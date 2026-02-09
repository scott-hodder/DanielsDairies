import { createSupabaseBrowserClient } from '../../../src/lib/supabaseClientFactory.js'

const { client, isConfigured, configError, message } = createSupabaseBrowserClient()

export const isSupabaseConfigured = isConfigured
export const supabaseConfigErrorMessage =
  message ||
  'Supabase is not configured for react-sidecar. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to react-sidecar/.env and restart the dev server.'

if (!isConfigured) {
  // eslint-disable-next-line no-console
  console.warn(supabaseConfigErrorMessage)
}

export function getSupabaseClient() {
  if (!client) {
    const error = configError || new Error(supabaseConfigErrorMessage)
    error.code = 'SUPABASE_CONFIG_MISSING'
    throw error
  }

  return client
}
