import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, rating, message } = await req.json()

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

    // Use Supabase's built-in email by creating a temporary "magic link" style approach
    // Actually, use pg_net to send via SMTP from inside the database
    // The most reliable approach: use the database's mail sending capability via pg_net HTTP extension

    // Call Supabase's own SMTP via the internal auth endpoint to send a raw email
    // This piggybacks on the already-configured SMTP in the Supabase dashboard
    const { error } = await admin.rpc('send_feedback_email', {
      recipient: 'info@danielsdiaries.com.au',
      subject: `Feedback${rating ? ` (${rating}/5)` : ''} from ${email || 'a user'}`,
      html_body: htmlBody
    })

    if (error) {
      console.error('RPC send_feedback_email error:', error)
      // Email failed but feedback is already in the DB — that's fine
      return new Response(JSON.stringify({ sent: false, reason: error.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Feedback email sent via pg_net')

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
})
