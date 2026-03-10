import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

type Tier = 'low' | 'mid' | 'top'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function isTier(value: string): value is Tier {
  return value === 'low' || value === 'mid' || value === 'top'
}

async function resolvePriceIdForTier(stripe: Stripe, tier: Tier): Promise<string> {
  const envKeyByTier: Record<Tier, string> = {
    low: 'STRIPE_PRICE_LOW',
    mid: 'STRIPE_PRICE_MID',
    top: 'STRIPE_PRICE_TOP'
  }

  const envPriceId = Deno.env.get(envKeyByTier[tier])
  if (envPriceId) return envPriceId

  const prices = await stripe.prices.list({ active: true, limit: 100, type: 'recurring' })
  const matched = prices.data.find((price) => price.metadata?.tier === tier)
  if (!matched?.id) {
    throw new Error(`No Stripe price configured for tier: ${tier}`)
  }

  return matched.id
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

    const body = await req.json()
    const tier = body?.tier
    const successUrl = body?.success_url
    const cancelUrl = body?.cancel_url

    if (typeof tier !== 'string' || !isTier(tier)) {
      return jsonResponse({ error: 'tier must be one of low|mid|top' }, 400)
    }

    if (typeof successUrl !== 'string' || typeof cancelUrl !== 'string') {
      return jsonResponse({ error: 'success_url and cancel_url are required' }, 400)
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: currentSub } = await admin
      .from('parent_subscriptions')
      .select('stripe_customer_id')
      .eq('parent_id', user.id)
      .maybeSingle()

    let customerId = currentSub?.stripe_customer_id as string | null | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          parent_id: user.id
        }
      })
      customerId = customer.id
    }

    const priceId = await resolvePriceIdForTier(stripe, tier)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          parent_id: user.id,
          tier
        }
      },
      metadata: {
        parent_id: user.id,
        tier
      }
    })

    const { error: upsertError } = await admin.from('parent_subscriptions').upsert(
      {
        parent_id: user.id,
        tier,
        stripe_customer_id: customerId,
        stripe_price_id: priceId,
        status: 'inactive',
        updated_at: new Date().toISOString()
      },
      { onConflict: 'parent_id' }
    )

    if (upsertError) {
      return jsonResponse({ error: upsertError.message }, 500)
    }

    return jsonResponse({ url: session.url, id: session.id })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400)
  }
})
