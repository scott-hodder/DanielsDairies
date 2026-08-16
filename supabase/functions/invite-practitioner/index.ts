// Admin-only management of practitioner account invites.
//
// Actions (POST JSON):
//   { action: 'create', email }   — create (or refresh) an invite and email the
//                                   signup link to the practitioner
//   { action: 'list' }            — recent invites for the admin panel
//   { action: 'revoke', inviteId }— revoke a pending invite
//
// The signup link points at practitioner-signup.html?token=..., served from the
// requesting origin when it is on the CORS allowlist (so dev invites stay on
// the dev site), falling back to APP_URL.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAdmin } from '../_shared/auth.ts'
import { withCors } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/email.ts'

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
      const htmlBody = `
        <h2 style="color:#2b3a55; font-family:sans-serif;">You're invited to the Daniel's Diaries Practitioner Hub</h2>
        <p style="font-family:sans-serif; color:#334155;">Daniel's Diaries gives you a professional workspace for the children you support — engagement data, goals with automatic module tracking, session notes and printable support plans — plus full access to the program content itself.</p>
        <p style="font-family:sans-serif;">
          <a href="${link}" style="display:inline-block; background:#14b8a6; color:#ffffff; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600;">Create your practitioner account</a>
        </p>
        <p style="font-family:sans-serif; color:#64748b; font-size:13px;">This link is personal to you and expires in 14 days. If the button doesn't work, copy this address into your browser:<br>${link}</p>
        <p style="color:#94a3b8; font-size:12px; font-family:sans-serif;">Sent by the Daniel's Diaries team. Questions? Reply to info@danielsdiaries.com</p>
      `

      const mailResult = await sendEmail({
        to: email,
        subject: "Your Daniel's Diaries Practitioner Hub invitation",
        html: htmlBody
      })
      if (!mailResult.sent) {
        console.error('[invite-practitioner] email send failed:', mailResult.reason)
      }

      return json({ success: true, email, link, emailSent: mailResult.sent, reused: !!existing })
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
