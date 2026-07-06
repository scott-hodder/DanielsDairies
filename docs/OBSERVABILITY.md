# Observability — errors & funnel analytics

_Added 6 July 2026. Self-hosted in Supabase: no external analytics account, no third-party
scripts, no cookies. Data lives in `client_errors` and `client_events` (service-role read
only) and is pruned after 90 days by `prune_telemetry()`._

## What gets recorded

**Errors** (`client_errors`) — every uncaught JS error and unhandled promise rejection on
pages that call `initTelemetry()`: landing, signup, dashboard, profile, practitioner hub.
Deduped per page load, capped at 10 per page load and 20 per session per hour (server-side).

**Events** (`client_events`) — the funnel:

| Event | Where | Props |
|---|---|---|
| `page_view` | every instrumented page | — |
| `pricing_cta_click` | landing pricing cards | `plan`, `billing` |
| `signup_start` | signup step 1 completed | `trial` |
| `checkout_redirect` | leaving for Stripe | `plan`, `billing` |
| `signup_payment_success` | back from Stripe, paid | `plan`, `billing` |
| `signup_payment_cancelled` | back from Stripe, not paid | `plan`, `has_resume` |
| `free_trial_created` | trial account created | — |
| `module_completed` | first completion of a module | `module_id` |
| `upgrade_checkout_start` | profile page upgrade/credits | `payment_type`, `months`, `credits` |
| `practitioner_checkout_start` | practitioner Plan & Billing | `plan` |

Add a new event anywhere with:
```js
import { trackEvent } from './lib/telemetry.js'
trackEvent('my_event', { any: 'props' })
```

## Queries (run in the Supabase SQL editor)

### Recent errors (start every morning here during beta)
```sql
select created_at, message, page, user_id, left(stack, 200) as stack_start
from client_errors
order by created_at desc
limit 50;
```

### Error frequency by message (what to fix first)
```sql
select left(message, 120) as message, count(*) as occurrences,
       count(distinct session_id) as sessions_affected,
       max(created_at) as last_seen
from client_errors
where created_at > now() - interval '7 days'
group by 1 order by 2 desc limit 20;
```

### The signup funnel, last 30 days
```sql
select event, count(*) as total, count(distinct session_id) as sessions
from client_events
where created_at > now() - interval '30 days'
  and event in ('page_view','pricing_cta_click','signup_start',
                'checkout_redirect','signup_payment_success','free_trial_created')
group by event
order by array_position(
  array['page_view','pricing_cta_click','signup_start',
        'checkout_redirect','signup_payment_success','free_trial_created'], event);
```

### Plan/billing mix of checkout starts
```sql
select props->>'plan' as plan, props->>'billing' as billing, count(*)
from client_events
where event = 'checkout_redirect' and created_at > now() - interval '30 days'
group by 1, 2 order by 3 desc;
```

### Modules completed per week (child engagement)
```sql
select date_trunc('week', created_at)::date as week, count(*) as modules_completed
from client_events
where event = 'module_completed'
group by 1 order by 1 desc limit 12;
```

### Housekeeping
```sql
select prune_telemetry(); -- delete telemetry older than 90 days
```
Optional: schedule it monthly with pg_cron:
```sql
select cron.schedule('prune-telemetry', '0 3 1 * *', 'select public.prune_telemetry()');
```

## Server-side (edge functions)

Edge function logs (including all `[Webhook]` money-path logging) are in
**Supabase Dashboard → Edge Functions → (function) → Logs**. Stripe deliveries and retries
are auditable in `stripe_webhook_events`; credit grants in `stripe_credit_grants`.

## What this deliberately is not

No session replay, no cross-site tracking, no PII in props (don't put names/emails in
`trackEvent` props). If the product outgrows this, Sentry (errors) + PostHog (product
analytics) are the natural upgrades — the `trackEvent` call sites transfer directly.
