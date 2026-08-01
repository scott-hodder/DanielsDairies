CREATE TABLE IF NOT EXISTS public.feedback_email_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.feedback_email_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feedback_email_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_feedback_email_slot(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claimed_user_id uuid;
BEGIN
  DELETE FROM public.feedback_email_rate_limits
  WHERE user_id = p_user_id
    AND window_start < date_trunc('hour', now()) - interval '24 hours';

  INSERT INTO public.feedback_email_rate_limits (user_id, window_start, request_count)
  VALUES (p_user_id, date_trunc('hour', now()), 1)
  ON CONFLICT (user_id, window_start) DO UPDATE
    SET request_count = feedback_email_rate_limits.request_count + 1
    WHERE feedback_email_rate_limits.request_count < 5
  RETURNING user_id INTO claimed_user_id;

  RETURN claimed_user_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_feedback_email_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_feedback_email_slot(uuid) TO service_role;

