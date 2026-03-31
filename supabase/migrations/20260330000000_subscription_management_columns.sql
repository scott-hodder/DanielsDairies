-- Add columns for payment failure tracking and subscription pause state
ALTER TABLE parent_subscriptions
  ADD COLUMN IF NOT EXISTS payment_failure_code text,
  ADD COLUMN IF NOT EXISTS payment_failure_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;
