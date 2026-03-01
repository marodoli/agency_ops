-- Atomically claim the next queued job for processing.
-- Uses FOR UPDATE SKIP LOCKED to prevent double pickup by concurrent workers.
-- Returns 0 or 1 rows (the claimed job, or empty set if no jobs queued).

CREATE OR REPLACE FUNCTION claim_next_job()
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE jobs
  SET status = 'running', started_at = now()
  WHERE id = (
    SELECT id FROM jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
