// start-paid-signup
//
// Secure replacement for the old client-side paid signup flow.
//
// Old flow (unsafe): the browser kept the signup form (including the plaintext
// password) in localStorage across the Stripe redirect and created the account
// client-side after payment. If localStorage was cleared or the user returned
// in a different browser, payment was taken with no account created.
//
// New flow:
//   1. This function creates the auth user + profile + inactive subscription
//      BEFORE any payment, entirely server-side. The password is used once and
//      never persisted anywhere client-side.
//   2. It creates a Stripe customer + checkout session carrying the new
//      user id (client_reference_id + metadata.parent_id).
//   3. The stripe-webhook activates the subscription and grants credits when
//      payment succeeds — idempotently.
//   4. A single-purpose resume token is returned so a cancelled checkout can
//      be retried without re-sending credentials. The token can only be used
//      to create a new checkout session for the same pending account.
//
// If the user abandons checkout entirely, the account remains with 0 credits
// and an inactive subscription — they can log in later and upgrade from their
// profile, so no payment can ever be taken without a working account.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'
import { createHash } from 'node:crypto'

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

// Non-blocking Mailchimp opt-in (same behaviour as complete-signup).
async function addToMailchimp(email: string, firstName: string, lastName: string) {
  try {
    const apiKey = Deno.env.get('MAILCHIMP_API_KEY')
    const listId = Deno.env.get('MAILCHIMP_LIST_ID')
    const tagName = Deno.env.get('MAILCHIMP_TAG') || "Daniel's Diaries New Member"
    if (!apiKey || !listId) return
    const dc = apiKey.split('-')[1]
    if (!dc) return
    const base = `https://${dc}.api.mailchimp.com/3.0`
    const authHeader = `Basic ${btoa(`anystring:${apiKey}`)}`
    const subscriberHash = createHash('md5').update(email.toLowerCase()).digest('hex')

    await fetch(`${base}/lists/${listId}/members/${subscriberHash}`, {
      method: 'PUT',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        merge_fields: { FNAME: firstName || '', LNAME: lastName || '' }
      })
    })
    await fetch(`${base}/lists/${listId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [{ name: tagName, status: 'active' }] })
    })
  } catch (err) {
    console.error('[mailchimp] non-fatal error:', err)
  }
}

serve(async (req) => {
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    const body = await req.json()
    const successUrl = body?.successUrl || `${appUrl}/signup.html?payment=success`
    const cancelUrl = body?.cancelUrl || `${appUrl}/signup.html?payment=cancelled`

    // ── Resume path: retry checkout for an existing pending signup ──
    if (body?.resumeToken) {
      const { data: pending } = await admin
        .from('pending_signups')
        .select('parent_id, email, plan, status, stripe_customer_id')
        .eq('resume_token', body.resumeToken)
        .maybeSingle()

      if (!pending || pending.status !== 'awaiting_payment') {
        return jsonResponse({ error: 'This signup can no longer be resumed. Please log in to complete your subscription from your profile.', code: 'resume_invalid' }, 410)
      }

      const session = await createSignupCheckoutSession(stripe, admin, {
        parentId: pending.parent_id,
        email: pending.email,
        plan: pending.plan,
        stripeCustomerId: pending.stripe_customer_id,
        successUrl,
        cancelUrl
      })
      return jsonResponse({ url: session.url, sessionId: session.id })
    }

    // ── New signup path ──
    const { email, password, firstName, lastName, phone, plan, mailchimpOptIn } = body

    if (!email || !password || !firstName || !plan) {
      return jsonResponse({ error: 'Missing required fields: email, password, firstName, plan' }, 400)
    }
    if (typeof password !== 'string' || password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)
    }

    const tierCode = String(plan).trim().toLowerCase()
    const { data: tier } = await admin
      .from('subscription_tiers')
      .select('tier, display_name, monthly_price_cents, modules_per_month, is_active')
      .eq('tier', tierCode)
      .maybeSingle()

    if (!tier || tier.is_active === false) {
      return jsonResponse({ error: 'Selected plan is not available' }, 400)
    }

    // 1. Create the auth user (anon signUp so the confirmation email is sent
    //    through the configured SMTP flow, same as free trial signups).
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName || '',
          full_name: `${firstName} ${lastName || ''}`.trim(),
          phone: phone || '',
          plan: tierCode,
          is_free_trial: false
        },
        emailRedirectTo: `${appUrl}/login.html?confirmed=true`
      }
    })

    if (signUpError) {
      if (signUpError.message?.includes('already been registered') || signUpError.message?.includes('already exists')) {
        // If this email has a pending (never paid) signup, let the client
        // offer a resume instead of a dead end.
        const { data: pendingForEmail } = await admin
          .from('pending_signups')
          .select('status')
          .eq('email', email)
          .eq('status', 'awaiting_payment')
          .maybeSingle()
        if (pendingForEmail) {
          return jsonResponse({
            error: 'You already started signing up with this email but payment was not completed. Please log in to finish upgrading from your profile, or contact support.',
            code: 'pending_exists'
          }, 409)
        }
        return jsonResponse({ error: 'An account with this email already exists. Please log in instead.', code: 'account_exists' }, 409)
      }
      return jsonResponse({ error: signUpError.message || 'Failed to create account' }, 400)
    }

    const userId = signUpData.user?.id
    if (!userId) {
      return jsonResponse({ error: 'Account creation failed - no user ID returned' }, 500)
    }

    // 2. Ensure the parent profile exists (trigger normally creates it) with
    //    0 credits and no active tier — activation happens via webhook.
    let profileReady = false
    for (let attempt = 1; attempt <= 5 && !profileReady; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
      const { data: profile } = await admin
        .from('parent_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      if (!profile) continue
      const { error: updateError } = await admin
        .from('parent_profiles')
        .update({
          full_name: `${firstName} ${lastName || ''}`.trim(),
          phone: phone || null,
          subscription_tier: null,
          credits: 0
        })
        .eq('id', userId)
      profileReady = !updateError
    }
    if (!profileReady) {
      const { error: insertError } = await admin.from('parent_profiles').insert({
        id: userId,
        full_name: `${firstName} ${lastName || ''}`.trim(),
        phone: phone || null,
        subscription_tier: null,
        credits: 0
      })
      if (insertError) console.error('[start-paid-signup] profile insert failed:', insertError)
    }

    // 3. Stripe customer carrying the parent id.
    const customer = await stripe.customers.create({
      email,
      metadata: { parent_id: userId, signup_plan: tierCode }
    })

    // 4. Inactive subscription record so the webhook can find this parent by
    //    customer id even before checkout completes.
    const { error: subError } = await admin.from('parent_subscriptions').upsert(
      {
        parent_id: userId,
        tier: tierCode,
        status: 'inactive',
        stripe_customer_id: customer.id,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'parent_id' }
    )
    if (subError) console.error('[start-paid-signup] subscription upsert failed:', subError)

    // 5. Pending signup record with resume token.
    const { data: pendingRow, error: pendingError } = await admin
      .from('pending_signups')
      .upsert(
        {
          parent_id: userId,
          email,
          plan: tierCode,
          status: 'awaiting_payment',
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'parent_id' }
      )
      .select('resume_token')
      .maybeSingle()
    if (pendingError) console.error('[start-paid-signup] pending signup insert failed:', pendingError)

    // 6. Marketing opt-in (explicit consent captured on the form).
    if (mailchimpOptIn) await addToMailchimp(email, firstName, lastName || '')

    // 7. Checkout session.
    const session = await createSignupCheckoutSession(stripe, admin, {
      parentId: userId,
      email,
      plan: tierCode,
      stripeCustomerId: customer.id,
      successUrl,
      cancelUrl
    })

    return jsonResponse({
      url: session.url,
      sessionId: session.id,
      resumeToken: pendingRow?.resume_token ?? null
    })
  } catch (error) {
    console.error('[start-paid-signup] error:', error)
    return jsonResponse({ error: 'Something went wrong starting your signup. Please try again.' }, 500)
  }
})

async function createSignupCheckoutSession(
  stripe: Stripe,
  admin: ReturnType<typeof createClient>,
  params: {
    parentId: string
    email: string
    plan: string
    stripeCustomerId?: string | null
    successUrl: string
    cancelUrl: string
  }
) {
  const { data: tier } = await admin
    .from('subscription_tiers')
    .select('display_name, monthly_price_cents, modules_per_month')
    .eq('tier', params.plan)
    .maybeSingle()

  const monthlyPriceCents =
    typeof tier?.monthly_price_cents === 'number' && tier.monthly_price_cents > 0
      ? tier.monthly_price_cents
      : 1900

  let customerId = params.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: params.email,
      metadata: { parent_id: params.parentId, signup_plan: params.plan }
    })
    customerId = customer.id
  }

  return await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: params.parentId,
    line_items: [
      {
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Daniel's Diaries - ${tier?.display_name || params.plan}`,
            description: `${tier?.modules_per_month ?? '?'} guided modules per month`
          },
          unit_amount: monthlyPriceCents,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        payment_type: 'signup',
        parent_id: params.parentId,
        tier: params.plan
      }
    },
    metadata: {
      payment_type: 'signup',
      parent_id: params.parentId,
      plan: params.plan
    }
  })
}
