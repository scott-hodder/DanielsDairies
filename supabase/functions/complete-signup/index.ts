import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing server configuration' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { email, password, firstName, lastName, phone, plan, isFreeTrial } = body
    console.log('[complete-signup] Request body:', JSON.stringify({ email, firstName, lastName, phone, plan, isFreeTrial, hasPassword: !!password }))

    if (!email || !password || !firstName) {
      return jsonResponse({ error: 'Missing required fields: email, password, firstName' }, 400)
    }

    const effectivePlan = isFreeTrial ? 'free_trial' : plan
    if (!effectivePlan) {
      return jsonResponse({ error: 'Missing required field: plan' }, 400)
    }

    // 1. Create the auth user via admin API (bypasses email confirmation requirement)
    console.log('[complete-signup] Step 1: Creating auth user...')
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        phone: phone || '',
        plan: effectivePlan,
        is_free_trial: !!isFreeTrial
      }
    })

    if (authError) {
      console.error('[complete-signup] Step 1 FAILED - Auth error:', JSON.stringify(authError))
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return jsonResponse({ error: 'An account with this email already exists. Please log in instead.' }, 409)
      }
      return jsonResponse({ error: authError.message || 'Failed to create account' }, 400)
    }

    const userId = authData.user.id
    console.log('[complete-signup] Step 1 OK - User created:', userId)

    // 2. Get tier details for credits
    console.log('[complete-signup] Step 2: Looking up credits for plan:', plan, 'isFreeTrial:', isFreeTrial)
    let credits = 0
    if (isFreeTrial) {
      credits = 2
      console.log('[complete-signup] Step 2 OK - Free trial, credits = 2')
    } else {
      const { data: tierData, error: tierError } = await admin
        .from('subscription_tiers')
        .select('*')
        .eq('tier', plan)
        .maybeSingle()

      console.log('[complete-signup] Step 2 - Tier query result:', JSON.stringify({ tierData, tierError }))

      if (tierError) {
        console.error('[complete-signup] Step 2 FAILED - Tier lookup error:', JSON.stringify(tierError))
      }

      if (!tierData) {
        console.error('[complete-signup] Step 2 WARNING - No tier found for plan:', plan)
        // List all available tiers for debugging
        const { data: allTiers } = await admin.from('subscription_tiers').select('tier, modules_per_month')
        console.log('[complete-signup] Step 2 - Available tiers:', JSON.stringify(allTiers))
      }

      credits = tierData?.modules_per_month || 0
      console.log('[complete-signup] Step 2 OK - Credits from tier:', credits)
    }

    // 3. Wait for the profile trigger to create parent_profiles, then update it
    console.log('[complete-signup] Step 3: Waiting for profile trigger...')
    let profileUpdated = false
    for (let attempt = 1; attempt <= 8; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))

      const { data: profile, error: profileCheckError } = await admin
        .from('parent_profiles')
        .select('id, credits, subscription_tier')
        .eq('id', userId)
        .maybeSingle()

      console.log(`[complete-signup] Step 3 - Attempt ${attempt}/8: profile =`, JSON.stringify(profile), 'error =', JSON.stringify(profileCheckError))

      if (!profile) {
        console.log(`[complete-signup] Step 3 - Profile not ready yet, attempt ${attempt}/8`)
        continue
      }

      const updatePayload = {
        full_name: `${firstName} ${lastName}`,
        phone: phone || null,
        subscription_tier: isFreeTrial ? null : plan,
        credits
      }
      console.log('[complete-signup] Step 3 - Updating profile with:', JSON.stringify(updatePayload))

      const { data: updatedProfile, error: updateError } = await admin
        .from('parent_profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select('id, credits, subscription_tier, full_name')

      if (updateError) {
        console.error(`[complete-signup] Step 3 FAILED - Profile update error attempt ${attempt}:`, JSON.stringify(updateError))
        continue
      }

      console.log('[complete-signup] Step 3 - Update returned:', JSON.stringify(updatedProfile))

      // Verify the update actually stuck by reading back
      const { data: verifyProfile, error: verifyError } = await admin
        .from('parent_profiles')
        .select('id, credits, subscription_tier, full_name')
        .eq('id', userId)
        .maybeSingle()

      console.log('[complete-signup] Step 3 - Verification read-back:', JSON.stringify({ verifyProfile, verifyError }))

      if (verifyProfile?.credits !== credits) {
        console.error('[complete-signup] Step 3 WARNING - Credits mismatch! Expected:', credits, 'Got:', verifyProfile?.credits)
      } else {
        console.log('[complete-signup] Step 3 OK - Credits confirmed:', verifyProfile?.credits)
      }

      profileUpdated = true
      break
    }

    // If trigger never fired, create the profile manually
    if (!profileUpdated) {
      console.log('[complete-signup] Step 3 - Trigger did not create profile, inserting manually')
      const insertPayload = {
        id: userId,
        full_name: `${firstName} ${lastName}`,
        phone: phone || null,
        subscription_tier: isFreeTrial ? null : plan,
        credits
      }
      console.log('[complete-signup] Step 3 - Manual insert payload:', JSON.stringify(insertPayload))

      const { data: insertedProfile, error: insertError } = await admin
        .from('parent_profiles')
        .insert(insertPayload)
        .select('id, credits, subscription_tier')

      if (insertError) {
        console.error('[complete-signup] Step 3 FAILED - Manual profile insert error:', JSON.stringify(insertError))
      } else {
        console.log('[complete-signup] Step 3 OK - Profile created manually:', JSON.stringify(insertedProfile))
        profileUpdated = true
      }
    }

    // 4. Create parent_subscriptions record and link Stripe subscription (paid plans only)
    if (!isFreeTrial && plan) {
      console.log('[complete-signup] Step 4: Creating subscription record and linking Stripe...')
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      // Try to find the Stripe customer and subscription by email
      let stripeCustomerId: string | null = null
      let stripeSubscriptionId: string | null = null
      let stripePriceId: string | null = null
      let stripePeriodStart: string | null = null
      let stripePeriodEnd: string | null = null

      try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (stripeSecretKey) {
          const { default: Stripe } = await import('https://esm.sh/stripe@14.25.0?target=denonext')
          const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

          // Find customer by email
          const customers = await stripe.customers.list({ email, limit: 1 })
          if (customers.data.length > 0) {
            const customer = customers.data[0]
            stripeCustomerId = customer.id
            console.log('[complete-signup] Step 4 - Found Stripe customer:', stripeCustomerId)

            // Find their active subscription
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: 'active',
              limit: 1
            })

            if (subscriptions.data.length > 0) {
              const sub = subscriptions.data[0]
              stripeSubscriptionId = sub.id
              stripePriceId = sub.items.data[0]?.price?.id ?? null
              stripePeriodStart = new Date(sub.current_period_start * 1000).toISOString()
              stripePeriodEnd = new Date(sub.current_period_end * 1000).toISOString()
              console.log('[complete-signup] Step 4 - Found Stripe subscription:', stripeSubscriptionId)

              // Update subscription metadata with the new user ID
              await stripe.subscriptions.update(sub.id, {
                metadata: { parent_id: userId, tier: plan }
              })
              // Also update customer metadata
              await stripe.customers.update(customer.id, {
                metadata: { parent_id: userId }
              })
            } else {
              console.log('[complete-signup] Step 4 - No active subscription found for customer')
            }
          } else {
            console.log('[complete-signup] Step 4 - No Stripe customer found for email:', email)
          }
        }
      } catch (stripeErr) {
        console.error('[complete-signup] Step 4 - Stripe lookup error (non-fatal):', stripeErr)
      }

      const subPayload: Record<string, unknown> = {
        parent_id: userId,
        tier: plan,
        status: 'active',
        current_period_start: stripePeriodStart ? stripePeriodStart.slice(0, 10) : now.toISOString().split('T')[0],
        current_period_end: stripePeriodEnd ? stripePeriodEnd.slice(0, 10) : periodEnd.toISOString().split('T')[0],
        cancel_at_period_end: false,
      }
      if (stripeCustomerId) subPayload.stripe_customer_id = stripeCustomerId
      if (stripeSubscriptionId) subPayload.stripe_subscription_id = stripeSubscriptionId
      if (stripePriceId) subPayload.stripe_price_id = stripePriceId
      if (stripePeriodStart) subPayload.stripe_current_period_start = stripePeriodStart
      if (stripePeriodEnd) subPayload.stripe_current_period_end = stripePeriodEnd

      console.log('[complete-signup] Step 4 - Subscription payload:', JSON.stringify(subPayload))

      const { data: subData, error: subError } = await admin
        .from('parent_subscriptions')
        .upsert(subPayload, { onConflict: 'parent_id' })
        .select('*')

      if (subError) {
        console.error('[complete-signup] Step 4 FAILED - Subscription record error:', JSON.stringify(subError))
      } else {
        console.log('[complete-signup] Step 4 OK - Subscription record created:', JSON.stringify(subData))
      }
    } else {
      console.log('[complete-signup] Step 4: Skipped (free trial or no plan)')
    }

    // 5. Send confirmation email
    // Use a regular (anon) Supabase client to call auth.resend - same method as the working resend button
    console.log('[complete-signup] Step 5: Sending confirmation email via auth.resend...')
    try {
      const anonClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { error: resendError } = await anonClient.auth.resend({
        type: 'signup',
        email
      })

      if (resendError) {
        console.error('[complete-signup] Step 5 FAILED - auth.resend error:', JSON.stringify(resendError))
      } else {
        console.log('[complete-signup] Step 5 OK - Confirmation email sent to:', email)
      }
    } catch (emailErr) {
      console.error('[complete-signup] Step 5 ERROR - Email sending exception:', emailErr)
    }

    const result = {
      success: true,
      userId,
      credits,
      plan: effectivePlan,
      profileUpdated
    }
    console.log('[complete-signup] DONE - Returning:', JSON.stringify(result))
    return jsonResponse(result)

  } catch (error) {
    console.error('[complete-signup] FATAL ERROR:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})
