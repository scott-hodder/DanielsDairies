-- =============================================
-- Check-In Configuration Tables
-- Replaces hardcoded arrays in focusPlan.js and dashboardPage.js
-- =============================================

-- 1. Focus Plan Goal Options (was GOAL_OPTIONS in focusPlan.js)
CREATE TABLE IF NOT EXISTS focus_plan_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE focus_plan_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read focus_plan_goals" ON focus_plan_goals FOR SELECT USING (true);
CREATE POLICY "Service role manage focus_plan_goals" ON focus_plan_goals FOR ALL USING (auth.role() = 'service_role');

-- Seed with current hardcoded values
INSERT INTO focus_plan_goals (key, label, icon, sort_order) VALUES
  ('calm_faster',           'Calm down faster',        '🧘', 1),
  ('less_meltdowns',        'Fewer meltdowns',         '🌊', 2),
  ('better_communication',  'Better communication',    '💬', 3),
  ('more_confidence',       'More confidence',         '💪', 4),
  ('handle_worry',          'Handle worry better',     '🌈', 5),
  ('make_friends',          'Make friends easier',     '👫', 6),
  ('custom',                'Custom goal...',          '✏️', 99)
ON CONFLICT (key) DO NOTHING;


-- 2. Focus Plan Frequency Options (was FREQUENCY_OPTIONS in focusPlan.js)
CREATE TABLE IF NOT EXISTS focus_plan_frequencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE focus_plan_frequencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read focus_plan_frequencies" ON focus_plan_frequencies FOR SELECT USING (true);
CREATE POLICY "Service role manage focus_plan_frequencies" ON focus_plan_frequencies FOR ALL USING (auth.role() = 'service_role');

INSERT INTO focus_plan_frequencies (value, label, description, sort_order) VALUES
  ('daily',        'Daily',               'Every day',       1),
  ('few_per_week', 'A few times a week',  '3-4 times',      2),
  ('weekly',       'Weekly',              'Once a week',     3),
  ('rare',         'As needed',           'When it comes up', 4)
ON CONFLICT (value) DO NOTHING;


-- 3. Focus Plan Intensity Options (was INTENSITY_OPTIONS in focusPlan.js)
CREATE TABLE IF NOT EXISTS focus_plan_intensities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '🌱',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE focus_plan_intensities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read focus_plan_intensities" ON focus_plan_intensities FOR SELECT USING (true);
CREATE POLICY "Service role manage focus_plan_intensities" ON focus_plan_intensities FOR ALL USING (auth.role() = 'service_role');

INSERT INTO focus_plan_intensities (value, label, description, icon, sort_order) VALUES
  ('mild',   'Mild',   'Small challenges',        '🌱', 1),
  ('medium', 'Medium', 'Regular challenges',      '🌿', 2),
  ('big',    'Big',    'Significant challenges',  '🌳', 3)
ON CONFLICT (value) DO NOTHING;


-- 4. Weekly Check-in Challenge Options (was hardcoded <option> in dashboard.html)
CREATE TABLE IF NOT EXISTS checkin_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checkin_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read checkin_challenges" ON checkin_challenges FOR SELECT USING (true);
CREATE POLICY "Service role manage checkin_challenges" ON checkin_challenges FOR ALL USING (auth.role() = 'service_role');

INSERT INTO checkin_challenges (label, sort_order) VALUES
  ('Morning routine',           1),
  ('School refusal / drop-off', 2),
  ('Homework / focus',          3),
  ('Bedtime',                   4),
  ('Sibling conflict',          5),
  ('Social worries',            6),
  ('Anger outbursts',           7),
  ('Sensory overwhelm',         8),
  ('Other',                     99)
ON CONFLICT (label) DO NOTHING;


-- 5. Weekly Check-in Goal Options (was hardcoded <option> in dashboard.html)
CREATE TABLE IF NOT EXISTS checkin_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checkin_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read checkin_goals" ON checkin_goals FOR SELECT USING (true);
CREATE POLICY "Service role manage checkin_goals" ON checkin_goals FOR ALL USING (auth.role() = 'service_role');

INSERT INTO checkin_goals (label, sort_order) VALUES
  ('Use a calm-down tool once',                    1),
  ('Name emotions once a day',                     2),
  ('Practice a coping tool 3 times',               3),
  ('Handle a transition better (school/bed)',       4),
  ('Try one brave step',                           5)
ON CONFLICT (label) DO NOTHING;


-- 6. Weekly Check-in Trigger / Feeling Options (was triggerOptions in dashboardPage.js)
CREATE TABLE IF NOT EXISTS checkin_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE checkin_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read checkin_triggers" ON checkin_triggers FOR SELECT USING (true);
CREATE POLICY "Service role manage checkin_triggers" ON checkin_triggers FOR ALL USING (auth.role() = 'service_role');

INSERT INTO checkin_triggers (label, sort_order) VALUES
  ('Anger',          1),
  ('Overwhelm',      2),
  ('Worry/Anxiety',  3),
  ('Sadness',        4),
  ('Frustration',    5)
ON CONFLICT (label) DO NOTHING;


-- 7. Focus Plan Categories / Focus Areas (Step 1 of child onboarding)
--    These replace the hardcoded category list shown on the "Choose up to 3 areas" screen.
--    Each category can optionally link to a super_skill.
CREATE TABLE IF NOT EXISTS focus_plan_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📚',
  short_description TEXT NOT NULL DEFAULT '',
  super_skill_id UUID REFERENCES super_skills(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE focus_plan_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read focus_plan_categories" ON focus_plan_categories FOR SELECT USING (true);
CREATE POLICY "Service role manage focus_plan_categories" ON focus_plan_categories FOR ALL USING (auth.role() = 'service_role');

-- Seed with current hardcoded categories from focusPlan.js getFallbackCategories()
INSERT INTO focus_plan_categories (name, icon, short_description, sort_order) VALUES
  ('Anger',           '🔥', 'Managing angry feelings',           1),
  ('Anxiety',         '🌧️', 'Handling worry and fear',           2),
  ('Body',            '💪', 'Connecting with your body',         3),
  ('Cognitive',       '🧠', 'Training your brain',               4),
  ('Depression',      '🌙', 'Working through sad feelings',      5),
  ('Emotions',        '💭', 'Understanding all feelings',        6),
  ('General',         '📚', 'General wellbeing',                 7),
  ('Social',          '👫', 'Making friends and connections',    8)
ON CONFLICT (name) DO NOTHING;
