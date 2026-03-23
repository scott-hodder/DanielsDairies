-- Create levels table for progressive XP requirements
CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  level INTEGER NOT NULL UNIQUE,
  xp_required INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial levels with progressive XP requirements
INSERT INTO levels (level, xp_required) VALUES
(1, 0),      -- Start at level 1 with 0 XP
(2, 500),    -- 500 XP to reach level 2
(3, 1200),   -- 700 XP additional (1200 total) to reach level 3
(4, 2100),   -- 900 XP additional (2100 total) to reach level 4
(5, 3300),   -- 1200 XP additional (3300 total) to reach level 5
(6, 4800),   -- 1500 XP additional (4800 total) to reach level 6
(7, 6600),   -- 1800 XP additional (6600 total) to reach level 7
(8, 8800),   -- 2200 XP additional (8800 total) to reach level 8
(9, 11400),  -- 2600 XP additional (11400 total) to reach level 9
(10, 14500), -- 3100 XP additional (14500 total) to reach level 10
(11, 18100), -- 3600 XP additional (18100 total) to reach level 11
(12, 22200), -- 4100 XP additional (22200 total) to reach level 12
(13, 26800), -- 4600 XP additional (26800 total) to reach level 13
(14, 31900), -- 5100 XP additional (31900 total) to reach level 14
(15, 37500), -- 5600 XP additional (37500 total) to reach level 15
(16, 43600), -- 6100 XP additional (43600 total) to reach level 16
(17, 50200), -- 6600 XP additional (50200 total) to reach level 17
(18, 57300), -- 7100 XP additional (57300 total) to reach level 18
(19, 64900), -- 7600 XP additional (64900 total) to reach level 19
(20, 73000); -- 8100 XP additional (73000 total) to reach level 20

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_levels_level ON levels(level);

-- Add RLS (Row Level Security)
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read levels (read-only data)
CREATE POLICY "Levels are viewable by everyone" ON levels
  FOR SELECT USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_levels_updated_at BEFORE UPDATE
  ON levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Add XP and level columns to children table if they don't exist
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Create indexes for XP-related queries
CREATE INDEX IF NOT EXISTS idx_children_total_xp ON children(total_xp);
CREATE INDEX IF NOT EXISTS idx_children_level ON children(level);

-- Update existing children to have proper initial values
UPDATE children 
SET total_xp = 0, level = 1 
WHERE total_xp IS NULL OR level IS NULL;

-- Add check constraints only if they don't exist
DO $$ 
BEGIN
    -- Add total_xp check constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_total_xp_non_negative' 
        AND conrelid = 'children'::regclass
    ) THEN
        ALTER TABLE children ADD CONSTRAINT check_total_xp_non_negative CHECK (total_xp >= 0);
    END IF;
    
    -- Add level check constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_level_positive' 
        AND conrelid = 'children'::regclass
    ) THEN
        ALTER TABLE children ADD CONSTRAINT check_level_positive CHECK (level >= 1);
    END IF;
END $$;
-- Create core_theories table for psychology theories
-- This table stores psychological theories that can be referenced in modules

CREATE TABLE IF NOT EXISTS core_theories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theory_name TEXT NOT NULL,
    theory_code TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    primary_researchers TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_core_theories_active ON core_theories(is_active);
CREATE INDEX IF NOT EXISTS idx_core_theories_category ON core_theories(category);
CREATE INDEX IF NOT EXISTS idx_core_theories_code ON core_theories(theory_code);

-- Add RLS policies
ALTER TABLE core_theories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read active theories
CREATE POLICY "Allow authenticated users to read active core theories"
    ON core_theories FOR SELECT
    USING (is_active = true AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert theories (admin functionality)
CREATE POLICY "Allow authenticated users to insert core theories"
    ON core_theories FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update theories (admin functionality)  
CREATE POLICY "Allow authenticated users to update core theories"
    ON core_theories FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete theories (admin functionality)
CREATE POLICY "Allow authenticated users to delete core theories"
    ON core_theories FOR DELETE
    USING (auth.role() = 'authenticated');

-- Insert some default psychological theories
INSERT INTO core_theories (theory_name, theory_code, description, category, primary_researchers) VALUES
    ('Cognitive Behavioral Therapy', 'CBT', 'A psychological treatment that helps people identify and change destructive or disturbing thought patterns', 'Therapy', 'Aaron Beck, Albert Ellis'),
    ('Attachment Theory', 'ATTACHMENT', 'A psychological theory explaining how humans form emotional bonds and attachments', 'Developmental', 'John Bowlby, Mary Ainsworth'),
    ('Social Learning Theory', 'SOCIAL_LEARNING', 'Theory that people learn from one another via observation, imitation, and modeling', 'Learning', 'Albert Bandura'),
    ('Maslow''s Hierarchy of Needs', 'MASLOW', 'A motivational theory proposing a hierarchy of human needs', 'Motivation', 'Abraham Maslow'),
    ('Piaget''s Cognitive Development', 'PIAGET', 'Theory about the nature and development of human intelligence', 'Developmental', 'Jean Piaget'),
    ('Emotional Regulation Theory', 'EMOTION_REG', 'Theories about how individuals manage and respond to emotional experiences', 'Emotion', 'James Gross, others'),
    ('Mindfulness-Based Stress Reduction', 'MBSR', 'A program that uses mindfulness to help people manage stress, anxiety, and pain', 'Therapy', 'Jon Kabat-Zinn'),
    ('Positive Psychology', 'POSITIVE_PSYCH', 'Scientific study of what makes life most worth living', 'Positive', 'Martin Seligman, others'),
    ('Trauma-Informed Care', 'TRAUMA_INFORMED', 'Approach that recognizes and responds to the effects of trauma', 'Trauma', 'Various researchers'),
    ('Family Systems Theory', 'FAMILY_SYSTEMS', 'Theory that families are systems of interconnected and interdependent individuals', 'Family', 'Murray Bowen, others')
ON CONFLICT (theory_code) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_core_theories_updated_at 
    BEFORE UPDATE ON core_theories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
-- Create theory_connections table to map Super Skill + Cycle + Primary Theory

CREATE TABLE IF NOT EXISTS theory_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_skill_id UUID NOT NULL REFERENCES super_skills(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    primary_theory_id UUID NOT NULL REFERENCES core_theories(id) ON DELETE CASCADE,
    citation TEXT,
    brain_town_application TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT theory_connections_unique UNIQUE (super_skill_id, cycle_id, primary_theory_id)
);

CREATE INDEX IF NOT EXISTS idx_theory_connections_super_skill_id ON theory_connections(super_skill_id);
CREATE INDEX IF NOT EXISTS idx_theory_connections_cycle_id ON theory_connections(cycle_id);
CREATE INDEX IF NOT EXISTS idx_theory_connections_primary_theory_id ON theory_connections(primary_theory_id);
CREATE INDEX IF NOT EXISTS idx_theory_connections_sort_order ON theory_connections(sort_order);

ALTER TABLE theory_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read theory connections"
    ON theory_connections FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert theory connections"
    ON theory_connections FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update theory connections"
    ON theory_connections FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete theory connections"
    ON theory_connections FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE TRIGGER update_theory_connections_updated_at
    BEFORE UPDATE ON theory_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- Create audit_sections table for audit section definitions
-- Each section has a weight that contributes to the total 100%

CREATE TABLE IF NOT EXISTS audit_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_number INTEGER NOT NULL UNIQUE,
    section_name TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'IMPORTANT', 'ADVISORY')),
    weight INTEGER NOT NULL DEFAULT 10 CHECK (weight >= 0 AND weight <= 100),
    description TEXT,
    ai_instruction TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_rules table for individual rules within sections
CREATE TABLE IF NOT EXISTS audit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES audit_sections(id) ON DELETE CASCADE,
    rule_number TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    check_type TEXT NOT NULL CHECK (check_type IN (
        'contains_text',
        'not_contains_text', 
        'contains_any',
        'not_contains_any',
        'min_count',
        'regex_match',
        'manual_review'
    )),
    check_params JSONB DEFAULT '{}',
    ai_instruction TEXT NOT NULL,
    failure_message TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section_id, rule_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_sections_active ON audit_sections(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_sections_number ON audit_sections(section_number);
CREATE INDEX IF NOT EXISTS idx_audit_rules_section ON audit_rules(section_id);
CREATE INDEX IF NOT EXISTS idx_audit_rules_active ON audit_rules(is_active);

-- Add RLS policies
ALTER TABLE audit_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_rules ENABLE ROW LEVEL SECURITY;

-- Policies for audit_sections
CREATE POLICY "Allow authenticated users to read audit sections"
    ON audit_sections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert audit sections"
    ON audit_sections FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update audit sections"
    ON audit_sections FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete audit sections"
    ON audit_sections FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for audit_rules
CREATE POLICY "Allow authenticated users to read audit rules"
    ON audit_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert audit rules"
    ON audit_rules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update audit rules"
    ON audit_rules FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete audit rules"
    ON audit_rules FOR DELETE USING (auth.role() = 'authenticated');

-- Grant access to anon for edge functions
GRANT SELECT ON audit_sections TO anon;
GRANT SELECT ON audit_rules TO anon;

-- Insert default sections (weights must sum to 100)
INSERT INTO audit_sections (section_number, section_name, severity, weight, description, ai_instruction) VALUES
(1, 'Theory Compliance', 'CRITICAL', 15, 'Module must reference the correct psychological theory and citation', 
   'You MUST mention the primary theory name AND the researcher surname/citation. For example, if the theory is "Neuroplasticity" with citation "Merzenich, 1998", both "Neuroplasticity" and "Merzenich" must appear in the content.'),
(2, 'Developmental Compliance', 'CRITICAL', 12, 'Content must be age-appropriate per Piaget stages',
   'Match content complexity to the target age range. 6-8: concrete, simple language, no abstract concepts. 9-11: concrete with emerging academic language. 12-14: academic with scaffolding. 15-18: sophisticated, abstract reasoning allowed.'),
(3, 'Brain Town Vocabulary', 'CRITICAL', 18, 'Must use Brain Town metaphor consistently',
   'Use Brain Town vocabulary throughout: town, roads, streets, traffic, buildings, town planner, brain town. The child is ALWAYS the "town planner" of their Brain Town. Daniel must narrate. Use the correct character for the Super Skill.'),
(4, 'Trauma & ND Affirming', 'CRITICAL', 15, 'Trauma-informed and neurodiversity-affirming language',
   'NEVER use directive language (you must, you need to, you should). Use invitation framing instead (you might, you could, one option is). NEVER use evaluation language (good job, well done, correct). NEVER create time pressure. Always offer genuine choice.'),
(5, 'Level Standards', 'IMPORTANT', 10, 'Use level-appropriate verbs only',
   'Use ONLY the approved verbs for the week/level. Seed (W1-3): identify, name, label, point to, recognise, notice, watch. Street (W4-6): demonstrate, practise, sort, categorise, compare, try, choose. Motorway (W7-9): apply, use independently, self correct, adapt, transfer, extend. City Planner (W10-12): design, teach, create, adapt, mentor, redesign, lead, integrate.'),
(6, 'Learning Outcome', 'IMPORTANT', 8, 'Clear observable learning outcome',
   'Include at least one learning outcome statement starting with "Child can..." describing an observable, measurable skill the child will develop.'),
(7, 'Dx Adjustments', 'IMPORTANT', 7, 'Diagnosis-specific adaptations',
   'If diagnosis pathways are specified, adapt content accordingly. FASD: visual supports, single-step instructions. ADHD: movement breaks, short segments. ASD: literal language, predictable structure. PDA: offer choices, avoid demands.'),
(8, 'Progression', 'IMPORTANT', 5, 'Builds on prior learning',
   'Reference or build upon concepts from previous modules in the series. Use phrases like "building on what we learned" or "remember when we explored".'),
(9, 'Content Quality', 'IMPORTANT', 7, 'Australian English and professional tone',
   'Use Australian English spelling (colour, behaviour, favourite, organise, centre, mum, learnt). Write in a warm, professional educator tone. Avoid AI-sounding phrases like "dive in", "unlock", "unleash".'),
(10, 'Platform', 'ADVISORY', 3, 'Technical requirements',
   'Ensure all required fields are present and properly formatted.')
ON CONFLICT (section_number) DO UPDATE SET
    section_name = EXCLUDED.section_name,
    severity = EXCLUDED.severity,
    weight = EXCLUDED.weight,
    description = EXCLUDED.description,
    ai_instruction = EXCLUDED.ai_instruction;

-- Insert default rules for each section
-- Section 1: Theory Compliance
INSERT INTO audit_rules (section_id, rule_number, rule_name, check_type, check_params, ai_instruction, failure_message, sort_order) VALUES
((SELECT id FROM audit_sections WHERE section_number = 1), '1.1', 'Theory name present', 'contains_text', '{"field": "theory_name", "source": "context"}', 'Mention the primary theory name in the content', 'Module must reference the primary theory', 10),
((SELECT id FROM audit_sections WHERE section_number = 1), '1.2', 'Citation author present', 'contains_text', '{"field": "citation_author", "source": "context"}', 'Include the researcher surname from the citation', 'Citation author missing', 20),
((SELECT id FROM audit_sections WHERE section_number = 1), '1.3', 'Cycle theme alignment', 'contains_text', '{"field": "cycle_theme", "source": "context"}', 'Align content with the cycle theme', NULL, 30)
ON CONFLICT (section_id, rule_number) DO NOTHING;

-- Section 3: Brain Town Vocabulary
INSERT INTO audit_rules (section_id, rule_number, rule_name, check_type, check_params, ai_instruction, failure_message, sort_order) VALUES
((SELECT id FROM audit_sections WHERE section_number = 3), '3.1', 'Approved terms (min 2)', 'min_count', '{"terms": ["town", "road", "roads", "street", "streets", "main street", "motorway", "highway", "traffic", "traffic light", "traffic signal", "building", "buildings", "town planner", "brain town"], "min": 2}', 'Use at least 2 Brain Town vocabulary terms', 'Minimum 2 Brain Town terms required', 10),
((SELECT id FROM audit_sections WHERE section_number = 3), '3.2', 'ZERO forbidden words', 'not_contains_any', '{"source": "forbidden_terms", "term_type": "word"}', 'NEVER use deficit language: broken, damaged, wrong, faulty, disordered, deficit, dysfunction, abnormal, sick, diseased, problem brain, bad roads, wrong roads, messed up, not working properly, hard wired, set in stone, permanent', 'Critical: forbidden word(s) detected', 20),
((SELECT id FROM audit_sections WHERE section_number = 3), '3.3', 'ZERO forbidden metaphors', 'not_contains_any', '{"source": "forbidden_terms", "term_type": "metaphor"}', 'NEVER use non-Brain Town metaphors: computer, machine, engine, wires, circuits, channels, weather, waves, colours for emotions, seeds, driver, passenger, captain, pilot, volume dial, thermostat, meter, garden', 'Must use Brain Town equivalents', 30),
((SELECT id FROM audit_sections WHERE section_number = 3), '3.4', 'Child as Town Planner', 'contains_text', '{"text": "town planner"}', 'Frame the child as the "town planner" of their Brain Town', 'Child must be the town planner', 40),
((SELECT id FROM audit_sections WHERE section_number = 3), '3.5', 'Daniel narrates', 'contains_text', '{"text": "daniel"}', 'Daniel must appear as narrator at least once', 'Daniel must narrate every module', 50),
((SELECT id FROM audit_sections WHERE section_number = 3), '3.6', 'Correct character', 'contains_text', '{"field": "character_name", "source": "context"}', 'Use the correct character for this Super Skill', 'Wrong character for this Super Skill', 60)
ON CONFLICT (section_id, rule_number) DO NOTHING;

-- Section 4: Trauma & ND Affirming
INSERT INTO audit_rules (section_id, rule_number, rule_name, check_type, check_params, ai_instruction, failure_message, sort_order) VALUES
((SELECT id FROM audit_sections WHERE section_number = 4), '4.1', 'No forced disclosure', 'not_contains_any', '{"terms": ["tell your parent about", "share your feelings with"]}', 'Never force disclosure of feelings to adults', NULL, 10),
((SELECT id FROM audit_sections WHERE section_number = 4), '4.2', 'No directive language', 'not_contains_any', '{"terms": ["you need to", "you must", "you have to", "you should", "do this now", "tell your parent", "share your feelings", "tell us about", "you will"]}', 'Use invitation framing: "you might", "you could", "one option is" instead of directives', 'Use invitation framing', 20),
((SELECT id FROM audit_sections WHERE section_number = 4), '4.3', 'No evaluation', 'not_contains_any', '{"terms": ["good job", "well done", "great work", "you got it right", "correct answer", "wrong answer", "try harder", "you scored", "points", "you only", "you failed", "score"]}', 'Daniel never scores or judges. No evaluation language.', 'DD never scores or judges', 30),
((SELECT id FROM audit_sections WHERE section_number = 4), '4.4', 'No time pressure', 'not_contains_any', '{"terms": ["hurry", "quick", "before time", "minutes to complete", "time is up", "countdown", "race against", "faster"]}', 'Child works at their own pace. No time pressure.', 'Child works at own pace', 40),
((SELECT id FROM audit_sections WHERE section_number = 4), '4.5', 'Choice present', 'contains_any', '{"terms": ["you could", "you might", "choose", "option"]}', 'Offer genuine choice at every decision point', 'Offer choice at every point', 50),
((SELECT id FROM audit_sections WHERE section_number = 4), '4.6', 'Strengths framing', 'not_contains_any', '{"source": "forbidden_terms", "term_type": "word"}', 'Frame neurodiversity as difference, not deficit', NULL, 60)
ON CONFLICT (section_id, rule_number) DO NOTHING;

-- Section 5: Level Standards
INSERT INTO audit_rules (section_id, rule_number, rule_name, check_type, check_params, ai_instruction, failure_message, sort_order) VALUES
((SELECT id FROM audit_sections WHERE section_number = 5), '5.1', 'Level-appropriate verbs', 'manual_review', '{"note": "Checks verbs match the week/level"}', 'Use ONLY approved verbs for the current level', 'Must use approved verbs only', 10)
ON CONFLICT (section_id, rule_number) DO NOTHING;

-- Section 6: Learning Outcome
INSERT INTO audit_rules (section_id, rule_number, rule_name, check_type, check_params, ai_instruction, failure_message, sort_order) VALUES
((SELECT id FROM audit_sections WHERE section_number = 6), '6.1', '"Child can..." format', 'contains_text', '{"text": "child can"}', 'Include at least one "Child can..." learning outcome statement', 'Start with "Child can"', 10)
ON CONFLICT (section_id, rule_number) DO NOTHING;

-- Section 9: Content Quality
INSERT INTO audit_rules (section_id, rule_number, rule_name, check_type, check_params, ai_instruction, failure_message, sort_order) VALUES
((SELECT id FROM audit_sections WHERE section_number = 9), '9.1', 'Australian English', 'not_contains_any', '{"terms": ["behavior", "color", "organization", "recognize", "organize", "center", "analyze", "generalize"]}', 'Use Australian English spelling: colour, behaviour, favourite, organise, centre, mum, learnt', 'Must use Australian English', 10),
((SELECT id FROM audit_sections WHERE section_number = 9), '9.2', 'BSP tone', 'manual_review', '{}', 'Write in a warm, professional educator tone', 'Requires clinical review', 20)
ON CONFLICT (section_id, rule_number) DO NOTHING;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_audit_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_audit_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_sections_updated_at ON audit_sections;
CREATE TRIGGER trigger_audit_sections_updated_at BEFORE UPDATE ON audit_sections FOR EACH ROW EXECUTE FUNCTION update_audit_sections_updated_at();

DROP TRIGGER IF EXISTS trigger_audit_rules_updated_at ON audit_rules;
CREATE TRIGGER trigger_audit_rules_updated_at BEFORE UPDATE ON audit_rules FOR EACH ROW EXECUTE FUNCTION update_audit_rules_updated_at();
-- Create forbidden_terms table for Brain Town vocabulary compliance
-- This table stores forbidden words and metaphors that should never appear in generated content

CREATE TABLE IF NOT EXISTS forbidden_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term TEXT NOT NULL,
    term_type TEXT NOT NULL CHECK (term_type IN ('word', 'metaphor')),
    reason TEXT,
    brain_town_alternative TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on term + type combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_forbidden_terms_unique ON forbidden_terms(LOWER(term), term_type);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forbidden_terms_active ON forbidden_terms(is_active);
CREATE INDEX IF NOT EXISTS idx_forbidden_terms_type ON forbidden_terms(term_type);

-- Add RLS policies
ALTER TABLE forbidden_terms ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read active terms
CREATE POLICY "Allow authenticated users to read forbidden terms"
    ON forbidden_terms FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert terms (admin functionality)
CREATE POLICY "Allow authenticated users to insert forbidden terms"
    ON forbidden_terms FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update terms (admin functionality)
CREATE POLICY "Allow authenticated users to update forbidden terms"
    ON forbidden_terms FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete terms (admin functionality)
CREATE POLICY "Allow authenticated users to delete forbidden terms"
    ON forbidden_terms FOR DELETE
    USING (auth.role() = 'authenticated');

-- Insert default forbidden words (deficit language)
INSERT INTO forbidden_terms (term, term_type, reason, brain_town_alternative) VALUES
    ('broken', 'word', 'Deficit language - implies permanent damage', 'developing'),
    ('damaged', 'word', 'Deficit language - implies permanent damage', 'growing'),
    ('wrong', 'word', 'Deficit language - implies judgement', 'different'),
    ('faulty', 'word', 'Deficit language - implies defect', 'unique'),
    ('disordered', 'word', 'Deficit language - pathologising', 'different'),
    ('deficit', 'word', 'Deficit language - pathologising', 'difference'),
    ('dysfunction', 'word', 'Deficit language - pathologising', 'difference'),
    ('abnormal', 'word', 'Deficit language - pathologising', 'unique'),
    ('sick', 'word', 'Deficit language - medicalising', NULL),
    ('diseased', 'word', 'Deficit language - medicalising', NULL),
    ('problem brain', 'word', 'Deficit language - pathologising', 'developing brain'),
    ('bad roads', 'word', 'Deficit language in Brain Town context', 'less-used roads'),
    ('wrong roads', 'word', 'Deficit language in Brain Town context', 'different roads'),
    ('messed up', 'word', 'Deficit language - informal pathologising', 'developing'),
    ('not working properly', 'word', 'Deficit language - implies defect', 'still growing'),
    ('hard wired', 'word', 'Fixed mindset language', 'can change'),
    ('set in stone', 'word', 'Fixed mindset language', 'can grow'),
    ('permanent', 'word', 'Fixed mindset language', 'changeable')
ON CONFLICT DO NOTHING;

-- Insert default forbidden metaphors (non-Brain Town metaphors)
INSERT INTO forbidden_terms (term, term_type, reason, brain_town_alternative) VALUES
    ('computer', 'metaphor', 'Non-Brain Town metaphor', 'Brain Town'),
    ('machine', 'metaphor', 'Non-Brain Town metaphor', 'town'),
    ('engine', 'metaphor', 'Non-Brain Town metaphor', 'town centre'),
    ('wires', 'metaphor', 'Non-Brain Town metaphor', 'roads'),
    ('circuits', 'metaphor', 'Non-Brain Town metaphor', 'streets'),
    ('channels', 'metaphor', 'Non-Brain Town metaphor', 'roads'),
    ('weather', 'metaphor', 'Non-Brain Town metaphor', 'traffic'),
    ('waves', 'metaphor', 'Non-Brain Town metaphor', 'traffic flow'),
    ('colours for emotions', 'metaphor', 'Non-Brain Town metaphor', 'traffic lights'),
    ('seeds', 'metaphor', 'Non-Brain Town metaphor (standalone)', 'buildings'),
    ('driver', 'metaphor', 'Non-Brain Town metaphor', 'town planner'),
    ('passenger', 'metaphor', 'Non-Brain Town metaphor', 'visitor'),
    ('captain', 'metaphor', 'Non-Brain Town metaphor', 'town planner'),
    ('pilot', 'metaphor', 'Non-Brain Town metaphor', 'town planner'),
    ('volume dial', 'metaphor', 'Non-Brain Town metaphor', 'traffic light'),
    ('thermostat', 'metaphor', 'Non-Brain Town metaphor', 'traffic controller'),
    ('meter', 'metaphor', 'Non-Brain Town metaphor', 'traffic signal'),
    ('garden', 'metaphor', 'Non-Brain Town metaphor', 'town park')
ON CONFLICT DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_forbidden_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_forbidden_terms_updated_at ON forbidden_terms;
CREATE TRIGGER trigger_forbidden_terms_updated_at
    BEFORE UPDATE ON forbidden_terms
    FOR EACH ROW
    EXECUTE FUNCTION update_forbidden_terms_updated_at();

-- Grant access to anon for edge functions
GRANT SELECT ON forbidden_terms TO anon;
-- Update Theory Compliance instruction to specify theory should only be mentioned ONCE
-- Not repetitively on every page

UPDATE audit_sections 
SET ai_instruction = 'Mention the primary theory name AND researcher citation ONCE in the module, ideally on the first content page or introduction. After that initial mention, let the theory DRIVE the content approach but do NOT repeatedly name the theory or researcher. The content should embody the theory principles without constantly referencing it by name. Example: If using "Neuroplasticity (Merzenich, 1998)", mention it once early, then use concepts like "your brain can change and grow" without saying "neuroplasticity" again.'
WHERE section_number = 1;

-- Also update Brain Town to be clearer about Daniel's role
UPDATE audit_sections 
SET ai_instruction = 'Use Brain Town vocabulary throughout: town, roads, streets, traffic, buildings, town planner, brain town. The child is ALWAYS the "town planner" of their Brain Town - they have agency and control. Daniel (the narrator) should introduce concepts and guide, but the child makes all decisions. Use the correct character mascot for the Super Skill (e.g., Lenny the Border Collie for Brain Builder).'
WHERE section_number = 3;
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS ai_prompt_template text;

UPDATE settings
SET ai_prompt_template = $$You are an expert child psychologist creating Daniel's Diaries modules — trauma-informed, neurodiversity-affirming social-emotional learning content for children ages 6-18.

=== DANIEL'S DIARIES FRAMEWORK ===
Daniel is a friendly narrator who guides children through Brain Town — a metaphor where the child's brain is a town they are building. The CHILD is always the "town planner" with full agency over their Brain Town.

=== MANDATORY CONTENT REQUIREMENTS ===
1. THEORY & CITATION: Every module MUST mention the primary theory name AND the researcher's surname (e.g., "Operant Learning Foundations" AND "Skinner").
2. BRAIN TOWN VOCABULARY - MUST USE: town, road, roads, street, streets, main street, motorway, highway, traffic, traffic light, traffic signal, building, buildings, town planner, brain town
3. CHILD AS TOWN PLANNER: Always frame the child as the "town planner" of their Brain Town. Use phrases like "As the town planner of your Brain Town..." or "You're the town planner here..."
4. DANIEL NARRATES: Daniel must appear as narrator (use "Daniel" by name at least once).
5. LEARNING OUTCOME: Include at least one statement starting with "Child can..." to describe what the child will learn.

=== ABSOLUTELY FORBIDDEN - NEVER USE ===
FORBIDDEN WORDS (deficit language): broken, damaged, wrong, faulty, disordered, deficit, dysfunction, abnormal, sick, diseased, problem brain, bad roads, wrong roads, messed up, not working properly, hard wired, set in stone, permanent
FORBIDDEN METAPHORS (use Brain Town equivalents instead): computer, hard drive, processor, muscle, empty vessel, blank slate, machine, engine, wires, circuits, channels, weather, waves, colours for emotions, seeds, driver, passenger, captain, pilot, volume dial, thermostat, meter, garden
DIRECTIVE LANGUAGE (use invitation framing instead): you need to, you must, you have to, you should, do this now, tell your parent, share your feelings, tell us about, you will
EVALUATION LANGUAGE (Daniel never scores or judges): good job, well done, great work, you got it right, correct answer, wrong answer, try harder, you scored, points, you only, you failed, score
TIME PRESSURE (child works at own pace): hurry, quick, before time, minutes to complete, time is up, countdown, race against, faster

=== INVITATION FRAMING (USE INSTEAD OF DIRECTIVES) ===
✅ "You might like to..." ✅ "You could try..." ✅ "Some children find it helpful to..." ✅ "One option is..." ✅ "If you'd like, you can..."
❌ "You need to..." ❌ "You must..." ❌ "You have to..." ❌ "You should..."

=== LEVEL-APPROPRIATE VERBS ===
SEED LEVEL (Weeks 1-3): ONLY use: identify, name, label, point to, recognise, notice, watch
STREET LEVEL (Weeks 4-6): ONLY use: demonstrate, practise, sort, categorise, compare, try, choose
MOTORWAY LEVEL (Weeks 7-9): ONLY use: apply, use independently, self correct, adapt, transfer, extend
CITY PLANNER LEVEL (Weeks 10-12): ONLY use: design, teach, create, adapt, mentor, redesign, lead, integrate

=== CRITICAL RULES ===
1. Always respond with ONLY valid JSON. No explanations, no markdown, just the JSON object.
2. If a specific character/mascot is mentioned, you MUST use EXACTLY that character name and type throughout. Never substitute a different animal or character.
3. The mascot emoji must match the character type exactly.
4. When creating multiple items, sequence them as a learning journey: start with simple awareness, then practise skills, then apply in real-life scenarios.
5. Treat the age range and language guidelines as hard requirements.
6. Use Australian English spelling throughout (colour, behaviour, favourite, organise, centre, mum, learnt). NEVER use: behavior, color, organization, recognize, organize, center, analyze, generalize.
7. NEVER use em dashes, "dive in", "unlock", "unleash", "delve", or other AI-sounding phrases.
8. Write as a warm, experienced educator, not a marketing copywriter.
9. NEVER use hyphens or en dashes to join compound words. Use spaces instead (e.g., "thought feeling" not "thought-feeling").
10. EMOJI SAFETY: Only use well-supported, common emojis from Unicode 12.0 or earlier.
   SAFE emojis: 😊 😢 😡 😨 😌 🤩 😳 😤 🤔 😴 🥰 😎 🤗 😮 🙂 😞 😰 ⭐ 💛 ❤ 🌟 🎯 🎨 📝 💡 🏠 🌈 🐕 🐱 🦁 🐻 🌸 🌻 🎵 🎶 💪 🧠 ❓ ✅ ✓ ❌ 🐢 🐠 🐟 🐙 🐚 🌊 🐬 🐳 🐋 🦈 🐡 🦀 🌿 🍃 💎 ⚡ 🔥 💧 🌙 ☀ 🌤 ⛅ 🌧 ⛈ 🌪 🌞 🎈 🎉 🏆 🎪 🎭 🎬 🎹 🥁 🎸 🎺 🎻 📖 📚 ✏ 🖍 🖌 👀 👂 🤝 👍 👏 🙌 💭 💬 🔍 🧩
   BANNED emojis: 🫧 🪸 🪷 🪻 🫁 🧒 🪼 🫠 🫣 🫤 🩵 🩶 🩷 🪺 🪹 🪨 🫂 — and ANY emoji you are unsure about.
11. GENUINE CHOICE: Always offer the child choices. Use "you could", "you might", "choose", "option" language.
12. STRENGTHS-BASED: Frame neurodiversity as difference, not deficit. Never use pathologising language.$$
WHERE ai_prompt_template IS NULL OR btrim(ai_prompt_template) = '';
ALTER TABLE public.parent_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS stripe_current_period_start timestamptz,
ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS parent_subscriptions_stripe_customer_uidx
ON public.parent_subscriptions (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS parent_subscriptions_stripe_subscription_uidx
ON public.parent_subscriptions (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.subscription_credit_ledger
ADD COLUMN IF NOT EXISTS source_invoice_id text,
ADD COLUMN IF NOT EXISTS stripe_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_credit_ledger_source_invoice_uidx
ON public.subscription_credit_ledger (source_invoice_id)
WHERE source_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_credit_ledger_stripe_event_uidx
ON public.subscription_credit_ledger (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
-- Comprehensive RLS baseline for app tables.
-- Rules implemented:
-- 1) Global/reference data: all authenticated users can read; only sys admins can write.
-- 2) User data: users can only read/write their own rows.

create or replace function public.is_sys_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.parent_profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.owns_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    where c.id = p_child_id
      and c.parent_user_id = auth.uid()
  );
$$;

-- Enable RLS on all public tables.
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- Global/reference tables: read for authenticated users, write for sys admin only.
do $$
declare
  t text;
  global_tables text[] := array[
    'age_ranges',
    'ai_module_config',
    'assessment_questions',
    'audit_criteria',
    'audit_rules',
    'audit_sections',
    'badges',
    'brain_town_vocabulary',
    'category_colors',
    'characters',
    'checkin_challenges',
    'checkin_goals',
    'checkin_triggers',
    'core_theories',
    'cycles',
    'diagnosis_profiles',
    'dss_sedi_categories',
    'emotions',
    'fasd_domains',
    'focus_plan_categories',
    'focus_plan_frequencies',
    'focus_plan_goals',
    'focus_plan_intensities',
    'forbidden_terms',
    'levels',
    'module_secondary_theories',
    'modules',
    'ndis_domains',
    'needs_based_pathways',
    'parent_scripts',
    'pathways',
    'roadblock_config',
    'roadblocks',
    'sequencing_rules',
    'series',
    'settings',
    'skills',
    'sub_skills',
    'subscription_tiers',
    'super_skills',
    'theory_connections',
    'tools',
    'ai_generation_jobs'
  ];
begin
  foreach t in array global_tables
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_all_authenticated', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_admin_only', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_admin_only', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_admin_only', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      t || '_select_all_authenticated', t
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_sys_admin());',
      t || '_insert_admin_only', t
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_sys_admin()) with check (public.is_sys_admin());',
      t || '_update_admin_only', t
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_sys_admin());',
      t || '_delete_admin_only', t
    );
  end loop;
end $$;

-- parent_profiles: users can manage their own profile; sys admins can manage all.
drop policy if exists parent_profiles_select_own_or_admin on public.parent_profiles;
drop policy if exists parent_profiles_insert_own_or_admin on public.parent_profiles;
drop policy if exists parent_profiles_update_own_or_admin on public.parent_profiles;
drop policy if exists parent_profiles_delete_own_or_admin on public.parent_profiles;

create policy parent_profiles_select_own_or_admin
on public.parent_profiles
for select
to authenticated
using (id = auth.uid() or public.is_sys_admin());

create policy parent_profiles_insert_own_or_admin
on public.parent_profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_sys_admin());

create policy parent_profiles_update_own_or_admin
on public.parent_profiles
for update
to authenticated
using (id = auth.uid() or public.is_sys_admin())
with check (id = auth.uid() or public.is_sys_admin());

create policy parent_profiles_delete_own_or_admin
on public.parent_profiles
for delete
to authenticated
using (id = auth.uid() or public.is_sys_admin());

-- Parent-owned tables (direct user id ownership).
do $$
declare
  t text;
  parent_owned_tables text[] := array[
    'children',
    'module_unlocks',
    'parent_modules',
    'parent_subscriptions',
    'subscription_credit_ledger',
    'modules_to_generate'
  ];
  owner_column text;
begin
  foreach t in array parent_owned_tables
  loop
    owner_column := case
      when t = 'children' then 'parent_user_id'
      when t = 'module_unlocks' then 'parent_id'
      when t = 'parent_modules' then 'parent_id'
      when t = 'parent_subscriptions' then 'parent_id'
      when t = 'subscription_credit_ledger' then 'parent_id'
      when t = 'modules_to_generate' then 'created_by'
      else 'parent_user_id'
    end;

    execute format('drop policy if exists %I on public.%I;', t || '_select_own_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_own_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_own_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_own_or_admin', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (%I = auth.uid() or public.is_sys_admin());',
      t || '_select_own_or_admin', t, owner_column
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%I = auth.uid() or public.is_sys_admin());',
      t || '_insert_own_or_admin', t, owner_column
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (%I = auth.uid() or public.is_sys_admin()) with check (%I = auth.uid() or public.is_sys_admin());',
      t || '_update_own_or_admin', t, owner_column, owner_column
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (%I = auth.uid() or public.is_sys_admin());',
      t || '_delete_own_or_admin', t, owner_column
    );
  end loop;
end $$;

-- Child-owned tables: access only if the child belongs to the current user (or sys admin).
do $$
declare
  t text;
  child_tables text[] := array[
    'child_badges',
    'child_cycle_progress',
    'child_focus_plan',
    'child_modules',
    'child_roadblock_completions',
    'child_roadblocks',
    'child_super_skill_progress',
    'daily_quest_completions',
    'pathway_assessments',
    'reward_purchases'
  ];
begin
  foreach t in array child_tables
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_own_child_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_own_child_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_own_child_or_admin', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_own_child_or_admin', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_select_own_child_or_admin', t
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_insert_own_child_or_admin', t
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.owns_child(child_id) or public.is_sys_admin()) with check (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_update_own_child_or_admin', t
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.owns_child(child_id) or public.is_sys_admin());',
      t || '_delete_own_child_or_admin', t
    );
  end loop;
end $$;

-- login_streaks may belong by user_id and/or child_id.
drop policy if exists login_streaks_select_own_or_admin on public.login_streaks;
drop policy if exists login_streaks_insert_own_or_admin on public.login_streaks;
drop policy if exists login_streaks_update_own_or_admin on public.login_streaks;
drop policy if exists login_streaks_delete_own_or_admin on public.login_streaks;

create policy login_streaks_select_own_or_admin
on public.login_streaks
for select
to authenticated
using (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy login_streaks_insert_own_or_admin
on public.login_streaks
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy login_streaks_update_own_or_admin
on public.login_streaks
for update
to authenticated
using (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
)
with check (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy login_streaks_delete_own_or_admin
on public.login_streaks
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

-- module_responses may be parent-owned and/or child-owned.
drop policy if exists module_responses_select_own_or_admin on public.module_responses;
drop policy if exists module_responses_insert_own_or_admin on public.module_responses;
drop policy if exists module_responses_update_own_or_admin on public.module_responses;
drop policy if exists module_responses_delete_own_or_admin on public.module_responses;

create policy module_responses_select_own_or_admin
on public.module_responses
for select
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy module_responses_insert_own_or_admin
on public.module_responses
for insert
to authenticated
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy module_responses_update_own_or_admin
on public.module_responses
for update
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
)
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy module_responses_delete_own_or_admin
on public.module_responses
for delete
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

-- weekly_checkins are parent/child scoped.
drop policy if exists weekly_checkins_select_own_or_admin on public.weekly_checkins;
drop policy if exists weekly_checkins_insert_own_or_admin on public.weekly_checkins;
drop policy if exists weekly_checkins_update_own_or_admin on public.weekly_checkins;
drop policy if exists weekly_checkins_delete_own_or_admin on public.weekly_checkins;

create policy weekly_checkins_select_own_or_admin
on public.weekly_checkins
for select
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy weekly_checkins_insert_own_or_admin
on public.weekly_checkins
for insert
to authenticated
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy weekly_checkins_update_own_or_admin
on public.weekly_checkins
for update
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
)
with check (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

create policy weekly_checkins_delete_own_or_admin
on public.weekly_checkins
for delete
to authenticated
using (
  parent_user_id = auth.uid()
  or public.owns_child(child_id)
  or public.is_sys_admin()
);

-- rewards can be baseline (global read) or parent-owned.
drop policy if exists rewards_select_baseline_or_own_or_admin on public.rewards;
drop policy if exists rewards_insert_own_or_admin on public.rewards;
drop policy if exists rewards_update_own_or_admin on public.rewards;
drop policy if exists rewards_delete_own_or_admin on public.rewards;

create policy rewards_select_baseline_or_own_or_admin
on public.rewards
for select
to authenticated
using (
  is_baseline = true
  or parent_user_id = auth.uid()
  or public.is_sys_admin()
);

create policy rewards_insert_own_or_admin
on public.rewards
for insert
to authenticated
with check (parent_user_id = auth.uid() or public.is_sys_admin());

create policy rewards_update_own_or_admin
on public.rewards
for update
to authenticated
using (parent_user_id = auth.uid() or public.is_sys_admin())
with check (parent_user_id = auth.uid() or public.is_sys_admin());

create policy rewards_delete_own_or_admin
on public.rewards
for delete
to authenticated
using (parent_user_id = auth.uid() or public.is_sys_admin());
-- Create daily_quest_completions table
CREATE TABLE IF NOT EXISTS daily_quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, completed_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_quest_completions_child_id ON daily_quest_completions(child_id);
CREATE INDEX IF NOT EXISTS idx_daily_quest_completions_completed_date ON daily_quest_completions(completed_date);
CREATE INDEX IF NOT EXISTS idx_daily_quest_completions_child_date ON daily_quest_completions(child_id, completed_date);

-- Enable RLS
ALTER TABLE daily_quest_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for parents to view their children's quest completions
CREATE POLICY "Parents can view their children's quest completions"
  ON daily_quest_completions
  FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- Create RLS policy for parents to insert quest completions for their children
CREATE POLICY "Parents can insert quest completions for their children"
  ON daily_quest_completions
  FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- Create RLS policy for parents to update quest completions for their children
CREATE POLICY "Parents can update quest completions for their children"
  ON daily_quest_completions
  FOR UPDATE
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );
-- Add child_id to rewards table so custom rewards can be scoped to a specific child
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id) ON DELETE CASCADE;

-- Baseline rewards and existing custom rewards (child_id = NULL) remain visible to all children.
-- New custom rewards created with a child_id are only visible to that child.

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_rewards_child_id ON rewards(child_id);

-- Update RLS: allow parents to see baseline rewards, their own custom rewards (global or child-specific)
-- Drop existing select policy and recreate
DROP POLICY IF EXISTS "Users can view baseline and own custom rewards" ON rewards;
CREATE POLICY "Users can view baseline and own custom rewards" ON rewards
  FOR SELECT USING (
    is_baseline = true
    OR parent_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM parent_users WHERE id = auth.uid() AND is_admin = true)
  );
