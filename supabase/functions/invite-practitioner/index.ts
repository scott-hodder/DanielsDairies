// Admin-only management of practitioner account invites.
//
// Actions (POST JSON):
//   { action: 'create', email }   — create (or refresh) an invite and email the
//                                   signup link to the practitioner
//   { action: 'list' }            — recent invites for the admin panel
//   { action: 'revoke', inviteId }— revoke a pending invite
//
// The invite email is sent by Supabase AUTH's own mailer via
// auth.admin.inviteUserByEmail — the same system that delivers signup
// confirmation emails, so no extra email provider is needed. The invite link
// lands on practitioner-signup.html?token=... with a session; the token (also
// carried in user metadata as a fallback) is what grants is_practitioner via
// redeem_practitioner_account_invite. For emails that already have an
// account, Auth can't send an invite — the admin shares the link instead and
// practitioner access activates at their next login.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAdmin } from '../_shared/auth.ts'
import { withCors } from '../_shared/cors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const LINK_ORIGINS = new Set([
  'https://app.danielsdiaries.com.au',
  'https://dev.danielsdiaries.com.au'
])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function generateToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

function signupLink(req: Request, token: string) {
  const origin = req.headers.get('origin') ?? ''
  const base = LINK_ORIGINS.has(origin)
    ? origin
    : (Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au')
  return `${base}/practitioner-signup.html?token=${token}`
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth
  const { admin } = auth

  try {
    const body = await req.json()
    const action = String(body?.action || '')

    if (action === 'list') {
      const { data, error } = await admin
        .from('practitioner_account_invites')
        .select('id, email, status, expires_at, accepted_at, created_at, token')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const invites = (data || []).map(inv => ({
        ...inv,
        link: inv.status === 'pending' ? signupLink(req, inv.token) : null,
        token: undefined
      }))
      return json({ invites })
    }

    if (action === 'create') {
      const email = String(body?.email || '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: 'A valid email address is required' }, 400)
      }

      // Reuse a live pending invite for the same email instead of stacking
      // duplicates; refresh its expiry so the re-sent link stays valid.
      const { data: existing } = await admin
        .from('practitioner_account_invites')
        .select('id, token, status, expires_at')
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      let token = existing?.token
      if (existing) {
        await admin
          .from('practitioner_account_invites')
          .update({ expires_at: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString() })
          .eq('id', existing.id)
      } else {
        token = generateToken()
        const { error: insertError } = await admin
          .from('practitioner_account_invites')
          .insert({ email, token, invited_by: auth.user.id })
        if (insertError) throw insertError
      }

      const link = signupLink(req, token!)

      // Send through Supabase Auth's mailer (the same channel as signup
      // confirmations). This also pre-creates the auth user; the token in
      // user metadata survives even if the redirect strips query params.
      let emailSent = false
      let alreadyRegistered = false
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: link,
        data: { prac_invite_token: token, practitioner_invite: true }
      })
      if (!inviteError) {
        emailSent = true
      } else if (/already|registered|exists/i.test(inviteError.message || '')) {
        // Existing account: Auth won't re-invite. The admin shares the link;
        // redemption happens at the user's next login.
        alreadyRegistered = true
      } else {
        console.error('[invite-practitioner] inviteUserByEmail failed:', inviteError)
      }

      return json({ success: true, email, link, emailSent, alreadyRegistered, reused: !!existing })
    }

    if (action === 'revoke') {
      const inviteId = String(body?.inviteId || '')
      if (!inviteId) return json({ error: 'inviteId is required' }, 400)
      const { error } = await admin
        .from('practitioner_account_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId)
        .eq('status', 'pending')
      if (error) throw error
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error('[invite-practitioner] error:', error)
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
}))
