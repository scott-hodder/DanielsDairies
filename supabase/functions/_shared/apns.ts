// Shared APNs (Apple Push Notification service) helpers.
// Used by send-push-notification (ad-hoc sends) and daily-reminders
// (scheduled morning/evening reminder pushes to the iOS app).
//
// Env required on the project: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY
// (p8 contents), APNS_BUNDLE_ID (defaults to com.danielsdiaries.app).

export async function createApnsJwt(keyId: string, teamId: string, privateKey: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: keyId }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const now = Math.floor(Date.now() / 1000)
  const claims = btoa(JSON.stringify({ iss: teamId, iat: now }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const signingInput = `${header}.${claims}`

  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  )

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${header}.${claims}.${sig}`
}

export async function sendApnsPush(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> | undefined,
  jwt: string,
  bundleId: string
) {
  const payload = {
    aps: {
      alert: { title, body },
      sound: 'default',
      badge: 1
    },
    ...(data || {})
  }

  // Production APNs URL (use api.sandbox.push.apple.com for dev builds)
  const url = `https://api.push.apple.com/3/device/${deviceToken}`

  return await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
}
