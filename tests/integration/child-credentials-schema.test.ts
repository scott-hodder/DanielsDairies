import { describe, expect, it } from 'vitest'
import {
  childCredentialsRequestSchema,
  childCredentialsResponseSchema
} from '../../supabase/functions/_shared/child-credentials-schemas'

describe('child credentials schema', () => {
  it('validates set password request', () => {
    const parsed = childCredentialsRequestSchema.parse({
      action: 'set_password',
      childId: '550e8400-e29b-41d4-a716-446655440000',
      password: 'abc123'
    })

    expect(parsed.action).toBe('set_password')
  })

  it('rejects invalid uuid', () => {
    expect(() =>
      childCredentialsRequestSchema.parse({
        action: 'verify_password',
        childId: 'not-uuid',
        password: 'abc123'
      })
    ).toThrow()
  })

  it('validates response shape', () => {
    const response = childCredentialsResponseSchema.parse({ ok: true, valid: true })
    expect(response.ok).toBe(true)
  })
})
