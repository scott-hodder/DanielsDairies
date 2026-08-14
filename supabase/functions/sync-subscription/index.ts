// sync-subscription
//
// Self-healing fallback for the Stripe webhook. Called by a logged-in
// parent (the profile page auto-invokes it when the subscription looks
// inactive but a Stripe customer exists). It reads the truth straight
// from Stripe and repairs the account:
//   * activates parent_subscriptions + sets the profile tier
//   * grants any missed credits, idempotently keyed per invoice with the
//     same grant keys the webhook uses, so webhook + sync can never
//     double-grant
//   * marks the pending signup complete
//
// The webhook remains the primary path; this only ever moves the account
// TOWARD what Stripe says is true.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'
import { withCors } from '../_shared/cors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function mapStripeStatus(status?: string): string {
  switch (status) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due':
    case 'unpaid': return 'past_due'
    case 'canceled':
    case 'incomplete_expired': return 'canceled'
    case 'paused': return 'paused'
    default: return 'inactive'
  }
}

function monthsCoveredByPrice(price: Stripe.Price | null | undefined): number {
  const interval = price?.recurring?.interval
  const count = price?.recurring?.interval_count ?? 1
  if (interval === 'year') return 12 * count
  if (interval === 'month') return count
  return 1
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
      return jsonResponse({ error: 'Missing server configuration' }, 500)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    const { data: sub } = await admin
      .from('parent_subscriptions')
      .select('stripe_customer_id, tier, status')
      .eq('parent_id', user.id)
      .maybeSingle()

    if (!sub?.stripe_customer_id) {
      return jsonResponse({ synced: false, reason: 'no_customer' })
    }

    // Most relevant subscription for this customer: active beats trialing
    // beats past_due beats anything else; newest wins within a rank.
    const subs = await stripe.subscriptions.list({
      customer: sub.stripe_customer_id,
      status: 'all',
      limit: 10,
      expand: ['data.items.data.price', 'data.latest_invoice']
    })
    if (subs.data.length === 0) {
      return jsonResponse({ synced: false, reason: 'no_subscription' })
    }
    const rank = (s: Stripe.Subscription) =>
      ({ active: 0, trialing: 1, past_due: 2 } as Record<string, number>)[s.status] ?? 3
    const best = subs.data.sort((a, b) => rank(a) - rank(b) || b.created - a.created)[0]

    const price = best.items.data[0]?.price
    const meta = (best.metadata || {}) as Record<string, string>
    const tier =
      (price?.metadata?.tier as string | undefined) ||
      meta.tier || meta.plan || sub.tier || null
    const billingInterval =
      price?.recurring?.interval === 'year' ? 'annual'
      : price?.recurring?.interval === 'month' ? 'monthly' : null

    // 1. Subscription row
    const payload: Record<string, unknown> = {
      parent_id: user.id,
      tier: tier ? String(tier).toLowerCase() : null,
      status: mapStripeStatus(best.status),
      stripe_customer_id: sub.stripe_customer_id,
      stripe_subscription_id: best.id,
      stripe_price_id: price?.id ?? null,
      stripe_current_period_start: new Date(best.current_period_start * 1000).toISOString(),
      stripe_current_period_end: new Date(best.current_period_end * 1000).toISOString(),
      current_period_start: new Date(best.current_period_start * 1000).toISOString().slice(0, 10),
      current_period_end: new Date(best.current_period_end * 1000).toISOString().slice(0, 10),
      cancel_at_period_end: best.cancel_at_period_end,
      updated_at: new Date().toISOString()
    }
    if (billingInterval) payload.billing_interval = billingInterval
    let { error: upsertError } = await admin
      .from('parent_subscriptions')
      .upsert(payload, { onConflict: 'parent_id' })
    if (upsertError && `${upsertError.message}`.includes('billing_interval')) {
      delete payload.billing_interval
      ;({ error: upsertError } = await admin
        .from('parent_subscriptions')
        .upsert(payload, { onConflict: 'parent_id' }))
    }
    if (upsertError) throw upsertError

    // 2. Profile tier (only when the subscription is usable)
    if (tier && ['active', 'trialing', 'past_due'].includes(mapStripeStatus(best.status))) {
      await admin
        .from('parent_profiles')
        .update({ subscription_tier: String(tier).toLowerCase() })
        .eq('id', user.id)
    }

    // 3. Missed credits: grant for the latest PAID invoice, same key as the
    //    webhook (invoice:<id>) so this can never double-grant.
    let creditsGranted = 0
    const invoice = best.latest_invoice as Stripe.Invoice | null
    if (tier && invoice && (invoice.status === 'paid' || invoice.paid)) {
      const { data: tierRow } = await admin
        .from('subscription_tiers')
        .select('modules_per_month')
        .eq('tier', String(tier).toLowerCase())
        .maybeSingle()

      const credits = (tierRow?.modules_per_month ?? 0) * monthsCoveredByPrice(price)
      if (credits > 0) {
        const { error: grantError } = await admin
          .from('stripe_credit_grants')
          .insert({ grant_key: `invoice:${invoice.id}`, parent_id: user.id, credits, source: 'sync_subscription' })
        if (!grantError) {
          // Add credits to the parent and every child (same as the webhook)
          const { data: parent } = await admin
            .from('parent_profiles').select('credits').eq('id', user.id).maybeSingle()
          await admin.from('parent_profiles')
            .update({ credits: (parent?.credits ?? 0) + credits }).eq('id', user.id)
          const { data: children } = await admin
            .from('children').select('id, credits').eq('parent_user_id', user.id)
          for (const child of children ?? []) {
            await admin.from('children')
              .update({ credits: (child.credits ?? 0) + credits }).eq('id', child.id)
          }
          creditsGranted = credits
          console.log(`[sync-subscription] Granted ${credits} missed credits to ${user.id} (invoice ${invoice.id})`)
        } else if (grantError.code !== '23505') {
          throw grantError
        }
      }
    }

    // 4. Pending signup bookkeeping
    await admin
      .from('pending_signups')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('parent_id', user.id)
      .eq('status', 'awaiting_payment')

    return jsonResponse({
      synced: true,
      status: mapStripeStatus(best.status),
      tier: tier ? String(tier).toLowerCase() : null,
      credits_granted: creditsGranted
    })
  } catch (error) {
    console.error('[sync-subscription] error:', error)
    return jsonResponse({ error: 'Could not sync subscription' }, 500)
  }
}))
