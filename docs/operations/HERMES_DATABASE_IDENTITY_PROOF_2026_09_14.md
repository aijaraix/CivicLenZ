# HERMES dedicated identity — physical verification, 2026-09-14

This is an intermediate execution record, not runtime acceptance.

## Authority and source

Owner authorized dedicated least-privilege HERMES identity and continued activation.
Freshly fetched control-plane head: e7f34dd4411a496ac8e4f67afed8483a49551cca.
Main before this record: ccf2acc7ebb96c925de485f4be303c52369c5ed6.
Database migration 20260914023034 (hermes_runtime_scoped_identity) physically applied.
Readiness bootstrap source: 8e7b3cd10d90449a5afffbd54bdff7796a17b217.
Existing observer/receiver release remains a32c1fb04bee564210cfcded48ef2853a568b120.
No claim that all main code is deployed.

## Dedicated database identity

Project uazqyzmzydtmbypjuqjw. Role hermes_runtime.
No superuser, role creation, database creation, replication, RLS bypass or schema ownership.
Scoped context reads, HERMES-owned job writes, limited execution lineage/monitoring writes,
and SECURITY INVOKER bounded lease/release functions. No civic publication writes.
Credential generated within Postgres and encrypted for transport to a temporary VPS-only
key, then stored root-only. Plaintext was never returned to the engineering session.
Temporary transport key removed after successful connection. No administrator credential
was installed in HERMES.

External connection: aws-0-us-west-2.pooler.supabase.com:5432, certificate+hostname
verification (verify-full), TLSv1.3. CA retrieved over verified HTTPS from the URL in
Supabase's official dashboard source. CA file SHA-256:
700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7.
Direct project IPv6 endpoint was unreachable; the existing pooler resolves this without
a paid IPv4 service. pg_stat_ssl reports the pooler-to-database backend as non-SSL;
the client libpq connection independently reports TLSv1.3. Do not conflate these hops.

## Behavioral database test

Sentinel execution: script_job_93a05caed7914b69aafdc56c1c6b4a7c.
Connected as hermes_runtime. Read counts before canary: 75 jobs, 87 worker_runs,
1 research_contract, 25 contract fields, 4 monitoring_state.
Test job cb713aed-79e3-4d3a-984a-2844d0360b1f:
- explicitly execution_class=TEST, job_type=permission_canary;
- duplicate dedupe_key insertion created zero rows;
- two concurrent separate connections: lease results [1, 0];
- wrong-token release returned zero rows; correct-token release returned one;
- second attempt succeeded; third attempt denied after max_attempts=2;
- final state cancelled, explicit test-only checkpoint;
- independent Supabase query confirmed cancelled state and two attempts.

Safe negative operations ran in rolled-back transactions:
CREATE SCHEMA, UPDATE claims WHERE false, SET ROLE postgres, and reading
vault.decrypted_secrets each failed with SQLSTATE 42501.
This proves these tested boundaries, not an exhaustive security audit.

## Running service / secret isolation

Sentinel execution: script_job_869900898dbe4b139c5939203ed9aa18.
Only civiclenz-hermes-prime restarted. MainPID=149958, active/running,
User/Group=civiclenz-hermes, NeedDaemonReload=no.
Startup code physically connected/read jobs as hermes_runtime and persisted
database_readiness in the existing operations SQLite database at epoch
1789353762.316075. Observer resumed and wrote a new observation.

Systemd LoadCredential delivers database-password from a root-only file.
Read tests as civiclenz, civiclenz-openclaw, and www-data denied both the
source credential and the runtime credential path.
Dedicated HERMES identity has only traversal ACLs to required parent directories
and read/list access to receiver receipt directory names; no shared civiclenz group.

Other healthy services retained PIDs:
- ingest 63755
- Qwen 63490
- OpenClaw 63491
- Cloudflare tunnel 857

Existing unit sandbox/resource limits preserved.
Rollback: remove only 30-database-identity.conf, restore prior service user/state
ownership, daemon-reload and restart only HERMES. A pre-change SQLite backup is
root-protected under /etc/civiclenz/hermes-db-identity-rollback.
Database rollback is credential revocation / role NOLOGIN after stopping consumers;
do not delete retained audit data.

## Unfinished activation

HERMES remains OBSERVATION_NO_DISPATCH. Database readiness is not scheduler proof.
Producer intake remains paused. Cloudflare DRY_RUN remains true.
73 legacy queued jobs (13 ingest, 60 monitor) lack research_work_identity.
No legacy work was dispatched or rewritten. Two succeeded legacy records require
further lineage classification; neither is credited as canonical acceptance.
R2 HTML hash incident remains unresolved; original object preserved.
Further canon review, durable ledger implementation, distributed execution,
validation and sustained autonomous acceptance remain required.
