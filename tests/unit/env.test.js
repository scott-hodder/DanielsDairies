import { describe, expect, it } from 'vitest'
import { assertSupabaseEnv } from '../../src/lib/env.js'

describe('assertSupabaseEnv', () => {
  it('throws when env vars are missing', () => {
    expect(() => assertSupabaseEnv({ supabaseUrl: '', supabaseAnonKey: '' })).toThrow(
      /Missing required environment variables/
    )
  })

  it('passes when env vars are present', () => {
    expect(() => assertSupabaseEnv({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'abc' })).not.toThrow()
  })
})
