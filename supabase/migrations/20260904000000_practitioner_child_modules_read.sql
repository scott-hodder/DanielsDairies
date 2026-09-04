-- Fix: practitioners saw "0 completed / 0 assigned" for every client that
-- isn't their own child.
--
-- child_modules carries a RESTRICTIVE select policy
-- (select_child_modules_for_own_children) that requires
-- children.parent_user_id = auth.uid(). Restrictive policies AND with all
-- permissive ones, so the permissive "Practitioners can view linked child
-- modules" grant could never take effect for a practitioner who isn't the
-- child's parent — the restrictive AND always failed and returned zero rows.
--
-- login_streaks / child_module_progress / children have no such restrictive
-- policy, which is why only child_modules read back empty in the hub.
--
-- Rewrite the restrictive SELECT policy so its USING clause admits every
-- legitimate reader (own parent, sys admin, active linked practitioner). It
-- stays RESTRICTIVE — defence in depth — it just no longer excludes readers
-- the permissive policies already allow. SELECT only; practitioners never
-- write child_modules, so insert/update/delete restrictive policies are
-- left untouched.

-- Helper mirroring public.owns_child, for an active practitioner link.
CREATE OR REPLACE FUNCTION public.practitioner_can_view_child(p_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.practitioner_clients pc
    WHERE pc.child_id = p_child_id
      AND pc.practitioner_user_id = auth.uid()
      AND pc.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.practitioner_can_view_child(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "select_child_modules_for_own_children" ON public.child_modules;

CREATE POLICY "select_child_modules_for_own_children"
  ON public.child_modules
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (
    public.owns_child(child_id)
    OR public.is_sys_admin()
    OR public.practitioner_can_view_child(child_id)
  );
