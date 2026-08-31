-- ============================================================================
-- Scheduled reminders — run ONCE per environment (Supabase SQL editor).
-- Supersedes cron_reminders/cron_weekly_summary templates.
--
-- Before running:
--   1. Replace YOUR_CRON_SECRET below with the CRON_SECRET secret configured
--      on the edge functions (Dashboard -> Edge Functions -> Secrets).
--   2. The URL below targets PROD (mikxrneopcwuldmykswq). For dev use
--      wximnkhcpugfyjshgaim instead.
--
-- Schedule (all UTC; Brisbane = UTC+10):
--   daily-reminders morning  21:30 UTC  -> 7:30am Brisbane
--   daily-reminders evening  07:30 UTC  -> 5:30pm Brisbane (streak guard)
--   weekly-parent-summary    Sun 08:00 UTC -> 6pm Sunday Brisbane
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin perform cron.unschedule('weekly-parent-summary'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('daily-reminders-morning'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('daily-reminders-evening'); exception when others then null; end $$;

select cron.schedule(
  'daily-reminders-morning',
  '30 21 * * *',
  $$
  select net.http_post(
    url := 'https://mikxrneopcwuldmykswq.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', 'YOUR_CRON_SECRET'),
    body := '{"mode":"morning"}'::jsonb
  );
  $$
);

select cron.schedule(
  'daily-reminders-evening',
  '30 7 * * *',
  $$
  select net.http_post(
    url := 'https://mikxrneopcwuldmykswq.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', 'YOUR_CRON_SECRET'),
    body := '{"mode":"evening"}'::jsonb
  );
  $$
);

select cron.schedule(
  'weekly-parent-summary',
  '0 8 * * 0',
  $$
  select net.http_post(
    url := 'https://mikxrneopcwuldmykswq.supabase.co/functions/v1/send-weekly-summary',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

-- Verify: select jobname, schedule, active from cron.job;
-- Remove: select cron.unschedule('<jobname>');
