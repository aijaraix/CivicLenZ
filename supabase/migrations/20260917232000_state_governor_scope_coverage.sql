-- Project the existing STATE_GOVERNOR contract/jobs into dimensional coverage.
-- This creates no Person, Seat, Occupancy, claim, evidence, attempt or job.
WITH governor_contract AS (
  SELECT research_contract_id
  FROM public.research_contracts
  WHERE contract_key = 'STATE_GOVERNOR' AND active
), governor_seats AS (
  SELECT seat_id
  FROM public.seats
  WHERE research_contract_key = 'STATE_GOVERNOR'
), scope_jobs AS (
  SELECT
    seat_id,
    payload->>'scope_key' AS scope_key,
    bool_or(status IN ('leased','running')) AS running,
    bool_or(status = 'succeeded') AS has_result
  FROM public.jobs
  WHERE job_type = 'contract_scope_research'
    AND payload->>'contract_id' = (SELECT research_contract_id::text FROM governor_contract)
  GROUP BY seat_id, payload->>'scope_key'
)
INSERT INTO public.subject_scope_coverage (
  subject_type, subject_id, seat_id, research_contract_id, scope_key,
  dataset_kind, coverage_state, coverage_audit_state, blocker, next_action
)
SELECT
  'seat',
  s.seat_id,
  s.seat_id,
  c.research_contract_id,
  f.field_key,
  CASE WHEN f.field_key IN (
    'election_history','campaign_finance','financial_disclosure',
    'executive_actions','prior_offices'
  ) THEN 'FINITE' ELSE 'OPEN_ENDED' END,
  CASE WHEN COALESCE(j.running, false) OR COALESCE(j.has_result, false)
    THEN 'IN_PROGRESS' ELSE 'CAPABILITY_BLOCKED' END,
  'PENDING',
  CASE WHEN COALESCE(j.running, false) OR COALESCE(j.has_result, false)
    THEN NULL ELSE 'CAPABILITY_NOT_IMPLEMENTED_OR_NOT_ROUTED' END,
  CASE WHEN COALESCE(j.running, false) OR COALESCE(j.has_result, false)
    THEN 'COLLECT_THEN_INDEPENDENT_COVERAGE_AUDIT'
    ELSE 'IMPLEMENT_COMPATIBLE_CAPABILITY_ROUTE' END
FROM governor_contract c
CROSS JOIN governor_seats s
JOIN public.research_contract_fields f ON f.research_contract_id = c.research_contract_id
LEFT JOIN scope_jobs j ON j.seat_id = s.seat_id AND j.scope_key = f.field_key
ON CONFLICT (subject_type, subject_id, research_contract_id, scope_key) DO UPDATE SET
  coverage_state = EXCLUDED.coverage_state,
  blocker = EXCLUDED.blocker,
  next_action = EXCLUDED.next_action,
  updated_at = now();

