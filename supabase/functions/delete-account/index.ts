import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing server configuration' }, 500)
    }

    // Authenticate the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const userId = user.id
    const body = await req.json()
    const { confirmEmail } = body

    // Require the user to confirm by entering their email
    if (!confirmEmail || confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return jsonResponse({ error: 'Please enter your email address to confirm account deletion.' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log(`[delete-account] Starting deletion for user: ${userId}`)

    // 1. Cancel any active Stripe subscription
    try {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (stripeSecretKey) {
        const { data: sub } = await admin
          .from('parent_subscriptions')
          .select('stripe_subscription_id')
          .eq('parent_id', userId)
          .maybeSingle()

        if (sub?.stripe_subscription_id) {
          const { default: Stripe } = await import('https://esm.sh/stripe@14.25.0?target=denonext')
          const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
          await stripe.subscriptions.cancel(sub.stripe_subscription_id)
          console.log(`[delete-account] Cancelled Stripe subscription: ${sub.stripe_subscription_id}`)
        }
      }
    } catch (stripeErr) {
      console.error('[delete-account] Stripe cancellation error (non-fatal):', stripeErr)
    }

    // 2. Get all children IDs for this parent
    const { data: children } = await admin
      .from('children')
      .select('id')
      .eq('parent_user_id', userId)

    const childIds = (children || []).map((c: { id: string }) => c.id)

    // 3. Delete child-related data (in case cascades don't cover everything)
    if (childIds.length > 0) {
      await Promise.all([
        admin.from('child_mood_checkins').delete().in('child_id', childIds),
        admin.from('module_responses').delete().in('child_id', childIds),
        admin.from('child_modules').delete().in('child_id', childIds),
        admin.from('child_badges').delete().in('child_id', childIds),
        admin.from('child_roadblocks').delete().in('child_id', childIds),
        admin.from('child_focus_plan').delete().in('child_id', childIds),
        admin.from('child_daily_quests').delete().in('child_id', childIds),
        admin.from('child_rewards').delete().in('child_id', childIds),
        admin.from('pathway_assessments').delete().in('child_id', childIds),
      ])
      console.log(`[delete-account] Deleted data for ${childIds.length} children`)
    }

    // 4. Delete parent-level data
    await Promise.all([
      admin.from('children').delete().eq('parent_user_id', userId),
      admin.from('weekly_checkins').delete().eq('parent_user_id', userId),
      admin.from('parent_modules').delete().eq('parent_user_id', userId),
      admin.from('parent_subscriptions').delete().eq('parent_id', userId),
      admin.from('user_feedback').delete().eq('user_id', userId),
      admin.from('parent_audit_log').delete().eq('parent_user_id', userId),
    ])
    console.log(`[delete-account] Deleted parent-level data`)

    // 5. Delete parent profile
    await admin.from('parent_profiles').delete().eq('id', userId)
    console.log(`[delete-account] Deleted parent profile`)

    // 6. Delete auth user (must be last)
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('[delete-account] Auth user deletion error:', deleteAuthError)
      return jsonResponse({ error: 'Failed to delete authentication record. Please contact support.' }, 500)
    }

    console.log(`[delete-account] Successfully deleted user: ${userId}`)
    return jsonResponse({ success: true, message: 'Your account and all associated data have been permanently deleted.' })

  } catch (error) {
    console.error('[delete-account] Error:', error)
    return jsonResponse({ error: 'Failed to delete account. Please contact support.' }, 500)
  }
})
