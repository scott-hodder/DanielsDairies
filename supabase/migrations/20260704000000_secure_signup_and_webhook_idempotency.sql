-- Secure paid signup flow + Stripe webhook idempotency
--
-- 1. stripe_webhook_events: every processed Stripe event id is recorded here.
--    The webhook inserts the event id before processing; a conflict means the
--    event was already handled (Stripe retries re-deliver the same event id),
--    so the webhook acks without re-processing.
--
-- 2. stripe_credit_grants: one row per credit-granting action, keyed by a
--    stable grant key (invoice id or checkout session id). Credits are only
--    granted when the insert succeeds, so duplicate events / overlapping
--    handlers (checkout.session.completed + invoice.paid for the same
--    invoice) can never double-grant.
--
-- 3. pending_signups: paid-signup accounts are now created server-side BEFORE
--    the Stripe redirect. This table tracks the pending state and holds a
--    single-purpose resume token so a cancelled checkout can be retried
--    without re-transmitting credentials.

CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "event_id" text PRIMARY KEY,
    "event_type" text,
    "received_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."stripe_credit_grants" (
    "grant_key" text PRIMARY KEY,
    "parent_id" uuid REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "credits" integer NOT NULL,
    "source" text,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."pending_signups" (
    "parent_id" uuid PRIMARY KEY REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "email" text NOT NULL,
    "plan" text NOT NULL,
    "resume_token" uuid NOT NULL DEFAULT gen_random_uuid(),
    "status" text NOT NULL DEFAULT 'awaiting_payment'
        CHECK ("status" IN ('awaiting_payment', 'completed', 'expired')),
    "stripe_customer_id" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "pending_signups_email_idx" ON "public"."pending_signups" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "pending_signups_resume_token_uidx" ON "public"."pending_signups" ("resume_token");

-- Service-role only: RLS enabled with no policies means anon/authenticated
-- clients cannot read or write these tables at all.
ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stripe_credit_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pending_signups" ENABLE ROW LEVEL SECURITY;

-- Keep old webhook event records from growing unbounded (webhook retries stop
-- after ~3 days; 30 days is a generous audit window).
CREATE OR REPLACE FUNCTION "public"."prune_stripe_webhook_events"()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.stripe_webhook_events WHERE received_at < now() - interval '30 days';
$$;
