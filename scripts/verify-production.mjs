import 'dotenv/config'

const baseUrl = String(process.env.PROD_BASE_URL || '').replace(/\/$/, '')
const supabaseUrl = String(process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!baseUrl) throw new Error('Set PROD_BASE_URL, for example https://app.danielsdiaries.com.au')

const failures = []
const requiredHeaders = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy'
]

for (const path of ['/index.html', '/login.html', '/signup.html', '/privacy-policy.html', '/terms-of-service.html']) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow' })
  if (!response.ok) failures.push(`${path}: HTTP ${response.status}`)
  if (path === '/index.html') {
    for (const header of requiredHeaders) {
      if (!response.headers.get(header)) failures.push(`missing response header: ${header}`)
    }
    const csp = response.headers.get('content-security-policy') || ''
    if (!csp.includes("frame-ancestors 'none'")) failures.push("CSP must contain frame-ancestors 'none'")
  }
}

if (supabaseUrl && anonKey) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  }
  const probes = [
    ['generate-module', {}],
    ['generate-narration', {}],
    ['fix-audit-errors', {}],
    ['send-payment-failure-email', {}],
    ['send-feedback-email', { message: 'authorization probe' }],
    ['send-push-notification', { user_id: '00000000-0000-0000-0000-000000000000', title: 'probe', body: 'probe' }]
  ]

  for (const [name, body] of probes) {
    const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST', headers, body: JSON.stringify(body)
    })
    if (![401, 403].includes(response.status)) {
      failures.push(`${name}: anon probe returned HTTP ${response.status}, expected 401/403`)
    }
  }
} else {
  console.warn('Skipping Edge Function probes: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are not set')
}

if (failures.length) {
  console.error('Production verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Production headers, public routes, and anonymous authorization probes passed.')
}
