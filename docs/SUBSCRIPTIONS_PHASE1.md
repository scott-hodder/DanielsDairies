# Subscription System (Phase 1: No Stripe)

This phase introduces subscription tiers + monthly credit unlocks without Stripe in the **main app** (non React-sidecar).

## 1) Run migration

Apply:

- `supabase/migrations/202602260003_add_subscription_credit_system.sql`

It creates:

- `subscription_tiers`
- `parent_subscriptions`
- `subscription_credit_ledger`
- `module_unlocks`
- `v_parent_credit_summary`
- RPC `unlock_module_with_credit(p_module_id, p_period_start)`

## 2) Testing flow

1. Open **Billing** page (`/billing.html`).
2. Save subscription profile for your user (tier/status/period).
3. Add credits manually in Supabase SQL editor (or use the quick grant form on Billing page):

```sql
insert into public.subscription_credit_ledger (
  parent_id,
  period_start,
  period_end,
  entry_type,
  credits_delta,
  notes,
  created_by
)
values (
  '<YOUR_AUTH_USER_ID>',
  date_trunc('month', now())::date,
  (date_trunc('month', now()) + interval '1 month - 1 day')::date,
  'grant',
  4,
  'Manual testing credit grant',
  '<YOUR_AUTH_USER_ID>'
);
```

4. Open **Dashboard** and click **Unlock** on locked modules.
5. Confirm wallet totals update and unlocks appear immediately.

## 3) Current unlock behavior

- One credit unlocks one module.
- Unlocks are period-bound (`period_start`, `period_end`) to match monthly billing cycles.
- Legacy module access from `parent_modules` remains respected for backward compatibility.

## 4) Stripe phase (future)

Stripe webhooks will later populate:

- `parent_subscriptions` status and period windows.
- Monthly grant entries in `subscription_credit_ledger`.

No rewrite should be needed for unlock logic when Stripe is connected.
