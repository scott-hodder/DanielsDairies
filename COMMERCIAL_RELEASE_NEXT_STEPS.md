# Commercial Release — What Was Done & What's Next

**Date:** 4 July 2026
**Scope:** Implementation of the commercial-readiness fixes from the product audit.

---

## 1. What was implemented

### Payments & signup (the money path)

- **New edge function `start-paid-signup`** — paid signups now create the account **server-side before** the Stripe redirect. The password is sent once to the server and is **never stored in localStorage** (the old flow kept it in plaintext across the redirect). The new user id travels through Stripe via `client_reference_id` + metadata, so the webhook can always find the account.
- **Webhook idempotency** (`stripe-webhook`) — every Stripe event id is recorded in `stripe_webhook_events` before processing; retried/duplicated events are acked without re-processing. Credit grants are additionally keyed per invoice/session in `stripe_credit_grants`, which also fixes a pre-existing **double-grant bug** (both `checkout.session.completed` and `invoice.paid` used to grant credits for the same invoice).
- **Signup activation via webhook** — on payment success the webhook activates the subscription, sets the profile tier, and marks the pending signup complete. `checkout.session.expired` is handled (resume token invalidated; the account stays usable at 0 credits so the parent can log in and upgrade later — payment can never be taken without a working account).
- **Cancelled/abandoned checkout UX** — a dedicated "Payment not completed — no charge was taken" screen with a one-click **resume checkout** (single-purpose resume token, no credentials re-sent) and a login fallback. New-browser returns get an honest recovery message.
- **Old insecure path retired** — the unauthenticated signup branch in `create-checkout-session` now returns 410; dead `src/stripe.js` (called non-existent `/api/*` endpoints) deleted.
- **Webhook bug fix** — the payment-failure email path queried `parent_profiles` by non-existent `user_id`/`email` columns; it now resolves the email via auth admin and greets by real first name.

### Pricing, conversion & trust (public site)

- **Pricing section on `index.html`**: Bronze/Silver/Gold cards (prices sync live from `subscription_tiers`, the same table checkout charges from), plan comparison table, "how credits work" (roll over while subscribed — matches the actual implementation), free-trial CTA, cancellation/refund link, and a 7-question parent FAQ.
- **Super Skills & Brain Town section**: all 7 skills introduced with the real character art (Lenny, Coco, Kip, Pepper, Eddie, Kai, Billie) plus Daniel as guide.
- **Product screenshots section** using the real onboarding screenshots (dashboard, adventure map, daily quest, star shop).
- **Trust section**: "Who's behind it" (Foundational Minds, registered Behaviour Support Practitioner, 5+ years' experience, completing Honours in Psychology — worded to never overclaim), AI-assisted/human-reviewed content, privacy-first, "built with families" (no fabricated testimonials), plus trust badges.
- **ToS updated**: `#billing` anchor, credits-roll-over clause, access-until-period-end on cancellation, Australian Consumer Law carve-out.

### AI content transparency

- **New page `how-our-content-is-made.html`**: the 4-step process (human framework → AI-assisted drafting → automated audit → practitioner review and approval), what AI does and doesn't do, the not-therapy callout with crisis lines (Kids Helpline / Lifeline), and Foundational Minds context. Linked from the landing FAQ, trust section, and footer.

### Retention

- **New edge function `send-weekly-summary`** — weekly parent email with modules completed, Super Skills practised, check-ins, games played, stars/XP, and a suggested next step. Three variants: activity summary, gentle getting-started nudge, and supportive re-engagement (never guilt-based). One-click **no-login unsubscribe** (tokenised GET endpoint) + `weekly_email_opt_out` on the profile. Double-send protection via `weekly_email_log` (one row per parent per ISO week). Cron setup script in `supabase/cron_weekly_summary.sql`.
- **Check-ins now visibly influence recommendations** — `computeCheckinRecommendation()` maps each weekly check-in's challenge/triggers to one of the 7 Super Skills. Shown immediately after submitting a check-in ("Daniel recommends practising Thought Driver…"), on the stored weekly plan, and as a card on the Parent Insights page. Wording is explicitly non-clinical ("a learning suggestion, not a diagnosis").

### Family Gold

- **All Gold hub data moved from device localStorage to the database** (`gold_support_settings`, `gold_appointments`, `gold_tasks`) with parent-scoped RLS — Daniel time, appointments, and tasks now follow the family across devices. Existing device data migrates up automatically on first load, then the old keys are cleared.
- **Parent follow-ups**: parents can add their own between-session tasks; practitioner-set tasks are labelled. Failed saves surface an error instead of silently pretending.
- **Gold messaging**: the hub now states that behavioural support is provided by Foundational Minds (registered Behaviour Support Practitioner), what it includes, and that it is educational/behavioural, not therapy. No response times promised (none exist yet as business rules).

### Arcade learning loop

- **`arcade_plays` table + `record_arcade_play` RPC** — plays are recorded server-side with a **server-enforced cap of 5 arcade stars/child/day** (1 star per win, +1 bonus for the first daily-challenge win). Endless replaying cannot farm stars.
- **Daniel's challenge of the day** — deterministic daily rotation, implemented identically in SQL and JS (unit-tested to stay in lockstep), with a banner and card badge in the arcade.
- **Personal bests** per game (server-computed, shown on cards and as "New personal best!" on the end screen).
- **Post-game reflections** — one tappable Super-Skill question per game after each recorded play (e.g. Shield Sprint: "Which helpful thought will you keep?"), saved to `arcade_plays.reflection` where parents can read them (RLS) and the weekly email counts plays.

### Child & parent onboarding

- Verified the existing Daniel-led explainer and the first-time "Pick a Super Skill" speech-bubble guide are implemented and wired in (dismiss-on-interaction, once per child, replayable chip) — no changes needed.
- **Greeting fix**: "Welcome back, Sthodder12" (email prefix) replaced with the parent's real first name from signup metadata, with a safe generic fallback.

### Production hardening & polish

- **School/practitioner passwords**: minimum raised 6 → 12 characters (server + client).
- **RLS cleanup migration**: dropped the four wide-open `child_modules` policies (`WITH CHECK (true)` / `USING (true)` / unconditional delete). Ownership was already enforced by restrictive policies, but the `true` policies were one dropped policy away from a cross-family hole.
- **Tailwind CDN removed from `module.html`** — replaced with a static build (`tailwind.module.config.js`, 27 KB / 5.7 KB gzip vs a runtime CDN script), scanned from the module-generation templates with a safelist for older stored modules. Runs automatically via `prebuild`. CSP updated to drop `cdn.tailwindcss.com`.
- **Broken production image paths fixed**: `/public/images/...` references in `landing.html` and `auth.html` 404'd in built output; now `/images/...`.
- **Branding**: all public pages now use a Daniel's Diaries favicon (`dd-favicon.png`, generated from the Daniel logo) instead of the Foundational Minds logo in the browser tab.
- Verified: CORS on edge functions locked to `app.danielsdiaries.com.au`; `export-user-data` and `delete-account` functions present.

### Tests

- **20 unit tests passing** (`npm test`): check-in → skill recommendation mapping (incl. no-signal returns null, non-clinical wording), arcade challenge rotation parity with the SQL function, reflection coverage for all 10 games, weekly-email ISO week-key correctness (incl. year boundary).
- **Playwright smoke suite scaffolded** (`npm run test:e2e`, `tests/e2e/smoke.spec.js`): landing pricing/trust/FAQ, content-transparency page, pricing→signup deep link run against any environment; login→dashboard, Gold persistence-across-reload, and arcade tests run when `E2E_TEST_EMAIL/PASSWORD` are set; the full paid-signup→Stripe test (including "password never in browser storage" assertion) is gated behind `E2E_STRIPE_TEST=1` for a staging project.

### Database migrations added

| Migration | Contents |
|---|---|
| `20260704000000_secure_signup_and_webhook_idempotency.sql` | `stripe_webhook_events`, `stripe_credit_grants`, `pending_signups` |
| `20260704001000_weekly_email_prefs.sql` | `weekly_email_opt_out`, `weekly_email_token`, `weekly_email_log` |
| `20260704002000_family_gold_support.sql` | Gold settings/appointments/tasks + RLS |
| `20260704003000_arcade_learning_loop.sql` | `arcade_plays`, `record_arcade_play`, `save_arcade_reflection`, `get_arcade_bests`, `arcade_daily_challenge_game` |
| `20260704004000_rls_cleanup_child_modules.sql` | Drop wide-open `child_modules` policies |

---

## 2. Remaining risks (honest)

- **The new payment flow is untested against real Stripe.** The logic is sound and unit/smoke-testable, but it must be exercised end-to-end in Stripe **test mode** (success, cancel, expire, webhook retry, duplicate `invoice.paid`) before launch. This is the single most important validation left.
- **Migrations are unapplied.** All five migrations need `supabase db push` (or the prod script) and the changed/new edge functions need deployment: `start-paid-signup` (new), `send-weekly-summary` (new), `stripe-webhook`, `create-checkout-session`, `schools-auth`. Per project convention deploy all with `--no-verify-jwt` — `start-paid-signup` (unauthenticated signups) and `send-weekly-summary` (GET unsubscribe link) require it.
- **Stripe webhook subscription must include `checkout.session.expired`** (newly handled) alongside the existing events — check the Stripe dashboard.
- **Tailwind safelist risk**: modules stored in the DB were generated by earlier template versions; if one uses a utility class outside the safelist, that element loses styling. Mitigation: open a handful of the oldest stored modules after deploy and eyeball them; add missing patterns to `tailwind.module.config.js` if needed.
- **No rate limiting was added in code.** Supabase Auth has built-in limits for login/signup, but `start-paid-signup` and checkout endpoints have no custom throttling. Recommend enabling Supabase's edge-function rate limits / a WAF rule before heavy marketing.
- **Arcade reflections are stored and parent-readable but not yet rendered** in the Parent Insights UI (the weekly email counts games played). Small follow-up.
- **Annual pricing not implemented at signup.** The tier table has discount columns (all NULL) and the authenticated "extend subscription" flow already offers 3/6/12-month bundles, but a true annual Stripe subscription at signup needs a pricing decision first (see §3).
- **Weekly email depends on the `send_feedback_email` RPC** — confirm its provider quota can handle the full parent list, and send a staged first run (`{ "parentId": "..." }` body sends to one family).
- **Emoji placeholder art remains** (avatars, tab icons, arcade icons). Centralising/replacing with commissioned art is a design task, not started.
- **Dashboard bundle is still ~865 KB minified.** Code-splitting the map/games was deprioritised in favour of the money path; acceptable for launch, should follow soon.
- **Practitioner credential verification** is still absent (any `is_practitioner` flag grants hub access) — acceptable while the only practitioner is Foundational Minds, a blocker for opening the practitioner tier to outsiders.

---

## 3. Manual business tasks still required

1. **Stripe test-mode dry run** of signup → pay → activate → cancel → expire (see §2).
2. **Final practitioner review of all live modules** — the transparency page now promises practitioner review; make sure every published module has actually had it.
3. **Legal review** of the updated ToS wording, disclaimers, the content-transparency page, and the practitioner description ("registered Behaviour Support Practitioner… completing Honours in Psychology") for accuracy.
4. **Privacy policy update** per Advice.md: list overseas recipients (Supabase/AWS, Stripe, Mailchimp, AI provider), confirm Supabase region, reference Australian law.
5. **Refund/cancellation policy approval** — the ToS currently says non-refundable except as required by law; decide whether to offer a goodwill window (e.g. 14 days) as a conversion lever.
6. **Final pricing decision** — confirm $19/$39/$69 AUD, and decide on annual pricing (recommended: ~2 months free) so the discount columns can be wired.
7. **Real testimonials** — recruit 3–5 beta families now; replace the "built with families" section when quotes exist.
8. **Gold support operations**: define response-time expectations, booking process, and practitioner availability before Gold marketing promises anything.
9. **Cron + secrets**: enable pg_cron/pg_net, set `CRON_SECRET` on `send-weekly-summary`, run `supabase/cron_weekly_summary.sql`, and set `APP_URL` on the new functions.
10. **Support channel**: a real support email/contact page — the FAQ says "contact support" and there's currently no published address.

---

## 4. Pre-launch checklist

**Product**
- [ ] All 5 migrations applied to production; edge functions deployed (`--no-verify-jwt`)
- [ ] Oldest stored modules open correctly with the static Tailwind build
- [ ] First-time child guide + explainer verified on a fresh child profile
- [ ] Check-in → recommendation loop verified with a real account
- [ ] Weekly email test-sent to a single internal family (all three variants)

**Payments**
- [ ] Stripe test-mode: success / cancel / resume / expired / webhook retry
- [ ] Webhook subscription includes `checkout.session.completed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*`
- [ ] Duplicate `invoice.paid` grants credits exactly once (check `stripe_credit_grants`)
- [ ] Prices on the landing page match Stripe charges (they read the same table — verify the table)

**Security**
- [ ] `npm test` green; Playwright public smoke suite green against staging
- [ ] Signup with password → confirm nothing sensitive in local/sessionStorage
- [ ] Cross-family probe: authenticated user A cannot read family B's `gold_*`, `arcade_plays`, `child_modules`
- [ ] School signup rejects an 11-character password
- [ ] Data export and account deletion round-trip on a staging account

**Content**
- [ ] Practitioner sign-off recorded for every live module
- [ ] Transparency page reviewed by the practitioner for accuracy
- [ ] Crisis-line details verified current

**Parent onboarding**
- [ ] Fresh signup → add child → first module in under 5 minutes, no dead ends
- [ ] Greeting shows first name (paid, trial, and legacy accounts)

**Gold support**
- [ ] Gold data persists across two devices/sessions
- [ ] localStorage migration verified on an account that used the old prototype

**Mobile/tablet**
- [ ] Brain Town pan/zoom on a low-end Android tablet and an older iPhone
- [ ] Landing pricing/FAQ layout at 360px width
- [ ] Module player + arcade end-screen (incl. reflection) on touch devices

**Analytics & support**
- [ ] Decide and wire basic funnel events (visit → signup start → paid → first module) — currently none
- [ ] Support email live and linked from FAQ/footer
- [ ] Error tracking (e.g. Sentry) on the money path — currently console-only

---

## 5. Recommended launch plan

**Verdict: not ready for a public marketing launch today — ready for a closed beta within days.** The launch blockers that were code problems are now fixed; what remains is validation (Stripe dry run, migrations, device pass) and business sign-off (content review, legal, support ops).

1. **Week 1 — Staging validation.** Apply migrations, deploy functions, run the Stripe test-mode dry run and the checklist above.
2. **Weeks 2–5 — Closed beta: 10–20 real families** (mix of free trial, Silver, and at least 2 Gold). Weekly emails on. Talk to every family.
3. **Public launch when beta shows:** ≥60% of trial families complete 3+ modules, no payment incidents for 2 weeks, Gold families rate support positively, and 3+ usable testimonials exist.

**What to validate with real families before scaling:** does the child return without prompting (D7/D30 retention)? Do parents open the weekly email and act on it? Does the check-in recommendation feel useful or gimmicky? Is $39 defensible after 2 weeks of use — where does perceived value sit?

**First-30-day metrics:** visit→trial conversion, trial→paid conversion, D7/D30 child retention, modules completed per child per week, weekly-email open/click, arcade plays + reflection completion rate, check-in completion rate, churn + cancellation reasons, support tickets per family.

---

## 6. Commercial growth opportunities (priority order)

1. **Annual plans** — biggest revenue-quality lever; data model is ready, needs a pricing decision + one Stripe change. Kids' subscriptions live on annual billing.
2. **Weekly email → email sequence** — the infrastructure now exists; extend to a 5-part onboarding drip (day 1 welcome, day 3 first-module nudge, day 7 progress, day 14 trial-to-paid) using the same RPC + log pattern.
3. **Schools landing page + per-seat pricing** — the schools dashboard and auth already exist; the missing piece is a public page and a price. Highest LTV segment.
4. **Sibling pricing** — multi-child families are the natural best customers; a "+$X per additional child" modifier is mostly a Stripe + copy change.
5. **Parent progress reports (PDF)** — the insights engine already computes everything; a formatted monthly PDF is a strong retention artifact and a Gold/Silver differentiator.
6. **Commissioned character art to replace emoji** — avatars, tab icons, and arcade icons; the 7 Super Skill characters already have art, so the style guide exists.
7. **Practitioner tier productisation** — credential verification + practitioner-side Gold tooling (set tasks/guides from the practitioner hub into `gold_tasks`, which already supports `source='practitioner'`), then sell to external practitioners.
8. **Offline module caching for the iOS app** — service worker + cached modules; important for tablets without wifi, after the above.

---

## Assumptions made (documented per brief)

- **Credits roll over** while a subscription is active — this matches the actual implementation (credits accumulate and are never reset), and is now promised on the landing page and in the ToS. If the business wants expiring credits, both the code and the copy must change together.
- **Arcade star economy**: 5 stars/day cap, 1 per win, +1 for the first daily-challenge win. Tunable in one place (`record_arcade_play`).
- **Mailchimp opt-in** is added at account creation when the parent ticks the box (consent-based, regardless of payment outcome) — consistent with APP 7 opt-in requirements.
- **Pending accounts that never pay** are left as usable zero-credit accounts (they can log in and upgrade), rather than deleted — safer for "I paid but nothing happened" support cases and a natural re-engagement audience.
- **Gold gate** continues to treat the current `top` tier as Gold (existing `isGoldTier` logic).
