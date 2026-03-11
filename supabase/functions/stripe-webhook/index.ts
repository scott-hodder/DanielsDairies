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

  const supabase = createClient(supabaseUrl, serviceRoleKey)

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
      tier: params.tier ?? null,
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

    let resolvedTier: string | null = tier
    if (!resolvedTier) {
      const { data: existing } = await supabase
        .from('parent_subscriptions')
        .select('tier')
        .eq('parent_id', parentId)
        .maybeSingle()
      resolvedTier = (existing?.tier as string | null) ?? null
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

        if (previousSubscriptionId && previousSubscriptionId !== subscriptionId) {
          try {
            await stripe.subscriptions.cancel(previousSubscriptionId)
          } catch (cancelError) {
            const message = cancelError instanceof Error ? cancelError.message.toLowerCase() : ''
            if (!message.includes('no such subscription')) throw cancelError
          }
        }

        await upsertParentSubscription({
          parentId,
          customerId,
          subscriptionId,
          tier,
          stripeStatus: 'active'
        })
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
