import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser } from '../_shared/auth.ts'
import { withCors } from '../_shared/cors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const auth = await requireUser(req)
  if (auth instanceof Response) return auth

  try {
    const { user_id, title, body, data } = await req.json()

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Use the authenticated user's ID if no user_id provided,
    // or verify the caller is an admin if targeting another user
    const authHeader = req.headers.get('Authorization')
    let targetUserId = user_id

    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user: caller } } = await userClient.auth.getUser()

      if (!caller) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!targetUserId) {
        // No user_id provided — send to the authenticated user
        targetUserId = caller.id
      } else if (targetUserId !== caller.id) {
        // Targeting a different user — verify caller is admin
        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const { data: profile } = await adminClient
          .from('parent_profiles')
          .select('is_admin')
          .eq('id', caller.id)
          .single()

        if (!profile?.is_admin) {
          return new Response(
            JSON.stringify({ error: 'Only admins can send notifications to other users' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } else if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'user_id is required when no auth token provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const apnsKeyId = Deno.env.get('APNS_KEY_ID') ?? ''
    const apnsTeamId = Deno.env.get('APNS_TEAM_ID') ?? ''
    const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY') ?? ''
    const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.danielsdiaries.app'

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get device tokens for the target user
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', targetUserId)

    if (tokenError) {
      throw new Error(`Failed to fetch tokens: ${tokenError.message}`)
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No device tokens found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const { token, platform } of tokens) {
      if (platform === 'ios') {
        try {
          const jwt = await createApnsJwt(apnsKeyId, apnsTeamId, apnsPrivateKey)
          const result = await sendApnsPush(token, title, body, data, jwt, apnsBundleId)
          results.push({ token: token.slice(0, 8) + '...', platform, success: result.ok })

          // Remove invalid tokens
          if (result.status === 410 || result.status === 400) {
            await supabase.from('device_tokens').delete().eq('token', token)
          }
        } catch (err) {
          results.push({ token: token.slice(0, 8) + '...', platform, success: false, error: err.message })
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}))

async function createApnsJwt(keyId: string, teamId: string, privateKey: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'ES256', kid: keyId }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const now = Math.floor(Date.now() / 1000)
  const claims = btoa(JSON.stringify({ iss: teamId, iat: now }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const signingInput = `${header}.${claims}`

  // Import the APNS private key
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

async function sendApnsPush(
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

  // Use production APNs URL (use api.sandbox.push.apple.com for dev)
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
