-- Practitioner commercial model:
--   - Practitioners subscribe to a plan sized by active-client caseload.
--   - Every practitioner starts on a 30-day free trial with Solo limits.
--   - Client families keep their own Daniel's Diaries subscription; the
--     practitioner plan covers the professional tools, not child app access.
--   - Practitioners invite families with a one-time invite code; redeeming it
--     links the family's children to the practitioner's caseload.

-- ============================================================
-- 1. Plans
-- ============================================================

CREATE TABLE IF NOT EXISTS public.practitioner_plans (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  monthly_price_cents integer NOT NULL CHECK (monthly_price_cents >= 0),
  currency text NOT NULL DEFAULT 'aud',
  included_clients integer NOT NULL CHECK (included_clients > 0),
  practitioner_seats integer NOT NULL DEFAULT 1 CHECK (practitioner_seats > 0),
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  stripe_price_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.practitioner_plans
  (code, display_name, monthly_price_cents, included_clients, practitioner_seats, description, sort_order) VALUES
  ('solo',     'Solo',     7900,  15,  1,  'For individual practitioners. Up to 15 active clients, full client workspace, goals and progress tracking.', 10),
  ('practice', 'Practice', 17900, 40,  3,  'For small practices. Up to 40 active clients and up to 3 practitioner logins.', 20),
  ('clinic',   'Clinic',   34900, 100, 10, 'For clinics and organisations. Up to 100 active clients and up to 10 practitioner logins, priority support.', 30)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. Practitioner subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.practitioner_subscriptions (
  practitioner_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'solo' REFERENCES public.practitioner_plans(code),
  status text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'inactive')),
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Invites
-- ============================================================

CREATE TABLE IF NOT EXISTS public.practitioner_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  family_email text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_parent_user_id uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practitioner_invites_practitioner
  ON public.practitioner_invites(practitioner_user_id);

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.practitioner_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active plans readable by authenticated"
  ON public.practitioner_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Practitioners read own subscription"
  ON public.practitioner_subscriptions FOR SELECT
  TO authenticated
  USING (practitioner_user_id = auth.uid());

CREATE POLICY "Practitioners manage own invites"
  ON public.practitioner_invites FOR ALL
  TO authenticated
  USING (practitioner_user_id = auth.uid())
  WITH CHECK (practitioner_user_id = auth.uid());

GRANT SELECT ON public.practitioner_plans TO authenticated;
GRANT SELECT ON public.practitioner_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_invites TO service_role;

-- ============================================================
-- 5. Plan usage RPC — creates the 30-day trial on first call.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_practitioner_plan_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record;
  plan record;
  active_count bigint;
  pending_invites bigint;
BEGIN
  IF NOT is_user_practitioner_check(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized - practitioner access required';
  END IF;

  -- Provision the free trial on first use
  INSERT INTO public.practitioner_subscriptions (practitioner_user_id, plan_code, status, trial_ends_at)
  VALUES (auth.uid(), 'solo', 'trialing', now() + interval '30 days')
  ON CONFLICT (practitioner_user_id) DO NOTHING;

  SELECT * INTO sub FROM public.practitioner_subscriptions
  WHERE practitioner_user_id = auth.uid();

  SELECT * INTO plan FROM public.practitioner_plans WHERE code = sub.plan_code;

  SELECT count(*) INTO active_count
  FROM public.practitioner_clients
  WHERE practitioner_user_id = auth.uid() AND status = 'active';

  SELECT count(*) INTO pending_invites
  FROM public.practitioner_invites
  WHERE practitioner_user_id = auth.uid()
    AND status = 'pending' AND expires_at > now();

  RETURN jsonb_build_object(
    'plan_code', sub.plan_code,
    'plan_name', plan.display_name,
    'monthly_price_cents', plan.monthly_price_cents,
    'currency', plan.currency,
    'included_clients', plan.included_clients,
    'practitioner_seats', plan.practitioner_seats,
    'status', sub.status,
    'trial_ends_at', sub.trial_ends_at,
    'current_period_end', sub.current_period_end,
    'active_clients', active_count,
    'pending_invites', pending_invites,
    'trial_expired', (sub.status = 'trialing' AND sub.trial_ends_at < now())
  );
END;
$$;

-- ============================================================
-- 6. Client limit enforcement.
--    Runs whenever a caseload link becomes active. Reactivating an already
--    active row never fails (the row itself is excluded from the count).
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_practitioner_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record;
  plan_limit integer;
  active_count bigint;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO sub FROM public.practitioner_subscriptions
  WHERE practitioner_user_id = NEW.practitioner_user_id;

  -- No subscription row yet: provision the trial so early users are not blocked
  IF NOT FOUND THEN
    INSERT INTO public.practitioner_subscriptions (practitioner_user_id, plan_code, status, trial_ends_at)
    VALUES (NEW.practitioner_user_id, 'solo', 'trialing', now() + interval '30 days')
    ON CONFLICT (practitioner_user_id) DO NOTHING;
    SELECT * INTO sub FROM public.practitioner_subscriptions
    WHERE practitioner_user_id = NEW.practitioner_user_id;
  END IF;

  IF sub.status = 'trialing' AND sub.trial_ends_at < now() THEN
    RAISE EXCEPTION 'Your free trial has ended. Choose a plan to keep adding clients.';
  END IF;

  IF sub.status IN ('canceled', 'inactive', 'past_due') THEN
    RAISE EXCEPTION 'Your practitioner plan is not active. Reactivate your plan to add clients.';
  END IF;

  SELECT included_clients INTO plan_limit
  FROM public.practitioner_plans WHERE code = sub.plan_code;

  SELECT count(*) INTO active_count
  FROM public.practitioner_clients
  WHERE practitioner_user_id = NEW.practitioner_user_id
    AND status = 'active'
    AND id IS DISTINCT FROM NEW.id;

  IF active_count >= plan_limit THEN
    RAISE EXCEPTION 'You have reached the % active clients included in your plan. Upgrade your plan or archive a client to add more.', plan_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_practitioner_client_limit ON public.practitioner_clients;
CREATE TRIGGER tr_enforce_practitioner_client_limit
  BEFORE INSERT OR UPDATE ON public.practitioner_clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_practitioner_client_limit();

-- ============================================================
-- 7. Invite RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_practitioner_invite(p_family_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  invite record;
BEGIN
  IF NOT is_user_practitioner_check(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized - practitioner access required';
  END IF;

  -- Short, readable, unambiguous code
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.practitioner_invites (practitioner_user_id, invite_code, family_email)
  VALUES (auth.uid(), new_code, nullif(lower(trim(p_family_email)), ''))
  RETURNING * INTO invite;

  RETURN jsonb_build_object(
    'id', invite.id,
    'invite_code', invite.invite_code,
    'family_email', invite.family_email,
    'expires_at', invite.expires_at
  );
END;
$$;

-- Redeemed by the parent (any authenticated family account). Links every child
-- on the parent account to the inviting practitioner.
CREATE OR REPLACE FUNCTION public.redeem_practitioner_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite record;
  prac_name text;
  linked_count integer := 0;
  kid record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO invite FROM public.practitioner_invites
  WHERE invite_code = upper(trim(p_code)) AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite code is not valid or has already been used.';
  END IF;

  IF invite.expires_at < now() THEN
    UPDATE public.practitioner_invites SET status = 'expired' WHERE id = invite.id;
    RAISE EXCEPTION 'This invite has expired. Ask your practitioner to send a new one.';
  END IF;

  BEGIN
    FOR kid IN SELECT id FROM public.children WHERE parent_user_id = auth.uid() LOOP
      INSERT INTO public.practitioner_clients (practitioner_user_id, child_id, parent_user_id, status)
      VALUES (invite.practitioner_user_id, kid.id, auth.uid(), 'active')
      ON CONFLICT (practitioner_user_id, child_id)
        DO UPDATE SET status = 'active', parent_user_id = EXCLUDED.parent_user_id;
      linked_count := linked_count + 1;
    END LOOP;
  EXCEPTION WHEN raise_exception THEN
    -- The caseload-limit trigger fired: give the parent a friendlier message
    RAISE EXCEPTION 'Your practitioner''s client list is currently full. Please let them know so they can make room and re-invite you.';
  END;

  IF linked_count = 0 THEN
    RAISE EXCEPTION 'Add a child profile to your account first, then enter the invite code again.';
  END IF;

  UPDATE public.practitioner_invites
  SET status = 'accepted', accepted_parent_user_id = auth.uid(), accepted_at = now()
  WHERE id = invite.id;

  SELECT full_name INTO prac_name FROM public.parent_profiles
  WHERE id = invite.practitioner_user_id;

  RETURN jsonb_build_object(
    'practitioner_name', COALESCE(prac_name, 'your practitioner'),
    'linked_children', linked_count
  );
END;
$$;

-- updated_at maintenance (reuses the shared trigger function)
CREATE TRIGGER tr_practitioner_plans_updated_at
  BEFORE UPDATE ON public.practitioner_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER tr_practitioner_subscriptions_updated_at
  BEFORE UPDATE ON public.practitioner_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
