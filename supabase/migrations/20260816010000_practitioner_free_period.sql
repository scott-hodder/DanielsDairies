-- Practitioner Hub free period:
--   The hub is free while the practitioner offering is developed — the
--   paywall (trial expiry + plan limits) is deliberately switched off.
--   This replaces enforce_practitioner_client_limit with a permissive
--   version that still provisions the subscription row (so plan data and
--   the future paywall keep working) but never blocks adding clients.
--   Restore the enforcing version from 20260705001000 when billing returns.

CREATE OR REPLACE FUNCTION public.enforce_practitioner_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Keep provisioning the subscription row for future billing, but during
  -- the free period nothing is enforced: no trial expiry, no client limits.
  INSERT INTO public.practitioner_subscriptions (practitioner_user_id, plan_code, status, trial_ends_at)
  VALUES (NEW.practitioner_user_id, 'solo', 'trialing', now() + interval '30 days')
  ON CONFLICT (practitioner_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
