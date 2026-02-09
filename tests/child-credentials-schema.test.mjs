import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertChildCredentialRequest,
  assertChildCredentialResponse
} from '../src/lib/childCredentialsContract.js'

test('valid child credentials request passes', () => {
  assert.doesNotThrow(() =>
    assertChildCredentialRequest({
      action: 'set_password',
      childId: '550e8400-e29b-41d4-a716-446655440000',
      password: 'abc123'
    })
  )
})

test('invalid child id fails', () => {
  assert.throws(() =>
    assertChildCredentialRequest({ action: 'verify_password', childId: 'bad-id', password: 'abc123' })
  )
})

test('response contract validates', () => {
  assert.doesNotThrow(() => assertChildCredentialResponse({ ok: true, valid: true }))
})
