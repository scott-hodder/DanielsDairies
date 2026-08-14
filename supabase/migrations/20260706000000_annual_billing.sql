-- ============================================================
-- Annual billing (family plans)
--
-- Annual price = 10 x monthly ("2 months free"). The price is computed
-- from subscription_tiers.monthly_price_cents at checkout time, so a
-- price change automatically reprices annual too.
--
-- billing_interval travels with the pending signup (so a resumed
-- checkout keeps the same billing choice) and is recorded on the
-- subscription row (so the profile/billing UI can show it).
-- ============================================================

ALTER TABLE public.pending_signups
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pending_signups_billing_interval_check'
  ) THEN
    ALTER TABLE public.pending_signups
      ADD CONSTRAINT pending_signups_billing_interval_check
      CHECK (billing_interval IN ('monthly', 'annual'));
  END IF;
END $$;

ALTER TABLE public.parent_subscriptions
  ADD COLUMN IF NOT EXISTS billing_interval text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parent_subscriptions_billing_interval_check'
  ) THEN
    ALTER TABLE public.parent_subscriptions
      ADD CONSTRAINT parent_subscriptions_billing_interval_check
      CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'annual'));
  END IF;
END $$;
