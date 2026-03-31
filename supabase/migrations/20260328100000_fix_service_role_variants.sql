-- Fix: re-grant service_role access to module_variants
-- The dev_to_prod_sync migration accidentally revoked all service_role permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.module_variants TO service_role;
