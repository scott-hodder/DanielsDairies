-- Reminder + lifecycle email plumbing.
--
-- 1. Per-mode send tracking for the daily reminders: the old single
--    last_sent_at with a 20h window meant an evening streak-guard could
--    never fire after a morning reminder. last_sent_modes stores
--    {"morning": ts, "evening": ts} per endpoint/token.
-- 2. device_tokens gets the same column so the iOS (APNs) channel is
--    rate-limited identically.
-- 3. parent_profiles.welcome_email_sent_at dedupes the one-time welcome
--    email (sent by complete-signup and stripe-webhook).

alter table public.push_subscriptions
  add column if not exists last_sent_modes jsonb not null default '{}'::jsonb;

alter table public.device_tokens
  add column if not exists last_sent_modes jsonb not null default '{}'::jsonb;

alter table public.parent_profiles
  add column if not exists welcome_email_sent_at timestamptz;

-- Belt-and-braces grants (these DBs do not apply default privileges):
grant select, insert, update, delete on public.device_tokens to service_role;
grant select, update, delete on public.push_subscriptions to service_role;
