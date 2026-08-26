// ================================================
// PUSH REMINDERS (web push opt-in)
// A small banner on the dashboard invites the family to turn on Brain Town
// reminders. Subscriptions are stored per browser in push_subscriptions;
// the daily-reminders edge function does the sending. Fails soft on
// browsers without push (iOS Safari outside an installed PWA).
// Part of the town_play layer.
// ================================================

import { supabase } from '../../supabaseClient.js'
import { isTownPlayEnabled } from './townPlayFlag.js'
import { trackEvent } from '../../lib/telemetry.js'

// Public VAPID key (raw, base64url) — pairs with the daily-reminders
// function's private key. Public by design.
const VAPID_PUBLIC_KEY = 'BJP426fAJ6fDGryrr8q2hPIDo7yiWfI9Sjzw_V88WgyOB24HodYB8kwlYawzxNDhKu7E5wI989uPWZb4hoVJWM0'

const DISMISS_KEY = 'dd_push_prompt_dismissed'

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlB64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function subscribe(childId) {
  const reg = await navigator.serviceWorker.register('/push-sw.js')
  await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
  })
  const json = sub.toJSON()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    child_id: childId || null,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth
  }, { onConflict: 'endpoint' })
  return !error
}

function injectStyles() {
  if (document.getElementById('pushReminderStyles')) return
  const st = document.createElement('style')
  st.id = 'pushReminderStyles'
  st.textContent = `
.pr-banner{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:2px solid #c7d2fe;border-radius:16px;padding:10px 14px;margin:10px 0;font-family:'Fredoka',system-ui,sans-serif}
.pr-text{flex:1;font-size:13.5px;font-weight:600;color:#3730a3;line-height:1.35}
.pr-on{border:none;border-radius:12px;padding:10px 16px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.pr-x{background:none;border:none;color:#818cf8;font-size:16px;cursor:pointer;padding:4px}
`
  document.head.appendChild(st)
}

/**
 * Mount the reminder opt-in banner (above the Brain Town map) when it makes
 * sense: push supported, permission not yet decided, not dismissed. If
 * permission is already granted, silently re-sync the subscription so a
 * cleared browser or new profile keeps getting reminders.
 */
export async function initPushReminders(container, { child } = {}) {
  if (!container || !pushSupported()) return
  if (!(await isTownPlayEnabled())) return

  if (Notification.permission === 'granted') {
    subscribe(child?.id).catch(() => { /* resync is best-effort */ })
    return
  }
  if (Notification.permission === 'denied') return
  try { if (localStorage.getItem(DISMISS_KEY) === '1') return } catch { /* ignore */ }

  const mapContainer = container.querySelector('#brainTownMapContainer')
  if (!mapContainer || container.querySelector('.pr-banner')) return
  injectStyles()

  const banner = document.createElement('div')
  banner.className = 'pr-banner'
  banner.innerHTML = `
    <span style="font-size:22px">🔔</span>
    <span class="pr-text">Want a nudge when something new happens in Brain Town? One a day, no spam.</span>
    <button type="button" class="pr-on">Turn on</button>
    <button type="button" class="pr-x" aria-label="Not now">✕</button>`
  mapContainer.parentElement.insertBefore(banner, mapContainer)

  banner.querySelector('.pr-x').addEventListener('click', () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    banner.remove()
    trackEvent('push_prompt_dismissed')
  })

  banner.querySelector('.pr-on').addEventListener('click', async () => {
    const btn = banner.querySelector('.pr-on')
    btn.disabled = true
    btn.textContent = 'Setting up…'
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        trackEvent('push_permission_declined')
        banner.remove()
        return
      }
      const ok = await subscribe(child?.id)
      trackEvent(ok ? 'push_subscribed' : 'push_subscribe_failed')
      banner.innerHTML = `<span style="font-size:22px">✅</span><span class="pr-text">Done! Daniel will let you know when Brain Town changes.</span>`
      setTimeout(() => banner.remove(), 4000)
    } catch (e) {
      console.error('Push subscribe failed:', e)
      trackEvent('push_subscribe_failed')
      banner.remove()
    }
  })
}
