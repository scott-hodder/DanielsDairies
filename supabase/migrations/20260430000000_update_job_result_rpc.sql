-- RPC function to update ai_generation_jobs with large results
-- Bypasses PostgREST body size limits by accepting result as TEXT
-- and casting to JSONB on the database side.
CREATE OR REPLACE FUNCTION update_job_result(
  job_id UUID,
  job_status TEXT,
  job_result TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_generation_jobs
  SET
    status = job_status,
    result = job_result::jsonb,
    updated_at = now()
  WHERE id = job_id;
END;
$$;
