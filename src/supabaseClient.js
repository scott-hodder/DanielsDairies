import { createSupabaseBrowserClient } from './lib/supabaseClientFactory.js'

const { client, isConfigured, configError, message } = createSupabaseBrowserClient()

if (!isConfigured && message) {
  console.warn(`⚠️ ${message}`)
}

export const isSupabaseConfigured = isConfigured
export const supabaseConfigError = configError

export const supabase = client

export function getSupabaseClient() {
  if (!supabase) {
    throw configError || new Error('Supabase client is unavailable')
  }
  return supabase
}
