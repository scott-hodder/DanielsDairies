# Testing & Go-Live Guide

**Date:** 4 July 2026
**Goal:** take the commercial-readiness changes from "deployed to dev" to "fully functioning and ready for prod".

---

## 0. Where things stand right now (already done)

| Item | Status |
|---|---|
| 5 new migrations | ✅ Applied to **dev** (`wximnkhcpugfyjshgaim`) — verified, new tables respond |
| Edge functions `start-paid-signup`, `send-weekly-summary`, `stripe-webhook`, `create-checkout-session`, `schools-auth` | ✅ Deployed to **dev** with `--no-verify-jwt` |
| Function smoke test | ✅ Unsubscribe endpoint renders, batch email rejects without secret (401), signup validates input (400) |
| Unit tests | ✅ 20/20 passing (`npm test`) |
| **Prod** (`mikxrneopcwuldmykswq`) | ❌ Has **neither** the new migrations **nor** the new functions — see §6 before any prod deploy. **Do not deploy the new `stripe-webhook` to prod before the migrations**, or credit-granting will 500. |

> **Which project is which:** `.env.local` points the front-end at dev (`wximnkhcpugfyjshgaim`). `scripts/db-push-prod.sh` treats `mikxrneopcwuldmykswq` as prod. Everything below runs against **dev** until §6.

> **CORS note for local testing:** the edge functions only allow the origin `https://app.danielsdiaries.com.au`. Browser calls from `http://localhost:3000` will be blocked by CORS on the signup/payment flows. Test the browser flows on the deployed dev site — or, for a local session, temporarily change `corsHeaders` in `start-paid-signup/index.ts` to your localhost origin, redeploy, test, and revert.

---

## 1. Set the function secrets (5 minutes — do this first)

The new functions need these env vars on the **dev** project. Check what's already set:

```powershell
npx supabase secrets list --project-ref wximnkhcpugfyjshgaim
```

Set anything missing (values from your Stripe **test mode** dashboard for now):

```powershell
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref wximnkhcpugfyjshgaim
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref wximnkhcpugfyjshgaim   # from §2 step 2
npx supabase secrets set APP_URL=https://app.danielsdiaries.com.au --project-ref wximnkhcpugfyjshgaim
npx supabase secrets set CRON_SECRET=<long-random-string> --project-ref wximnkhcpugfyjshgaim  # for §4
```

Generate a good `CRON_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Stripe test-mode dry run (the most important step)

### 2.1 Point a test-mode webhook at dev

1. Stripe Dashboard → **toggle Test mode ON** → Developers → Webhooks → **Add endpoint**.
2. Endpoint URL: `https://wximnkhcpugfyjshgaim.supabase.co/functions/v1/stripe-webhook`
3. Select these events (the full set the webhook handles):
   - `checkout.session.completed`
   - `checkout.session.expired`  ← **new, required**
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the endpoint's **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` (§1).

### 2.2 Happy path: signup → pay → activated

1. On the deployed dev site, go to `/signup.html?plan=mid`, sign up with a fresh email (e.g. `sthodder12+test1@gmail.com` — Gmail `+` aliases all land in your inbox).
2. You should be redirected to Stripe Checkout. Pay with test card **4242 4242 4242 4242**, any future expiry, any CVC.
3. Back on the site you should see **"Payment successful! Your account and subscription are active."** with the check-your-inbox login form.
4. Verify in the database (Supabase Dashboard → SQL Editor, dev project):

```sql
-- The signup should be 'completed', the subscription 'active' with tier 'mid',
-- and the family should have exactly 6 credits (Silver)
select ps.status, ps.tier, pp.credits, pending.status as signup_status
from parent_subscriptions ps
join parent_profiles pp on pp.id = ps.parent_id
join pending_signups pending on pending.parent_id = ps.parent_id
order by ps.updated_at desc limit 1;

-- Exactly ONE credit grant for the first invoice (this is the double-grant fix)
select grant_key, credits, source, created_at
from stripe_credit_grants order by created_at desc limit 5;
```

5. Confirm the email confirmation arrived, click it, log in.

### 2.3 Idempotency: replay the webhook

1. Stripe Dashboard → Webhooks → your endpoint → the `invoice.paid` event → **Resend**.
2. Re-run the SQL above: **credits must not increase** and `stripe_credit_grants` must still have one row for that invoice.
3. Check the event log recorded the duplicate:

```sql
select event_id, event_type, received_at from stripe_webhook_events order by received_at desc limit 10;
```

(The resent delivery reuses the same event id, so it's acked as a duplicate — you'll see one row per unique event.)

### 2.4 Cancel path + resume

1. Start another signup with a fresh email, but on the Stripe page click the **back arrow** (cancel).
2. You should land on **"Payment not completed — no charge was taken"** with a *Try payment again* button and a *Log in instead* link.
3. Click **Try payment again** → you should get a fresh Stripe checkout **without re-entering any details**. Complete payment and verify activation as in 2.2.
4. Security check while on this screen: DevTools → Application → Local storage + Session storage — confirm **the password appears nowhere** (only `dd_signup_resume` with email/plan/token in sessionStorage).

### 2.5 Expired session

Checkout sessions expire after 24h; don't wait — expire it manually. Grab the session id (`cs_test_...`) from Stripe Dashboard → Payments/Checkout, then:

```powershell
# Uses your test secret key
curl.exe -s -X POST "https://api.stripe.com/v1/checkout/sessions/cs_test_.../expire" -u "sk_test_...:"
```

Verify: `select status from pending_signups where email = '<that email>';` → should be `expired`, and the *Try payment again* button for that session should now show the "can no longer be resumed" message. The account still works — log in with it and confirm you land on the dashboard with 0 credits.

### 2.6 Failed renewal email

Optional but worth one run: Stripe Dashboard → Customers → the test customer → subscription → update the payment method to test card **4000 0000 0000 0341** (attaches but fails payments), then advance/retry the invoice. Confirm the payment-failure email arrives greeting the parent **by first name** (this path had a bug that's now fixed — worth confirming end to end).

### 2.7 Free trial regression

The trial path (`/signup.html?trial=true`) was intentionally unchanged — run one signup through it to confirm it still creates the account with 2 credits.

---

## 3. Stripe webhook events (production checklist)

Covered above for test mode. When you go to prod (§6), repeat §2.1 in **live mode** against the prod function URL, with live keys, and update the prod function secrets. The event list is identical. Delete or disable any old webhook endpoints that point at retired flows so events aren't double-delivered.

---

## 4. Weekly parent email

### 4.1 One-family test send (do this before any batch)

Send to your own family only (find your parent id: `select id, full_name from parent_profiles;`):

```powershell
curl.exe -s -X POST "https://wximnkhcpugfyjshgaim.supabase.co/functions/v1/send-weekly-summary" -H "Content-Type: application/json" -H "x-cron-secret: <your CRON_SECRET>" -d "{\"parentId\": \"<your-parent-uuid>\"}"
```

Check:
- The response says `sent:summary` (or `nudge`/`re-engagement` depending on the week's activity).
- The email arrives, reads well, and the **Unsubscribe** link works (click it → confirmation page → `select weekly_email_opt_out from parent_profiles where id = '<id>';` → `true`). Flip it back with an update statement afterwards.
- Run the same curl again: response should say `skipped:already-sent` (one email per family per week).
- `select * from weekly_email_log;` shows one row with the right variant.

> If the send fails, the `send_feedback_email` RPC is the dependency to check — confirm its provider/SMTP quota can handle your full parent list before scheduling.

### 4.2 Schedule it

1. Supabase Dashboard (dev project) → Database → **Extensions** → enable `pg_cron` and `pg_net`.
2. Open `supabase/cron_weekly_summary.sql`, fill in the project ref (`wximnkhcpugfyjshgaim`) and your `CRON_SECRET`, adjust the schedule if you want a different day/time (default: Sunday 08:00 UTC ≈ 6–7pm AEST).
3. Run it in the SQL Editor.
4. Verify: `select jobname, schedule from cron.job;` shows `weekly-parent-summary`.
5. After the first scheduled run, check `weekly_email_log` and `select * from cron.job_run_details order by start_time desc limit 5;`.

---

## 5. Business / manual finalisation

These can run in parallel with §2–§4:

1. **Practitioner sign-off on live modules.** The new public page (`/how-our-content-is-made.html`) promises practitioner review of everything children see. Have the Foundational Minds practitioner review any live modules that haven't had it, and read that page + the landing trust section to confirm the credentials wording ("registered Behaviour Support Practitioner, 5+ years, completing Honours in Psychology") is accurate and comfortable.
2. **Legal/policy pass.** ToS changes (billing anchor, credit rollover, ACL carve-out), the transparency page disclaimers, and the privacy policy update from `Advice.md` (list overseas recipients: Supabase/AWS, Stripe, Mailchimp, AI provider; confirm Supabase region).
3. **Pricing decisions.** Confirm $19/$39/$69 AUD (the landing page reads live from `subscription_tiers`, so a DB update changes both display and charge). Decide on annual pricing — the `discount_12_month` column exists and is unused until you set it and we wire the signup option.
4. **Refund window.** ToS currently says non-refundable except as required by law. Decide if you want a goodwill window (e.g. 14 days) — it's a conversion lever for a new brand.
5. **Support email.** The FAQ and cancelled-payment screen say "contact support" — publish a real address (footer + FAQ) before beta.
6. **Gold operations.** Write down the actual rules: how Gold families book, expected response time, practitioner hours. The Gold hub deliberately promises nothing specific yet — keep it that way until these exist.
7. **Beta recruitment.** 10–20 families (mix of trial/Silver/≥2 Gold) for a 3–4 week closed beta; collect testimonials to replace the "built with families" placeholder section.

---

## 6. Feature verification pass (30 minutes, on the deployed dev site)

Run through as a parent + child would:

- **Landing page:** pricing shows the right numbers (they load from the DB — a wrong number means the tier table is wrong, which also means checkout would charge wrong). FAQ accordions open. "How our content is made" link works. Tab icon is Daniel, not the FM logo.
- **Greeting:** log in → welcome page says "Welcome back, *<your first name>*" (not your email prefix). Older accounts without metadata just say "Welcome back".
- **Check-in loop:** dashboard → weekly check-in → submit → confirm the plan shows the "Daniel recommends practising …" card, and Parent Insights shows the same suggestion under actions.
- **Family Gold (needs a `top`-tier account):** set Daniel-time days, save an appointment, add a follow-up task, tick a practitioner task → **open the same account on a second device/browser** → everything is there. Also confirm data entered on the old localStorage version migrated up on first load.
- **Arcade:** the challenge-of-the-day banner shows; win a game → end screen shows "+1 star" (or +2 on the challenge) and the one-tap reflection; answer it → `select reflection from arcade_plays order by created_at desc limit 1;`. Win 5+ games → confirm the cap message appears and `children.stars` stops increasing from arcade play. Personal best appears on the game card after a reload.
- **Module player:** open 2–3 modules **including your oldest generated one** — confirm styling is intact (they now use a static Tailwind build instead of the CDN; if anything looks unstyled, note which module and we extend the safelist in `tailwind.module.config.js`).
- **Schools signup:** try an 11-character password → rejected; 12+ → accepted.

### Automated E2E (optional but recommended)

```powershell
npx playwright install chromium
# Public pages only:
$env:E2E_BASE_URL="https://<your dev site url>"; npm run test:e2e
# Add account flows:
$env:E2E_TEST_EMAIL="..."; $env:E2E_TEST_PASSWORD="..."; npm run test:e2e
```

---

## 7. Promote to prod (only after §2–§6 pass)

Prod (`mikxrneopcwuldmykswq`) currently has **neither the migrations nor the new functions**. Order matters — migrations first:

1. **Migrations:** `bash scripts/db-push-prod.sh`, or directly:
   ```powershell
   npx supabase db push --db-url "<prod db url from scripts/db-push-prod.sh>"
   ```
   Note: prod is also missing three earlier migrations (`20260613` device tokens, `20260625*` practitioner tables) — they'll go along for the ride; review them before pushing.
2. **Secrets on prod:** repeat §1 with `--project-ref mikxrneopcwuldmykswq`, using **live** Stripe keys and a fresh `CRON_SECRET`.
3. **Functions:**
   ```powershell
   npx supabase functions deploy start-paid-signup --project-ref mikxrneopcwuldmykswq --no-verify-jwt
   npx supabase functions deploy send-weekly-summary --project-ref mikxrneopcwuldmykswq --no-verify-jwt
   npx supabase functions deploy stripe-webhook --project-ref mikxrneopcwuldmykswq --no-verify-jwt
   npx supabase functions deploy create-checkout-session --project-ref mikxrneopcwuldmykswq --no-verify-jwt
   npx supabase functions deploy schools-auth --project-ref mikxrneopcwuldmykswq --no-verify-jwt
   ```
4. **Stripe live webhook** → prod function URL, same event list, set the live `STRIPE_WEBHOOK_SECRET`.
5. **Cron on prod:** §4.2 with the prod ref/secret.
6. **Front-end deploy:** build (`npm run build`) and ship with the production env vars pointing at whichever project actually backs `app.danielsdiaries.com.au`.
7. **One live-mode transaction** with a real card for a small amount (then refund it in Stripe) — the final proof.

---

## Quick reference — what to look at when something misbehaves

| Symptom | Look at |
|---|---|
| Signup says "Something went wrong starting your signup" | Function logs: Dashboard → Edge Functions → `start-paid-signup` → Logs |
| Paid but not activated | `stripe-webhook` logs; `select * from stripe_webhook_events order by received_at desc;`; Stripe → Webhooks → delivery attempts |
| Credits look doubled/missing | `select * from stripe_credit_grants;` — one row per invoice/session is correct |
| Weekly email didn't send | `weekly_email_log` (was it already sent this week?), `cron.job_run_details`, function logs |
| Gold data not saving | Browser console (`[familyGold] save failed`), then RLS: the account must own the child row |
| Arcade stars not appearing | `select * from arcade_plays order by created_at desc;` — `stars_earned = 0` means the daily cap was hit (working as designed) |
