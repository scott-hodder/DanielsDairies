// Welcome email — sent once per parent account, deduped via
// parent_profiles.welcome_email_sent_at (set only after a confirmed send).
//
// Callers: complete-signup (free/native accounts) and stripe-webhook
// (paid signups activated after checkout). Both pass their service-role
// client. Fails soft: a missing RESEND_API_KEY or transient error never
// blocks signup.

import { sendEmail } from './email.ts'

// deno-lint-ignore no-explicit-any
type AdminClient = any

function firstNameOnly(name: string | null | undefined): string {
  const n = String(name || '').trim().split(/\s+/)[0]
  return n || 'there'
}

function buildWelcomeHtml(firstName: string, appUrl: string): string {
  const safeName = firstName.replace(/[<>&]/g, '')
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #2b3a55;">
    <h1 style="color:#2A8F8F; font-size: 24px;">Welcome to Daniel's Diaries, ${safeName}! 🐕</h1>
    <p style="font-size: 15px; line-height: 1.6;">
      You've just given your child a friendly new way to build emotional
      intelligence, resilience and coping skills — one small adventure at a time.
    </p>
    <p style="font-size: 15px; line-height: 1.6;"><strong>Getting started takes two minutes:</strong></p>
    <ol style="font-size: 15px; line-height: 1.8;">
      <li><strong>Confirm your email</strong> — check your inbox for the confirmation link (peek in spam if it's hiding).</li>
      <li><strong>Add your child</strong> — create their explorer profile and pick an avatar together.</li>
      <li><strong>Start the first adventure</strong> — Daniel will meet them in Brain Town and show them around.</li>
    </ol>
    <p style="margin: 28px 0;">
      <a href="${appUrl}/login.html"
         style="background:#2A8F8F; color:#ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
        Open Daniel's Diaries
      </a>
    </p>
    <p style="font-size: 14px; line-height: 1.6; color:#4c6c96;">
      A tip from families who get the most out of it: a regular five-minute
      visit beats an occasional long session. The daily quests and streaks are
      built around exactly that.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color:#4c6c96;">
      Questions? Just reply to this email — a real person reads every message
      at <a href="mailto:info@danielsdiaries.com.au" style="color:#2A8F8F;">info@danielsdiaries.com.au</a>.
    </p>
    <p style="font-size: 14px; color:#4c6c96;">— The Daniel's Diaries team</p>
  </div>`
}

export async function sendWelcomeEmailOnce(
  admin: AdminClient,
  userId: string,
  email: string,
  firstName: string | null | undefined
): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (!email) return { sent: false, reason: 'no email' }

    const { data: profile } = await admin
      .from('parent_profiles')
      .select('welcome_email_sent_at')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.welcome_email_sent_at) {
      return { sent: false, reason: 'already sent' }
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au'
    const result = await sendEmail({
      to: email,
      subject: "Welcome to Daniel's Diaries — your child's adventure starts here 🐾",
      html: buildWelcomeHtml(firstNameOnly(firstName), appUrl)
    })

    if (result.sent) {
      await admin
        .from('parent_profiles')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('id', userId)
    } else {
      console.error('[welcome-email] not sent:', result.reason)
    }
    return result
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error('[welcome-email] failed:', reason)
    return { sent: false, reason }
  }
}
