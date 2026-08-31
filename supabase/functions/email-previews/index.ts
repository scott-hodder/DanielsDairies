// Email preview harness — sends a [TEST]-prefixed sample of every lifecycle
// email to a given address, through the REAL template + mailer pipeline, so
// styling and encoding can be checked exactly as customers will see them.
//
// POST { "to": "you@example.com" } with x-cron-secret header.
// Never called by any schedule — manual QA only.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendEmail } from '../_shared/email.ts'
import { renderBrandEmail, p } from '../_shared/emailTemplate.ts'

serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  let body: { to?: string } = {}
  try { body = await req.json() } catch { /* none */ }
  const to = String(body.to || '').trim()
  if (!to || !to.includes('@')) {
    return new Response(JSON.stringify({ error: 'body.to (email) required' }), { status: 400 })
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://app.danielsdiaries.com.au'

  const samples: Array<{ subject: string; html: string }> = [
    {
      subject: "[TEST] Welcome to Daniel's Diaries, Scott",
      html: renderBrandEmail({
        daniel: 'heart',
        heading: 'Welcome, Scott — the adventure starts here',
        bodyHtml:
          p("You've just given your child a friendly new way to build emotional intelligence, resilience and coping skills — one small adventure at a time.") +
          p('<strong>Getting started takes two minutes:</strong>') +
          `<ol style="margin:0 0 14px;padding-left:20px;line-height:1.8;">
            <li><strong>Confirm your email</strong> — the confirmation link is in your inbox.</li>
            <li><strong>Add your child</strong> — create their explorer profile and pick an avatar together.</li>
            <li><strong>Start the first adventure</strong> — Daniel will meet them in Brain Town.</li>
          </ol>` +
          p('A tip from families who get the most out of it: a regular five-minute visit beats an occasional long session.'),
        ctaLabel: "Open Daniel's Diaries",
        ctaUrl: appUrl + '/login.html'
      })
    },
    {
      subject: "[TEST] Ava's first adventure is ready in Brain Town",
      html: renderBrandEmail({
        daniel: 'thumbsup',
        heading: "Ava's first adventure is ready",
        bodyHtml:
          p("Ava's profile is set up — the first adventure in Brain Town is waiting, and it takes about ten minutes. Daniel will meet Ava at Brain Builder and show them around.") +
          p('Little and often beats long and rare: a regular ten-minute visit is exactly what the daily quests and streaks are built around. Tonight after dinner is a great first slot.'),
        ctaLabel: 'Start the first adventure',
        ctaUrl: appUrl + '/login.html',
        footerNote: 'This is a one-time reminder about your new account.'
      })
    },
    {
      subject: '[TEST] Two minutes to finish setting up',
      html: renderBrandEmail({
        daniel: 'reading',
        heading: 'Two minutes to finish setting up',
        bodyHtml:
          p("You created your Daniel's Diaries account a few days ago - the only step left is adding your child's explorer profile. It takes about two minutes: pick a name, choose an avatar together, and Daniel takes it from there.") +
          p('A tip: do the setup <em>with</em> your child. Choosing their own avatar is the first small moment of ownership, and it makes the first adventure feel like theirs.'),
        ctaLabel: 'Add your child',
        ctaUrl: appUrl + '/login.html',
        footerNote: 'This is a one-time reminder about your new account.'
      })
    },
    {
      subject: "[TEST] Payment failed — let's get this sorted",
      html: renderBrandEmail({
        daniel: 'thumbsup',
        heading: 'Hi Scott, quick payment hiccup',
        bodyHtml:
          p("We had trouble processing your latest payment for Daniel's Diaries. This can happen if your card has expired or there are insufficient funds.") +
          p("To keep your family's learning journey going, please update your payment details — it takes under a minute."),
        ctaLabel: 'Update payment method',
        ctaUrl: appUrl + '/profile.html'
      })
    }
  ]

  const results = []
  for (const s of samples) {
    const r = await sendEmail({ to, subject: s.subject, html: s.html })
    results.push({ subject: s.subject, sent: r.sent, reason: r.reason })
  }

  return new Response(JSON.stringify({ to, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
