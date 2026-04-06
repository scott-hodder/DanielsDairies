-- Restore authenticated-user RLS policies on children table.
-- These were accidentally dropped by 20260331233124_remote_schema.sql
-- which only re-created service_role policies.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'children_select_own_or_admin'
  ) THEN
    CREATE POLICY "children_select_own_or_admin"
      ON "public"."children"
      AS permissive FOR SELECT TO authenticated
      USING ((parent_user_id = auth.uid()) OR public.is_sys_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'children_insert_own_or_admin'
  ) THEN
    CREATE POLICY "children_insert_own_or_admin"
      ON "public"."children"
      AS permissive FOR INSERT TO authenticated
      WITH CHECK ((parent_user_id = auth.uid()) OR public.is_sys_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'children_update_own_or_admin'
  ) THEN
    CREATE POLICY "children_update_own_or_admin"
      ON "public"."children"
      AS permissive FOR UPDATE TO authenticated
      USING ((parent_user_id = auth.uid()) OR public.is_sys_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'children_delete_own_or_admin'
  ) THEN
    CREATE POLICY "children_delete_own_or_admin"
      ON "public"."children"
      AS permissive FOR DELETE TO authenticated
      USING ((parent_user_id = auth.uid()) OR public.is_sys_admin());
  END IF;
END $$;
