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
