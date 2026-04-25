-- Add is_practitioner flag to parent_profiles
ALTER TABLE parent_profiles
ADD COLUMN IF NOT EXISTS is_practitioner boolean DEFAULT false;

-- Helper function to check practitioner status (mirrors is_user_admin_check pattern)
CREATE OR REPLACE FUNCTION is_user_practitioner_check(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_practitioner FROM parent_profiles WHERE id = user_id),
    false
  );
$$;
