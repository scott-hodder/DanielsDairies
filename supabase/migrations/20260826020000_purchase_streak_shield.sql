-- Streak Shield purchase: atomic spendable-star debit + shield credit.
-- One shield held at a time; costs 15 stars; only the child's own parent
-- account can buy (the child dashboard runs under the parent session).

create or replace function public.purchase_streak_shield(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost int := 15;
  v_spendable int;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select spendable_stars into v_spendable
  from children
  where id = p_child_id and parent_user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not-found');
  end if;

  if exists (
    select 1 from login_streaks
    where user_id = v_uid and child_id = p_child_id and shields >= 1
  ) then
    return jsonb_build_object('ok', false, 'error', 'already-protected');
  end if;

  if coalesce(v_spendable, 0) < v_cost then
    return jsonb_build_object('ok', false, 'error', 'not-enough-stars');
  end if;

  update children
  set spendable_stars = spendable_stars - v_cost
  where id = p_child_id;

  update login_streaks
  set shields = shields + 1
  where user_id = v_uid and child_id = p_child_id;

  if not found then
    insert into login_streaks (user_id, child_id, current_streak, longest_streak, last_login_date, shields)
    values (v_uid, p_child_id, 0, 0, (now() at time zone 'Australia/Brisbane')::date, 1);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.purchase_streak_shield(uuid) to authenticated;
