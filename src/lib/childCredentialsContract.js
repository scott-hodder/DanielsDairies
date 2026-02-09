const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertChildCredentialRequest(payload) {
  if (!['set_password', 'verify_password'].includes(payload.action)) {
    throw new Error('Invalid action')
  }
  if (!UUID_REGEX.test(payload.childId || '')) {
    throw new Error('Invalid childId')
  }
  if (payload.password !== null && typeof payload.password !== 'string') {
    throw new Error('Invalid password')
  }
}

export function assertChildCredentialResponse(payload) {
  if (typeof payload?.ok !== 'boolean') throw new Error('Invalid response payload')
}
