-- Additive live change: atomic job lease RPC only.
--
-- LIVE CivicLenZ (ref uazqyzmzydtmbypjuqjw) does NOT have lease_due_job yet.
-- This file is the independently applicable migration for that function.
-- It does not alter or recreate civic tables.
--
-- DO NOT apply to production until reviewed. After review, this is the file
-- an operator would apply — not 202609020001 (fresh-database reconstruction).

CREATE OR REPLACE FUNCTION public.lease_due_job(
  p_leased_by text,
  p_lease_seconds integer DEFAULT 300,
  p_job_id uuid DEFAULT NULL
)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  claimed public.jobs;
BEGIN
  IF p_lease_seconds IS NULL OR p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'p_lease_seconds must be greater than zero';
  END IF;

  UPDATE public.jobs
  SET
    status = 'leased',
    leased_by = p_leased_by,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = attempt_count + 1,
    started_at = COALESCE(started_at, now()),
    updated_at = now()
  WHERE job_id = (
    SELECT j.job_id
    FROM public.jobs j
    WHERE (
        j.status = 'queued'
        OR (j.status = 'leased' AND j.lease_expires_at < now())
      )
      AND (j.scheduled_for IS NULL OR j.scheduled_for <= now())
      AND (p_job_id IS NULL OR j.job_id = p_job_id)
    ORDER BY j.priority DESC, j.scheduled_for ASC NULLS FIRST, j.created_at ASC, j.job_id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO claimed;

  IF claimed.job_id IS NOT NULL THEN
    RETURN NEXT claimed;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lease_due_job(text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lease_due_job(text, integer, uuid) TO service_role;
