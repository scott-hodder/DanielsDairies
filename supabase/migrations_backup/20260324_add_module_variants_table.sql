-- ============================================================================
-- Migration: Add multi-age variant support for modules
-- Date: 2026-03-24
-- Description: Creates the module_variants table for storing age-band-specific
--   HTML content, and adds is_multi_age flag to the modules table.
--
-- Backward compatibility: Existing modules have is_multi_age = false (default)
--   and continue to use html_content directly. Multi-age modules set
--   is_multi_age = true and store variant HTML in module_variants.
-- ============================================================================

-- Add multi-age flag to modules table
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS is_multi_age boolean DEFAULT false;

-- Create module_variants table for age-band-specific content
CREATE TABLE IF NOT EXISTS public.module_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  age_band varchar(10) NOT NULL,  -- '6-8', '9-11', '12-14', '15-18'
  html_content text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  generation_spec jsonb,          -- per-variant generation metadata
  token_usage integer DEFAULT 0,
  UNIQUE(module_id, age_band)
);

-- Index for fast lookups by module_id
CREATE INDEX IF NOT EXISTS idx_module_variants_module_id
  ON public.module_variants(module_id);

-- Enable RLS on module_variants
ALTER TABLE public.module_variants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read variants (same as modules access)
CREATE POLICY "module_variants_select_policy" ON public.module_variants
  FOR SELECT USING (true);

-- Allow service role full access for generation
CREATE POLICY "module_variants_service_insert" ON public.module_variants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "module_variants_service_update" ON public.module_variants
  FOR UPDATE USING (true);

CREATE POLICY "module_variants_service_delete" ON public.module_variants
  FOR DELETE USING (true);

-- Ensure age_ranges table has rows for the new fine-grained bands
-- These may already exist; INSERT ON CONFLICT ensures idempotency
-- NOTE: You may need to adjust these inserts if your age_ranges table
-- already has different bands (e.g., 6-8, 9-11). Create new rows for
-- The age_ranges table should already have rows for 6-8, 9-11, 12-14, 15-18.
-- No new rows are needed for the multi-age variant system.
