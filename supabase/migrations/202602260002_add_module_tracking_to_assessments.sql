-- Add module tracking fields to pathway_assessments table
-- This allows us to track which module triggered the assessment and prevent duplicate check-ins

ALTER TABLE public.pathway_assessments
ADD COLUMN IF NOT EXISTS module_id uuid,
ADD COLUMN IF NOT EXISTS week_number integer,
ADD COLUMN IF NOT EXISTS cycle_number integer;

-- Add foreign key constraint for module_id
ALTER TABLE public.pathway_assessments
ADD CONSTRAINT pathway_assessments_module_id_fkey 
FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE SET NULL;

-- Create index for faster lookups by module
CREATE INDEX IF NOT EXISTS idx_pathway_assessments_module_id 
ON public.pathway_assessments USING btree (module_id);

-- Create composite index for checking if assessment exists for specific module
CREATE INDEX IF NOT EXISTS idx_pathway_assessments_child_module_type 
ON public.pathway_assessments USING btree (child_id, module_id, assessment_type);

-- Create composite index for checking by week and cycle
CREATE INDEX IF NOT EXISTS idx_pathway_assessments_child_week_cycle 
ON public.pathway_assessments USING btree (child_id, pathway_category, week_number, cycle_number, assessment_type);
