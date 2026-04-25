-- ============================================================
-- Schools Program Extension
-- ============================================================

-- 1) Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  access_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) School users (children and practitioners)
CREATE TABLE IF NOT EXISTS school_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('child', 'practitioner')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(auth_user_id, school_id)
);

-- 3) Workbook registry
CREATE TABLE IF NOT EXISTS school_workbooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('child', 'practitioner')),
  html_content text NOT NULL,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4) Schools program audit log
CREATE TABLE IF NOT EXISTS school_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_workbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_audit_log ENABLE ROW LEVEL SECURITY;

-- Schools: anyone can read active schools (for login dropdown, before auth)
CREATE POLICY "Anyone can read active schools"
  ON schools FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Schools: admins can do everything
CREATE POLICY "Admins full access on schools"
  ON schools FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_profiles
      WHERE parent_profiles.id = auth.uid()
      AND parent_profiles.is_admin = true
    )
  );

-- School users: users can read their own record
CREATE POLICY "Users can read own school_users record"
  ON school_users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- School users: admins can do everything
CREATE POLICY "Admins full access on school_users"
  ON school_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_profiles
      WHERE parent_profiles.id = auth.uid()
      AND parent_profiles.is_admin = true
    )
  );

-- School users: service role insert (for signup edge function)
CREATE POLICY "Service role insert school_users"
  ON school_users FOR INSERT
  TO service_role
  WITH CHECK (true);

-- School workbooks: school users can read active workbooks
CREATE POLICY "School users can read active workbooks"
  ON school_workbooks FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM school_users
      WHERE school_users.auth_user_id = auth.uid()
      AND school_users.role = school_workbooks.audience
    )
  );

-- School workbooks: admins can do everything
CREATE POLICY "Admins full access on school_workbooks"
  ON school_workbooks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_profiles
      WHERE parent_profiles.id = auth.uid()
      AND parent_profiles.is_admin = true
    )
  );

-- School audit log: admins can read
CREATE POLICY "Admins can read audit log"
  ON school_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_profiles
      WHERE parent_profiles.id = auth.uid()
      AND parent_profiles.is_admin = true
    )
  );

-- School audit log: insert for service role and authenticated
CREATE POLICY "Insert audit log"
  ON school_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- Helper function: ensure only one active workbook per audience
-- ============================================================
CREATE OR REPLACE FUNCTION set_active_workbook(p_workbook_id uuid, p_audience text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deactivate all workbooks for this audience
  UPDATE school_workbooks
  SET is_active = false, updated_at = now()
  WHERE audience = p_audience AND is_active = true;

  -- Activate the selected one
  UPDATE school_workbooks
  SET is_active = true, updated_at = now()
  WHERE id = p_workbook_id AND audience = p_audience;

  -- Log the change
  INSERT INTO school_audit_log (event_type, actor_id, metadata)
  VALUES (
    'workbook_activated',
    auth.uid(),
    jsonb_build_object('workbook_id', p_workbook_id, 'audience', p_audience)
  );
END;
$$;

-- ============================================================
-- Helper function: validate school access key
-- ============================================================
CREATE OR REPLACE FUNCTION validate_school_access(p_school_id uuid, p_access_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM schools
    WHERE id = p_school_id
    AND access_key = p_access_key
    AND is_active = true
  ) INTO v_valid;

  -- Log the attempt
  INSERT INTO school_audit_log (event_type, actor_id, school_id, metadata)
  VALUES (
    'school_access_validation',
    auth.uid(),
    p_school_id,
    jsonb_build_object('valid', v_valid)
  );

  RETURN v_valid;
END;
$$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_school_users_auth_user ON school_users(auth_user_id);
CREATE INDEX idx_school_users_school ON school_users(school_id);
CREATE INDEX idx_school_workbooks_audience_active ON school_workbooks(audience, is_active);
CREATE INDEX idx_school_audit_log_event ON school_audit_log(event_type, created_at);
