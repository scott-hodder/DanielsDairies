// practitioner-checkout
//
// Self-serve Stripe billing for practitioner plans (Solo / Practice / Clinic).
//
//   POST { plan: 'solo' | 'practice' | 'clinic', successUrl?, cancelUrl? }
//     → creates a subscription-mode Checkout session for the plan and
//       returns { url }. If the practitioner already has an active Stripe
//       subscription, its id travels in metadata.previous_subscription_id
//       and the webhook cancels it once the new plan's payment succeeds
//       (same upgrade pattern as family plans).
//
//   POST { portal: true, returnUrl? }
//     → creates a Stripe Billing Portal session (manage card, invoices,
//       cancel) and returns { url }. Requires the practitioner to already
//       have a Stripe customer.
//
// Prices come from practitioner_plans (the same table the hub displays),
// so repricing is a DB update — no code change, no Stripe product setup.
// Activation happens exclusively via stripe-webhook.

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

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const appUrl = Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au'

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
      return jsonResponse({ error: 'Missing server configuration' }, 500)
    }

    // ── Authenticated practitioner only ──
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: isPractitioner } = await admin.rpc('is_user_practitioner_check', { user_id: user.id })
    if (!isPractitioner) {
      return jsonResponse({ error: 'Practitioner access required' }, 403)
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
    const body = await req.json()

    const { data: sub } = await admin
      .from('practitioner_subscriptions')
      .select('plan_code, status, stripe_customer_id, stripe_subscription_id')
      .eq('practitioner_user_id', user.id)
      .maybeSingle()

    // ── Billing portal: manage card / invoices / cancel ──
    if (body?.portal) {
      if (!sub?.stripe_customer_id) {
        return jsonResponse({ error: 'No billing account yet — choose a plan first.' }, 400)
      }
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: body?.returnUrl || `${appUrl}/practitioner-dashboard.html`
      })
      return jsonResponse({ url: portal.url })
    }

    // ── Checkout for a plan ──
    const planCode = String(body?.plan || '').trim().toLowerCase()
    const { data: plan } = await admin
      .from('practitioner_plans')
      .select('code, display_name, monthly_price_cents, currency, included_clients, practitioner_seats')
      .eq('code', planCode)
      .eq('is_active', true)
      .maybeSingle()

    if (!plan) return jsonResponse({ error: 'Selected plan is not available' }, 400)

    let customerId = sub?.stripe_customer_id as string | null | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { practitioner_user_id: user.id }
      })
      customerId = customer.id
      // Persist immediately so the webhook can find this practitioner by
      // customer id even if metadata is ever missing.
      await admin.from('practitioner_subscriptions').upsert(
        {
          practitioner_user_id: user.id,
          plan_code: sub?.plan_code || planCode,
          status: sub?.status || 'trialing',
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'practitioner_user_id' }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: plan.currency || 'aud',
            product_data: {
              name: `Daniel's Diaries Practitioner — ${plan.display_name}`,
              description: `Up to ${plan.included_clients} active clients, ${plan.practitioner_seats} practitioner login${plan.practitioner_seats > 1 ? 's' : ''}`
            },
            unit_amount: plan.monthly_price_cents,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }
      ],
      success_url: body?.successUrl || `${appUrl}/practitioner-dashboard.html?billing=success`,
      cancel_url: body?.cancelUrl || `${appUrl}/practitioner-dashboard.html?billing=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          payment_type: 'practitioner_plan',
          practitioner_user_id: user.id,
          plan_code: plan.code
        }
      },
      metadata: {
        payment_type: 'practitioner_plan',
        practitioner_user_id: user.id,
        plan_code: plan.code,
        previous_subscription_id: sub?.stripe_subscription_id || ''
      }
    })

    return jsonResponse({ url: session.url, id: session.id })
  } catch (error) {
    console.error('[practitioner-checkout] error:', error)
    return jsonResponse({ error: 'Could not start billing. Please try again.' }, 500)
  }
}))
