-- Grant table-level permissions for schools program tables
-- RLS policies control row-level access; these grants enable table-level access

-- schools table
GRANT SELECT ON schools TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON schools TO authenticated, service_role;

-- school_users table
GRANT SELECT ON school_users TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON school_users TO service_role;
GRANT INSERT ON school_users TO authenticated;

-- school_workbooks table
GRANT SELECT ON school_workbooks TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON school_workbooks TO authenticated, service_role;

-- school_audit_log table
GRANT SELECT ON school_audit_log TO authenticated, service_role;
GRANT INSERT ON school_audit_log TO authenticated, service_role;

-- Allow practitioners to read ALL active workbooks (both practitioner and child)
CREATE POLICY "Practitioners can read all active workbooks"
  ON school_workbooks FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM school_users
      WHERE school_users.auth_user_id = auth.uid()
      AND school_users.role = 'practitioner'
    )
  );
