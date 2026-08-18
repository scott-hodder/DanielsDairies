// Public, token-gated practitioner signup.
//
// Actions (POST JSON):
//   { action: 'validate', token }                       — is this invite usable?
//   { action: 'complete', token, password, fullName }   — create the account
//
// The invite token (created by an admin via invite-practitioner) is the ONLY
// thing that can grant is_practitioner here — the flag is set server-side with
// the service role, never from the browser. If the email already has an
// account we return alreadyRegistered and the client falls back to logging in
// and redeeming via the redeem_practitioner_account_invite RPC.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from '../_shared/cors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Missing server configuration' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const action = String(body?.action || '')
    const token = String(body?.token || '')
    if (!token) return json({ error: 'Missing invite token' }, 400)

    const { data: invite } = await admin
      .from('practitioner_account_invites')
      .select('id, email, status, expires_at')
      .eq('token', token)
      .maybeSingle()

    const usable = invite
      && invite.status === 'pending'
      && new Date(invite.expires_at).getTime() > Date.now()

    if (action === 'validate') {
      if (!usable) return json({ valid: false })
      return json({ valid: true, email: invite.email })
    }

    if (action === 'complete') {
      if (!usable) return json({ error: 'This invite link is no longer valid. Ask your Daniel\'s Diaries contact to send a new one.' }, 400)

      const password = String(body?.password || '')
      const fullName = String(body?.fullName || '').trim().slice(0, 120)
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
      if (!fullName) return json({ error: 'Please enter your name' }, 400)

      // Create the account already-confirmed — the invite token IS the proof
      // of email ownership, so no confirmation round-trip is needed and the
      // page can sign the practitioner in immediately afterwards.
      //
      // The auth user may already exist UNCONFIRMED when the invite email was
      // sent (inviteUserByEmail pre-creates it); in that case set the
      // password on that user instead of creating a new one.
      let userId: string | null = null
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, practitioner_invite: true, prac_invite_token: token }
      })

      if (!createError) {
        userId = created.user?.id ?? null
      } else if (/already|registered|exists/i.test(createError.message || '')) {
        // Locate the existing user. (Pagination note: fine while the user
        // base fits one page; revisit past ~1000 accounts.)
        const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existing = page?.users?.find((u: { email?: string }) =>
          (u.email || '').toLowerCase() === invite.email.toLowerCase())

        if (existing && !existing.email_confirmed_at) {
          // Pre-created by the invite email, never completed: claim it.
          const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            user_metadata: { ...(existing.user_metadata || {}), full_name: fullName, prac_invite_token: token }
          })
          if (updateError) return json({ error: updateError.message }, 500)
          userId = existing.id
        } else {
          // A real, confirmed account: they log in instead (the invite token
          // is redeemed at login via metadata/localStorage).
          return json({ alreadyRegistered: true, email: invite.email })
        }
      } else {
        return json({ error: createError.message || 'Failed to create account' }, 400)
      }

      if (!userId) return json({ error: 'Account creation failed' }, 500)

      // The parent_profiles row is created by a DB trigger shortly after
      // signUp; wait for it, then grant practitioner access server-side.
      let flagged = false
      for (let attempt = 1; attempt <= 8; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 400 * attempt))
        const { data: profile } = await admin
          .from('parent_profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()
        if (!profile) continue

        const { error: updateError } = await admin
          .from('parent_profiles')
          .update({ full_name: fullName, is_practitioner: true })
          .eq('id', userId)
        if (!updateError) { flagged = true; break }
      }
      if (!flagged) {
        const { error: insertError } = await admin
          .from('parent_profiles')
          .insert({ id: userId, full_name: fullName, is_practitioner: true })
        if (insertError) console.error('[practitioner-signup] profile provisioning failed:', insertError)
        else flagged = true
      }

      // Demo child so the practitioner can tour the adventure map without a
      // real child profile.
      const { data: existingChildren } = await admin
        .from('children')
        .select('id')
        .eq('parent_user_id', userId)
        .limit(1)
      if (!existingChildren?.length) {
        const { error: childError } = await admin
          .from('children')
          .insert({ parent_user_id: userId, name: 'Demo Explorer', stars: 0, spendable_stars: 0 })
        if (childError) console.error('[practitioner-signup] demo child failed:', childError)
      }

      await admin
        .from('practitioner_account_invites')
        .update({ status: 'accepted', accepted_user_id: userId, accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      return json({ success: true, email: invite.email, practitionerFlagged: flagged, canSignIn: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error('[practitioner-signup] error:', error)
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
}))
