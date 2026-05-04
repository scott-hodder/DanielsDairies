-- Fix: service_role only had SELECT on parent_profiles and children,
-- preventing edge functions (complete-signup, stripe-webhook) from
-- updating credits, full_name, etc.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."parent_profiles" TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."children" TO "service_role";
