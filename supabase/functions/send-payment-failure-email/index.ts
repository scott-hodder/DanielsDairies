import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireServiceRole } from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'
import { renderBrandEmail, p } from '../_shared/emailTemplate.ts'

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
    const appUrl = Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au'

    const htmlBody = renderBrandEmail({
      daniel: 'thumbsup',
      heading: 'Hi ' + safeName + ', quick payment hiccup',
      bodyHtml:
        (isFirst
          ? p('We had trouble processing your latest payment for Daniel&#8217;s Diaries. This can happen if your card has expired or there are insufficient funds.')
          : p('We&#8217;ve tried to process your payment ' + attemptCount + ' times now but haven&#8217;t been able to charge your card. Your subscription is currently on hold.')) +
        p('To keep your family&#8217;s learning journey going, please update your payment details - it takes under a minute.'),
      ctaLabel: 'Update payment method',
      ctaUrl: retryUrl || (appUrl + '/profile.html')
    })

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
