import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature'
}

type Tier = 'low' | 'mid' | 'top'

function toIsoDate(unixSeconds?: number | null) {
  if (!unixSeconds) return null
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

function toIsoTimestamp(unixSeconds?: number | null) {
  if (!unixSeconds) return null
  return new Date(unixSeconds * 1000).toISOString()
}

function toCurrentCalendarPeriod(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  return { start, end }
}


function mapStripeStatus(status?: string): string {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'paused':
      return 'paused'
    default:
      return 'inactive'
  }
}

function normalizeTierCode(tier: unknown): string | null {
  if (typeof tier !== 'string') return null
  const normalized = tier.trim().toLowerCase()
  return normalized || null
}

function extractTierFromPrice(price: Stripe.Price | null | undefined): Tier | null {
  const tier = price?.metadata?.tier
  if (tier === 'low' || tier === 'mid' || tier === 'top') return tier
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
    return new Response('Missing environment configuration', { status: 500, headers: corsHeaders })
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing stripe-signature header', { status: 400, headers: corsHeaders })

  const payload = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, stripeWebhookSecret)
  } catch (error) {
    return new Response(`Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 400,
      headers: corsHeaders
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // ── Event-level idempotency ──
  // Stripe retries deliver the same event id. Recording the id before doing
  // any work means a retried (or concurrently re-delivered) event is acked
  // without re-processing, so credits/subscription changes never run twice.
  const { error: eventInsertError } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type })

  if (eventInsertError) {
    if (eventInsertError.code === '23505') {
      console.log(`[Webhook] Duplicate event ${event.id} (${event.type}) — already processed, acking.`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    // If the idempotency table is unavailable, fail the delivery so Stripe
    // retries later rather than risking unrecorded processing.
    console.error('[Webhook] Failed to record event id:', eventInsertError)
    return new Response(JSON.stringify({ error: 'Event log unavailable' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // ── Grant-level idempotency ──
  // Both checkout.session.completed and invoice.paid can attempt to grant
  // credits for the same invoice. Each grant is keyed (invoice or session id)
  // and only executes when its key is newly inserted.
  async function grantCreditsOnce(grantKey: string, parentId: string, credits: number, source: string): Promise<boolean> {
    if (credits <= 0) return false
    const { error: grantError } = await supabase
      .from('stripe_credit_grants')
      .insert({ grant_key: grantKey, parent_id: parentId, credits, source })
    if (grantError) {
      if (grantError.code === '23505') {
        console.log(`[Webhook] Credits already granted for ${grantKey} — skipping.`)
        return false
      }
      throw grantError
    }
    await addCreditsToFamily(parentId, credits)
    return true
  }

  async function findParentId(customerId?: string | null, subscriptionId?: string | null) {
    if (subscriptionId) {
      const { data } = await supabase
        .from('parent_subscriptions')
        .select('parent_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()
      if (data?.parent_id) return data.parent_id as string
    }

    if (customerId) {
      const { data } = await supabase
        .from('parent_subscriptions')
        .select('parent_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()
      if (data?.parent_id) return data.parent_id as string
    }

    return null
  }

  // Add credits to parent_profiles and all children for a given parent
  async function addCreditsToFamily(parentId: string, amount: number) {
    // Update parent credits (parent_profiles PK is 'id', not 'user_id')
    const { data: parent } = await supabase
      .from('parent_profiles')
      .select('credits')
      .eq('id', parentId)
      .maybeSingle()

    const newCredits = (parent?.credits ?? 0) + amount
    const { error: updateError } = await supabase
      .from('parent_profiles')
      .update({ credits: newCredits })
      .eq('id', parentId)

    if (updateError) {
      console.error(`[Webhook] addCreditsToFamily - failed to update parent credits:`, updateError)
    } else {
      console.log(`[Webhook] addCreditsToFamily - parent ${parentId} credits: ${parent?.credits ?? 0} -> ${newCredits}`)
    }

    // Update all children's credits
    const { data: children, error: childQueryError } = await supabase
      .from('children')
      .select('id, name, credits')
      .eq('parent_user_id', parentId)

    console.log(`[Webhook] addCreditsToFamily - found ${children?.length ?? 0} children, queryError: ${childQueryError?.message ?? 'none'}`)

    if (children && children.length > 0) {
      for (const child of children) {
        const oldCredits = child.credits ?? 0
        const newChildCredits = oldCredits + amount
        const { data: updated, error: childUpdateError } = await supabase
          .from('children')
          .update({ credits: newChildCredits })
          .eq('id', child.id)
          .select('id, credits')

        console.log(`[Webhook] addCreditsToFamily - child ${child.id} (${child.name}): ${oldCredits} -> ${newChildCredits}, updateError: ${childUpdateError?.message ?? 'none'}, returned: ${JSON.stringify(updated)}`)
      }
    }
  }

  async function upsertParentSubscription(params: {
    parentId: string
    customerId?: string | null
    subscriptionId?: string | null
    priceId?: string | null
    tier?: string | null
    stripeStatus?: string | null
    currentPeriodStart?: number | null
    currentPeriodEnd?: number | null
    cancelAtPeriodEnd?: boolean
    billingInterval?: 'monthly' | 'annual' | null
  }) {
    const payload: Record<string, unknown> = {
      parent_id: params.parentId,
      tier: normalizeTierCode(params.tier),
      status: mapStripeStatus(params.stripeStatus ?? undefined),
      stripe_customer_id: params.customerId ?? null,
      stripe_subscription_id: params.subscriptionId ?? null,
      stripe_price_id: params.priceId ?? null,
      stripe_current_period_start: toIsoTimestamp(params.currentPeriodStart),
      stripe_current_period_end: toIsoTimestamp(params.currentPeriodEnd),
      current_period_start: toIsoDate(params.currentPeriodStart),
      current_period_end: toIsoDate(params.currentPeriodEnd),
      cancel_at_period_end: Boolean(params.cancelAtPeriodEnd),
      updated_at: new Date().toISOString()
    }
    if (params.billingInterval) payload.billing_interval = params.billingInterval

    const { error } = await supabase.from('parent_subscriptions').upsert(payload, { onConflict: 'parent_id' })
    if (error) {
      // billing_interval only exists once the annual-billing migration is
      // applied — retry without it rather than failing the whole event.
      if (params.billingInterval && `${error.message}`.includes('billing_interval')) {
        delete payload.billing_interval
        const { error: retryError } = await supabase.from('parent_subscriptions').upsert(payload, { onConflict: 'parent_id' })
        if (retryError) throw retryError
        return
      }
      throw error
    }
  }

  // How many months of module credits an invoice covers: a yearly price
  // covers 12 months at once (credits roll over, so the family gets the
  // whole year's credits up front).
  function monthsCoveredByPrice(price: Stripe.Price | null | undefined): number {
    const interval = price?.recurring?.interval
    const count = price?.recurring?.interval_count ?? 1
    if (interval === 'year') return 12 * count
    if (interval === 'month') return count
    return 1
  }

  function billingIntervalFromPrice(price: Stripe.Price | null | undefined): 'monthly' | 'annual' | null {
    const interval = price?.recurring?.interval
    if (interval === 'year') return 'annual'
    if (interval === 'month') return 'monthly'
    return null
  }

  async function grantCreditsFromInvoice(invoice: Stripe.Invoice) {
    // Support both old API (invoice.subscription) and new API (invoice.parent.subscription_details)
    const invoiceAny = invoice as any
    const subscriptionId =
      (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id) ||
      invoiceAny.parent?.subscription_details?.subscription ||
      invoiceAny.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
      null
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

    console.log(`[Webhook] grantCreditsFromInvoice - subscriptionId: ${subscriptionId}, customerId: ${customerId}`)

    const parentId = await findParentId(customerId, subscriptionId)
    console.log(`[Webhook] grantCreditsFromInvoice - parentId: ${parentId}`)

    if (!parentId || !subscriptionId) {
      console.log(`[Webhook] grantCreditsFromInvoice - SKIPPED: parentId=${parentId}, subscriptionId=${subscriptionId}`)
      return
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price']
    })

    const price = subscription.items.data[0]?.price
    const tier = extractTierFromPrice(price)

    // Also check subscription metadata for tier (set during signup)
    let resolvedTier: string | null = normalizeTierCode(tier)
    if (!resolvedTier) {
      const subMeta = (subscription as any).metadata
      resolvedTier = normalizeTierCode(subMeta?.tier) || normalizeTierCode(subMeta?.plan)
    }
    if (!resolvedTier) {
      const { data: existing } = await supabase
        .from('parent_subscriptions')
        .select('tier')
        .eq('parent_id', parentId)
        .maybeSingle()
      resolvedTier = normalizeTierCode(existing?.tier)
    }

    console.log(`[Webhook] grantCreditsFromInvoice - resolvedTier: ${resolvedTier}, priceMeta: ${JSON.stringify(price?.metadata)}`)

    if (!resolvedTier) {
      console.log(`[Webhook] grantCreditsFromInvoice - SKIPPED: could not resolve tier`)
      return
    }

    const { data: tierRow, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('modules_per_month')
      .eq('tier', resolvedTier)
      .single()

    if (tierError || !tierRow) throw tierError ?? new Error('Tier not found')

    const line = invoice.lines.data[0]
    const periodStart = line?.period?.start ?? subscription.current_period_start
    const periodEnd = line?.period?.end ?? subscription.current_period_end

    // Update subscription period dates
    await upsertParentSubscription({
      parentId,
      customerId,
      subscriptionId,
      tier: resolvedTier,
      stripeStatus: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      billingInterval: billingIntervalFromPrice(price)
    })

    // Grant credits (idempotent per invoice — safe even if both
    // checkout.session.completed and invoice.paid fire for this invoice).
    // An annual invoice covers 12 months, so it grants 12 months of credits
    // up front (credits roll over while the subscription is active).
    const monthsCovered = monthsCoveredByPrice(price)
    const creditsToGrant = tierRow.modules_per_month * monthsCovered
    const granted = await grantCreditsOnce(`invoice:${invoice.id}`, parentId, creditsToGrant, 'subscription_invoice')
    if (granted) {
      console.log(`[Webhook] Granted ${creditsToGrant} credits (${monthsCovered} month(s)) to family of ${parentId} (invoice ${invoice.id}, tier ${resolvedTier})`)
    }
  }

  async function grantSubscriptionExtensionCredits(params: {
    parentId: string
    months: number
    tier?: string | null
    grantKey: string
  }) {
    const { parentId, months } = params
    if (months <= 0) return

    let resolvedTier = normalizeTierCode(params.tier)
    if (!resolvedTier) {
      const { data: existing } = await supabase
        .from('parent_subscriptions')
        .select('tier')
        .eq('parent_id', parentId)
        .maybeSingle()
      resolvedTier = normalizeTierCode(existing?.tier)
    }

    if (!resolvedTier) return

    const { data: tierRow, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('modules_per_month')
      .eq('tier', resolvedTier)
      .single()

    if (tierError || !tierRow) throw tierError ?? new Error('Tier not found')

    const creditsToGrant = tierRow.modules_per_month * months
    if (creditsToGrant <= 0) return

    const granted = await grantCreditsOnce(params.grantKey, parentId, creditsToGrant, 'subscription_extension')
    if (granted) {
      console.log(`Granted ${creditsToGrant} extension credits to family of ${parentId} (${months} months)`)
    }
  }

  // ── Practitioner plan billing ──
  // Practitioner subscriptions live in practitioner_subscriptions and are
  // identified by metadata.payment_type === 'practitioner_plan' (or by a
  // matching stripe_customer_id / stripe_subscription_id).
  async function activatePractitionerPlan(session: Stripe.Checkout.Session) {
    const practitionerId = session.metadata?.practitioner_user_id ?? session.client_reference_id
    const planCode = session.metadata?.plan_code
    if (!practitionerId || !planCode) {
      console.error('[Webhook] practitioner_plan session missing metadata', session.id)
      return
    }

    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

    // Upgrade path: cancel the plan being replaced once the new one is paid.
    const previousSubscriptionId = session.metadata?.previous_subscription_id || null
    if (previousSubscriptionId && previousSubscriptionId !== subscriptionId) {
      try {
        await stripe.subscriptions.cancel(previousSubscriptionId)
      } catch (cancelError) {
        const message = cancelError instanceof Error ? cancelError.message.toLowerCase() : ''
        if (!message.includes('no such subscription')) throw cancelError
      }
    }

    let periodEnd: string | null = null
    let status = 'active'
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      periodEnd = toIsoTimestamp(subscription.current_period_end)
      status = mapStripeStatus(subscription.status)
    }

    const { error } = await supabase.from('practitioner_subscriptions').upsert(
      {
        practitioner_user_id: practitionerId,
        plan_code: planCode,
        status,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'practitioner_user_id' }
    )
    if (error) throw error
    console.log(`[Webhook] Practitioner plan activated: ${practitionerId} → ${planCode}`)
  }

  // Keep practitioner subscription status in sync on renewals, payment
  // failures, and cancellations. Returns true when the subscription
  // belonged to a practitioner (so parent handling is skipped).
  async function syncPractitionerSubscription(subscription: Stripe.Subscription): Promise<boolean> {
    const practitionerId = subscription.metadata?.practitioner_user_id
    let match: { practitioner_user_id: string } | null = null

    if (practitionerId) {
      match = { practitioner_user_id: practitionerId }
    } else {
      const { data } = await supabase
        .from('practitioner_subscriptions')
        .select('practitioner_user_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
      match = data ?? null
    }
    if (!match) return false

    const { error } = await supabase
      .from('practitioner_subscriptions')
      .update({
        status: mapStripeStatus(subscription.status),
        current_period_end: toIsoTimestamp(subscription.current_period_end),
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString()
      })
      .eq('practitioner_user_id', match.practitioner_user_id)
    if (error) throw error
    console.log(`[Webhook] Practitioner subscription synced: ${match.practitioner_user_id} → ${subscription.status}`)
    return true
  }

  try {
    console.log(`[Webhook] Processing event: ${event.type} (${event.id})`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.payment_type === 'practitioner_plan') {
          await activatePractitionerPlan(session)
          break
        }

        const parentId = session.client_reference_id ?? session.metadata?.parent_id ?? null
        if (!parentId) break

        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const tier = session.metadata?.tier ?? null
        const previousSubscriptionId = session.metadata?.previous_subscription_id || null
        const paymentType = session.metadata?.payment_type || null

        // Handle one-time payments for subscription extensions
        if (session.mode === 'payment' && paymentType === 'subscription_extension') {
          const months = parseInt(session.metadata?.months || '1')
          const newEndDateStr = session.metadata?.new_end_date || null

          // Get current subscription to determine start date
          const { data: currentSub } = await supabase
            .from('parent_subscriptions')
            .select('current_period_end, tier')
            .eq('parent_id', parentId)
            .maybeSingle()

          const now = new Date()
          let periodStart: Date
          let periodEnd: Date

          // If they have a current period end that's in the future, extend from there
          if (currentSub?.current_period_end) {
            const existingEnd = new Date(currentSub.current_period_end)
            periodStart = existingEnd > now ? existingEnd : now
          } else {
            periodStart = now
          }

          // Calculate new end date
          if (newEndDateStr) {
            periodEnd = new Date(newEndDateStr)
          } else {
            periodEnd = new Date(periodStart)
            periodEnd.setMonth(periodEnd.getMonth() + months)
          }

          // Update subscription with new period dates
          const { error: updateError } = await supabase
            .from('parent_subscriptions')
            .upsert({
              parent_id: parentId,
              stripe_customer_id: customerId,
              tier: normalizeTierCode(currentSub?.tier) || 'low',
              status: 'active',
              current_period_start: periodStart.toISOString().slice(0, 10),
              current_period_end: periodEnd.toISOString().slice(0, 10),
              stripe_current_period_start: periodStart.toISOString(),
              stripe_current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: false,
              updated_at: new Date().toISOString()
            }, { onConflict: 'parent_id' })

          if (updateError) {
            console.error('Failed to update subscription after payment:', updateError)
            throw updateError
          }

          await grantSubscriptionExtensionCredits({
            parentId,
            months,
            tier: currentSub?.tier || session.metadata?.tier || 'low',
            grantKey: `session:${session.id}`
          })

          console.log(`Subscription extended for ${parentId}: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
          break
        }

        // Handle prepaid credits purchase
        if (session.mode === 'payment' && paymentType === 'prepaid_credits') {
          const credits = parseInt(session.metadata?.credits || '0')
          if (credits > 0) {
            try {
              const granted = await grantCreditsOnce(`session:${session.id}`, parentId, credits, 'prepaid_credits')
              if (granted) console.log(`Granted ${credits} prepaid credits to family of ${parentId}`)
            } catch (creditError) {
              console.error('Failed to grant prepaid credits:', creditError)
            }
          }
          break
        }

        // Handle recurring subscription payments (original logic)
        if (previousSubscriptionId && previousSubscriptionId !== subscriptionId) {
          try {
            await stripe.subscriptions.cancel(previousSubscriptionId)
          } catch (cancelError) {
            const message = cancelError instanceof Error ? cancelError.message.toLowerCase() : ''
            if (!message.includes('no such subscription')) throw cancelError
          }
        }

        let subscriptionDetails: Stripe.Subscription | null = null
        if (subscriptionId) {
          subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price']
          })
        }

        const subscriptionPrice = subscriptionDetails?.items.data[0]?.price
        const resolvedTier = tier ?? extractTierFromPrice(subscriptionPrice) ?? subscriptionDetails?.metadata?.tier ?? null

        await upsertParentSubscription({
          parentId,
          customerId,
          subscriptionId,
          priceId: subscriptionPrice?.id ?? null,
          tier: resolvedTier,
          stripeStatus: subscriptionDetails?.status ?? 'active',
          currentPeriodStart: subscriptionDetails?.current_period_start ?? null,
          currentPeriodEnd: subscriptionDetails?.current_period_end ?? null,
          cancelAtPeriodEnd: subscriptionDetails?.cancel_at_period_end ?? false,
          billingInterval: billingIntervalFromPrice(subscriptionPrice)
        })

        const sessionInvoiceId = typeof session.invoice === 'string' ? session.invoice : session.invoice?.id
        if (sessionInvoiceId) {
          const invoice = await stripe.invoices.retrieve(sessionInvoiceId)
          await grantCreditsFromInvoice(invoice)
        }

        // New paid signup: the account was created server-side before
        // checkout (start-paid-signup). Activate it now.
        if (paymentType === 'signup') {
          const signupTier = normalizeTierCode(session.metadata?.plan) ?? resolvedTier
          if (signupTier) {
            const { error: profileError } = await supabase
              .from('parent_profiles')
              .update({ subscription_tier: signupTier })
              .eq('id', parentId)
            if (profileError) console.error('[Webhook] Failed to set profile tier after signup:', profileError)
          }
          const { error: pendingError } = await supabase
            .from('pending_signups')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('parent_id', parentId)
          if (pendingError) console.error('[Webhook] Failed to mark pending signup complete:', pendingError)
          console.log(`[Webhook] Activated signup for ${parentId} (tier ${signupTier})`)
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const parentId = session.client_reference_id ?? session.metadata?.parent_id ?? null
        if (parentId && session.metadata?.payment_type === 'signup') {
          // The account stays usable (0 credits, inactive subscription) so the
          // parent can log in and subscribe from their profile — we only stop
          // the stale resume token from creating further sessions.
          await supabase
            .from('pending_signups')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('parent_id', parentId)
            .eq('status', 'awaiting_payment')
          console.log(`[Webhook] Signup checkout expired for ${parentId}`)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Practitioner subscriptions sync to their own table.
        if (await syncPractitionerSubscription(subscription)) break

        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
        const parentId = subscription.metadata?.parent_id ?? (await findParentId(customerId, subscription.id))
        if (!parentId) break

        const price = subscription.items.data[0]?.price
        const tier = extractTierFromPrice(price) ?? subscription.metadata?.tier ?? null

        await upsertParentSubscription({
          parentId,
          customerId,
          subscriptionId: subscription.id,
          priceId: price?.id ?? null,
          tier,
          stripeStatus: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          billingInterval: billingIntervalFromPrice(price)
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[Webhook] invoice.paid received - invoice: ${invoice.id}, customer: ${invoice.customer}`)
        await grantCreditsFromInvoice(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const invoiceAny2 = invoice as any
        const subscriptionId =
          (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id) ||
          invoiceAny2.parent?.subscription_details?.subscription ||
          null
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        const parentId = await findParentId(customerId, subscriptionId)
        if (!parentId) break

        // Determine retry attempt from Stripe's attempt_count
        const attemptCount = invoice.attempt_count ?? 1
        console.log(`[Webhook] Payment failed for ${parentId}, attempt ${attemptCount}`)

        await upsertParentSubscription({
          parentId,
          customerId,
          subscriptionId,
          stripeStatus: 'past_due'
        })

        // Store the failure details for the frontend to display
        await supabase.from('parent_subscriptions').update({
          payment_failure_code: invoice.last_finalization_error?.code ?? 'payment_failed',
          payment_failure_count: attemptCount,
          payment_failed_at: new Date().toISOString(),
        }).eq('parent_id', parentId)

        // Send notification email to the parent about the failed payment
        try {
          // parent_profiles is keyed by id and has no email column — the
          // email comes from auth, with the Stripe customer as fallback.
          const { data: parentProfile } = await supabase
            .from('parent_profiles')
            .select('full_name')
            .eq('id', parentId)
            .maybeSingle()

          const { data: authUser } = await supabase.auth.admin.getUserById(parentId)
          let email = authUser?.user?.email
          if (!email && customerId) {
            const customer = await stripe.customers.retrieve(customerId as string)
            if (customer && !customer.deleted) {
              email = (customer as Stripe.Customer).email
            }
          }

          if (email) {
            const firstName = (parentProfile?.full_name || '').trim().split(/\s+/)[0] || 'there'
            const isFirstAttempt = attemptCount <= 1
            const subject = isFirstAttempt
              ? "Payment failed — let's get this sorted"
              : `Payment failed (attempt ${attemptCount}) — action needed`

            // Use Stripe's hosted invoice URL for easy retry
            const retryUrl = invoice.hosted_invoice_url || ''

            console.log(`[Webhook] Sending payment failure email to ${email} (attempt ${attemptCount})`)

            // Send via Supabase edge function or direct (using existing send-feedback-email pattern)
            await supabase.functions.invoke('send-payment-failure-email', {
              body: {
                to: email,
                firstName,
                attemptCount,
                retryUrl,
                subject,
              }
            }).catch((emailErr: unknown) => {
              // Don't fail the webhook if email sending fails
              console.error('[Webhook] Failed to send payment failure email:', emailErr)
            })
          }
        } catch (notifyErr) {
          console.error('[Webhook] Error preparing payment failure notification:', notifyErr)
        }

        break
      }

      default:
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    console.error('[stripe-webhook] Unhandled error:', error instanceof Error ? error.stack : error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
