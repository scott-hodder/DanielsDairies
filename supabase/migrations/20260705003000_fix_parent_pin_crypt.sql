-- Fix Parent Zone PIN functions: pgcrypto (crypt/gen_salt) lives in the
-- "extensions" schema on Supabase, so the functions need it on their
-- search_path or set_parent_pin fails with "function crypt does not exist".

CREATE OR REPLACE FUNCTION public.set_parent_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
SET search_path TO 'public', 'extensions'
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
