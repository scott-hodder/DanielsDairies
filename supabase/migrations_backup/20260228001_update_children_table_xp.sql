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
