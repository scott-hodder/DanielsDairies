// Shared outbound email for edge functions.
//
// History: functions used to call a `send_feedback_email` Postgres RPC that
// was never actually created in either database, so every email silently
// failed. This helper sends for real via the Resend HTTP API.
//
// Why not SMTP? Raw-TCP SMTP (denomailer) hard-crashes the Supabase edge
// runtime worker (gateway 503), so HTTP is the only dependable channel here.
// RESEND_API_KEY must be set as a function secret on each project; when it
// is missing we fail soft with a clear reason and callers fall back to
// showing the user a copyable link / logging the failure.
//
// Per project convention all mail comes from info@danielsdiaries.com
// (SMTP_FROM overrides the display-from if set).

export type SendEmailInput = {
  to: string
  subject: string
  html: string
}

export type SendEmailResult = {
  sent: boolean
  reason?: string
}

const DEFAULT_FROM = "Daniel's Diaries <info@danielsdiaries.com>"

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    const reason = 'RESEND_API_KEY is not set on this project'
    console.error('[email]', reason)
    return { sent: false, reason }
  }

  try {
    const from = Deno.env.get('SMTP_FROM') || DEFAULT_FROM
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html })
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const reason = `Resend ${res.status}: ${body.slice(0, 300)}`
      console.error('[email]', reason)
      return { sent: false, reason }
    }
    return { sent: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error('[email] send failed:', reason)
    return { sent: false, reason }
  }
}
