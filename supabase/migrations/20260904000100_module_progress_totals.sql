-- "How far through" for the practitioner hub's progress card.
--
-- child_module_progress already stores last_page + scenes_done per child per
-- module, but nothing recorded the module's total length, so a percentage
-- had no denominator. The module player knows pages.length at render time;
-- these columns let it persist the totals alongside the progress it already
-- writes. Existing rows stay null until the child next opens the module —
-- the hub falls back to "In progress" for those (no backfill needed).

ALTER TABLE public.child_module_progress
  ADD COLUMN IF NOT EXISTS total_pages integer,
  ADD COLUMN IF NOT EXISTS total_scenes integer;
