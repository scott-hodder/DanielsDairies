// Day-3 onboarding nudge — one email, once, to families who signed up
// ~3 days ago and haven't started yet.
//
// Two variants:
//   no-child   — the parent never added a child profile
//   no-module  — a child exists but no adventure has been started
// Families already engaged are marked (day3_nudge_sent_at) without email.
//
// Trigger: pg_cron daily at 22:00 UTC (8am Brisbane) via setup_reminder_crons.
// Auth: x-cron-secret must match CRON_SECRET (same convention as the
// weekly summary). Optional body: { only_user_id } for a manual test.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email.ts'

function firstNameOnly(name: string | null | undefined): string {
  const n = String(name || '').trim().split(/\s+/)[0]
  return n || 'there'
}

function buildHtml(variant: 'no-child' | 'no-module', firstName: string, childName: string, appUrl: string): { subject: string; html: string } {
  const safeName = firstName.replace(/[<>&]/g, '')
  const safeChild = (childName || 'your child').replace(/[<>&]/g, '')
  const btn = (label: string) =>
    `<p style="margin:26px 0;"><a href="${appUrl}/login.html" style="background:#2A8F8F;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a></p>`
  const footer = `
    <p style="font-size:13px;color:#8a97ab;margin-top:32px;border-top:1px solid #e5e9f0;padding-top:14px;">
      This is a one-time reminder about your new Daniel's Diaries account.
      Questions? Just reply — a real person reads every message.
    </p>`

  if (variant === 'no-child') {
    return {
      subject: "Two minutes to finish setting up — Daniel's waiting 🐕",
      html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b3a55;">
        <h2 style="color:#2A8F8F;">Hi ${safeName},</h2>
        <p style="font-size:15px;line-height:1.6;">You created your Daniel's Diaries account a few days ago — the only step left is adding your child's explorer profile. It takes about two minutes: pick a name, choose an avatar together, and Daniel takes it from there.</p>
        ${btn('Add your child')}
        <p style="font-size:14px;line-height:1.6;color:#4c6c96;">A tip from families who get the most out of it: do the setup <em>with</em> your child. Choosing their own avatar is the first small moment of ownership, and it makes the first adventure feel like theirs.</p>
        ${footer}
      </div>`
    }
  }
  return {
    subject: `${safeChild}'s first adventure is ready in Brain Town 🐕`,
    html: `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#2b3a55;">
      <h2 style="color:#2A8F8F;">Hi ${safeName},</h2>
      <p style="font-size:15px;line-height:1.6;">${safeChild}'s profile is set up — the first adventure in Brain Town is waiting, and it takes about ten minutes. Daniel will meet ${safeChild} at Brain Builder and show them around.</p>
      ${btn('Start the first adventure')}
      <p style="font-size:14px;line-height:1.6;color:#4c6c96;">Little and often beats long and rare: a regular ten-minute visit is exactly what the daily quests and streaks are built around. Tonight after dinner is a great first slot.</p>
      ${footer}
    </div>`
  }
}

serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  let body: { only_user_id?: string } = {}
  try { body = await req.json() } catch { /* default */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const appUrl = Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au'

  // Signed up 3-5 days ago, never nudged. The 2-day window plus the
  // sent-marker means a missed cron day self-heals the next morning.
  const now = Date.now()
  const from = new Date(now - 5 * 86400_000).toISOString()
  const to = new Date(now - 3 * 86400_000).toISOString()

  let q = supabase.from('parent_profiles')
    .select('id, email, full_name, is_admin, is_practitioner, created_at')
    .is('day3_nudge_sent_at', null)
    .gte('created_at', from)
    .lte('created_at', to)
    .limit(200)
  if (body.only_user_id) {
    q = supabase.from('parent_profiles')
      .select('id, email, full_name, is_admin, is_practitioner, created_at')
      .eq('id', body.only_user_id)
  }
  const { data: parents, error } = await q
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results: Array<{ id: string; action: string; reason?: string }> = []

  for (const p of parents || []) {
    try {
      if (p.is_admin || p.is_practitioner || !p.email) {
        await supabase.from('parent_profiles').update({ day3_nudge_sent_at: new Date().toISOString() }).eq('id', p.id)
        results.push({ id: p.id, action: 'skipped', reason: 'not-a-family-or-no-email' })
        continue
      }

      const { data: children } = await supabase.from('children')
        .select('id, name').eq('parent_user_id', p.id).limit(5)

      let variant: 'no-child' | 'no-module' | null = null
      let childName = ''

      if (!children || children.length === 0) {
        variant = 'no-child'
      } else {
        const ids = children.map((c) => c.id)
        const { count } = await supabase.from('child_modules')
          .select('module_id', { count: 'exact', head: true })
          .in('child_id', ids)
        if ((count ?? 0) === 0) {
          variant = 'no-module'
          childName = children[0].name || ''
        }
      }

      if (!variant) {
        // Already engaged — mark so we never scan them again.
        await supabase.from('parent_profiles').update({ day3_nudge_sent_at: new Date().toISOString() }).eq('id', p.id)
        results.push({ id: p.id, action: 'skipped', reason: 'already-engaged' })
        continue
      }

      const { subject, html } = buildHtml(variant, firstNameOnly(p.full_name), childName, appUrl)
      const sent = await sendEmail({ to: p.email, subject, html })
      if (sent.sent) {
        await supabase.from('parent_profiles').update({ day3_nudge_sent_at: new Date().toISOString() }).eq('id', p.id)
        results.push({ id: p.id, action: 'sent', reason: variant })
      } else {
        // Leave unmarked so tomorrow retries (e.g. mailer briefly down).
        results.push({ id: p.id, action: 'failed', reason: sent.reason })
      }
    } catch (err) {
      results.push({ id: p.id, action: 'failed', reason: String(err).slice(0, 120) })
    }
  }

  return new Response(JSON.stringify({ scanned: (parents || []).length, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
