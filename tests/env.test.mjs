import test from 'node:test'
import assert from 'node:assert/strict'
import { assertSupabaseEnv } from '../src/lib/env.js'

test('assertSupabaseEnv throws when missing', () => {
  assert.throws(() => assertSupabaseEnv({ supabaseUrl: '', supabaseAnonKey: '' }))
})

test('assertSupabaseEnv succeeds when present', () => {
  assert.doesNotThrow(() =>
    assertSupabaseEnv({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'key' })
  )
})
