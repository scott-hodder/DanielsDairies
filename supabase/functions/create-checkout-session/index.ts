import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Pricing configuration
const DEFAULT_MONTHLY_PRICE = 1900 // $19.00 in cents fallback
const CREDIT_PRICE = 699 // $6.99 in cents per credit
const DEFAULT_DISCOUNT_RATES: Record<number, number> = {
  1: 0,
  3: 0.05,  // 5% off
  6: 0.10,  // 10% off
  12: 0.17  // 17% off (~2 months free)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function normalizeDiscountRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
  return value > 1 ? value / 100 : value
}

function normalizeTierCode(tier: unknown): string {
  return typeof tier === 'string' ? tier.trim().toLowerCase() : ''
}

function calculateSubscriptionPrice(
  months: number,
  monthlyPriceCents: number,
  discountRates: Record<number, number>
): number {
  const basePrice = monthlyPriceCents * months
  const discount = discountRates[months] || 0
  return Math.round(basePrice * (1 - discount))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
      return jsonResponse({ error: 'Missing required environment configuration' }, 500)
    }

    const body = await req.json()
    const paymentType = body?.paymentType || body?.plan ? 'signup' : 'subscription'
    const appUrl = Deno.env.get('APP_URL') || 'https://danielsdiaries.com.au'

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // ── Signup checkout has moved ──
    // The old unauthenticated signup branch created a checkout session with
    // no account behind it, forcing the browser to hold credentials across
    // the redirect. Paid signups now go through start-paid-signup, which
    // creates the (pending) account server-side first.
    if (paymentType === 'signup' || body?.plan) {
      return jsonResponse({ error: 'Signup checkout has moved. Use the start-paid-signup function.', code: 'use_start_paid_signup' }, 410)
    }

    // ── Authenticated flows (subscription extension / prepaid credits) ──
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })

    const {
      data: { user },
      error: authError
    } = await authClient.auth.getUser()

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const months = body?.months || 1
    const credits = body?.credits || 0
    const newEndDate = body?.newEndDate
    const requestedTier = body?.tier || ''
    const successUrl = body?.success_url || `${appUrl}/dashboard.html?payment=success`
    const cancelUrl = body?.cancel_url || `${appUrl}/dashboard.html?payment=cancelled`

    if (!['subscription', 'prepaid'].includes(paymentType)) {
      return jsonResponse({ error: 'paymentType must be subscription or prepaid' }, 400)
    }

    if (paymentType === 'prepaid' && (!credits || credits < 1)) {
      return jsonResponse({ error: 'credits must be at least 1 for prepaid purchases' }, 400)
    }

    if (paymentType === 'subscription' && (!months || months < 1)) {
      return jsonResponse({ error: 'months must be at least 1 for subscription payments' }, 400)
    }

    // Get current subscription info
    const { data: currentSub } = await admin
      .from('parent_subscriptions')
      .select('stripe_customer_id, current_period_end, tier')
      .eq('parent_id', user.id)
      .maybeSingle()

    const activeTier = normalizeTierCode(currentSub?.tier) || normalizeTierCode(requestedTier) || 'low'

    const { data: tierPricing } = await admin
      .from('subscription_tiers')
      .select('monthly_price_cents')
      .eq('tier', activeTier)
      .maybeSingle()

    const monthlyPriceCents =
      typeof tierPricing?.monthly_price_cents === 'number' && tierPricing.monthly_price_cents > 0
        ? tierPricing.monthly_price_cents
        : DEFAULT_MONTHLY_PRICE

    // Use default discount rates since discount columns don't exist in the table yet
    const discountRates: Record<number, number> = {
      1: 0,
      3: DEFAULT_DISCOUNT_RATES[3],
      6: DEFAULT_DISCOUNT_RATES[6],
      12: DEFAULT_DISCOUNT_RATES[12]
    }

    let customerId = currentSub?.stripe_customer_id as string | null | undefined

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { parent_id: user.id }
      })
      customerId = customer.id
    }

    let session: any

    if (paymentType === 'prepaid') {
      // Prepaid credits at $6.99 each - create one-time payment with dynamic pricing
      const totalAmount = credits * CREDIT_PRICE

      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Module Credits',
              description: `${credits} module credit${credits > 1 ? 's' : ''} for Daniel's Diaries`
            },
            unit_amount: CREDIT_PRICE
          },
          quantity: credits
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
        allow_promotion_codes: true,
        metadata: {
          parent_id: user.id,
          payment_type: 'prepaid_credits',
          credits: String(credits),
          total_cents: String(totalAmount)
        }
      })
    } else {
      // Subscription payment - calculate price based on months
      const totalAmount = calculateSubscriptionPrice(months, monthlyPriceCents, discountRates)

      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{
          price_data: {
            currency: 'aud',
            product_data: {
              name: `Daniel's Diaries Subscription`,
              description: `${months} month${months > 1 ? 's' : ''} subscription access`
            },
            unit_amount: totalAmount
          },
          quantity: 1
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
        allow_promotion_codes: true,
        metadata: {
          parent_id: user.id,
          payment_type: 'subscription_extension',
          months: String(months),
          new_end_date: newEndDate || '',
          total_cents: String(totalAmount)
        }
      })

      // Update subscription record with pending payment info
      const { error: upsertError } = await admin.from('parent_subscriptions').upsert(
        {
          parent_id: user.id,
          tier: activeTier,
          stripe_customer_id: customerId,
          status: currentSub ? 'active' : 'pending',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'parent_id' }
      )

      if (upsertError) {
        console.warn('Failed to update subscription record:', upsertError)
      }
    }

    return jsonResponse({ url: session.url, id: session.id })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400)
  }
})
