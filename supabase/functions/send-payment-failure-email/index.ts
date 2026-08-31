import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireServiceRole } from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.danielsdiaries.com.au',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authError = requireServiceRole(req)
  if (authError) return authError

  try {
    const { to, firstName, attemptCount, retryUrl, subject } = await req.json()

    if (!to) {
      return new Response(JSON.stringify({ sent: false, reason: 'missing recipient' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    // Send via the shared Resend mailer. (This used to call a
    // send_feedback_email Postgres RPC that never existed in any
    // environment - dunning emails silently failed from day one.)
    const result = await sendEmail({ to, subject: emailSubject, html: htmlBody })

    if (!result.sent) {
      console.error('Payment failure email send error:', result.reason)
      return new Response(JSON.stringify({ sent: false, reason: result.reason }), {
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
