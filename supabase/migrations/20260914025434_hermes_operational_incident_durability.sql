-- Additive operational incident store. Existing jobs/runs/monitoring remain authoritative.
-- Rollback: revoke runtime writes and retain audit records; no destructive DROP required.
CREATE TABLE hermes_ops.incidents (
 incident_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 incident_key text NOT NULL UNIQUE,
 incident_class text NOT NULL,
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','REMEDIATION_PENDING','RESOLVED')),
 detected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reported_by text NOT NULL DEFAULT current_user,
 affected_references jsonb NOT NULL DEFAULT '{}'::jsonb,
 observations jsonb NOT NULL DEFAULT '{}'::jsonb,
 resolution_evidence jsonb,
 CHECK(status <> 'RESOLVED' OR resolution_evidence IS NOT NULL)
);
ALTER TABLE hermes_ops.incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hermes_ops.incidents FROM PUBLIC;
GRANT SELECT,INSERT ON hermes_ops.incidents TO hermes_runtime;
GRANT UPDATE(status,last_observed_at,observations,resolution_evidence) ON hermes_ops.incidents TO hermes_runtime;
CREATE POLICY hermes_incident_read ON hermes_ops.incidents FOR SELECT TO hermes_runtime USING(true);
CREATE POLICY hermes_incident_insert ON hermes_ops.incidents FOR INSERT TO hermes_runtime WITH CHECK(reported_by=current_user);
CREATE POLICY hermes_incident_update ON hermes_ops.incidents FOR UPDATE TO hermes_runtime USING(true) WITH CHECK(true);
CREATE INDEX incidents_open_observed ON hermes_ops.incidents(last_observed_at) WHERE status <> 'RESOLVED';
