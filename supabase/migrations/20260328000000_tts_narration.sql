-- ============================================================
-- TTS Narration Support for Module Content
-- ============================================================

-- 1. Add voice_id to super_skills (maps character to ElevenLabs voice)
ALTER TABLE super_skills ADD COLUMN IF NOT EXISTS voice_id text;

-- 2. Add narration columns to modules
--    narration_data: JSON array of {pageIndex, text, audioUrl, contentHash}
--    narration_status: 'none' | 'pending' | 'ready' | 'error'
ALTER TABLE modules ADD COLUMN IF NOT EXISTS narration_data jsonb DEFAULT '[]'::jsonb;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS narration_status text DEFAULT 'none';

-- 3. Add narration columns to module_variants (for multi-age modules)
ALTER TABLE module_variants ADD COLUMN IF NOT EXISTS narration_data jsonb DEFAULT '[]'::jsonb;
ALTER TABLE module_variants ADD COLUMN IF NOT EXISTS narration_status text DEFAULT 'none';

-- 4. Create storage bucket for TTS audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policy: anyone can read audio files (public bucket)
CREATE POLICY "Public read access for tts-audio"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'tts-audio');

-- 6. Storage policy: service role can upload audio files
CREATE POLICY "Service role can upload tts-audio"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'tts-audio');

-- 7. Storage policy: service role can delete/update audio files
CREATE POLICY "Service role can manage tts-audio"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'tts-audio');

-- 8. Default voice IDs for existing super skills (can be updated in admin)
-- These are ElevenLabs voice IDs - placeholder values to be configured
COMMENT ON COLUMN super_skills.voice_id IS 'ElevenLabs voice ID for this character. Configure in admin Reference Data tab.';
