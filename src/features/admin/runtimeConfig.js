export function getSupabaseUrl(supabase = window.supabase) {
  return window.SUPABASE_URL || window.__SUPABASE_URL__ || window.ENV?.SUPABASE_URL || supabase?.supabaseUrl || ''
}

export function getSupabaseAnonKey(supabase = window.supabase) {
  return window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__ || window.ENV?.SUPABASE_ANON_KEY || supabase?.supabaseKey || ''
}

export function requireSupabaseEnv(supabase = window.supabase) {
  const url = getSupabaseUrl(supabase)
  const key = getSupabaseAnonKey(supabase)
  if (!url || !key) {
    console.error(
      '[Admin] Missing Supabase URL / anon key for fetch calls. Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY (or window.ENV.*).'
    )
  }
  return { url, key }
}
