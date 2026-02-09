import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './env.js'

export function createSupabaseBrowserClient(mode) {
  const config = getSupabaseConfig(mode)

  if (!config.isConfigured) {
    return {
      client: null,
      isConfigured: false,
      configError: config.configError,
      message: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
    }
  }

  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  })

  return { client, isConfigured: true, configError: null, message: null }
}
