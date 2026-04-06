-- Add feature_flags JSONB column to settings table
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS feature_flags jsonb DEFAULT '{"text_to_voice": true}'::jsonb;
