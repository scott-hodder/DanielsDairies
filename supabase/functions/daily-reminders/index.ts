// Daily web-push reminders for the town_play layer.
//
// Two modes, both triggered by pg_cron (see the migration/cron setup):
//   morning  — "X needs your help in Brain Town today!" using the same
//              deterministic character pick as the dashboard's daily event.
//   evening  — streak guard: only families whose child has a streak >= 2
//              and hasn't opened the app today (Brisbane time).
//
// Auth: requires the x-cron-key header to match CRON_SECRET. No user JWT —
// this function is only ever called by the scheduler (or a manual test).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'

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

  const vapidJson = JSON.parse(Deno.env.get('VAPID_KEYS_JSON') ?? '{}')
  const vapidKeys = await webpush.importVapidKeys(vapidJson.jwk, { extractable: false })
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: 'mailto:info@danielsdiaries.com',
    vapidKeys
  })

  let q = supabase.from('push_subscriptions')
    .select('id, user_id, child_id, endpoint, p256dh, auth, last_sent_at, children:child_id(id, name)')
  if (body.only_user_id) q = q.eq('user_id', body.only_user_id)
  const { data: subs, error } = await q
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const today = brisbaneToday()
  const results: Array<{ id: string; sent: boolean; reason?: string }> = []

  for (const sub of subs || []) {
    try {
      // At most one send per mode per ~20h per endpoint.
      if (!body.only_user_id && sub.last_sent_at &&
          Date.now() - new Date(sub.last_sent_at).getTime() < 20 * 3600 * 1000) {
        results.push({ id: sub.id, sent: false, reason: 'rate-limited' })
        continue
      }

      const childName = (sub.children as { name?: string } | null)?.name || 'your explorer'
      let payload: { title: string; body: string; tag: string; url: string } | null = null

      if (mode === 'morning' && sub.child_id) {
        const ch = todaysChar(sub.child_id)
        payload = {
          title: 'Brain Town news!',
          body: `${ch.emoji} ${ch.name} needs ${childName}'s help today!`,
          tag: 'dd-morning',
          url: '/dashboard.html'
        }
      } else if (mode === 'evening' && sub.child_id) {
        const { data: streak } = await supabase.from('login_streaks')
          .select('current_streak, last_login_date')
          .eq('user_id', sub.user_id).eq('child_id', sub.child_id)
          .maybeSingle()
        if (!streak || streak.current_streak < 2 || streak.last_login_date >= today) {
          results.push({ id: sub.id, sent: false, reason: 'streak-safe' })
          continue
        }
        payload = {
          title: 'Streak check!',
          body: `🔥 ${childName}'s ${streak.current_streak}-day streak just needs five minutes today to stay alive!`,
          tag: 'dd-evening',
          url: '/dashboard.html'
        }
      }

      if (!payload) { results.push({ id: sub.id, sent: false, reason: 'no-child' }); continue }

      const subscriber = appServer.subscribe({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      })
      await subscriber.pushTextMessage(JSON.stringify(payload), {})
      await supabase.from('push_subscriptions')
        .update({ last_sent_at: new Date().toISOString() }).eq('id', sub.id)
      results.push({ id: sub.id, sent: true })
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 410) {
        // Endpoint gone — browser unsubscribed or profile cleared.
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        results.push({ id: sub.id, sent: false, reason: 'expired-removed' })
      } else {
        results.push({ id: sub.id, sent: false, reason: String(err).slice(0, 120) })
      }
    }
  }

  return new Response(JSON.stringify({ mode, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
