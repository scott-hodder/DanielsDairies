-- =====================================================
-- Switch encryption key storage from app_secrets table
-- to Supabase Vault (secure, built-in secret management)
-- =====================================================

-- Enable the Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Insert the encryption key into Vault
-- This generates a strong random key automatically
SELECT vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'encryption_key',
  'Column-level encryption key for sensitive child data'
);

-- Update encrypt function to read from Vault instead of app_secrets
CREATE OR REPLACE FUNCTION encrypt_sensitive(plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key text;
BEGIN
  IF plaintext IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'encryption_key'
    LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found in Vault';
  END IF;
  RETURN extensions.pgp_sym_encrypt(plaintext, v_key);
END;
$$;

-- Update decrypt function to read from Vault instead of app_secrets
CREATE OR REPLACE FUNCTION decrypt_sensitive(ciphertext bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key text;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'encryption_key'
    LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found in Vault';
  END IF;
  RETURN extensions.pgp_sym_decrypt(ciphertext, v_key);
END;
$$;

-- Re-encrypt existing data with the new Vault-managed key
UPDATE weekly_checkins
SET
  notes_encrypted = encrypt_sensitive(notes),
  challenge_encrypted = encrypt_sensitive(challenge),
  goal_encrypted = encrypt_sensitive(goal)
WHERE notes IS NOT NULL OR challenge IS NOT NULL OR goal IS NOT NULL;

UPDATE child_mood_checkins
SET mood_label_encrypted = encrypt_sensitive(mood_label)
WHERE mood_label IS NOT NULL;

-- Drop the old app_secrets table (no longer needed)
DROP TABLE IF EXISTS app_secrets;
