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
