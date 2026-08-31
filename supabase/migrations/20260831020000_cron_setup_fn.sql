-- Cron bootstrap for the reminder loops, callable via RPC.
--
-- Why a function instead of raw cron.schedule statements in a migration:
-- the scheduled command must embed CRON_SECRET, which is env-specific and
-- must never be committed. The deploy step calls this function once per
-- environment (service-role only) with the secret and the functions base
-- URL; it (re)schedules all three jobs idempotently.
--
--   select public.setup_reminder_crons(
--     '<CRON_SECRET>', 'https://<ref>.supabase.co/functions/v1');
--
-- Schedules (UTC; Brisbane = UTC+10):
--   daily-reminders-morning  30 21 * * *  -> 7:30am Brisbane
--   daily-reminders-evening  30 7 * * *   -> 5:30pm Brisbane (streak guard)
--   weekly-parent-summary    0 8 * * 0    -> 6pm Sunday Brisbane

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.setup_reminder_crons(p_cron_secret text, p_functions_base text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Service role / direct SQL only; never client sessions.
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'forbidden';
  end if;
  if p_cron_secret is null or length(p_cron_secret) < 16 then
    raise exception 'cron secret too short';
  end if;

  for r in
    select jobname from cron.job
    where jobname in ('weekly-parent-summary', 'daily-reminders-morning', 'daily-reminders-evening')
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

  return (
    select jsonb_agg(jsonb_build_object('jobname', jobname, 'schedule', schedule, 'active', active) order by jobname)
    from cron.job
    where jobname in ('weekly-parent-summary', 'daily-reminders-morning', 'daily-reminders-evening')
  );
end;
$$;

revoke execute on function public.setup_reminder_crons(text, text) from public;
revoke execute on function public.setup_reminder_crons(text, text) from anon;
revoke execute on function public.setup_reminder_crons(text, text) from authenticated;
grant execute on function public.setup_reminder_crons(text, text) to service_role;

-- Read-only companion: job names + schedules only (never the command,
-- which embeds the secret).
create or replace function public.list_reminder_crons()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('jobname', jobname, 'schedule', schedule, 'active', active) order by jobname), '[]'::jsonb)
  from cron.job
  where jobname in ('weekly-parent-summary', 'daily-reminders-morning', 'daily-reminders-evening');
$$;

revoke execute on function public.list_reminder_crons() from public;
revoke execute on function public.list_reminder_crons() from anon;
revoke execute on function public.list_reminder_crons() from authenticated;
grant execute on function public.list_reminder_crons() to service_role;
