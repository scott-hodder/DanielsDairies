// Daily reminders for the town_play layer — web push + iOS APNs.
//
// Modes (triggered by pg_cron — see supabase/cron_reminders.sql):
//   morning  — "X needs your help in Brain Town today!" using the same
//              deterministic character pick as the dashboard's daily event.
//   evening  — streak guard: only families whose child has a streak >= 2
//              and hasn't opened the app today (Brisbane time).
//
// Channels:
//   - Web push (push_subscriptions, VAPID) for browsers / installed PWA.
//   - APNs (device_tokens, platform 'ios') for the installed iOS app.
//     Requires APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY secrets;
//     the APNs pass is skipped (with a log line) when not configured.
//
// Rate limiting: at most one send per MODE per ~20h per endpoint/token,
// tracked in last_sent_modes ({"morning": ts, "evening": ts}). The old
// single last_sent_at meant an evening streak-guard could never fire after
// a morning send; last_sent_at is still written for back-compat.
//
// Auth: requires the x-cron-key header to match CRON_SECRET. No user JWT —
// this function is only ever called by the scheduler (or a manual test).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'
import { createApnsJwt, sendApnsPush } from '../_shared/apns.ts'

// Mirrors the client event pool's character order (townEvents.js). Only the
// character matters here — the copy just names who needs help today.
const EVENT_CHARS = [
  'kip', 'kip', 'kip', 'kip',
  'lenny', 'lenny', 'lenny',
  'coco', 'coco', 'coco',
  'pepper', 'pepper', 'pepper',
  'eddie', 'eddie', 'eddie',
  'kai', 'kai', 'kai',
  'billie', 'billie', 'billie',
  'daniel', 'daniel', 'daniel'
]

const CHAR_META: Record<string, { name: string; emoji: string }> = {
  lenny: { name: 'Lenny the Border Collie', emoji: '🐶' },
  coco: { name: 'Coco the Cockatoo', emoji: '🦜' },
  kip: { name: 'Kip the Koala', emoji: '🐨' },
  pepper: { name: 'Pepper the Possum', emoji: '🐾' },
  eddie: { name: 'Eddie the Echidna', emoji: '🦔' },
  kai: { name: 'Kai the Kookaburra', emoji: '🐦' },
  billie: { name: 'Billie the Bilby', emoji: '🐰' },
  daniel: { name: 'Daniel', emoji: '🐕' }
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function brisbaneToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
}

function todaysChar(childId: string): { name: string; emoji: string } {
  const key = EVENT_CHARS[hashStr(brisbaneToday() + '|' + childId) % EVENT_CHARS.length]
  return CHAR_META[key] || CHAR_META.daniel
}

const RATE_WINDOW_MS = 20 * 3600 * 1000

type ReminderPayload = { title: string; body: string; tag: string; url: string }

serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (!cronSecret || req.headers.get('x-cron-key') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  let body: { mode?: string; only_user_id?: string } = {}
  try { body = await req.json() } catch { /* default */ }
  const mode = body.mode === 'evening' ? 'evening' : 'morning'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const today = brisbaneToday()
  const nowIso = new Date().toISOString()
  const results: Array<{ id: string; channel: string; sent: boolean; reason?: string }> = []

  const rateLimited = (modes: Record<string, string> | null | undefined): boolean => {
    const last = modes?.[mode]
    return !!last && Date.now() - new Date(last).getTime() < RATE_WINDOW_MS
  }

  // Payload for one child in the current mode, or null when nothing should
  // be sent (no child, or the streak guard says the family is safe).
  const payloadFor = async (
    userId: string,
    childId: string | null,
    childName: string
  ): Promise<ReminderPayload | null> => {
    if (!childId) return null
    if (mode === 'morning') {
      const ch = todaysChar(childId)
      return {
        title: 'Brain Town news!',
        body: `${ch.emoji} ${ch.name} needs ${childName}'s help today!`,
        tag: 'dd-morning',
        url: '/dashboard.html'
      }
    }
    const { data: streak } = await supabase.from('login_streaks')
      .select('current_streak, last_login_date')
      .eq('user_id', userId).eq('child_id', childId)
      .maybeSingle()
    if (!streak || streak.current_streak < 2 || streak.last_login_date >= today) return null
    return {
      title: 'Streak check!',
      body: `🔥 ${childName}'s ${streak.current_streak}-day streak just needs five minutes today to stay alive!`,
      tag: 'dd-evening',
      url: '/dashboard.html'
    }
  }

  // ── Channel 1: web push (browsers / installed PWA) ────────────────────────
  try {
    const vapidJson = JSON.parse(Deno.env.get('VAPID_KEYS_JSON') ?? '{}')
    const vapidKeys = await webpush.importVapidKeys(vapidJson.jwk, { extractable: false })
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: 'mailto:info@danielsdiaries.com.au',
      vapidKeys
    })

    let q = supabase.from('push_subscriptions')
      .select('id, user_id, child_id, endpoint, p256dh, auth, last_sent_at, last_sent_modes, children:child_id(id, name)')
    if (body.only_user_id) q = q.eq('user_id', body.only_user_id)
    const { data: subs, error } = await q
    if (error) throw new Error(error.message)

    for (const sub of subs || []) {
      try {
        if (!body.only_user_id && rateLimited(sub.last_sent_modes)) {
          results.push({ id: sub.id, channel: 'webpush', sent: false, reason: 'rate-limited' })
          continue
        }

        const childName = (sub.children as { name?: string } | null)?.name || 'your explorer'
        const payload = await payloadFor(sub.user_id, sub.child_id, childName)
        if (!payload) {
          results.push({ id: sub.id, channel: 'webpush', sent: false, reason: sub.child_id ? 'streak-safe' : 'no-child' })
          continue
        }

        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        })
        await subscriber.pushTextMessage(JSON.stringify(payload), {})
        await supabase.from('push_subscriptions')
          .update({
            last_sent_at: nowIso,
            last_sent_modes: { ...(sub.last_sent_modes || {}), [mode]: nowIso }
          })
          .eq('id', sub.id)
        results.push({ id: sub.id, channel: 'webpush', sent: true })
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404 || status === 410) {
          // Endpoint gone — browser unsubscribed or profile cleared.
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          results.push({ id: sub.id, channel: 'webpush', sent: false, reason: 'expired-removed' })
        } else {
          results.push({ id: sub.id, channel: 'webpush', sent: false, reason: String(err).slice(0, 120) })
        }
      }
    }
  } catch (err) {
    console.error('[daily-reminders] web push pass failed:', err)
  }

  // ── Channel 2: APNs (installed iOS app) ───────────────────────────────────
  const apnsKeyId = Deno.env.get('APNS_KEY_ID') ?? ''
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID') ?? ''
  const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY') ?? ''
  const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.danielsdiaries.app'

  if (apnsKeyId && apnsTeamId && apnsPrivateKey) {
    try {
      let tq = supabase.from('device_tokens')
        .select('id, user_id, token, last_sent_modes')
        .eq('platform', 'ios')
      if (body.only_user_id) tq = tq.eq('user_id', body.only_user_id)
      const { data: tokens, error: tokenError } = await tq
      if (tokenError) throw new Error(tokenError.message)

      if (tokens && tokens.length > 0) {
        const jwt = await createApnsJwt(apnsKeyId, apnsTeamId, apnsPrivateKey)
        // The reminder is about the family's first child (device tokens are
        // per parent account, not per child).
        const childCache = new Map<string, { id: string; name: string } | null>()

        for (const t of tokens) {
          try {
            if (!body.only_user_id && rateLimited(t.last_sent_modes)) {
              results.push({ id: t.id, channel: 'apns', sent: false, reason: 'rate-limited' })
              continue
            }

            let child = childCache.get(t.user_id)
            if (child === undefined) {
              const { data: kids } = await supabase.from('children')
                .select('id, name')
                .eq('parent_user_id', t.user_id)
                .order('created_at', { ascending: true })
                .limit(1)
              child = (kids && kids[0]) || null
              childCache.set(t.user_id, child)
            }

            const payload = await payloadFor(t.user_id, child?.id ?? null, child?.name || 'your explorer')
            if (!payload) {
              results.push({ id: t.id, channel: 'apns', sent: false, reason: child ? 'streak-safe' : 'no-child' })
              continue
            }

            const res = await sendApnsPush(t.token, payload.title, payload.body, { url: payload.url }, jwt, apnsBundleId)
            if (res.ok) {
              await supabase.from('device_tokens')
                .update({
                  last_sent_modes: { ...(t.last_sent_modes || {}), [mode]: nowIso },
                  updated_at: nowIso
                })
                .eq('id', t.id)
              results.push({ id: t.id, channel: 'apns', sent: true })
            } else if (res.status === 410 || res.status === 400) {
              // Token invalid — app uninstalled or token rotated.
              await supabase.from('device_tokens').delete().eq('id', t.id)
              results.push({ id: t.id, channel: 'apns', sent: false, reason: 'expired-removed' })
            } else {
              results.push({ id: t.id, channel: 'apns', sent: false, reason: `apns-${res.status}` })
            }
          } catch (err) {
            results.push({ id: t.id, channel: 'apns', sent: false, reason: String(err).slice(0, 120) })
          }
        }
      }
    } catch (err) {
      console.error('[daily-reminders] APNs pass failed:', err)
    }
  } else {
    console.log('[daily-reminders] APNs skipped — APNS_* secrets not configured')
  }

  return new Response(JSON.stringify({ mode, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
