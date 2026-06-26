-- Fix practitioner RPC functions: cast email type, add partial search, add extra RLS policies

-- Allow practitioners to read weekly_checkins for linked children
CREATE POLICY "Practitioners can view linked child checkins"
  ON public.weekly_checkins FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM public.practitioner_clients
      WHERE practitioner_user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow practitioners to read child_mood_checkins for linked children
CREATE POLICY "Practitioners can view linked child mood checkins"
  ON public.child_mood_checkins FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM public.practitioner_clients
      WHERE practitioner_user_id = auth.uid() AND status = 'active'
    )
  );

-- Drop and recreate search function with LIKE partial matching
DROP FUNCTION IF EXISTS search_children_by_parent_email(text);

CREATE OR REPLACE FUNCTION search_children_by_parent_email(search_email text)
RETURNS TABLE(
  child_id uuid,
  child_name text,
  child_age int,
  child_avatar text,
  parent_user_id uuid,
  parent_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_user_practitioner_check(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized - practitioner access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS child_id,
    c.name AS child_name,
    EXTRACT(YEAR FROM age(c.date_of_birth))::int AS child_age,
    c.avatar AS child_avatar,
    c.parent_user_id,
    pp.full_name AS parent_name
  FROM public.children c
  JOIN auth.users u ON c.parent_user_id = u.id
  LEFT JOIN public.parent_profiles pp ON pp.id = u.id
  WHERE lower(u.email::text) LIKE '%' || lower(search_email) || '%';
END;
$$;

-- Drop and recreate caseload function with email cast to text
DROP FUNCTION IF EXISTS get_practitioner_caseload(uuid);

CREATE OR REPLACE FUNCTION get_practitioner_caseload(prac_user_id uuid)
RETURNS TABLE(
  child_id uuid,
  child_name text,
  child_avatar text,
  child_age int,
  child_level int,
  child_stars numeric,
  child_total_xp int,
  parent_name text,
  parent_email text,
  link_status text,
  linked_at timestamptz,
  modules_completed bigint,
  current_streak int,
  last_login_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF prac_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT is_user_practitioner_check(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized - practitioner access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS child_id,
    c.name AS child_name,
    c.avatar AS child_avatar,
    EXTRACT(YEAR FROM age(c.date_of_birth))::int AS child_age,
    c.level AS child_level,
    c.stars AS child_stars,
    c.total_xp AS child_total_xp,
    pp.full_name AS parent_name,
    u.email::text AS parent_email,
    pc.status AS link_status,
    pc.created_at AS linked_at,
    COALESCE((SELECT count(*) FROM public.child_modules cm WHERE cm.child_id = c.id AND cm.is_completed = true), 0) AS modules_completed,
    COALESCE(ls.current_streak, 0) AS current_streak,
    ls.last_login_date
  FROM public.practitioner_clients pc
  JOIN public.children c ON c.id = pc.child_id
  LEFT JOIN auth.users u ON u.id = c.parent_user_id
  LEFT JOIN public.parent_profiles pp ON pp.id = c.parent_user_id
  LEFT JOIN public.login_streaks ls ON ls.child_id = c.id
  WHERE pc.practitioner_user_id = prac_user_id
    AND pc.status = 'active'
  ORDER BY c.name;
END;
$$;
