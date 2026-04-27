-- =====================================================
-- Privacy & Security Compliance Migration
-- P1-8: Audit logging for parent data access
-- P1-9: Rate limiting on child PIN attempts
-- P1-10: Column-level encryption for sensitive fields
-- =====================================================

-- ─── P1-8: Parent Audit Log ─────────────────────────────

CREATE TABLE IF NOT EXISTS parent_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_audit_log_user ON parent_audit_log(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_audit_log_action ON parent_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_parent_audit_log_created ON parent_audit_log(created_at);

ALTER TABLE parent_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop policies first to make idempotent
DROP POLICY IF EXISTS "Parents can view own audit logs" ON parent_audit_log;
CREATE POLICY "Parents can view own audit logs"
  ON parent_audit_log FOR SELECT
  USING (auth.uid() = parent_user_id);

DROP POLICY IF EXISTS "Users can insert own audit logs" ON parent_audit_log;
CREATE POLICY "Users can insert own audit logs"
  ON parent_audit_log FOR INSERT
  WITH CHECK (auth.uid() = parent_user_id);

DROP POLICY IF EXISTS "Admins can view all audit logs" ON parent_audit_log;
CREATE POLICY "Admins can view all audit logs"
  ON parent_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_profiles
      WHERE parent_profiles.id = auth.uid()
      AND parent_profiles.is_admin = true
    )
  );


-- ─── P1-9: Child PIN Rate Limiting ─────────────────────

CREATE TABLE IF NOT EXISTS child_pin_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  attempted_at timestamptz DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_child ON child_pin_attempts(child_id);
CREATE INDEX IF NOT EXISTS idx_pin_attempts_time ON child_pin_attempts(attempted_at);

ALTER TABLE child_pin_attempts ENABLE ROW LEVEL SECURITY;

-- Replace the verify_child_password_secure function with rate-limited version
CREATE OR REPLACE FUNCTION verify_child_password_secure(p_child_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stored_hash text;
  v_failed_count int;
  v_result boolean;
BEGIN
  -- Check rate limit: max 5 failed attempts in 15 minutes
  SELECT COUNT(*) INTO v_failed_count
  FROM child_pin_attempts
  WHERE child_id = p_child_id
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF v_failed_count >= 5 THEN
    INSERT INTO child_pin_attempts (child_id, success)
    VALUES (p_child_id, false);
    RAISE EXCEPTION 'Too many failed attempts. Please try again in 15 minutes.';
  END IF;

  -- Get stored hash
  SELECT child_password_hash INTO v_stored_hash
  FROM children
  WHERE id = p_child_id;

  -- If no password set, return true (no password required)
  IF v_stored_hash IS NULL THEN
    RETURN true;
  END IF;

  -- Verify password
  v_result := (v_stored_hash = crypt(p_password, v_stored_hash));

  -- Log the attempt
  INSERT INTO child_pin_attempts (child_id, success)
  VALUES (p_child_id, v_result);

  RETURN v_result;
END;
$$;


-- ─── P1-10: Column-Level Encryption for Sensitive Fields ─

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Weekly checkins: encrypt notes, challenge, goal
ALTER TABLE weekly_checkins
  ADD COLUMN IF NOT EXISTS notes_encrypted bytea,
  ADD COLUMN IF NOT EXISTS challenge_encrypted bytea,
  ADD COLUMN IF NOT EXISTS goal_encrypted bytea;

-- Child mood checkins: encrypt mood_label
ALTER TABLE child_mood_checkins
  ADD COLUMN IF NOT EXISTS mood_label_encrypted bytea;

-- Secrets table for encryption key
CREATE TABLE IF NOT EXISTS app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- Insert a default encryption key (MUST be changed in production via Supabase dashboard)
INSERT INTO app_secrets (key, value)
VALUES ('encryption_key', 'CHANGE_THIS_IN_PRODUCTION_' || gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

-- Encrypt function
CREATE OR REPLACE FUNCTION encrypt_sensitive(plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key text;
BEGIN
  IF plaintext IS NULL THEN RETURN NULL; END IF;
  SELECT value INTO v_key FROM app_secrets WHERE key = 'encryption_key';
  RETURN extensions.pgp_sym_encrypt(plaintext, v_key);
END;
$$;

-- Decrypt function
CREATE OR REPLACE FUNCTION decrypt_sensitive(ciphertext bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key text;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;
  SELECT value INTO v_key FROM app_secrets WHERE key = 'encryption_key';
  RETURN extensions.pgp_sym_decrypt(ciphertext, v_key);
END;
$$;

-- Migrate existing data to encrypted columns (one-time, skip already encrypted rows)
UPDATE weekly_checkins
SET
  notes_encrypted = encrypt_sensitive(notes),
  challenge_encrypted = encrypt_sensitive(challenge),
  goal_encrypted = encrypt_sensitive(goal)
WHERE (notes IS NOT NULL OR challenge IS NOT NULL OR goal IS NOT NULL)
  AND notes_encrypted IS NULL;

UPDATE child_mood_checkins
SET mood_label_encrypted = encrypt_sensitive(mood_label)
WHERE mood_label IS NOT NULL AND mood_label_encrypted IS NULL;

-- Create views that transparently decrypt for authorised access
CREATE OR REPLACE VIEW weekly_checkins_decrypted AS
SELECT
  id,
  parent_user_id,
  child_id,
  COALESCE(decrypt_sensitive(notes_encrypted), notes) as notes,
  COALESCE(decrypt_sensitive(challenge_encrypted), challenge) as challenge,
  COALESCE(decrypt_sensitive(goal_encrypted), goal) as goal,
  intensity,
  triggers,
  generated_plan,
  created_at,
  sub_skill_id,
  week_number,
  module_id
FROM weekly_checkins;

CREATE OR REPLACE VIEW child_mood_checkins_decrypted AS
SELECT
  id,
  child_id,
  mood_score,
  COALESCE(decrypt_sensitive(mood_label_encrypted), mood_label) as mood_label,
  mood_emoji,
  created_at
FROM child_mood_checkins;

-- Grant access to the views
GRANT SELECT ON weekly_checkins_decrypted TO authenticated;
GRANT SELECT ON child_mood_checkins_decrypted TO authenticated;

-- Auto-encrypt trigger for weekly_checkins
CREATE OR REPLACE FUNCTION encrypt_weekly_checkins_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.notes_encrypted := encrypt_sensitive(NEW.notes);
  NEW.challenge_encrypted := encrypt_sensitive(NEW.challenge);
  NEW.goal_encrypted := encrypt_sensitive(NEW.goal);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_weekly_checkins ON weekly_checkins;
CREATE TRIGGER trg_encrypt_weekly_checkins
  BEFORE INSERT OR UPDATE ON weekly_checkins
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_weekly_checkins_trigger();

-- Auto-encrypt trigger for child_mood_checkins
CREATE OR REPLACE FUNCTION encrypt_mood_checkins_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.mood_label_encrypted := encrypt_sensitive(NEW.mood_label);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_mood_checkins ON child_mood_checkins;
CREATE TRIGGER trg_encrypt_mood_checkins
  BEFORE INSERT OR UPDATE ON child_mood_checkins
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_mood_checkins_trigger();
