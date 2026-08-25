-- Fix: the "How big do these moments feel?" step of focus-plan onboarding
-- fails for the most common answer.
--
-- focus_plan_intensities serves the values (mild, medium, complex, severe)
-- but child_focus_plan_intensity_chk only allowed (mild, moderate, severe,
-- complex) — so choosing "Medium" made the insert violate the constraint and
-- the parent saw "Something went wrong. Please try again." forever, blocking
-- first-run onboarding entirely.
--
-- Allow the union of every value the options table has ever served plus
-- legacy row values (big, moderate), and NULL (the questions are optional).

alter table "public"."child_focus_plan" drop constraint if exists "child_focus_plan_intensity_chk";

alter table "public"."child_focus_plan" add constraint "child_focus_plan_intensity_chk"
  CHECK ((intensity IS NULL) OR (intensity = ANY (ARRAY[
    'mild'::text, 'medium'::text, 'moderate'::text,
    'big'::text, 'complex'::text, 'severe'::text
  ]))) not valid;

alter table "public"."child_focus_plan" validate constraint "child_focus_plan_intensity_chk";
