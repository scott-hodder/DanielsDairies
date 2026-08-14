-- Parent Zone PIN: a short PIN that gates parent-only surfaces (profile,
-- billing, parent insights) from children using the shared family session.
-- Same trust model and hashing as child profile passwords (bcrypt via
-- pgcrypto) — it's a child gate, not an account-security boundary.

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS parent_pin_hash text;

-- Set (or clear, with NULL) the caller's own Parent Zone PIN
CREATE OR REPLACE FUNCTION public.set_parent_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_pin IS NULL THEN
    UPDATE public.parent_profiles SET parent_pin_hash = NULL WHERE id = auth.uid();
    RETURN true;
  END IF;

  IF p_pin !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION 'PIN must be 4 to 8 digits';
  END IF;

  UPDATE public.parent_profiles
  SET parent_pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_parent_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT parent_pin_hash INTO v_hash
  FROM public.parent_profiles WHERE id = auth.uid();

  RETURN v_hash IS NOT NULL AND v_hash = crypt(COALESCE(p_pin, ''), v_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_parent_pin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT COALESCE(
    (SELECT parent_pin_hash IS NOT NULL FROM public.parent_profiles WHERE id = auth.uid()),
    false
  );
$$;
