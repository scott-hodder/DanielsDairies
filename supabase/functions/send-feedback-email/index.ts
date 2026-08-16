import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser } from '../_shared/auth.ts'
import { withCors } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/email.ts'

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
    const body = await req.json()
    const email = auth.user.email || ''
    const rating = Number.isInteger(body?.rating) ? Math.min(5, Math.max(1, body.rating)) : null
    const message = String(body?.message || '').trim().slice(0, 4000)

    if (!message) {
      return new Response(JSON.stringify({ sent: false, reason: 'message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ sent: false, reason: 'missing config' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: slotClaimed, error: rateLimitError } = await admin
      .rpc('claim_feedback_email_slot', { p_user_id: auth.user.id })

    if (rateLimitError) throw new Error(`Could not apply feedback rate limit: ${rateLimitError.message}`)
    if (!slotClaimed) {
      return new Response(JSON.stringify({ sent: false, reason: 'rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' }
      })
    }

    const stars = rating ? '⭐'.repeat(rating) + ` (${rating}/5)` : 'No rating'
    const safeEmail = (email || 'Unknown').replace(/</g, '&lt;')
    const safeMessage = message
      ? message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
      : '<em>No message</em>'

    const htmlBody = `
      <h2 style="color:#2b3a55; font-family:sans-serif;">New Feedback from Daniel's Diaries</h2>
      <p style="font-family:sans-serif;"><strong>From:</strong> ${safeEmail}</p>
      <p style="font-family:sans-serif;"><strong>Rating:</strong> ${stars}</p>
      <p style="font-family:sans-serif;"><strong>Message:</strong></p>
      <blockquote style="background:#f8f9fa; padding:16px; border-radius:8px; border-left:4px solid #14b8a6; margin:8px 0; font-family:sans-serif;">
        ${safeMessage}
      </blockquote>
      <p style="color:#94a3b8; font-size:12px; font-family:sans-serif;">Sent from the Daniel's Diaries profile page</p>
    `

    const mailResult = await sendEmail({
      to: 'info@danielsdiaries.com',
      subject: `Feedback${rating ? ` (${rating}/5)` : ''} from ${email || 'a user'}`,
      html: htmlBody
    })

    if (!mailResult.sent) {
      console.error('Feedback email send failed:', mailResult.reason)
      // Email failed but feedback is already in the DB — that's fine
      return new Response(JSON.stringify({ sent: false, reason: mailResult.reason }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Feedback email sent')

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Feedback email error:', error)
    return new Response(JSON.stringify({ sent: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))
