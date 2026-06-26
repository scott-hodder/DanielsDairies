import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

// ── Mailchimp ──────────────────────────────────────────────
// Non-blocking: logs errors but never throws so signup still succeeds.
async function addToMailchimp(email: string, firstName: string, lastName: string) {
  try {
    const apiKey = Deno.env.get('MAILCHIMP_API_KEY')
    const listId = Deno.env.get('MAILCHIMP_LIST_ID')
    const tagName = Deno.env.get('MAILCHIMP_TAG') || "Daniel's Diaries New Member"
    if (!apiKey || !listId) {
      console.log('[mailchimp] Skipped — MAILCHIMP_API_KEY or MAILCHIMP_LIST_ID not set')
      return
    }
    // Datacenter is the suffix after the dash in the API key, e.g. "abc-us8" → "us8"
    const dc = apiKey.split('-')[1]
    if (!dc) {
      console.error('[mailchimp] Invalid API key format (no datacenter suffix)')
      return
    }
    const base = `https://${dc}.api.mailchimp.com/3.0`
    const authHeader = `Basic ${btoa(`anystring:${apiKey}`)}`
    const subscriberHash = createHash('md5').update(email.toLowerCase()).digest('hex')
    const displayName = `${firstName} ${lastName}`.trim()

    // PUT upserts the member (status_if_new=subscribed = single opt-in on new records)
    const memberRes = await fetch(`${base}/lists/${listId}/members/${subscriberHash}`, {
      method: 'PUT',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        merge_fields: {
          FNAME: firstName || '',
          LNAME: lastName || '',
          NAME: displayName,
        },
      }),
    })
    if (!memberRes.ok) {
      const errBody = await memberRes.text().catch(() => '')
      console.error(`[mailchimp] member upsert failed ${memberRes.status}:`, errBody.slice(0, 500))
      return
    }
    console.log('[mailchimp] Member upserted:', email)

    // Add the tag
    const tagRes = await fetch(`${base}/lists/${listId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [{ name: tagName, status: 'active' }] }),
    })
    if (!tagRes.ok) {
      const errBody = await tagRes.text().catch(() => '')
      console.error(`[mailchimp] tag add failed ${tagRes.status}:`, errBody.slice(0, 500))
      return
    }
    console.log(`[mailchimp] Tagged "${tagName}" on:`, email)
  } catch (err) {
    console.error('[mailchimp] unexpected error:', err)
  }
}

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing server configuration' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { email, password, firstName, lastName, phone, plan, isFreeTrial, mailchimpOptIn } = body
    console.log('[complete-signup] Request body:', JSON.stringify({ email, firstName, lastName, phone, plan, isFreeTrial, hasPassword: !!password }))

    if (!email || !password || !firstName) {
      return jsonResponse({ error: 'Missing required fields: email, password, firstName' }, 400)
    }

    const effectivePlan = isFreeTrial ? 'free_trial' : plan
    if (!effectivePlan) {
      return jsonResponse({ error: 'Missing required field: plan' }, 400)
    }

    // 1. Create the auth user via regular signUp (triggers confirmation email via SMTP)
    console.log('[complete-signup] Step 1: Creating auth user via signUp...')
    const appUrl = Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au'
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          phone: phone || '',
          plan: effectivePlan,
          is_free_trial: !!isFreeTrial
        },
        emailRedirectTo: `${appUrl}/login.html?confirmed=true`
      }
    })

    if (signUpError) {
      console.error('[complete-signup] Step 1 FAILED - SignUp error:', JSON.stringify(signUpError))
      if (signUpError.message?.includes('already been registered') || signUpError.message?.includes('already exists')) {
        return jsonResponse({ error: 'An account with this email already exists. Please log in instead.' }, 409)
      }
      return jsonResponse({ error: signUpError.message || 'Failed to create account' }, 400)
    }

    const userId = signUpData.user?.id
    if (!userId) {
      console.error('[complete-signup] Step 1 FAILED - No user ID returned')
      return jsonResponse({ error: 'Account creation failed - no user ID returned' }, 500)
    }
    console.log('[complete-signup] Step 1 OK - User created:', userId, '(confirmation email sent)')

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

    // 5. Confirmation email already sent by auth.signUp in Step 1
    console.log('[complete-signup] Step 5: Skipped (confirmation email sent in Step 1)')

    // 6. Add to Mailchimp audience (only if user opted in)
    if (mailchimpOptIn) {
      console.log('[complete-signup] Step 6: Adding to Mailchimp (user opted in)...')
      await addToMailchimp(email, firstName, lastName || '')
    } else {
      console.log('[complete-signup] Step 6: Skipped Mailchimp (user did not opt in)')
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
