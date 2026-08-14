-- RLS cleanup: drop the wide-open permissive policies on child_modules.
--
-- Ownership is enforced today by the RESTRICTIVE policies
-- (insert/select/update_child_modules_for_own_children), which AND with all
-- permissive policies — so these `true` policies are not currently
-- exploitable. But they are exactly one dropped restrictive policy away from
-- a cross-family data hole, and proper permissive policies already exist
-- ("Users can insert/update/view their children's modules",
--  "child_modules_*_own_child_or_admin", admin + service-role policies).
-- Removing the `true` policies changes nothing for legitimate access and
-- removes the standing hazard.

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."child_modules";
DROP POLICY IF EXISTS "Enable select for authenticated users" ON "public"."child_modules";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."child_modules";

-- Same hazard class: unconditional authenticated DELETE. Scoped delete
-- policies (child_modules_delete_own_child_or_admin + restrictive
-- delete_child_modules_for_own_children) remain in place.
DROP POLICY IF EXISTS "Allow authenticated delete on child_modules" ON "public"."child_modules";
