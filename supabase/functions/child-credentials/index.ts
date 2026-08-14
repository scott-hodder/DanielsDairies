import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { withCors } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  childCredentialsRequestSchema,
  childCredentialsResponseSchema
} from '../_shared/child-credentials-schemas.ts'
import type { Database } from '../_shared/database.types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const parsed = childCredentialsRequestSchema.parse(body)

    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        }
      }
    )

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let response: unknown

    if (parsed.action === 'set_password') {
      const { data, error } = await supabase.rpc('set_child_password_secure', {
        p_child_id: parsed.childId,
        p_password: parsed.password
      })

      if (error) throw error
      response = { ok: Boolean(data) }
    } else {
      const { data, error } = await supabase.rpc('verify_child_password_secure', {
        p_child_id: parsed.childId,
        p_password: parsed.password ?? ''
      })

      if (error) {
        // Check for rate limit error from the database function
        if (error.message?.includes('Too many failed attempts')) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Too many failed attempts. Please try again in 15 minutes.' }),
            {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw error
      }
      response = { ok: true, valid: Boolean(data) }
    }

    const validated = childCredentialsResponseSchema.parse(response)

    return new Response(JSON.stringify(validated), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}))
