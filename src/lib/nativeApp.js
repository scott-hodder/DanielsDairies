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
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') return false

    return await new Promise((resolve) => {
      PushNotifications.addListener('registration', async (token) => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return resolve(false)
          // upsert semantics without a unique constraint on token: delete+insert
          await supabase.from('device_tokens').delete().eq('token', token.value)
          const { error } = await supabase.from('device_tokens').insert({
            user_id: user.id,
            token: token.value,
            platform: 'ios'
          })
          resolve(!error)
        } catch {
          resolve(false)
        }
      })
      PushNotifications.addListener('registrationError', () => resolve(false))
      PushNotifications.register()
      setTimeout(() => resolve(false), 15000)
    })
  } catch (e) {
    console.error('Native push registration failed:', e)
    return false
  }
}
