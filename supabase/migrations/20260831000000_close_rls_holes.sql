-- ============================================================================
-- CLOSE RLS HOLES (pre-launch hardening)
--
-- What this fixes (all verified against the migration history):
--  1. "(testing)" policies let any parent write their own subscription row
--     (self-serve Gold). Dropped; subscription writes are admin/service only.
--  2. subscription_credit_ledger allowed self insert/update/delete. Now
--     admin/service only (clients only ever read it).
--  3. "Allow authenticated delete on modules" let ANY logged-in user delete
--     the content catalogue. Dropped (admin-only policies remain).
--  4. modules were readable by anon (full html_content dump with the public
--     anon key). Select now requires an authenticated session.
--  5. subscription_tiers had NO anon select policy, so logged-out visitors
--     got zero rows -> signup step 2 rendered "No plans available". Anon can
--     now read tiers (read-only).
--  6. parent_profiles / children updates had no column restrictions, so any
--     user could mint credits or set their own tier. A guard trigger now
--     blocks credit increases and tier/admin changes for non-admin clients
--     (service role and sys admins are unaffected).
--  7. Hygiene: revoke anon write grants on sensitive tables.
--
-- NOTE: billing.html (the client-side "grant credits" page) is deleted from
-- the app in the same commit as this migration.
-- ============================================================================

-- 1. parent_subscriptions: drop self-write --------------------------------
drop policy if exists "Users can update own subscription (testing)" on public.parent_subscriptions;
drop policy if exists "Users can upsert own subscription (testing)" on public.parent_subscriptions;

drop policy if exists "parent_subscriptions_insert_own_or_admin" on public.parent_subscriptions;
drop policy if exists "parent_subscriptions_update_own_or_admin" on public.parent_subscriptions;
drop policy if exists "parent_subscriptions_delete_own_or_admin" on public.parent_subscriptions;
-- (select_own_or_admin is kept: parents still read their own subscription)

drop policy if exists "parent_subscriptions_insert_admin_only" on public.parent_subscriptions;
create policy "parent_subscriptions_insert_admin_only"
  on public.parent_subscriptions for insert to authenticated
  with check (public.is_sys_admin());

drop policy if exists "parent_subscriptions_update_admin_only" on public.parent_subscriptions;
create policy "parent_subscriptions_update_admin_only"
  on public.parent_subscriptions for update to authenticated
  using (public.is_sys_admin()) with check (public.is_sys_admin());

drop policy if exists "parent_subscriptions_delete_admin_only" on public.parent_subscriptions;
create policy "parent_subscriptions_delete_admin_only"
  on public.parent_subscriptions for delete to authenticated
  using (public.is_sys_admin());

-- 2. subscription_credit_ledger: writes are admin/service only ------------
drop policy if exists "subscription_credit_ledger_insert_own_or_admin" on public.subscription_credit_ledger;
drop policy if exists "subscription_credit_ledger_update_own_or_admin" on public.subscription_credit_ledger;
drop policy if exists "subscription_credit_ledger_delete_own_or_admin" on public.subscription_credit_ledger;
-- (select_own_or_admin is kept: parents read their own ledger)

drop policy if exists "subscription_credit_ledger_insert_admin_only" on public.subscription_credit_ledger;
create policy "subscription_credit_ledger_insert_admin_only"
  on public.subscription_credit_ledger for insert to authenticated
  with check (public.is_sys_admin());

drop policy if exists "subscription_credit_ledger_update_admin_only" on public.subscription_credit_ledger;
create policy "subscription_credit_ledger_update_admin_only"
  on public.subscription_credit_ledger for update to authenticated
  using (public.is_sys_admin()) with check (public.is_sys_admin());

drop policy if exists "subscription_credit_ledger_delete_admin_only" on public.subscription_credit_ledger;
create policy "subscription_credit_ledger_delete_admin_only"
  on public.subscription_credit_ledger for delete to authenticated
  using (public.is_sys_admin());

-- 3 + 4. modules: no user deletes, no anonymous content dump --------------
drop policy if exists "Allow authenticated delete on modules" on public.modules;
drop policy if exists "Anyone can view active modules" on public.modules;

drop policy if exists "modules_select_active_authenticated" on public.modules;
create policy "modules_select_active_authenticated"
  on public.modules for select to authenticated
  using (is_active = true);
-- Admins keep full access via "Admins can manage all modules" (for all).

-- 5. subscription_tiers: logged-out visitors must see pricing -------------
drop policy if exists "subscription_tiers_select_anon" on public.subscription_tiers;
create policy "subscription_tiers_select_anon"
  on public.subscription_tiers for select to anon
  using (true);

-- 6. Guard trigger: protect money/role columns from client tampering ------
create or replace function public.guard_protected_family_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  privileged boolean;
begin
  -- service_role / postgres / any non-client role passes straight through,
  -- as do sys admins acting from the admin centre.
  privileged := coalesce(auth.role(), '') not in ('anon', 'authenticated')
                or public.is_sys_admin();
  if privileged then
    return new;
  end if;

  if tg_table_name = 'parent_profiles' then
    if tg_op = 'UPDATE' then
      if coalesce(new.credits, 0) > coalesce(old.credits, 0) then
        raise exception 'Credits can only be added by the billing system';
      end if;
      if new.subscription_tier is distinct from old.subscription_tier then
        raise exception 'Subscription tier can only be changed by the billing system';
      end if;
      if new.is_admin is distinct from old.is_admin then
        raise exception 'Admin status cannot be changed from the client';
      end if;
      if new.is_practitioner is distinct from old.is_practitioner then
        raise exception 'Practitioner status cannot be changed from the client';
      end if;
    elsif tg_op = 'INSERT' then
      new.credits := 0;
      new.is_admin := false;
      new.is_practitioner := false;
      new.subscription_tier := null;
    end if;

  elsif tg_table_name = 'children' then
    if tg_op = 'UPDATE' then
      if coalesce(new.credits, 0) > coalesce(old.credits, 0) then
        raise exception 'Credits can only be added by the billing system';
      end if;
    elsif tg_op = 'INSERT' then
      -- children legitimately inherit the parent's balance at creation;
      -- clamp so a hand-crafted insert cannot exceed it.
      new.credits := least(
        coalesce(new.credits, 0),
        coalesce((select credits from public.parent_profiles where id = new.parent_user_id), 0)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_parent_profiles_protected on public.parent_profiles;
create trigger guard_parent_profiles_protected
  before insert or update on public.parent_profiles
  for each row execute function public.guard_protected_family_columns();

drop trigger if exists guard_children_protected on public.children;
create trigger guard_children_protected
  before insert or update on public.children
  for each row execute function public.guard_protected_family_columns();

-- 7. Hygiene: anon must not hold write grants on sensitive tables ---------
revoke insert, update, delete on public.modules from anon;
revoke select on public.modules from anon;
revoke insert, update, delete on public.subscription_tiers from anon;
revoke insert, update, delete on public.login_streaks from anon;
revoke insert, update, delete on public.parent_subscriptions from anon;
revoke insert, update, delete on public.subscription_credit_ledger from anon;
revoke insert, update, delete on public.parent_profiles from anon;
revoke insert, update, delete on public.children from anon;
