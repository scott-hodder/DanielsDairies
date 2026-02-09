export function getAppEnv(mode = import.meta.env.MODE) {
  return {
    mode,
    isDev: mode === 'development',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  }
}

export function assertSupabaseEnv(config) {
  const missing = []
  if (!config.supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!config.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')

  if (missing.length > 0) {
    const error = new Error(`Missing required environment variables: ${missing.join(', ')}`)
    error.code = 'ENV_CONFIG_MISSING'
    error.missing = missing
    throw error
  }
}

export function getSupabaseConfig(mode) {
  const env = getAppEnv(mode)

  try {
    assertSupabaseEnv(env)
    return {
      ...env,
      isConfigured: true,
      configError: null
    }
  } catch (error) {
    if (env.isDev) {
      return {
        ...env,
        isConfigured: false,
        configError: error
      }
    }

    throw error
  }
}
