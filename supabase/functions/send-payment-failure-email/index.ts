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
    const { to, firstName, attemptCount, retryUrl, subject } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey || !to) {
      return new Response(JSON.stringify({ sent: false, reason: 'missing config or recipient' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const safeName = (firstName || 'there').replace(/</g, '&lt;')
    const isFirst = attemptCount <= 1
    const retryButton = retryUrl
      ? `<a href="${retryUrl}" style="display:inline-block; padding:12px 24px; background:#2A8F8F; color:white; text-decoration:none; border-radius:8px; font-weight:600; margin:16px 0;">Update Payment Method</a>`
      : ''

    const htmlBody = `
      <div style="font-family:sans-serif; max-width:520px; margin:0 auto; padding:24px;">
        <h2 style="color:#2b3a55;">Hi ${safeName},</h2>
        ${isFirst
          ? `<p>We had trouble processing your latest payment for Daniel's Diaries. This can happen if your card has expired or there are insufficient funds.</p>`
          : `<p>We've tried to process your payment ${attemptCount} times now but haven't been able to charge your card. Your subscription is currently on hold.</p>`
        }
        <p>To keep your family's learning journey going, please update your payment details:</p>
        ${retryButton}
        <p style="margin-top:20px;">If you need any help, just reply to this email — we're happy to assist.</p>
        <p style="color:#64748B; font-size:13px; margin-top:32px; border-top:1px solid #E5E7EB; padding-top:16px;">
          Daniel's Diaries — Growing together, one module at a time.
        </p>
      </div>
    `

    const emailSubject = subject || "Payment failed — let's get this sorted"

    const { error } = await admin.rpc('send_feedback_email', {
      recipient: to,
      subject: emailSubject,
      html_body: htmlBody
    })

    if (error) {
      console.error('Payment failure email RPC error:', error)
      return new Response(JSON.stringify({ sent: false, reason: error.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Payment failure email sent to ${to} (attempt ${attemptCount})`)

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Payment failure email error:', error)
    return new Response(JSON.stringify({ sent: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
