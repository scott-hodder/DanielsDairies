import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabaseConfigErrorMessage =
  'Supabase is not configured for react-sidecar. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to react-sidecar/.env and restart the dev server.'

let supabaseClient = null

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  })
} else {
  // eslint-disable-next-line no-console
  console.warn(supabaseConfigErrorMessage)
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    const configError = new Error(supabaseConfigErrorMessage)
    configError.code = 'SUPABASE_CONFIG_MISSING'
    throw configError
  }

  return supabaseClient
}
