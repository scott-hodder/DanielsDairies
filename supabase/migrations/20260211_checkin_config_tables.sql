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
DROP POLICY IF EXISTS "Public read focus_plan_goals" ON focus_plan_goals;
CREATE POLICY "Public read focus_plan_goals" ON focus_plan_goals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage focus_plan_goals" ON focus_plan_goals;
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
DROP POLICY IF EXISTS "Public read focus_plan_frequencies" ON focus_plan_frequencies;
CREATE POLICY "Public read focus_plan_frequencies" ON focus_plan_frequencies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage focus_plan_frequencies" ON focus_plan_frequencies;
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
DROP POLICY IF EXISTS "Public read focus_plan_intensities" ON focus_plan_intensities;
CREATE POLICY "Public read focus_plan_intensities" ON focus_plan_intensities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage focus_plan_intensities" ON focus_plan_intensities;
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
DROP POLICY IF EXISTS "Public read checkin_challenges" ON checkin_challenges;
CREATE POLICY "Public read checkin_challenges" ON checkin_challenges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage checkin_challenges" ON checkin_challenges;
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
DROP POLICY IF EXISTS "Public read checkin_goals" ON checkin_goals;
CREATE POLICY "Public read checkin_goals" ON checkin_goals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage checkin_goals" ON checkin_goals;
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
DROP POLICY IF EXISTS "Public read checkin_triggers" ON checkin_triggers;
CREATE POLICY "Public read checkin_triggers" ON checkin_triggers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage checkin_triggers" ON checkin_triggers;
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
DROP POLICY IF EXISTS "Public read focus_plan_categories" ON focus_plan_categories;
CREATE POLICY "Public read focus_plan_categories" ON focus_plan_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage focus_plan_categories" ON focus_plan_categories;
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


-- 8. Assessment Questions (psychometric check-in questions per pathway)
--    These replace the hardcoded PATHWAY_ASSESSMENTS questions in progress-tracking-system.js
--    Each question belongs to a pathway_category (anger, anxiety, depression, emotions, social, body, cognitive, general)
CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_category TEXT NOT NULL,
  question_key TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'frequency',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  reverse_score BOOLEAN NOT NULL DEFAULT false,
  score_category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read assessment_questions" ON assessment_questions;
CREATE POLICY "Public read assessment_questions" ON assessment_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role manage assessment_questions" ON assessment_questions;
CREATE POLICY "Service role manage assessment_questions" ON assessment_questions FOR ALL USING (auth.role() = 'service_role');

-- Seed anger questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('anger', 'anger_frequency', 'In the past week, how often did you feel really angry?', 'frequency',
   '[{"value":0,"label":"Never","emoji":"😊"},{"value":1,"label":"Once or twice","emoji":"🙂"},{"value":2,"label":"A few times","emoji":"😐"},{"value":3,"label":"Almost every day","emoji":"😠"},{"value":4,"label":"Multiple times every day","emoji":"🤬"}]',
   false, null, 1),
  ('anger', 'anger_intensity', 'When you feel angry, how strong is the feeling usually?', 'intensity',
   '[{"value":0,"label":"Very mild - easy to handle","emoji":"😌"},{"value":1,"label":"Mild - a bit uncomfortable","emoji":"🙂"},{"value":2,"label":"Medium - hard to ignore","emoji":"😤"},{"value":3,"label":"Strong - really hard to control","emoji":"😡"},{"value":4,"label":"Very strong - feels explosive","emoji":"🌋"}]',
   false, null, 2),
  ('anger', 'anger_physical', 'When angry, do you notice body feelings like hot face, tight muscles, or fast heartbeat?', 'awareness',
   '[{"value":4,"label":"Yes, I notice them and can describe them","emoji":"💪"},{"value":3,"label":"Yes, I notice some feelings","emoji":"👍"},{"value":2,"label":"Sometimes I notice","emoji":"🤔"},{"value":1,"label":"Not really sure","emoji":"😐"},{"value":0,"label":"No, I don''t notice anything","emoji":"❓"}]',
   true, 'awareness', 3),
  ('anger', 'anger_expression', 'When you get angry, what usually happens?', 'behavior',
   '[{"value":0,"label":"I can calm myself down quickly","emoji":"🧘"},{"value":1,"label":"I talk about why I''m upset","emoji":"💬"},{"value":2,"label":"I need to be alone for a while","emoji":"🚪"},{"value":3,"label":"I might say mean things","emoji":"😤"},{"value":4,"label":"I sometimes break things or hit","emoji":"💥"}]',
   false, null, 4),
  ('anger', 'anger_recovery', 'After feeling angry, how long does it usually take to feel calm again?', 'regulation',
   '[{"value":0,"label":"A few minutes","emoji":"⏱️"},{"value":1,"label":"About 30 minutes","emoji":"🕐"},{"value":2,"label":"An hour or so","emoji":"🕐"},{"value":3,"label":"Several hours","emoji":"😔"},{"value":4,"label":"Most of the day or longer","emoji":"😓"}]',
   false, null, 5),
  ('anger', 'anger_coping_confidence', 'How confident do you feel about handling your anger?', 'self_efficacy',
   '[{"value":4,"label":"Very confident - I have good strategies","emoji":"💪"},{"value":3,"label":"Pretty confident most of the time","emoji":"👍"},{"value":2,"label":"Somewhat confident","emoji":"🤷"},{"value":1,"label":"Not very confident","emoji":"😕"},{"value":0,"label":"Not confident at all","emoji":"😰"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;

-- Seed anxiety questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('anxiety', 'anxiety_worry_frequency', 'In the past week, how often did you feel worried or nervous?', 'frequency',
   '[{"value":0,"label":"Never","emoji":"😊"},{"value":1,"label":"Once or twice","emoji":"🙂"},{"value":2,"label":"A few times","emoji":"😐"},{"value":3,"label":"Almost every day","emoji":"😰"},{"value":4,"label":"Multiple times every day","emoji":"😨"}]',
   false, null, 1),
  ('anxiety', 'anxiety_physical', 'Do you get tummy aches, headaches, or feel sick when worried?', 'somatic',
   '[{"value":0,"label":"Never","emoji":"😊"},{"value":1,"label":"Rarely","emoji":"🙂"},{"value":2,"label":"Sometimes","emoji":"😐"},{"value":3,"label":"Often","emoji":"🤢"},{"value":4,"label":"Almost always","emoji":"😣"}]',
   false, null, 2),
  ('anxiety', 'anxiety_avoidance', 'Do your worries stop you from doing things you want to do?', 'avoidance',
   '[{"value":0,"label":"Never - I do what I want","emoji":"💪"},{"value":1,"label":"Rarely - only small things","emoji":"🙂"},{"value":2,"label":"Sometimes - a few things","emoji":"😐"},{"value":3,"label":"Often - many things","emoji":"😔"},{"value":4,"label":"Very often - lots of things","emoji":"😢"}]',
   false, null, 3),
  ('anxiety', 'anxiety_sleep', 'Do worries make it hard to fall asleep or wake you up at night?', 'sleep',
   '[{"value":0,"label":"Never - I sleep well","emoji":"😴"},{"value":1,"label":"Rarely","emoji":"🙂"},{"value":2,"label":"Sometimes","emoji":"😐"},{"value":3,"label":"Often","emoji":"😫"},{"value":4,"label":"Most nights","emoji":"😰"}]',
   false, null, 4),
  ('anxiety', 'anxiety_control', 'When worries come, can you calm yourself down?', 'regulation',
   '[{"value":4,"label":"Yes, easily","emoji":"💪"},{"value":3,"label":"Usually I can","emoji":"👍"},{"value":2,"label":"Sometimes I can","emoji":"🤷"},{"value":1,"label":"It''s hard to","emoji":"😕"},{"value":0,"label":"I can''t calm down","emoji":"😰"}]',
   true, 'efficacy', 5),
  ('anxiety', 'anxiety_coping_confidence', 'How confident do you feel about handling your worries?', 'self_efficacy',
   '[{"value":4,"label":"Very confident","emoji":"💪"},{"value":3,"label":"Pretty confident","emoji":"👍"},{"value":2,"label":"Somewhat confident","emoji":"🤷"},{"value":1,"label":"Not very confident","emoji":"😕"},{"value":0,"label":"Not confident at all","emoji":"😰"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;

-- Seed depression questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('depression', 'depression_mood', 'In the past week, how often did you feel sad or down?', 'frequency',
   '[{"value":0,"label":"Never","emoji":"😊"},{"value":1,"label":"Once or twice","emoji":"🙂"},{"value":2,"label":"A few times","emoji":"😐"},{"value":3,"label":"Almost every day","emoji":"😔"},{"value":4,"label":"All the time","emoji":"😢"}]',
   false, null, 1),
  ('depression', 'depression_interest', 'How much did you enjoy doing things you usually like?', 'anhedonia',
   '[{"value":0,"label":"Enjoyed them a lot","emoji":"🎉"},{"value":1,"label":"Enjoyed them mostly","emoji":"😊"},{"value":2,"label":"Enjoyed them a little","emoji":"😐"},{"value":3,"label":"Didn''t enjoy much","emoji":"😕"},{"value":4,"label":"Nothing felt fun","emoji":"😔"}]',
   false, null, 2),
  ('depression', 'depression_energy', 'How was your energy level this week?', 'energy',
   '[{"value":0,"label":"Good energy","emoji":"⚡"},{"value":1,"label":"Mostly okay","emoji":"🙂"},{"value":2,"label":"Sometimes tired","emoji":"😐"},{"value":3,"label":"Often tired","emoji":"😫"},{"value":4,"label":"Exhausted all the time","emoji":"😴"}]',
   false, null, 3),
  ('depression', 'depression_worth', 'How did you feel about yourself this week?', 'self_esteem',
   '[{"value":0,"label":"Really good about myself","emoji":"⭐"},{"value":1,"label":"Pretty good","emoji":"😊"},{"value":2,"label":"Okay I guess","emoji":"😐"},{"value":3,"label":"Not great","emoji":"😕"},{"value":4,"label":"Pretty bad about myself","emoji":"😔"}]',
   false, null, 4),
  ('depression', 'depression_connection', 'How connected did you feel to family and friends?', 'social',
   '[{"value":0,"label":"Very connected","emoji":"💖"},{"value":1,"label":"Pretty connected","emoji":"😊"},{"value":2,"label":"Somewhat connected","emoji":"😐"},{"value":3,"label":"A bit lonely","emoji":"😕"},{"value":4,"label":"Very alone","emoji":"😢"}]',
   false, null, 5),
  ('depression', 'depression_hope', 'How hopeful do you feel about things getting better?', 'hope',
   '[{"value":4,"label":"Very hopeful","emoji":"🌟"},{"value":3,"label":"Pretty hopeful","emoji":"😊"},{"value":2,"label":"Somewhat hopeful","emoji":"🤷"},{"value":1,"label":"Not very hopeful","emoji":"😕"},{"value":0,"label":"Not hopeful at all","emoji":"😔"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;

-- Seed emotions questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('emotions', 'emotions_identify', 'How easy is it for you to know what feeling you''re having?', 'awareness',
   '[{"value":4,"label":"Very easy - I always know","emoji":"💡"},{"value":3,"label":"Pretty easy","emoji":"😊"},{"value":2,"label":"Sometimes easy","emoji":"🤔"},{"value":1,"label":"Hard to tell","emoji":"😕"},{"value":0,"label":"I often don''t know","emoji":"❓"}]',
   true, 'awareness', 1),
  ('emotions', 'emotions_express', 'How comfortable are you sharing your feelings with others?', 'expression',
   '[{"value":4,"label":"Very comfortable","emoji":"💬"},{"value":3,"label":"Pretty comfortable","emoji":"😊"},{"value":2,"label":"Somewhat comfortable","emoji":"🤷"},{"value":1,"label":"Not very comfortable","emoji":"😕"},{"value":0,"label":"I keep feelings inside","emoji":"🤐"}]',
   true, 'expression', 2),
  ('emotions', 'emotions_variety', 'This week, how many different feelings did you notice?', 'range',
   '[{"value":4,"label":"Many different feelings","emoji":"🌈"},{"value":3,"label":"Several feelings","emoji":"😊"},{"value":2,"label":"A few feelings","emoji":"😐"},{"value":1,"label":"Only 1 or 2 feelings","emoji":"😕"},{"value":0,"label":"Mostly just one feeling","emoji":"😐"}]',
   true, 'awareness', 3),
  ('emotions', 'emotions_overwhelm', 'How often did feelings feel too big to handle?', 'regulation',
   '[{"value":0,"label":"Never - I could handle them","emoji":"💪"},{"value":1,"label":"Rarely","emoji":"🙂"},{"value":2,"label":"Sometimes","emoji":"😐"},{"value":3,"label":"Often","emoji":"😰"},{"value":4,"label":"Very often","emoji":"🌊"}]',
   false, null, 4),
  ('emotions', 'emotions_strategies', 'Do you know good ways to help yourself feel better?', 'coping',
   '[{"value":4,"label":"Yes, many ways","emoji":"🧰"},{"value":3,"label":"Yes, several ways","emoji":"👍"},{"value":2,"label":"A few ways","emoji":"🤷"},{"value":1,"label":"Only 1 or 2 ways","emoji":"😕"},{"value":0,"label":"Not really","emoji":"😔"}]',
   true, 'efficacy', 5),
  ('emotions', 'emotions_confidence', 'How confident do you feel about understanding your emotions?', 'self_efficacy',
   '[{"value":4,"label":"Very confident","emoji":"💪"},{"value":3,"label":"Pretty confident","emoji":"👍"},{"value":2,"label":"Somewhat confident","emoji":"🤷"},{"value":1,"label":"Not very confident","emoji":"😕"},{"value":0,"label":"Not confident at all","emoji":"😰"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;

-- Seed social questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('social', 'social_comfort', 'How comfortable do you feel around other kids?', 'comfort',
   '[{"value":4,"label":"Very comfortable","emoji":"😊"},{"value":3,"label":"Pretty comfortable","emoji":"🙂"},{"value":2,"label":"Somewhat comfortable","emoji":"😐"},{"value":1,"label":"A bit nervous","emoji":"😕"},{"value":0,"label":"Very nervous","emoji":"😰"}]',
   true, 'comfort', 1),
  ('social', 'social_friends', 'How satisfied are you with your friendships?', 'satisfaction',
   '[{"value":4,"label":"Very satisfied","emoji":"💖"},{"value":3,"label":"Pretty satisfied","emoji":"😊"},{"value":2,"label":"Somewhat satisfied","emoji":"😐"},{"value":1,"label":"Not very satisfied","emoji":"😕"},{"value":0,"label":"Not satisfied","emoji":"😔"}]',
   true, 'satisfaction', 2),
  ('social', 'social_joining', 'How easy is it to join in when others are playing?', 'initiation',
   '[{"value":4,"label":"Very easy","emoji":"🎉"},{"value":3,"label":"Pretty easy","emoji":"🙂"},{"value":2,"label":"Sometimes easy","emoji":"🤷"},{"value":1,"label":"Hard","emoji":"😕"},{"value":0,"label":"Very hard","emoji":"😔"}]',
   true, 'skills', 3),
  ('social', 'social_conflict', 'When you disagree with a friend, can you work it out?', 'conflict_resolution',
   '[{"value":4,"label":"Yes, usually pretty easily","emoji":"🤝"},{"value":3,"label":"Yes, most of the time","emoji":"👍"},{"value":2,"label":"Sometimes","emoji":"🤷"},{"value":1,"label":"It''s hard","emoji":"😕"},{"value":0,"label":"We usually stay upset","emoji":"😔"}]',
   true, 'skills', 4),
  ('social', 'social_listening', 'Are you a good listener when friends talk to you?', 'listening',
   '[{"value":4,"label":"Yes, very good","emoji":"👂"},{"value":3,"label":"Pretty good","emoji":"😊"},{"value":2,"label":"Okay I guess","emoji":"😐"},{"value":1,"label":"I try but get distracted","emoji":"😕"},{"value":0,"label":"I find it hard","emoji":"😔"}]',
   true, 'skills', 5),
  ('social', 'social_confidence', 'How confident do you feel about making and keeping friends?', 'self_efficacy',
   '[{"value":4,"label":"Very confident","emoji":"💪"},{"value":3,"label":"Pretty confident","emoji":"👍"},{"value":2,"label":"Somewhat confident","emoji":"🤷"},{"value":1,"label":"Not very confident","emoji":"😕"},{"value":0,"label":"Not confident at all","emoji":"😰"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;

-- Seed body questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('body', 'body_awareness', 'How well do you notice what your body is feeling?', 'awareness',
   '[{"value":4,"label":"Very well - I always notice","emoji":"💡"},{"value":3,"label":"Pretty well","emoji":"😊"},{"value":2,"label":"Sometimes","emoji":"🤔"},{"value":1,"label":"Not very well","emoji":"😕"},{"value":0,"label":"I don''t really notice","emoji":"❓"}]',
   true, 'awareness', 1),
  ('body', 'body_tension', 'How often do you feel tense or tight in your body?', 'frequency',
   '[{"value":0,"label":"Never","emoji":"😊"},{"value":1,"label":"Rarely","emoji":"🙂"},{"value":2,"label":"Sometimes","emoji":"😐"},{"value":3,"label":"Often","emoji":"😕"},{"value":4,"label":"Almost always","emoji":"😣"}]',
   false, null, 2),
  ('body', 'body_energy', 'How is your energy during the day?', 'energy',
   '[{"value":4,"label":"Great energy all day","emoji":"⚡"},{"value":3,"label":"Good most of the time","emoji":"😊"},{"value":2,"label":"Up and down","emoji":"😐"},{"value":1,"label":"Often low","emoji":"😕"},{"value":0,"label":"Very low energy","emoji":"😴"}]',
   true, 'energy', 3),
  ('body', 'body_sleep', 'How well are you sleeping?', 'sleep',
   '[{"value":4,"label":"Great - fall asleep easily","emoji":"😴"},{"value":3,"label":"Pretty well","emoji":"😊"},{"value":2,"label":"Okay","emoji":"😐"},{"value":1,"label":"Not great","emoji":"😕"},{"value":0,"label":"Really struggling","emoji":"😫"}]',
   true, 'sleep', 4),
  ('body', 'body_calming', 'Can you use your body to help calm down (like deep breaths)?', 'regulation',
   '[{"value":4,"label":"Yes, it really helps","emoji":"🧘"},{"value":3,"label":"Usually it helps","emoji":"👍"},{"value":2,"label":"Sometimes","emoji":"🤷"},{"value":1,"label":"I try but it''s hard","emoji":"😕"},{"value":0,"label":"I don''t know how","emoji":"❓"}]',
   true, 'skills', 5),
  ('body', 'body_confidence', 'How confident do you feel about listening to your body?', 'self_efficacy',
   '[{"value":4,"label":"Very confident","emoji":"💪"},{"value":3,"label":"Pretty confident","emoji":"👍"},{"value":2,"label":"Somewhat confident","emoji":"🤷"},{"value":1,"label":"Not very confident","emoji":"😕"},{"value":0,"label":"Not confident at all","emoji":"😰"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;

-- Seed cognitive questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('cognitive', 'cognitive_thoughts', 'Can you notice when you''re having unhelpful thoughts?', 'awareness',
   '[{"value":4,"label":"Yes, I notice quickly","emoji":"💡"},{"value":3,"label":"Usually I notice","emoji":"😊"},{"value":2,"label":"Sometimes","emoji":"🤔"},{"value":1,"label":"Not very often","emoji":"😕"},{"value":0,"label":"I don''t really notice","emoji":"❓"}]',
   true, 'awareness', 1),
  ('cognitive', 'cognitive_negative', 'How often do you have negative thoughts about yourself or situations?', 'frequency',
   '[{"value":0,"label":"Never","emoji":"😊"},{"value":1,"label":"Rarely","emoji":"🙂"},{"value":2,"label":"Sometimes","emoji":"😐"},{"value":3,"label":"Often","emoji":"😕"},{"value":4,"label":"Very often","emoji":"😔"}]',
   false, null, 2),
  ('cognitive', 'cognitive_challenge', 'Can you question whether your worried thoughts are true?', 'reframing',
   '[{"value":4,"label":"Yes, I''m good at that","emoji":"🔍"},{"value":3,"label":"Usually I can","emoji":"👍"},{"value":2,"label":"Sometimes","emoji":"🤷"},{"value":1,"label":"It''s hard","emoji":"😕"},{"value":0,"label":"No, they feel very real","emoji":"😔"}]',
   true, 'skills', 3),
  ('cognitive', 'cognitive_perspective', 'Can you think of different ways to see a situation?', 'flexibility',
   '[{"value":4,"label":"Yes, easily","emoji":"🌈"},{"value":3,"label":"Usually","emoji":"😊"},{"value":2,"label":"Sometimes","emoji":"🤷"},{"value":1,"label":"It''s hard","emoji":"😕"},{"value":0,"label":"I get stuck on one view","emoji":"😔"}]',
   true, 'skills', 4),
  ('cognitive', 'cognitive_problem', 'When you have a problem, can you think of solutions?', 'problem_solving',
   '[{"value":4,"label":"Yes, I think of many","emoji":"💡"},{"value":3,"label":"Usually some ideas","emoji":"👍"},{"value":2,"label":"Sometimes","emoji":"🤷"},{"value":1,"label":"It''s hard","emoji":"😕"},{"value":0,"label":"I feel stuck","emoji":"😔"}]',
   true, 'skills', 5),
  ('cognitive', 'cognitive_confidence', 'How confident do you feel about managing your thoughts?', 'self_efficacy',
   '[{"value":4,"label":"Very confident","emoji":"💪"},{"value":3,"label":"Pretty confident","emoji":"👍"},{"value":2,"label":"Somewhat confident","emoji":"🤷"},{"value":1,"label":"Not very confident","emoji":"😕"},{"value":0,"label":"Not confident at all","emoji":"😰"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;

-- Seed general questions
INSERT INTO assessment_questions (pathway_category, question_key, question_text, question_type, options, reverse_score, score_category, sort_order) VALUES
  ('general', 'general_happiness', 'Overall, how happy have you been this week?', 'wellbeing',
   '[{"value":4,"label":"Very happy","emoji":"😊"},{"value":3,"label":"Pretty happy","emoji":"🙂"},{"value":2,"label":"Okay","emoji":"😐"},{"value":1,"label":"Not very happy","emoji":"😕"},{"value":0,"label":"Not happy at all","emoji":"😔"}]',
   true, 'wellbeing', 1),
  ('general', 'general_coping', 'How well did you handle difficult moments this week?', 'coping',
   '[{"value":4,"label":"Very well","emoji":"💪"},{"value":3,"label":"Pretty well","emoji":"👍"},{"value":2,"label":"Okay","emoji":"🤷"},{"value":1,"label":"Not very well","emoji":"😕"},{"value":0,"label":"I really struggled","emoji":"😔"}]',
   true, 'skills', 2),
  ('general', 'general_school', 'How did things go at school this week?', 'functioning',
   '[{"value":4,"label":"Great","emoji":"⭐"},{"value":3,"label":"Pretty good","emoji":"😊"},{"value":2,"label":"Okay","emoji":"😐"},{"value":1,"label":"Not great","emoji":"😕"},{"value":0,"label":"Really hard","emoji":"😔"}]',
   true, 'functioning', 3),
  ('general', 'general_relationships', 'How well did you get along with family and friends?', 'social',
   '[{"value":4,"label":"Really well","emoji":"💖"},{"value":3,"label":"Pretty well","emoji":"😊"},{"value":2,"label":"Okay","emoji":"😐"},{"value":1,"label":"Some problems","emoji":"😕"},{"value":0,"label":"Lots of problems","emoji":"😔"}]',
   true, 'social', 4),
  ('general', 'general_sleep_eat', 'How were your sleeping and eating habits?', 'basics',
   '[{"value":4,"label":"Great","emoji":"😴"},{"value":3,"label":"Pretty good","emoji":"😊"},{"value":2,"label":"Okay","emoji":"😐"},{"value":1,"label":"Not great","emoji":"😕"},{"value":0,"label":"Really struggling","emoji":"😔"}]',
   true, 'basics', 5),
  ('general', 'general_confidence', 'How confident do you feel about handling whatever comes your way?', 'self_efficacy',
   '[{"value":4,"label":"Very confident","emoji":"💪"},{"value":3,"label":"Pretty confident","emoji":"👍"},{"value":2,"label":"Somewhat confident","emoji":"🤷"},{"value":1,"label":"Not very confident","emoji":"😕"},{"value":0,"label":"Not confident at all","emoji":"😰"}]',
   true, 'efficacy', 6)
ON CONFLICT (question_key) DO NOTHING;


-- 9. Add sub_skill_id and week_number to weekly_checkins
--    This allows check-ins to be tied to a specific sub-skill + week,
--    so we can enforce "show check-in on weeks 1, 4, 7, 10 if not already done".
ALTER TABLE weekly_checkins ADD COLUMN IF NOT EXISTS sub_skill_id UUID REFERENCES sub_skills(id) ON DELETE SET NULL;
ALTER TABLE weekly_checkins ADD COLUMN IF NOT EXISTS week_number INT;
ALTER TABLE weekly_checkins ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

-- Unique constraint: one check-in per child + sub_skill + week_number
-- (uses a partial unique index so NULLs don't conflict)
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_child_subskill_week
  ON weekly_checkins (child_id, sub_skill_id, week_number)
  WHERE sub_skill_id IS NOT NULL AND week_number IS NOT NULL;
