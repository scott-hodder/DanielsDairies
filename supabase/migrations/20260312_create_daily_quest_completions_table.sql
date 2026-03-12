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
