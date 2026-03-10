# Stripe subscriptions setup for DanielsDairies (Supabase)

This guide maps Stripe subscriptions to your existing tables:

- `public.subscription_tiers`
- `public.parent_subscriptions`
- `public.subscription_credit_ledger`
- `public.module_unlocks`

## 1) Decide the Stripe ↔ tier mapping

Use one Stripe Product for "Daniels Dairies Subscription", and 3 recurring Prices:

- `low`
- `mid`
- `top`

Store the internal tier in Stripe Price metadata:

- metadata key: `tier`
- value: one of `low | mid | top`

This removes hardcoded Stripe Price IDs in your app and lets the webhook infer tier directly.

## 2) Prepare Supabase data

Seed/verify `subscription_tiers`:

```sql
insert into public.subscription_tiers (tier, modules_per_month, monthly_price_cents)
values
  ('low', 4, 1900),
  ('mid', 8, 3900),
  ('top', 16, 6900)
on conflict (tier) do update set
  modules_per_month = excluded.modules_per_month,
  monthly_price_cents = excluded.monthly_price_cents,
  updated_at = now();
```

## 3) Add Stripe IDs to your model (recommended)

Your current schema does not persist Stripe customer/subscription IDs. Add columns so webhooks are idempotent and reversible:

```sql
alter table public.parent_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_current_period_start timestamptz,
  add column if not exists stripe_current_period_end timestamptz;

create unique index if not exists parent_subscriptions_stripe_customer_uidx
  on public.parent_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists parent_subscriptions_stripe_subscription_uidx
  on public.parent_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
```

## 4) Create Stripe objects

In Stripe Dashboard (test mode first):

1. Create product `Daniels Dairies Subscription`.
2. Create 3 monthly recurring prices.
3. On each Price, set metadata `tier` = `low` / `mid` / `top`.
4. Enable payment methods you want (card first is simplest).
5. Copy these secrets for Supabase:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (after webhook endpoint creation)

## 5) Create Supabase Edge Function: create-checkout-session

Purpose:
- Require authenticated parent.
- Create/reuse Stripe customer.
- Start Checkout Session for selected tier.

Inputs from client:
- `tier` (`low|mid|top`)
- `success_url`
- `cancel_url`

Server flow:
1. Read `auth.uid()`.
2. Resolve tier → Stripe price (either lookup by metadata or env map).
3. Create/retrieve customer with metadata `parent_id = auth.uid()`.
4. Create checkout session (`mode=subscription`).
5. Return `url`.

Important:
- Never expose `STRIPE_SECRET_KEY` in frontend.
- Keep this function with service role permissions server-side only.

## 6) Create Supabase Edge Function: stripe-webhook

Purpose:
- Verify Stripe signature.
- Update `parent_subscriptions`.
- Grant monthly credits in `subscription_credit_ledger`.

Handle these Stripe events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### Status mapping

Map Stripe subscription status to your enum:

- `trialing` -> `trialing`
- `active` -> `active`
- `past_due` / `unpaid` -> `past_due`
- `canceled` / `incomplete_expired` -> `canceled`
- `paused` -> `paused`
- fallback -> `inactive`

### Tier resolution

Resolve tier from:
1. Subscription item price metadata `tier`, else
2. lookup table of known Price IDs.

### Credit grant rule

On each successful billing cycle (usually `invoice.paid` for subscription invoice):

1. Determine billing period start/end from invoice lines/subscription.
2. Get `modules_per_month` from `subscription_tiers` for resolved tier.
3. Insert one `grant` ledger row with `credits_delta = modules_per_month`.
4. Make it idempotent (do not double-grant for same parent+period+invoice).

Recommended uniqueness helper:
- Add `external_event_id text` on ledger and unique index, or
- Add deterministic note token like `invoice:{invoice_id}` + unique expression index.

## 7) Stripe webhook endpoint configuration

In Stripe Dashboard > Developers > Webhooks:

1. Add endpoint:
   - `https://<PROJECT-REF>.supabase.co/functions/v1/stripe-webhook`
2. Select events listed above.
3. Copy signing secret into Supabase secret `STRIPE_WEBHOOK_SECRET`.

Deploy functions and set secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

## 8) Row Level Security and permissions

- Client should only read/update its own `parent_subscriptions` by `parent_id = auth.uid()`.
- `subscription_credit_ledger` should generally be read-only to parent, writes only by backend (service role / webhook).
- Webhook function should use service role key internally to bypass RLS safely.

## 9) Wire frontend billing page

Your current page is a manual test lab. Replace "save subscription profile" with:

1. Tier selection UI.
2. POST to `create-checkout-session`.
3. Redirect user to returned Stripe Checkout URL.
4. After success return, refresh subscription from DB.

Optionally add "Manage billing" button via Stripe Billing Portal function.

## 10) Test end-to-end in Stripe test mode

1. Start checkout with test card `4242 4242 4242 4242`.
2. Confirm `parent_subscriptions` updated:
   - `tier`, `status`, period dates, Stripe IDs.
3. Confirm one `grant` row in `subscription_credit_ledger` for the paid period.
4. Trigger renewal (`invoice.paid`) using Stripe test clocks or manual invoice event.
5. Verify second period grant appears once only.
6. Trigger `invoice.payment_failed`; verify status becomes `past_due`.
7. Cancel subscription; verify status transitions correctly and no future grants.

## 11) Optional hardening (recommended)

- Add `billing_events` table with unique `stripe_event_id` to enforce webhook idempotency.
- Add retry-safe SQL function:
  - upsert subscription snapshot
  - grant credits once per `parent_id + period_start + period_end + source_invoice_id`
- Add audit logs for admin visibility.

## 12) Minimal SQL RPC shape for safe credit grant

A single Postgres function called by webhook can:

- lock parent subscription row (`for update`)
- upsert subscription state
- insert grant ledger row if not already present
- return resulting balance summary

This keeps Stripe webhook handling deterministic even under retries.

---

## Quick checklist

- [ ] Stripe product + 3 prices created
- [ ] Price metadata includes `tier`
- [ ] Supabase secrets set
- [ ] `create-checkout-session` deployed
- [ ] `stripe-webhook` deployed
- [ ] Webhook signature verification enabled
- [ ] `parent_subscriptions` stores Stripe IDs
- [ ] Ledger grants are idempotent
- [ ] Billing page redirects to Checkout
- [ ] Test-mode events verified end-to-end
