// send-weekly-summary
//
// Weekly parent progress email — the core retention loop.
//
// Modes:
//   POST + x-cron-secret header (or service-role bearer): batch-send to every
//        opted-in parent who has at least one child. Optional body
//        { parentId } limits the run to one family (useful for testing).
//   GET  ?action=unsubscribe&token=<weekly_email_token>: one-click, no-login
//        unsubscribe. Returns a small confirmation page.
//
// Email variants per family, based on the last 7 days:
//   summary       — there was activity: modules, skills, check-ins, stars/XP,
//                   games, plus a suggested next step.
//   nudge         — account is new / little data yet: gentle "here's how to start".
//   re-engagement — children exist but no activity this week: supportive, not guilt.
//
// Double-send protection: one row per (parent, ISO week) in weekly_email_log.
//
// Scheduling: run once a week (e.g. Sunday 6pm) via pg_cron + pg_net or any
// external scheduler hitting this endpoint with the x-cron-secret header.
// See supabase/cron_weekly_summary.sql.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Shared with the Node test suite (tests/weeklySummary.test.mjs).
import { isoWeekKey } from '../_shared/weekKey.mjs'
import { sendEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret'
}

function esc(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const appUrl = Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au'

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Missing server configuration', { status: 500, headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // ── One-click unsubscribe (GET, no login) ──
  if (req.method === 'GET') {
    const url = new URL(req.url)
    if (url.searchParams.get('action') === 'unsubscribe') {
      const token = url.searchParams.get('token') || ''
      let message = 'This unsubscribe link is invalid or has expired.'
      if (token) {
        const { data: profile } = await admin
          .from('parent_profiles')
          .select('id')
          .eq('weekly_email_token', token)
          .maybeSingle()
        if (profile) {
          await admin.from('parent_profiles').update({ weekly_email_opt_out: true }).eq('id', profile.id)
          message = "You've been unsubscribed from weekly progress emails. You can turn them back on any time from your profile."
        }
      }
      return new Response(
        `<!doctype html><html><head><meta charset="utf-8"><title>Daniel's Diaries</title></head>
         <body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#2b3a55;">
           <h2>Daniel's Diaries</h2><p>${esc(message)}</p>
           <p><a href="${esc(appUrl)}" style="color:#2A8F8F;">Back to Daniel's Diaries</a></p>
         </body></html>`,
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }
    return new Response('Not found', { status: 404, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  // ── Authorisation: cron secret or service-role key ──
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  const providedSecret = req.headers.get('x-cron-secret') ?? ''
  const authHeader = req.headers.get('Authorization') ?? ''
  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`
  const isCron = cronSecret !== '' && providedSecret === cronSecret
  if (!isServiceRole && !isCron) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch (_) { /* empty body is fine */ }
  const onlyParentId = typeof body?.parentId === 'string' ? body.parentId : null

  const weekKey = isoWeekKey()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // ── Find candidate parents: those with at least one child ──
  let childQuery = admin.from('children').select('id, name, parent_user_id')
  if (onlyParentId) childQuery = childQuery.eq('parent_user_id', onlyParentId)
  const { data: allChildren, error: childrenError } = await childQuery
  if (childrenError) {
    return new Response(JSON.stringify({ error: childrenError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const familyMap = new Map<string, { id: string; name: string }[]>()
  for (const child of allChildren || []) {
    if (!child.parent_user_id) continue
    const list = familyMap.get(child.parent_user_id) || []
    list.push({ id: child.id, name: child.name })
    familyMap.set(child.parent_user_id, list)
  }

  const results: Record<string, string> = {}

  for (const [parentId, children] of familyMap) {
    try {
      // Skip opted-out parents and those already emailed this week.
      const { data: profile } = await admin
        .from('parent_profiles')
        .select('id, full_name, weekly_email_opt_out, weekly_email_token')
        .eq('id', parentId)
        .maybeSingle()
      if (!profile || profile.weekly_email_opt_out) {
        results[parentId] = 'skipped:opt-out'
        continue
      }

      const { error: logError } = await admin
        .from('weekly_email_log')
        .insert({ parent_id: parentId, week_key: weekKey, variant: 'pending' })
      if (logError) {
        results[parentId] = logError.code === '23505' ? 'skipped:already-sent' : `skipped:${logError.message}`
        continue
      }

      const { data: userData } = await admin.auth.admin.getUserById(parentId)
      const email = userData?.user?.email
      if (!email) {
        results[parentId] = 'skipped:no-email'
        continue
      }

      const firstName = (profile.full_name || '').trim().split(/\s+/)[0] || 'there'
      const childIds = children.map((c) => c.id)

      // ── Gather the week's activity across the family ──
      const [{ data: completed }, { data: weeklyCheckins }, { data: moodCheckins }] = await Promise.all([
        admin
          .from('child_modules')
          .select('child_id, stars_awarded, xp_awarded, completed_at, modules(title, super_skill_id, super_skills(name))')
          .in('child_id', childIds)
          .eq('is_completed', true)
          .gte('completed_at', since),
        admin.from('weekly_checkins').select('id').eq('parent_user_id', parentId).gte('created_at', since),
        admin.from('child_mood_checkins').select('id').in('child_id', childIds).gte('created_at', since)
      ])

      // Arcade plays table ships with the arcade learning-loop update; tolerate absence.
      let gamesPlayed = 0
      try {
        const { data: plays, error: playsError } = await admin
          .from('arcade_plays')
          .select('id')
          .in('child_id', childIds)
          .gte('created_at', since)
        if (!playsError) gamesPlayed = plays?.length ?? 0
      } catch (_) { /* table not deployed yet */ }

      const modulesCompleted = completed?.length ?? 0
      const starsEarned = (completed || []).reduce((sum, cm) => sum + (cm.stars_awarded || 0), 0)
      const xpEarned = (completed || []).reduce((sum, cm) => sum + (cm.xp_awarded || 0), 0)
      const checkinsDone = (weeklyCheckins?.length ?? 0) + (moodCheckins?.length ?? 0)
      const skillNames = [...new Set(
        (completed || [])
          .map((cm) => (cm as Record<string, any>).modules?.super_skills?.name)
          .filter(Boolean)
      )] as string[]

      // Suggested next step: the first active, incomplete module in the family.
      let nextStep = 'Log in and pick the next module together.'
      const { data: nextModules } = await admin
        .from('child_modules')
        .select('child_id, modules(title)')
        .in('child_id', childIds)
        .eq('is_active', true)
        .eq('is_completed', false)
        .limit(1)
      const nextRow = nextModules?.[0] as Record<string, any> | undefined
      if (nextRow?.modules?.title) {
        const childName = children.find((c) => c.id === nextRow.child_id)?.name
        nextStep = childName
          ? `${childName}'s next module is "${nextRow.modules.title}" — a great one to do together this week.`
          : `The next module waiting is "${nextRow.modules.title}".`
      }

      const hadActivity = modulesCompleted > 0 || checkinsDone > 0 || gamesPlayed > 0
      const childNames = children.map((c) => c.name).join(' & ')
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/send-weekly-summary?action=unsubscribe&token=${profile.weekly_email_token}`

      let variant: string
      let subject: string
      let bodyHtml: string

      if (hadActivity) {
        variant = 'summary'
        subject = `${childNames}'s week with Daniel 🐾`
        const skillLine = skillNames.length
          ? `<li><strong>Super Skills practised:</strong> ${skillNames.map(esc).join(', ')}</li>`
          : ''
        bodyHtml = `
          <p>Here's what happened in ${esc(childNames)}'s world this week:</p>
          <ul style="line-height:1.9;">
            <li><strong>Modules completed:</strong> ${modulesCompleted}</li>
            ${skillLine}
            <li><strong>Check-ins:</strong> ${checkinsDone}</li>
            ${gamesPlayed > 0 ? `<li><strong>Games played:</strong> ${gamesPlayed}</li>` : ''}
            <li><strong>Stars earned:</strong> ${starsEarned} &nbsp;|&nbsp; <strong>XP:</strong> ${xpEarned}</li>
          </ul>
          <p><strong>Suggested next step:</strong> ${esc(nextStep)}</p>`
      } else if ((weeklyCheckins?.length ?? 0) === 0 && modulesCompleted === 0 && checkinsDone === 0) {
        variant = 're-engagement'
        subject = `Daniel's been keeping ${childNames}'s spot warm 🐾`
        bodyHtml = `
          <p>It's been a quiet week in Brain Town — and that's completely okay. Life gets busy.</p>
          <p>When you have ten minutes, a single module or a quick daily quest is enough to keep ${esc(childNames)}'s skills growing. Small steps count.</p>
          <p><strong>An easy way back in:</strong> ${esc(nextStep)}</p>`
      } else {
        variant = 'nudge'
        subject = `Getting started with Daniel's Diaries`
        bodyHtml = `
          <p>You're all set up — the next step is a first module with ${esc(childNames)}.</p>
          <p>Most families start with a Brain Builder module: ten relaxed minutes, together, with Daniel doing the heavy lifting.</p>
          <p><strong>This week:</strong> ${esc(nextStep)}</p>`
      }

      const html = `
        <div style="font-family:sans-serif; max-width:520px; margin:0 auto; padding:24px;">
          <h2 style="color:#2b3a55;">Hi ${esc(firstName)},</h2>
          ${bodyHtml}
          <a href="${esc(appUrl)}/dashboard.html" style="display:inline-block; padding:12px 24px; background:#2A8F8F; color:white; text-decoration:none; border-radius:8px; font-weight:600; margin:16px 0;">Open Daniel's Diaries</a>
          <p style="color:#64748B; font-size:13px; margin-top:32px; border-top:1px solid #E5E7EB; padding-top:16px;">
            Daniel's Diaries — Growing together, one module at a time.<br>
            You're receiving this because you have a Daniel's Diaries family account.
            <a href="${esc(unsubscribeUrl)}" style="color:#64748B;">Unsubscribe from weekly emails</a>
          </p>
        </div>`

      const mailResult = await sendEmail({ to: email, subject, html })

      if (!mailResult.sent) {
        // Free the log slot so a retry run can attempt this parent again.
        await admin.from('weekly_email_log').delete().eq('parent_id', parentId).eq('week_key', weekKey)
        results[parentId] = `error:${mailResult.reason || 'email send failed'}`
        continue
      }

      await admin
        .from('weekly_email_log')
        .update({ variant })
        .eq('parent_id', parentId)
        .eq('week_key', weekKey)
      results[parentId] = `sent:${variant}`
    } catch (err) {
      results[parentId] = `error:${err instanceof Error ? err.message : 'unknown'}`
    }
  }

  const sent = Object.values(results).filter((r) => r.startsWith('sent')).length
  console.log(`[weekly-summary] week ${weekKey}: ${sent}/${familyMap.size} sent`, JSON.stringify(results))

  return new Response(JSON.stringify({ weekKey, sent, total: familyMap.size, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
