-- ============================================================
-- Observability: client error tracking + funnel analytics.
--
-- Self-hosted in Supabase (no external analytics account):
--   client_errors  — uncaught JS errors / promise rejections
--   client_events  — funnel + product events (landing_view,
--                    signup_start, checkout_redirect, module_completed…)
--
-- Writes go through SECURITY DEFINER RPCs (log_client_error /
-- log_client_event) so payload sizes are capped server-side and the
-- tables never need INSERT grants. Reads are service-role only (the
-- dashboard/SQL editor) — no client can read anyone's telemetry.
-- Queries to actually use this live in docs/OBSERVABILITY.md.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,             -- null for anonymous visitors
  session_id text,          -- per-tab session, groups a visit's events
  event text NOT NULL,
  page text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS client_events_event_time_idx
  ON public.client_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS client_events_session_idx
  ON public.client_events (session_id, created_at);

CREATE TABLE IF NOT EXISTS public.client_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  session_id text,
  message text NOT NULL,
  stack text,
  page text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS client_errors_time_idx
  ON public.client_errors (created_at DESC);

ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (dashboard/SQL) can read; writes go
-- through the RPCs below.

CREATE OR REPLACE FUNCTION public.log_client_event(
  p_event text,
  p_page text DEFAULT NULL,
  p_props jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event IS NULL OR length(trim(p_event)) = 0 THEN RETURN; END IF;
  INSERT INTO public.client_events (user_id, session_id, event, page, props)
  VALUES (
    auth.uid(),
    LEFT(COALESCE(p_session_id, ''), 64),
    LEFT(trim(p_event), 64),
    LEFT(COALESCE(p_page, ''), 200),
    CASE WHEN pg_column_size(COALESCE(p_props, '{}'::jsonb)) <= 4096
         THEN COALESCE(p_props, '{}'::jsonb)
         ELSE jsonb_build_object('_truncated', true) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_client_error(
  p_message text,
  p_stack text DEFAULT NULL,
  p_page text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN RETURN; END IF;
  -- Per-session flood guard: at most 20 stored errors per session per hour.
  IF p_session_id IS NOT NULL AND (
    SELECT count(*) FROM public.client_errors
    WHERE session_id = LEFT(p_session_id, 64)
      AND created_at > now() - interval '1 hour'
  ) >= 20 THEN
    RETURN;
  END IF;
  INSERT INTO public.client_errors (user_id, session_id, message, stack, page, user_agent)
  VALUES (
    auth.uid(),
    LEFT(COALESCE(p_session_id, ''), 64),
    LEFT(trim(p_message), 500),
    LEFT(COALESCE(p_stack, ''), 4000),
    LEFT(COALESCE(p_page, ''), 200),
    LEFT(COALESCE(p_user_agent, ''), 300)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_client_event(text, text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text) TO anon, authenticated;

-- Keep the tables from growing without bound: telemetry older than 90
-- days has no operational value. (Runs opportunistically — call from a
-- cron job, or manually; see docs/OBSERVABILITY.md.)
CREATE OR REPLACE FUNCTION public.prune_telemetry()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.client_events WHERE created_at < now() - interval '90 days';
  DELETE FROM public.client_errors WHERE created_at < now() - interval '90 days';
$$;
