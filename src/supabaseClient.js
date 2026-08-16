import { createSupabaseBrowserClient } from './lib/supabaseClientFactory.js'

const { client, isConfigured, configError, message } = createSupabaseBrowserClient()

if (!isConfigured && message) {
  console.warn(`⚠️ ${message}`)
}

export const isSupabaseConfigured = isConfigured
export const supabaseConfigError = configError

export const supabase = client

// Keep tabs consistent: when the user signs out (in this tab or another one —
// the localStorage-backed session is shared), authenticated pages return to
// the login screen instead of erroring on dead queries. Public pages and the
// schools flow (which manages its own sign-in/out cycle) are left alone.
const AUTH_REQUIRED_PATHS = [
  '/dashboard.html', '/landing.html', '/profile.html', '/billing.html',
  '/admin.html', '/module.html', '/parent-insights.html',
  '/family-library.html', '/practitioner-dashboard.html'
]

if (supabase && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return
    const path = window.location.pathname
    if (AUTH_REQUIRED_PATHS.some(p => path === p || path.startsWith(p))) {
      window.location.href = '/login.html'
    }
  })
}

export function getSupabaseClient() {
  if (!supabase) {
    throw configError || new Error('Supabase client is unavailable')
  }
  return supabase
}
