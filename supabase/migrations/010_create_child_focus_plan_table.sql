-- Create child_focus_plan table for storing focus plan data
CREATE TABLE IF NOT EXISTS child_focus_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  target_category_ids TEXT[] NOT NULL,
  default_pathway_id UUID,
  goal_key TEXT,
  goal_text TEXT,
  frequency TEXT,
  intensity TEXT,
  comments TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_child_focus_plan_child_id ON child_focus_plan(child_id);
CREATE INDEX IF NOT EXISTS idx_child_focus_plan_is_active ON child_focus_plan(is_active);
CREATE INDEX IF NOT EXISTS idx_child_focus_plan_child_active ON child_focus_plan(child_id, is_active);
