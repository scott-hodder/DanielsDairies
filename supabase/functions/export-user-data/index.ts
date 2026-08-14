import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { withCors } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing server configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authenticate the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = user.id
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Fetch all user data in parallel
    const [
      profileResult,
      childrenResult,
      subscriptionResult,
      parentModulesResult,
      weeklyCheckinsResult,
      feedbackResult
    ] = await Promise.all([
      admin.from('parent_profiles').select('id, full_name, phone, credits, subscription_tier, created_at').eq('id', userId).maybeSingle(),
      admin.from('children').select('id, name, date_of_birth, avatar_url, created_at').eq('parent_user_id', userId),
      admin.from('parent_subscriptions').select('tier, status, current_period_start, current_period_end, cancel_at_period_end, created_at').eq('parent_id', userId).maybeSingle(),
      admin.from('parent_modules').select('id, module_id, status, assigned_at, completed_at').eq('parent_user_id', userId),
      admin.from('weekly_checkins').select('id, child_id, week_start, notes, challenge, goal, created_at').eq('parent_user_id', userId),
      admin.from('user_feedback').select('id, rating, message, created_at').eq('user_id', userId)
    ])

    // For each child, fetch their detailed data
    const children = childrenResult.data || []
    const childDataPromises = children.map(async (child: { id: string; name: string; date_of_birth: string; avatar_url: string; created_at: string }) => {
      const [moodResult, responsesResult, modulesResult] = await Promise.all([
        admin.from('child_mood_checkins').select('id, mood_score, mood_label, mood_emoji, created_at').eq('child_id', child.id),
        admin.from('module_responses').select('id, module_id, question_id, response_type, response_value, is_correct, time_spent_ms, created_at').eq('child_id', child.id),
        admin.from('child_modules').select('id, module_id, status, started_at, completed_at, xp_earned').eq('child_id', child.id)
      ])

      return {
        profile: {
          name: child.name,
          date_of_birth: child.date_of_birth,
          avatar: child.avatar_url,
          created_at: child.created_at
        },
        mood_checkins: moodResult.data || [],
        module_responses: responsesResult.data || [],
        module_progress: modulesResult.data || []
      }
    })

    const childData = await Promise.all(childDataPromises)

    // Assemble the export
    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        email: user.email,
        profile: profileResult.data,
        subscription: subscriptionResult.data,
        created_at: user.created_at
      },
      children: childData,
      parent_modules: parentModulesResult.data || [],
      weekly_checkins: weeklyCheckinsResult.data || [],
      feedback: feedbackResult.data || []
    }

    // Log audit event
    await admin.from('parent_audit_log').insert({
      parent_user_id: userId,
      action: 'data_export',
      resource_type: 'account',
      resource_id: userId,
      metadata: { exported_tables: ['parent_profiles', 'children', 'child_mood_checkins', 'module_responses', 'child_modules', 'weekly_checkins', 'parent_modules', 'user_feedback'] }
    }).then(() => {}).catch(() => {}) // non-blocking

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="daniels-diaries-data-export-${new Date().toISOString().slice(0, 10)}.json"`
      }
    })
  } catch (error) {
    console.error('[export-user-data] Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to export data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))
