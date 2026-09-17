-- Seed the canonical 73-capability catalog without claiming implementation.
INSERT INTO public.physical_capabilities (capability_key, capability_family, implementation_state, current_blockers, monitoring_state)
SELECT capability_key, capability_family, 'DECLARED', '[]'::jsonb, 'UNKNOWN'
FROM (VALUES
('seat_discovery','foundation'),
('jurisdiction_discovery','foundation'),
('current_officeholder','foundation'),
('occupancy','foundation'),
('identity_resolution','foundation'),
('portrait','foundation'),
('official_contact','foundation'),
('official_social','foundation'),
('election_calendar','elections_candidates'),
('election_discovery','elections_candidates'),
('candidate_discovery','elections_candidates'),
('candidate_status','elections_candidates'),
('filing_status','elections_candidates'),
('ballot_qualification','elections_candidates'),
('election_results','elections_candidates'),
('biography','background'),
('education','background'),
('career','background'),
('military_history','background'),
('political_history','background'),
('prior_offices','background'),
('election_history','background'),
('campaign_committees','finance'),
('campaign_finance','finance'),
('contributions','finance'),
('expenditures','finance'),
('pac_relationships','finance'),
('finance_reconciliation','finance'),
('financial_disclosures','disclosure'),
('assets','disclosure'),
('liabilities','disclosure'),
('income_sources','disclosure'),
('business_interests','disclosure'),
('gifts','disclosure'),
('outside_income','disclosure'),
('legislation','government_activity'),
('sponsored_bills','government_activity'),
('votes','government_activity'),
('committee_assignments','government_activity'),
('executive_actions','government_activity'),
('executive_orders','government_activity'),
('bill_signings','government_activity'),
('vetoes','government_activity'),
('appointments','government_activity'),
('budget_actions','government_activity'),
('campaign_promises','accountability'),
('public_commitments','accountability'),
('public_statements','accountability'),
('promise_status','accountability'),
('ethics','accountability'),
('investigations','accountability'),
('court_public_records','accountability'),
('conflicts_of_interest','accountability'),
('political_relationships','relationships'),
('donor_relationships','relationships'),
('organization_relationships','relationships'),
('staff_relationships','relationships'),
('appointment_relationships','relationships'),
('publicly_relevant_family_business_relationships','relationships'),
('official_press','media_monitoring'),
('news','media_monitoring'),
('interviews','media_monitoring'),
('debates','media_monitoring'),
('material_social_activity','media_monitoring'),
('change_detection','media_monitoring'),
('source_health','media_monitoring'),
('freshness_monitor','media_monitoring'),
('evidence_validation','system_quality'),
('entity_resolution','system_quality'),
('contradiction_resolution','system_quality'),
('dataset_reconciliation','system_quality'),
('completeness_audit','system_quality'),
('publication_gate','system_quality')
) AS seed(capability_key, capability_family)
ON CONFLICT (capability_key) DO NOTHING;

-- Promote only physically evidenced paths; READY remains distinct from ACTIVE.
WITH recent AS (
 SELECT DISTINCT ON ((metadata->>'capability')) metadata->>'capability' AS capability_key, worker_run_id, completed_at, deployment_id, worker_key
 FROM public.worker_runs
 WHERE status='succeeded' AND COALESCE(records_read,0)+COALESCE(records_written,0)>0
   AND metadata->>'capability' IN ('authoritative_evidence_retrieval','official_profile_evidence_extraction')
 ORDER BY metadata->>'capability', completed_at DESC
)
INSERT INTO public.physical_capabilities (capability_key,capability_family,implementation_state,worker_module,runtime,queue_pool,evidence_obligation,validation_path,last_successful_worker_run_id,deployment_version,monitoring_state,last_observed_at)
SELECT capability_key,'physical_pipeline','ACTIVE',
 CASE capability_key WHEN 'authoritative_evidence_retrieval' THEN 'workers/cloudflare/shared/src/contract-evidence.ts' ELSE 'workers/cloudflare/shared/src/contract-extraction.ts' END,
 'cloudflare','cloudflare-deterministic-http','{"required":true,"raw_bytes":true,"sha256":true}'::jsonb,
 '{"independent_canonical_validation":true}'::jsonb,worker_run_id,deployment_id,'OBSERVED',completed_at
FROM recent
ON CONFLICT (capability_key) DO UPDATE SET implementation_state='ACTIVE',last_successful_worker_run_id=excluded.last_successful_worker_run_id,deployment_version=excluded.deployment_version,last_observed_at=excluded.last_observed_at,updated_at=now();

WITH recent AS (
 SELECT worker_run_id,completed_at,deployment_id FROM public.worker_runs
 WHERE worker_key='hermes.cloudflare.validation' AND status='succeeded' AND COALESCE(records_read,0)+COALESCE(records_written,0)>0
 ORDER BY completed_at DESC LIMIT 1
)
UPDATE public.physical_capabilities p SET implementation_state='ACTIVE',worker_module='workers/cloudflare/shared/src/contract-validation.ts',runtime='cloudflare',queue_pool='cloudflare-validation',last_successful_worker_run_id=r.worker_run_id,deployment_version=r.deployment_id,monitoring_state='OBSERVED',last_observed_at=r.completed_at,updated_at=now() FROM recent r WHERE p.capability_key='evidence_validation';

UPDATE public.physical_capabilities SET implementation_state='READY',current_blockers='["NO_RECENT_SUCCESSFUL_CAPABILITY_RUN"]'::jsonb,updated_at=now()
WHERE capability_key IN ('seat_discovery','jurisdiction_discovery','current_officeholder','identity_resolution','portrait','candidate_discovery','candidate_status','change_detection','source_health','entity_resolution','dataset_reconciliation','completeness_audit','publication_gate') AND implementation_state='DECLARED';

UPDATE public.physical_capabilities SET implementation_state='NOT_IMPLEMENTED',current_blockers='["CAPABILITY_NOT_IMPLEMENTED"]'::jsonb,updated_at=now() WHERE implementation_state='DECLARED';

UPDATE public.physical_capabilities p SET backlog_count=q.c
FROM (SELECT payload->>'scope_key' capability_key,count(*)::bigint c FROM public.jobs WHERE status IN ('queued','leased') AND payload ? 'scope_key' GROUP BY payload->>'scope_key') q
WHERE p.capability_key=q.capability_key;
