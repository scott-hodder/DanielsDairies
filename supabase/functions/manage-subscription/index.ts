import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

type Action = 'cancel' | 'pause' | 'resume'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function isAction(value: string): value is Action {
  return value === 'cancel' || value === 'pause' || value === 'resume'
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
    const action = String(body?.action ?? '').toLowerCase()

    if (!isAction(action)) {
      return jsonResponse({ error: 'action must be one of cancel|pause|resume' }, 400)
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // Explicitly disable auth session handling so the service role key
    // properly bypasses Row Level Security (RLS) policies
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: currentSub, error: currentSubError } = await admin
      .from('parent_subscriptions')
      .select('stripe_subscription_id, status, cancel_at_period_end')
      .eq('parent_id', user.id)
      .maybeSingle()

    if (currentSubError) {
      const isPermissionError = /permission denied/i.test(currentSubError.message || '')
      return jsonResponse(
        {
          error: isPermissionError
            ? 'Database permission error on parent_subscriptions. Verify SUPABASE_SERVICE_ROLE_KEY is set correctly for this Edge Function.'
            : currentSubError.message
        },
        500
      )
    }

    if (!currentSub?.stripe_subscription_id) {
      return jsonResponse({ error: 'No active subscription found' }, 404)
    }

    const subscriptionId = currentSub.stripe_subscription_id as string

    // Perform the Stripe action
    if (action === 'cancel') {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      })
    } else if (action === 'pause') {
      await stripe.subscriptions.update(subscriptionId, {
        pause_collection: { behavior: 'void' }
      })
    } else if (action === 'resume') {
      // Resume handles both paused subscriptions and scheduled cancellations
      const updates: Record<string, unknown> = {
        cancel_at_period_end: false
      }
      // Only clear pause_collection if the subscription was paused
      if (currentSub.status === 'paused') {
        updates.pause_collection = ''
      }
      await stripe.subscriptions.update(subscriptionId, updates)
    }

    // Update the parent_subscriptions table accordingly
    let updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (action === 'cancel') {
      updateFields.cancel_at_period_end = true
    } else if (action === 'pause') {
      updateFields.status = 'paused'
      updateFields.paused_at = new Date().toISOString()
    } else if (action === 'resume') {
      updateFields.status = 'active'
      updateFields.cancel_at_period_end = false
      updateFields.paused_at = null
    }

    const { error: updateError } = await admin
      .from('parent_subscriptions')
      .update(updateFields)
      .eq('parent_id', user.id)

    if (updateError) {
      const isPermissionError = /permission denied/i.test(updateError.message || '')
      return jsonResponse(
        {
          error: isPermissionError
            ? 'Database permission error while updating parent_subscriptions. Verify SUPABASE_SERVICE_ROLE_KEY is set correctly for this Edge Function.'
            : updateError.message
        },
        500
      )
    }

    return jsonResponse({ success: true, action })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400)
  }
})
