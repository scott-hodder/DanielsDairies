-- Add super_skill_id column to child_focus_plan table
-- This column links focus plans to super skills for pathway recommendations

alter table public.child_focus_plan
  add column if not exists super_skill_id uuid references public.super_skills(id) on delete set null;

create index if not exists idx_child_focus_plan_super_skill
  on public.child_focus_plan(super_skill_id);
