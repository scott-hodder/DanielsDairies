import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
  }) {
    const payload = {
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

    const { error } = await supabase.from('parent_subscriptions').upsert(payload, { onConflict: 'parent_id' })
    if (error) throw error
  }

  async function grantCreditsFromInvoice(invoice: Stripe.Invoice) {
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    const parentId = await findParentId(customerId, subscriptionId)
    if (!parentId || !subscriptionId) return

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price']
    })

    const price = subscription.items.data[0]?.price
    const tier = extractTierFromPrice(price)

    let resolvedTier: string | null = normalizeTierCode(tier)
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

    const line = invoice.lines.data[0]
    const periodStart = line?.period?.start ?? subscription.current_period_start
    const periodEnd = line?.period?.end ?? subscription.current_period_end

    const { data: existingGrant } = await supabase
      .from('subscription_credit_ledger')
      .select('id')
      .eq('source_invoice_id', invoice.id)
      .maybeSingle()

    if (existingGrant?.id) return

    const { error: insertError } = await supabase.from('subscription_credit_ledger').insert({
      parent_id: parentId,
      period_start: toIsoDate(periodStart),
      period_end: toIsoDate(periodEnd),
      entry_type: 'grant',
      credits_delta: tierRow.modules_per_month,
      notes: `Stripe invoice grant (${resolvedTier})`,
      source_invoice_id: invoice.id,
      stripe_event_id: event.id,
      created_at: new Date().toISOString()
    })

    if (insertError && !insertError.message.toLowerCase().includes('duplicate key')) {
      throw insertError
    }
  }

  async function grantSubscriptionExtensionCredits(params: {
    parentId: string
    months: number
    tier?: string | null
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

    const currentPeriod = toCurrentCalendarPeriod(new Date())

    const { error: insertError } = await supabase
      .from('subscription_credit_ledger')
      .insert({
        parent_id: parentId,
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
        entry_type: 'grant',
        credits_delta: creditsToGrant,
        notes: `Stripe subscription payment grant (${resolvedTier}, ${months} month${months > 1 ? 's' : ''})`,
        stripe_event_id: event.id,
        created_at: new Date().toISOString()
      })

    if (insertError && !insertError.message.toLowerCase().includes('duplicate key')) {
      throw insertError
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
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
            tier: currentSub?.tier || session.metadata?.tier || 'low'
          })

          console.log(`Subscription extended for ${parentId}: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
          break
        }

        // Handle prepaid credits purchase
        if (session.mode === 'payment' && paymentType === 'prepaid_credits') {
          const credits = parseInt(session.metadata?.credits || '0')
          if (credits > 0) {
            // Get current billing period
            const { data: currentSub } = await supabase
              .from('parent_subscriptions')
              .select('current_period_start, current_period_end')
              .eq('parent_id', parentId)
              .maybeSingle()

            const now = new Date()
            const periodStart = currentSub?.current_period_start || now.toISOString().slice(0, 10)
            const periodEnd = currentSub?.current_period_end || new Date(now.setMonth(now.getMonth() + 1)).toISOString().slice(0, 10)

            // Grant credits to the user
            const { error: creditError } = await supabase
              .from('subscription_credit_ledger')
              .insert({
                parent_id: parentId,
                period_start: periodStart,
                period_end: periodEnd,
                entry_type: 'prepaid_purchase',
                credits_delta: credits,
                notes: `Prepaid ${credits} credits via Stripe checkout`,
                stripe_event_id: event.id,
                created_at: new Date().toISOString()
              })

            if (creditError) {
              console.error('Failed to grant prepaid credits:', creditError)
            } else {
              console.log(`Granted ${credits} prepaid credits to ${parentId}`)
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
          cancelAtPeriodEnd: subscriptionDetails?.cancel_at_period_end ?? false
        })

        const sessionInvoiceId = typeof session.invoice === 'string' ? session.invoice : session.invoice?.id
        if (sessionInvoiceId) {
          const invoice = await stripe.invoices.retrieve(sessionInvoiceId)
          await grantCreditsFromInvoice(invoice)
        }

        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
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
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await grantCreditsFromInvoice(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        const parentId = await findParentId(customerId, subscriptionId)
        if (!parentId) break

        await upsertParentSubscription({
          parentId,
          customerId,
          subscriptionId,
          stripeStatus: 'past_due'
        })
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : null }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
