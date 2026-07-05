-- Weekly parent progress email preferences.
--
-- weekly_email_opt_out: parents can opt out (unsubscribe link in every email).
-- weekly_email_token: single-purpose token embedded in the unsubscribe link so
-- it works without login (required for compliant one-click unsubscribe).

ALTER TABLE "public"."parent_profiles"
    ADD COLUMN IF NOT EXISTS "weekly_email_opt_out" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "weekly_email_token" uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS "parent_profiles_weekly_email_token_uidx"
    ON "public"."parent_profiles" ("weekly_email_token");

-- Log of sent weekly emails: prevents double-sends if the cron job fires twice
-- and gives an audit trail.
CREATE TABLE IF NOT EXISTS "public"."weekly_email_log" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "parent_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "week_key" text NOT NULL,
    "variant" text NOT NULL,
    "sent_at" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("parent_id", "week_key")
);

ALTER TABLE "public"."weekly_email_log" ENABLE ROW LEVEL SECURITY;
