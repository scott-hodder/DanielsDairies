// ================================================
// NATIVE APP BRIDGE (Capacitor iOS)
// Everything the web app does differently when it's running inside the
// installed app rather than a browser:
//   - marks <body> with .native-app so CSS can hide web-only surfaces
//     (pricing, subscribe CTAs — Apple guideline 3.1.1: no external
//     purchase paths inside the app)
//   - registers for push notifications and stores the APNs device token
//     in device_tokens for the send-push-notification function
// Safe to import everywhere: every entry point no-ops in a browser.
// ================================================

import { supabase } from '../supabaseClient.js'

export function isNativeApp() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  } catch {
    return false
  }
}

/** Add the .native-app body class and companion-mode CSS. Call early. */
export function initNativeChrome() {
  if (!isNativeApp()) return
  document.body.classList.add('native-app')
  if (document.getElementById('nativeAppStyles')) return
  const st = document.createElement('style')
  st.id = 'nativeAppStyles'
  // Companion mode: purchasing lives on the website, never in the app.
  st.textContent = `
    body.native-app [data-web-only],
    body.native-app .pricing-section,
    body.native-app #pricing,
    body.native-app .billing-section,
    body.native-app .plan-upgrade,
    body.native-app .subscribe-cta { display: none !important; }
  `
  document.head.appendChild(st)
}

/**
 * Ask for push permission and store the device token. Call after login —
 * never on first paint (permission prompts before context are dismissed).
 */
export async function registerNativePush() {
  if (!isNativeApp()) return false
  // Breadcrumbs via self-hosted telemetry: push failures on a phone are
  // otherwise invisible (no console).
  const crumb = (step, extra) => {
    try {
      supabase.rpc('log_client_event', {
        p_event: 'native_push_' + step,
        p_page: '/native',
        p_props: extra || {},
        p_session_id: 'native'
      }).then(() => {}, () => {})
    } catch { /* never break */ }
  }
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    let perm = await PushNotifications.checkPermissions()
    crumb('perm_checked', { state: perm.receive })
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions()
      crumb('perm_requested', { state: perm.receive })
    }
    if (perm.receive !== 'granted') return false

    return await new Promise((resolve) => {
      let settled = false
      const done = (ok, step, extra) => {
        if (settled) return
        settled = true
        crumb(step, extra)
        resolve(ok)
      }
      PushNotifications.addListener('registration', async (token) => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return done(false, 'no_user')
          // upsert semantics without a unique constraint on token: delete+insert
          await supabase.from('device_tokens').delete().eq('token', token.value)
          const { error } = await supabase.from('device_tokens').insert({
            user_id: user.id,
            token: token.value,
            platform: 'ios'
          })
          done(!error, error ? 'insert_failed' : 'token_stored', error ? { msg: String(error.message).slice(0, 120) } : {})
        } catch (e) {
          done(false, 'store_threw', { msg: String(e).slice(0, 120) })
        }
      })
      PushNotifications.addListener('registrationError', (e) => done(false, 'registration_error', { msg: String(e?.error || e).slice(0, 120) }))
      PushNotifications.register()
      setTimeout(() => done(false, 'timeout'), 15000)
    })
  } catch (e) {
    console.error('Native push registration failed:', e)
    try {
      supabase.rpc('log_client_event', { p_event: 'native_push_plugin_missing', p_page: '/native', p_props: { msg: String(e).slice(0, 120) }, p_session_id: 'native' }).then(() => {}, () => {})
    } catch { /* ignore */ }
    return false
  }
}
