-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dog', 'cat', 'rabbit', 'bear', 'fox', 'owl', 'other')),
  emoji TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view characters)
CREATE POLICY "Anyone can view characters"
  ON characters FOR SELECT
  USING (true);

-- Admin-only write access
CREATE POLICY "Admins can create characters"
  ON characters FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    public.is_user_admin_check(auth.uid()) = true
  );

CREATE POLICY "Admins can update characters"
  ON characters FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    public.is_user_admin_check(auth.uid()) = true
  );

CREATE POLICY "Admins can delete characters"
  ON characters FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    public.is_user_admin_check(auth.uid()) = true
  );

-- Insert default characters
INSERT INTO characters (name, type, emoji, description) VALUES
  ('Daniel', 'dog', '🐕', 'A friendly and curious dog who helps children understand their emotions'),
  ('Luna', 'cat', '🐱', 'A calm and thoughtful cat who guides children through mindfulness'),
  ('Buddy', 'rabbit', '🐰', 'An energetic rabbit who encourages exploration and learning'),
  ('Bear', 'bear', '🐻', 'A strong and protective bear who teaches courage and resilience'),
  ('Rusty', 'fox', '🦊', 'A clever fox who helps children solve problems creatively'),
  ('Ollie', 'owl', '🦉', 'A wise owl who shares knowledge and encourages curiosity')
ON CONFLICT DO NOTHING;

-- Create index for faster lookups
CREATE INDEX idx_characters_type ON characters(type);
CREATE INDEX idx_characters_name ON characters(name);
