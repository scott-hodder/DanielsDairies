// Branded email wrapper — every lifecycle email renders through this so
// customers see one consistent Daniel's Diaries look.
//
// Design (per founder direction 2026-08-31): DD navy header, no character
// imagery, gold accent divider, clean type. Email-client constraints:
//  - inline styles only (Gmail strips <style>)
//  - no webfonts (Gmail strips them) — friendly rounded system stack
//  - NO emoji in subjects or body copy: some clients/gateways mangle them
//    into "?" and they trip spam filters.

const FONT = "'Trebuchet MS', 'Segoe UI', Verdana, Arial, sans-serif"
const NAVY = '#2b3a55'
const NAVY_SOFT = '#405878'
const SLATE = '#4c6c96'
const GOLD = '#f6b700'

export type BrandEmailInput = {
  heading: string
  /** Paragraphs/lists as HTML strings — styled by this wrapper's palette. */
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  /** Kept for caller compatibility; artwork is no longer rendered. */
  daniel?: 'thumbsup' | 'heart' | 'reading'
  /** Small grey line above the footer (e.g. "This is a one-time reminder…") */
  footerNote?: string
}

export function renderBrandEmail(input: BrandEmailInput): string {
  const cta = input.ctaLabel && input.ctaUrl
    ? `<div style="margin:28px 0;text-align:center;">
         <a href="${input.ctaUrl}" style="background:${NAVY};color:#ffffff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;font-family:${FONT};display:inline-block;">${input.ctaLabel}</a>
       </div>`
    : ''
  const footerNote = input.footerNote
    ? `<p style="font-size:13px;color:#8a97ab;margin:0 0 10px;">${input.footerNote}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px 14px;">

    <div style="background:${NAVY};border-radius:18px 18px 0 0;padding:30px 20px 26px;text-align:center;">
      <div style="font-family:${FONT};font-size:27px;font-weight:700;color:#ffffff;letter-spacing:.3px;">Daniel's Diaries</div>
      <div style="font-family:${FONT};font-size:13px;color:#c7d2e4;margin-top:6px;">Helping children build emotional intelligence</div>
      <div style="width:56px;height:3px;background:${GOLD};margin:16px auto 0;border-radius:2px;"></div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 18px 18px;padding:32px 32px 26px;font-family:${FONT};">
      <h1 style="font-size:22px;line-height:1.3;color:${NAVY};margin:0 0 14px;">${input.heading}</h1>
      <div style="font-size:15px;line-height:1.65;color:${NAVY_SOFT};">
        ${input.bodyHtml}
      </div>
      ${cta}
      <div style="border-top:1px solid #e3e8f0;margin:26px 0 18px;"></div>
      <p style="font-size:14px;line-height:1.6;color:${SLATE};margin:0;">
        Questions? Just reply — a real person reads every message at
        <a href="mailto:info@danielsdiaries.com.au" style="color:${NAVY};font-weight:600;">info@danielsdiaries.com.au</a>.
      </p>
    </div>

    <div style="text-align:center;padding:20px 12px 8px;font-family:${FONT};">
      ${footerNote}
      <p style="font-size:12px;color:#9aa8bb;margin:0;">
        Daniel's Diaries — Foundational Minds · Australia<br>
        An educational wellbeing tool. Not therapy or a substitute for professional advice.
      </p>
    </div>

  </div>
</body></html>`
}

/** Shared paragraph helper so body copy stays on-palette. */
export function p(text: string): string {
  return `<p style="margin:0 0 14px;">${text}</p>`
}
