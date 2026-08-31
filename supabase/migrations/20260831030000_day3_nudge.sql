-- Day-3 onboarding nudge.
--
-- 1. parent_profiles.day3_nudge_sent_at dedupes the one-time nudge email
--    (set when sent OR when skipped because the family already engaged).
-- 2. setup_reminder_crons gains a fourth job, 'day3-nudge', hitting the
--    send-day3-nudge edge function daily at 22:00 UTC (8am Brisbane).
--    Re-run the RPC after applying (see supabase/cron_reminders.sql).

alter table public.parent_profiles
  add column if not exists day3_nudge_sent_at timestamptz;

create or replace function public.setup_reminder_crons(p_cron_secret text, p_functions_base text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'forbidden';
  end if;
  if p_cron_secret is null or length(p_cron_secret) < 16 then
    raise exception 'cron secret too short';
  end if;

  for r in
    select jobname from cron.job
    where jobname in ('weekly-parent-summary', 'daily-reminders-morning', 'daily-reminders-evening', 'day3-nudge')
  loop
    perform cron.unschedule(r.jobname);
  end loop;

  perform cron.schedule(
    'daily-reminders-morning',
    '30 21 * * *',
    format(
      $fmt$select net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', %L), body := '{"mode":"morning"}'::jsonb);$fmt$,
      p_functions_base || '/daily-reminders', p_cron_secret
    )
  );

  perform cron.schedule(
    'daily-reminders-evening',
    '30 7 * * *',
    format(
      $fmt$select net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', %L), body := '{"mode":"evening"}'::jsonb);$fmt$,
      p_functions_base || '/daily-reminders', p_cron_secret
    )
  );

  perform cron.schedule(
    'weekly-parent-summary',
    '0 8 * * 0',
    format(
      $fmt$select net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', %L), body := '{}'::jsonb);$fmt$,
      p_functions_base || '/send-weekly-summary', p_cron_secret
    )
  );

  perform cron.schedule(
    'day3-nudge',
    '0 22 * * *',
    format(
      $fmt$select net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', %L), body := '{}'::jsonb);$fmt$,
      p_functions_base || '/send-day3-nudge', p_cron_secret
    )
  );

  return (
    select jsonb_agg(jsonb_build_object('jobname', jobname, 'schedule', schedule, 'active', active) order by jobname)
    from cron.job
    where jobname in ('weekly-parent-summary', 'daily-reminders-morning', 'daily-reminders-evening', 'day3-nudge')
  );
end;
$$;

create or replace function public.list_reminder_crons()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('jobname', jobname, 'schedule', schedule, 'active', active) order by jobname), '[]'::jsonb)
  from cron.job
  where jobname in ('weekly-parent-summary', 'daily-reminders-morning', 'daily-reminders-evening', 'day3-nudge');
$$;
