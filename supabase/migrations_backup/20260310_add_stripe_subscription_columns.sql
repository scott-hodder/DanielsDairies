ALTER TABLE public.parent_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS stripe_current_period_start timestamptz,
ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS parent_subscriptions_stripe_customer_uidx
ON public.parent_subscriptions (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS parent_subscriptions_stripe_subscription_uidx
ON public.parent_subscriptions (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.subscription_credit_ledger
ADD COLUMN IF NOT EXISTS source_invoice_id text,
ADD COLUMN IF NOT EXISTS stripe_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_credit_ledger_source_invoice_uidx
ON public.subscription_credit_ledger (source_invoice_id)
WHERE source_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_credit_ledger_stripe_event_uidx
ON public.subscription_credit_ledger (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
