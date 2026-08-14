-- Behaviour plan detail for practitioner_behaviours.
-- Optional columns mirroring the structure of a standard behaviour support
-- plan: operational definition, setting events, antecedents, consequence
-- analysis, strategies and review. All nullable — the quick-add flow that
-- only records description/setting/baseline keeps working unchanged.
-- List-style fields store one item per line.

ALTER TABLE public.practitioner_behaviours
  ADD COLUMN IF NOT EXISTS definition text,
  ADD COLUMN IF NOT EXISTS looks_like text,
  ADD COLUMN IF NOT EXISTS not_included text,
  ADD COLUMN IF NOT EXISTS setting_events text,
  ADD COLUMN IF NOT EXISTS antecedents text,
  ADD COLUMN IF NOT EXISTS consequences text,
  ADD COLUMN IF NOT EXISTS behaviour_function text,
  ADD COLUMN IF NOT EXISTS what_works text,
  ADD COLUMN IF NOT EXISTS what_doesnt text,
  ADD COLUMN IF NOT EXISTS proactive_strategies text,
  ADD COLUMN IF NOT EXISTS response_early text,
  ADD COLUMN IF NOT EXISTS response_escalation text,
  ADD COLUMN IF NOT EXISTS response_recovery text,
  ADD COLUMN IF NOT EXISTS data_source text,
  ADD COLUMN IF NOT EXISTS review_date date;
