-- ============================================================
-- FIX: missing table GRANTs.
--
-- This database does NOT apply default privileges to new tables, so any
-- migration that creates a table without explicit GRANTs produces a table
-- that even the service role cannot touch ("permission denied"). That
-- silently broke, since 13 June:
--   * stripe-webhook      → could not record events → 500 on EVERY Stripe
--                           event → subscriptions never activated, credits
--                           never granted (the "paid Gold, 0 credits" bug)
--   * start-paid-signup   → pending_signups writes refused (resume broken)
--   * Family Gold hub     → gold_* saves refused
--   * arcade recording    → arcade_plays reads refused for parents
--   * weekly email log    → double-send protection refused
--   * push notifications  → device_tokens refused
--   * telemetry           → client_events/client_errors refused
--
-- RLS policies still apply on top of these grants — granting to
-- authenticated does not expose other families' rows.
--
-- RULE FOR ALL FUTURE MIGRATIONS: every CREATE TABLE must be followed by
-- explicit GRANTs (see 20260705001000_practitioner_plans_invites.sql for
-- the pattern — those tables worked because they granted explicitly).
-- ============================================================

-- Server-only tables (edge functions with the service role)
GRANT ALL ON TABLE public.pending_signups        TO service_role;
GRANT ALL ON TABLE public.stripe_webhook_events  TO service_role;
GRANT ALL ON TABLE public.stripe_credit_grants   TO service_role;
GRANT ALL ON TABLE public.weekly_email_log       TO service_role;
GRANT ALL ON TABLE public.client_events          TO service_role;
GRANT ALL ON TABLE public.client_errors          TO service_role;

-- Push notification tokens (clients register their own; RLS scopes rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.device_tokens TO authenticated;
GRANT ALL ON TABLE public.device_tokens TO service_role;

-- Family Gold hub (parent-scoped via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gold_support_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gold_appointments    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gold_tasks           TO authenticated;
GRANT ALL ON TABLE public.gold_support_settings TO service_role;
GRANT ALL ON TABLE public.gold_appointments     TO service_role;
GRANT ALL ON TABLE public.gold_tasks            TO service_role;

-- Arcade plays: parents read their children's plays (writes go through
-- SECURITY DEFINER RPCs, so no INSERT/UPDATE grant is needed)
GRANT SELECT ON TABLE public.arcade_plays TO authenticated;
GRANT ALL ON TABLE public.arcade_plays TO service_role;

-- Sequences backing identity columns (needed for inserts by service_role)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
