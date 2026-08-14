-- Practitioner settings that must follow the practitioner across devices
-- (previously letterhead lived in localStorage, so the NDIS letter lost its
-- credentials/ABN on any new device).

CREATE TABLE IF NOT EXISTS public.practitioner_settings (
  practitioner_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  letterhead jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.practitioner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioners manage own settings"
  ON public.practitioner_settings FOR ALL
  TO authenticated
  USING (practitioner_user_id = auth.uid())
  WITH CHECK (practitioner_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practitioner_settings TO service_role;

CREATE TRIGGER tr_practitioner_settings_updated_at
  BEFORE UPDATE ON public.practitioner_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
