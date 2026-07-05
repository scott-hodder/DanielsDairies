-- Weekly parent summary email schedule.
--
-- Run this ONCE against the production database (SQL editor or psql) after
-- deploying the send-weekly-summary edge function. It is intentionally NOT a
-- migration because pg_cron/pg_net must be enabled on the project first
-- (Dashboard -> Database -> Extensions) and the secrets differ per environment.
--
-- Before running, set the two values below:
--   1. YOUR_CRON_SECRET  — must match the CRON_SECRET env var configured on
--      the send-weekly-summary edge function.
--   2. The project ref in the URL.
--
-- Schedule: Sundays 08:00 UTC (6pm-7pm Australian Eastern) — adjust to taste.

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

select cron.schedule(
  'weekly-parent-summary',
  '0 8 * * 0',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-weekly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To remove: select cron.unschedule('weekly-parent-summary');
