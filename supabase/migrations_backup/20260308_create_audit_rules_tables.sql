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
