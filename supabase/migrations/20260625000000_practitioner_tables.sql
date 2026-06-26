-- Practitioner tables for Practice Hub feature

-- Links practitioners to children they work with
CREATE TABLE IF NOT EXISTS public.practitioner_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_user_id uuid NOT NULL REFERENCES auth.users(id),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(practitioner_user_id, child_id)
);

-- Practitioner notes per child
CREATE TABLE IF NOT EXISTS public.practitioner_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_user_id uuid NOT NULL REFERENCES auth.users(id),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Practitioner goals per child
CREATE TABLE IF NOT EXISTS public.practitioner_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_user_id uuid NOT NULL REFERENCES auth.users(id),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  goal_text text NOT NULL,
  category text,
  status text DEFAULT 'in_progress',
  review_date date,
  measure text,
  created_at timestamptz DEFAULT now()
);

-- Practitioner-recorded behaviours of concern per child
CREATE TABLE IF NOT EXISTS public.practitioner_behaviours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  practitioner_user_id uuid NOT NULL REFERENCES auth.users(id),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  description text NOT NULL,
  setting text,
  baseline text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practitioner_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_behaviours ENABLE ROW LEVEL SECURITY;

-- Practitioners can manage their own client links
CREATE POLICY "Practitioners manage own clients"
  ON public.practitioner_clients FOR ALL
  USING (practitioner_user_id = auth.uid());

-- Practitioners can manage their own notes
CREATE POLICY "Practitioners manage own notes"
  ON public.practitioner_notes FOR ALL
  USING (practitioner_user_id = auth.uid());

-- Practitioners can manage their own goals
CREATE POLICY "Practitioners manage own goals"
  ON public.practitioner_goals FOR ALL
  USING (practitioner_user_id = auth.uid());

-- Practitioners can manage their own behaviours
CREATE POLICY "Practitioners manage own behaviours"
  ON public.practitioner_behaviours FOR ALL
  USING (practitioner_user_id = auth.uid());

-- Allow practitioners to read children they are linked to
CREATE POLICY "Practitioners can view linked children"
  ON public.children FOR SELECT
  USING (
    id IN (
      SELECT child_id FROM public.practitioner_clients
      WHERE practitioner_user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow practitioners to read child_modules for linked children
CREATE POLICY "Practitioners can view linked child modules"
  ON public.child_modules FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM public.practitioner_clients
      WHERE practitioner_user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow practitioners to read login_streaks for linked children
CREATE POLICY "Practitioners can view linked child streaks"
  ON public.login_streaks FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM public.practitioner_clients
      WHERE practitioner_user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow practitioners to read module_responses for linked children
CREATE POLICY "Practitioners can view linked child responses"
  ON public.module_responses FOR SELECT
  USING (
    child_id IN (
      SELECT child_id FROM public.practitioner_clients
      WHERE practitioner_user_id = auth.uid() AND status = 'active'
    )
  );

-- RPC: Search children by parent email (for linking)
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

-- RPC: Get full caseload data for a practitioner
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
