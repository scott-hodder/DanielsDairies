import { getSupabaseClient } from '../supabaseClient.js'
import { assertChildCredentialRequest, assertChildCredentialResponse } from '../lib/childCredentialsContract.js'

async function invokeChildCredentials(action, payload) {
  const body = { action, ...payload }
  assertChildCredentialRequest(body)

  const { data, error } = await getSupabaseClient().functions.invoke('child-credentials', {
    body
  })

  if (error) throw error
  assertChildCredentialResponse(data)
  return data
}

export async function setChildPasswordServer(childId, password) {
  return invokeChildCredentials('set_password', { childId, password })
}

export async function verifyChildPasswordServer(childId, password) {
  return invokeChildCredentials('verify_password', { childId, password })
}
