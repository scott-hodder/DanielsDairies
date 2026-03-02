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
