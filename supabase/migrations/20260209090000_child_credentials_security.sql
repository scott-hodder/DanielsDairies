-- Child credential operations are server-side only via SECURITY DEFINER RPCs.
-- These functions verify that the authenticated user owns the child row.

create extension if not exists pgcrypto;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_child_password_secure(
  p_child_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_user_id uuid;
  v_hash text;
begin
  select parent_user_id into v_parent_user_id
  from public.children
  where id = p_child_id;

  if v_parent_user_id is null then
    raise exception 'Child not found';
  end if;

  if auth.uid() is null or auth.uid() <> v_parent_user_id then
    raise exception 'Unauthorized child access';
  end if;

  if p_password is null then
    update public.children set password = null where id = p_child_id;
    return true;
  end if;

  if char_length(p_password) < 3 then
    raise exception 'Password too short';
  end if;

  v_hash := crypt(p_password, gen_salt('bf'));

  update public.children
  set password = v_hash
  where id = p_child_id;

  return true;
end;
$$;

grant execute on function public.set_child_password_secure(uuid, text) to authenticated;

create or replace function public.verify_child_password_secure(
  p_child_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_user_id uuid;
  v_hash text;
begin
  select parent_user_id, password into v_parent_user_id, v_hash
  from public.children
  where id = p_child_id;

  if v_parent_user_id is null then
    return false;
  end if;

  if auth.uid() is null or auth.uid() <> v_parent_user_id then
    raise exception 'Unauthorized child access';
  end if;

  if v_hash is null then
    return false;
  end if;

  return v_hash = crypt(p_password, v_hash);
end;
$$;

grant execute on function public.verify_child_password_secure(uuid, text) to authenticated;
