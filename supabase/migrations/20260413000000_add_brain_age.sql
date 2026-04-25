-- Add brain_age column to children table
-- When set, this overrides the calculated age from date_of_birth for module rendering
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS brain_age text;

-- Add a comment explaining the column
COMMENT ON COLUMN public.children.brain_age IS 'Override age band for module rendering (e.g. 6-8, 9-11, 12-14, 15-18). When set, used instead of date_of_birth.';
