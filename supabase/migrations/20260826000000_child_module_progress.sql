-- Cross-device episode progress for the module player (town_play layer).
-- One row per child per module: the furthest page reached and which scene
-- boundaries have already been celebrated. Row visibility rides on the
-- children table's own RLS: whoever can see the child can sync progress.

create table if not exists public.child_module_progress (
  child_id uuid not null references public.children(id) on delete cascade,
  module_key text not null,
  last_page integer not null default 0,
  scenes_done integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (child_id, module_key)
);

alter table public.child_module_progress enable row level security;

drop policy if exists "cmp_select" on public.child_module_progress;
create policy "cmp_select" on public.child_module_progress
  for select using (child_id in (select id from public.children));

drop policy if exists "cmp_insert" on public.child_module_progress;
create policy "cmp_insert" on public.child_module_progress
  for insert with check (child_id in (select id from public.children));

drop policy if exists "cmp_update" on public.child_module_progress;
create policy "cmp_update" on public.child_module_progress
  for update using (child_id in (select id from public.children))
  with check (child_id in (select id from public.children));

drop policy if exists "cmp_delete" on public.child_module_progress;
create policy "cmp_delete" on public.child_module_progress
  for delete using (child_id in (select id from public.children));

grant select, insert, update, delete on public.child_module_progress to authenticated, service_role;
