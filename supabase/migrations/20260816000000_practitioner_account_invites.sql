-- Practitioner account invites:
--   - Admins invite a practitioner by email from the Admin Centre.
--   - The invite email carries a tokenised link to practitioner-signup.html,
--     where the practitioner creates their account; the invite token is what
--     grants is_practitioner (never client-side writes).
--   - Redemption also provisions a "Demo Explorer" child so practitioners can
--     tour the adventure map and modules without a real child profile.
--   - Distinct from practitioner_invites, which is practitioners inviting
--     client FAMILIES to their caseload.

-- ============================================================
-- 1. Invite table (service-role only; managed by edge functions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.practitioner_account_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prac_account_invites_email
  ON public.practitioner_account_invites (lower(email));

ALTER TABLE public.practitioner_account_invites ENABLE ROW LEVEL SECURITY;

-- No client policies: only the service role (edge functions) and the
-- SECURITY DEFINER redeem function below touch this table.
-- These databases do NOT apply default privileges to new tables — every
-- new table needs explicit GRANTs or even the service role is locked out.
GRANT ALL ON public.practitioner_account_invites TO service_role;

-- ============================================================
-- 2. Redeem RPC — called by a logged-in user holding an invite token.
--    Covers the "this email already had an account" path and acts as a
--    safety net if the signup edge function set nothing.
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_practitioner_account_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.practitioner_account_invites%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.practitioner_account_invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid');
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = auth.uid();

  IF v_email IS NULL OR lower(v_email) != lower(v_invite.email) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'email_mismatch');
  END IF;

  UPDATE public.parent_profiles
  SET is_practitioner = true
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.parent_profiles (id, is_practitioner)
    VALUES (auth.uid(), true)
    ON CONFLICT (id) DO UPDATE SET is_practitioner = true;
  END IF;

  -- Demo child so the practitioner can tour the app without a real child.
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE parent_user_id = auth.uid()) THEN
    INSERT INTO public.children (parent_user_id, name, stars, spendable_stars)
    VALUES (auth.uid(), 'Demo Explorer', 0, 0);
  END IF;

  UPDATE public.practitioner_account_invites
  SET status = 'accepted',
      accepted_user_id = auth.uid(),
      accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_practitioner_account_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_practitioner_account_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_practitioner_account_invite(text) TO service_role;
