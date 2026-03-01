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
