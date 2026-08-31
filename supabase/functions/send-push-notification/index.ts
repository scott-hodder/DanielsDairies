import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser } from '../_shared/auth.ts'
import { withCors } from '../_shared/cors.ts'
import { createApnsJwt, sendApnsPush } from '../_shared/apns.ts'

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
