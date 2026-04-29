-- Allow anonymous users to read settings (needed for feature flags on landing page)
CREATE POLICY "Allow anonymous users to read settings"
  ON public.settings
  AS permissive
  FOR SELECT
  TO anon
  USING (true);
