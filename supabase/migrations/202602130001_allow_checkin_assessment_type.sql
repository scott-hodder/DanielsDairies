-- Allow weekly check-ins in pathway_assessments
-- Fixes: new row violates check constraint "pathway_assessments_assessment_type_check"

ALTER TABLE public.pathway_assessments
DROP CONSTRAINT IF EXISTS pathway_assessments_assessment_type_check;

ALTER TABLE public.pathway_assessments
ADD CONSTRAINT pathway_assessments_assessment_type_check
CHECK (assessment_type IN ('baseline', 'midpoint', 'endpoint', 'checkin', 'check_in'));
