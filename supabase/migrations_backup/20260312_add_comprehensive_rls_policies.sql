-- Comprehensive RLS baseline for app tables.
-- Rules implemented:
-- 1) Global/reference data: all authenticated users can read; only sys admins can write.
-- 2) User data: users can only read/write their own rows.

create or replace function public.is_sys_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.parent_profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.owns_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    where c.id = p_child_id
      and c.parent_user_id = auth.uid()
  );
$$;

-- Enable RLS on all public tables.
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- Global/reference tables: read for authenticated users, write for sys admin only.
do $$
declare
  t text;
  global_tables text[] := array[
    'age_ranges',
    'ai_module_config',
    'assessment_questions',
    'audit_criteria',
    'audit_rules',
    'audit_sections',
    'badges',
    'brain_town_vocabulary',
    'category_colors',
    'characters',
    'checkin_challenges',
    'checkin_goals',
    'checkin_triggers',
    'core_theories',
    'cycles',
    'diagnosis_profiles',
    'dss_sedi_categories',
    'emotions',
    'fasd_domains',
    'focus_plan_categories',
    'focus_plan_frequencies',
    'focus_plan_goals',
    'focus_plan_intensities',
    'forbidden_terms',
    'levels',
    'module_secondary_theories',
    'modules',
    'ndis_domains',
    'needs_based_pathways',
    'parent_scripts',
    'pathways',
    'roadblock_config',
    'roadblocks',
    'sequencing_rules',
    'series',
    'settings',
    'skills',
    'sub_skills',
    'subscription_tiers',
    'super_skills',
    'theory_connections',
    'tools',
    'ai_generation_jobs'
  ];
begin
  foreach t in array global_tables
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_all_authenticated', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_admin_only', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_admin_only', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_admin_only', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      t || '_select_all_authenticated', t
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_sys_admin());',
      t || '_insert_admin_only', t
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_sys_admin()) with check (public.is_sys_admin());',
      t || '_update_admin_only', t
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_sys_admin());',
      t || '_delete_admin_only', t
    );
  end loop;
end $$;

-- parent_profiles: users can manage their own profile; sys admins can manage all.
drop policy if exists parent_profiles_select_own_or_admin on public.parent_profiles;
drop policy if exists parent_profiles_insert_own_or_admin on public.parent_profiles;
drop policy if exists parent_profiles_update_own_or_admin on public.parent_profiles;
drop policy if exists parent_profiles_delete_own_or_admin on public.parent_profiles;

create policy parent_profiles_select_own_or_admin
on public.parent_profiles
for select
to authenticated
using (id = auth.uid() or public.is_sys_admin());

create policy parent_profiles_insert_own_or_admin
on public.parent_profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_sys_admin());

create policy parent_profiles_update_own_or_admin
on public.parent_profiles
for update
to authenticated
using (id = auth.uid() or public.is_sys_admin())
with check (id = auth.uid() or public.is_sys_admin());

create policy parent_profiles_delete_own_or_admin
on public.parent_profiles
for delete
to authenticated
using (id = auth.uid() or public.is_sys_admin());

-- Parent-owned tables (direct user id ownership).
do $$
declare
  t text;
  parent_owned_tables text[] := array[
    'children',
    'module_unlocks',
    'parent_modules',
    'parent_subscriptions',
    'subscription_credit_ledger',
    'modules_to_generate'
  ];
  owner_column text;
begin
  foreach t in array parent_owned_tables
  loop
    owner_column := case
      when t = 'children' then 'parent_user_id'
      when t = 'module_unlocks' then 'parent_id'
      when t = 'parent_modules' then 'parent_id'
      when t = 'parent_subscriptions' then 'parent_id'
      when t = 'subscription_credit_ledger' then 'parent_id'
      when t = 'modules_to_generate' then 'created_by'
      else 'parent_user_id'
    end;

    execute format('drop policy if exists %I on public.%I;', t || '_select_own_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_own_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_own_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_own_or_admin', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (%I = auth.uid() or public.is_sys_admin());',
      t || '_select_own_or_admin', t, owner_column
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%I = auth.uid() or public.is_sys_admin());',
      t || '_insert_own_or_admin', t, owner_column
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (%I = auth.uid() or public.is_sys_admin()) with check (%I = auth.uid() or public.is_sys_admin());',
      t || '_update_own_or_admin', t, owner_column, owner_column
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (%I = auth.uid() or public.is_sys_admin());',
      t || '_delete_own_or_admin', t, owner_column
    );
  end loop;
end $$;

-- Child-owned tables: access only if the child belongs to the current user (or sys admin).
do $$
declare
  t text;
  child_tables text[] := array[
    'child_badges',
    'child_cycle_progress',
    'child_focus_plan',
    'child_modules',
    'child_roadblock_completions',
    'child_roadblocks',
    'child_super_skill_progress',
    'daily_quest_completions',
    'pathway_assessments',
    'reward_purchases'
  ];
begin
  foreach t in array child_tables
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_own_child_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_own_child_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_own_child_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_own_child_or_admin', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_select_own_child_or_admin', t
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_insert_own_child_or_admin', t
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.owns_child(child_id) or public.is_sys_admin()) with check (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_update_own_child_or_admin', t
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_delete_own_child_or_admin', t
    );
  end loop;
end $$;

-- login_streaks may belong by user_id and/or child_id.
drop policy if exists login_streaks_select_own_or_admin on public.login_streaks;
drop policy if exists login_streaks_insert_own_or_admin on public.login_streaks;
drop policy if exists login_streaks_update_own_or_admin on public.login_streaks;
drop policy if exists login_streaks_delete_own_or_admin on public.login_streaks;

create policy login_streaks_select_own_or_admin
on public.login_streaks
for select
to authenticated
using (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy login_streaks_insert_own_or_admin
on public.login_streaks
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy login_streaks_update_own_or_admin
on public.login_streaks
for update
to authenticated
using (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
)
with check (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy login_streaks_delete_own_or_admin
on public.login_streaks
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

-- module_responses may be parent-owned and/or child-owned.
drop policy if exists module_responses_select_own_or_admin on public.module_responses;
drop policy if exists module_responses_insert_own_or_admin on public.module_responses;
drop policy if exists module_responses_update_own_or_admin on public.module_responses;
drop policy if exists module_responses_delete_own_or_admin on public.module_responses;

create policy module_responses_select_own_or_admin
on public.module_responses
for select
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy module_responses_insert_own_or_admin
on public.module_responses
for insert
to authenticated
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy module_responses_update_own_or_admin
on public.module_responses
for update
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
)
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy module_responses_delete_own_or_admin
on public.module_responses
for delete
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

-- weekly_checkins are parent/child scoped.
drop policy if exists weekly_checkins_select_own_or_admin on public.weekly_checkins;
drop policy if exists weekly_checkins_insert_own_or_admin on public.weekly_checkins;
drop policy if exists weekly_checkins_update_own_or_admin on public.weekly_checkins;
drop policy if exists weekly_checkins_delete_own_or_admin on public.weekly_checkins;

create policy weekly_checkins_select_own_or_admin
on public.weekly_checkins
for select
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy weekly_checkins_insert_own_or_admin
on public.weekly_checkins
for insert
to authenticated
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy weekly_checkins_update_own_or_admin
on public.weekly_checkins
for update
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
)
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy weekly_checkins_delete_own_or_admin
on public.weekly_checkins
for delete
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

-- rewards can be baseline (global read) or parent-owned.
drop policy if exists rewards_select_baseline_or_own_or_admin on public.rewards;
drop policy if exists rewards_insert_own_or_admin on public.rewards;
drop policy if exists rewards_update_own_or_admin on public.rewards;
drop policy if exists rewards_delete_own_or_admin on public.rewards;

create policy rewards_select_baseline_or_own_or_admin
on public.rewards
for select
to authenticated
using (
  is_baseline = true
  or parent_user_id = auth.uid()
  or public.is_sys_admin()
);

create policy rewards_insert_own_or_admin
on public.rewards
for insert
to authenticated
with check (parent_user_id = auth.uid() or public.is_sys_admin());

create policy rewards_update_own_or_admin
on public.rewards
for update
to authenticated
using (parent_user_id = auth.uid() or public.is_sys_admin())
with check (parent_user_id = auth.uid() or public.is_sys_admin());

create policy rewards_delete_own_or_admin
on public.rewards
for delete
to authenticated
using (parent_user_id = auth.uid() or public.is_sys_admin());
