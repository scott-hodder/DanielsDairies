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
