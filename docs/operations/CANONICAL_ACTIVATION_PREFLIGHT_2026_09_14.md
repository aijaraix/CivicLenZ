# CivicLenZ activation preflight — 2026-09-14

## Result
ACTIVATION_NOT_COMPLETE. The canonical executive is not activated. This report records physical observations, not final acceptance. The full implementation, complete manifest-document semantic review, scheduler census and canary sequence remain unfinished.

## Repository
Fetched both remote heads before inspection.
- Initial main: 2bbf69a10a9cfc38e3446bc9d673de4a4456312a
- Authorized control-plane head: e7f34dd4411a496ac8e4f67afed8483a49551cca
- Main was an ancestor of the authorized branch; reconciled through a non-forced fast-forward.
- Fetched again and verified remote main equals e7f34dd4411a496ac8e4f67afed8483a49551cca.
- Manifest version: 1.2.0; manifest Git blob: ebc3cfb7de567218f10b8215893883086bb133e6.
- All 48 literal required_documents exist and byte-match the authorized branch.
- Presence/hash verification is not a claim that all 48 documents have been fully semantically reviewed.
- This report commit advances main separately; it is not deployed runtime code.
- VPS current release symlink: /opt/civiclenz/releases/a32c1fb04bee564210cfcded48ef2853a568b120.
- HERMES current symlink points to services/hermes-prime within that release. A symlink alone is not complete deployment attestation.

## Physical host observations
Host: civiclenz-prod-ai (SentinelX host_1809bab1f11de7f7).
All five units active, enabled, Restart=on-failure and NeedDaemonReload=no:
- civiclenz-hermes-prime: PID 63756; civiclenz identity; observer.py; MemoryMax 192 MiB.
- civiclenz-hermes-ingest: PID 63755; civiclenz identity.
- civiclenz-openclaw: PID 63491; civiclenz-openclaw identity; MemoryMax 1536 MiB.
- civiclenz-qwen: PID 63490; civiclenz identity; MemoryMax 6 GiB.
- civiclenz-cloudflared-ingest: PID 857; civiclenz identity.

Measured 4 CPUs, approximately 10.4 GB available RAM, 69.7 GB free disk, zero swap use during observation. This is idle/preflight telemetry, not load acceptance.

Deployed observer source explicitly sets dispatch_enabled=false and dispatch_limit=0. Latest durable SQLite observations at Unix timestamps 1789352286.674431 and 1789352316.7724276 confirm:
- mode OBSERVATION_NO_DISPATCH
- canonical_dispatch NOT_IMPLEMENTED
- canonical_work_ledger NOT_IMPLEMENTED (observer integration; Supabase does have existing jobs)
- civic_validation NOT_IMPLEMENTED
- receiver_health true
- local_receipt_files 0
- governor HEADROOM_AVAILABLE
One local Academy observation row exists; governance lifecycle not proven.

Receiver health endpoint returned HTTP 200 and status ok. Reading only the named pause key from the running receiver environment confirmed HERMES_INGEST_INTAKE_PAUSED=true.

OpenClaw and Qwen effective on-disk units have IPAddressDeny=any and IPAddressAllow=localhost. Qwen uses qwen3-4b, context 16384, parallel 1, threads 3. No browser or inference job was invoked.

## Supabase physical inventory
Approved project: uazqyzmzydtmbypjuqjw, named CivicLenZ, ACTIVE_HEALTHY.
Four deployed migrations:
- 20260901222128 civiclenz_canonical_civic_foundation
- 20260901222145 civiclenz_foundation_security_hardening
- 20260902021040 atomic_job_leasing
- 20260902021054 atomic_job_leasing_privilege_hardening

Exact SELECT counts:
- jobs: 75 (73 queued; 2 succeeded)
- worker_runs: 87
- raw_retrievals: 3
- evidence_objects: 0
- validation_runs: 0
- monitoring_state: 4

These are existing row counts, not new work or accepted proof of historical successful execution.

Existing tables include jobs, worker_runs, monitoring_state, research_contracts, research_contract_fields, raw_retrievals, evidence_objects, claims, claim_evidence, validation_runs, contradictions and separate civic entities. All 19 public ordinary tables inspected have RLS enabled.

lease_due_job exists and uses FOR UPDATE SKIP LOCKED. Its inspected definition does not enforce attempt_count < max_attempts or a distinct attempt fencing token. Do not treat this source inspection as lease-concurrency behavior proof.

Three jurisdiction monitoring rows have last_checked_at=null. The source monitoring row last_checked_at is 2026-09-02 and next_check_at=null. Registration is not sustained monitoring.

## Cloudflare physical inventory
Workers: civiclenz-collector, civiclenz-validator, civiclenz-scheduler.
Settings were read from the actual account API.
- scheduler DRY_RUN=true
- scheduler cron: 0 */6 * * * and 15 7 * * *
- collector and validator schedules empty
- collector R2 binding EVIDENCE_BUCKET -> civiclenzevidence
- Supabase secret binding names present; values not exposed
- collector/validator have no explicit DRY_RUN binding in returned settings

Deployment API returned latest listed versions:
- collector 8d64e687-4eac-45fb-b367-66de9f114f18
- validator adf0e9a8-f39f-4fbc-9651-e17fd44a19c2
- scheduler d06b4312-9e65-472c-921e-9b256630f53c

Script modified timestamps were 2026-09-14, while listed deployment records were dated 2026-09-08. Running-version/source lineage remains to be reconciled; modified timestamps alone do not establish a new code deployment.

Queues and configured consumers:
- civiclenz-ingest -> civiclenz-collector, batch 5, retries 4
- civiclenz-monitor -> civiclenz-collector, batch 5, retries 4
- civiclenz-validate -> civiclenz-validator, batch 10, retries 4
- civiclenz-heavy -> no consumer
- civiclenz-dead-letter -> no consumer
These are configured consumers, not observed message consumption in this pass.

## R2 physical read-back and integrity incident
Actual account buckets: civiclenz-evidence and civiclenzevidence.
Read two existing objects through the authorized R2 API. No object was written or modified.

PDF:
raw/miami-dade-county-elected-officials/2026/09/02/46849f93da3075ce00b98c77092554c91514d0da81248af31e88e4ac282b27e0.pdf
- HTTP 200, 575868 bytes
- recomputed SHA-256 46849f93da3075ce00b98c77092554c91514d0da81248af31e88e4ac282b27e0
- matches recorded hash/key

HTML:
raw/florida-governor-official/2026/09/02/596a4d4a44519958a5719615aea2992aa5e5e059aa636da693c734ac6c19cae3.html
- HTTP 200, 34578 bytes
- recomputed SHA-256 35ca8d2abd332cb9949beae13d8c6ce891114f4babe19bfbddc539a6c1ac61fe
- does NOT match hash encoded in key
- retrieval c92dace8-94f4-46bd-bc51-23d85bd73f28 expects 596a4d4a...
- retrieval dcd9cb60-d2b6-4500-a63e-992c3467c91a expects 35ca8d2a... but uses the same old-hash URI

Preserve bytes and history. Investigate writer/source lineage, then repair generalized content-addressing and supersede invalid references through normal governed reconciliation. No factual claim was validated from these objects.

## Authority and access observations
- No CivicLenZ systemd timer appeared in list-timers.
- No user crontab files; /etc/cron.d contained standard sysstat/e2scrub files.
- GitHub source still contains scheduled research workflows; live workflow enablement and full scheduler census remain unverified.
- Google producer runtime was not changed.
- SentinelX file-operation policy lists /etc,/var/log,/var/www,/opt,/srv read-only; writable_paths empty. Managed service map lists nginx, docker and sentinelx-cloud-core, not CivicLenZ units.
- Privileged read-only scripts worked. These observations alone do not establish whether every authorized deployment interface is blocked; do not broaden policy or bypass a denied operation.
- HERMES unit has no EnvironmentFile. Inspected /etc/civiclenz env files contain Cloudflare token/account identifiers and bridge shared secret, no Supabase credential.
- Supabase credentials exist as Cloudflare secret bindings; that does not establish an approved HERMES service credential. Do not exfiltrate Worker secrets into logs or silently broaden HERMES authority.
- OpenClaw external browser networking is currently blocked by its localhost-only service policy. Any expansion requires explicit security-boundary review.

## Acceptance classifications
| Dimension | Classification | Basis |
|---|---|---|
| CANONICAL_HERMES | FAIL | Observer, no dispatch |
| WORK_LEDGER | DEGRADED | Existing jobs/runs, no executive integration or complete ledger proof |
| SCHEDULER | FAIL | HERMES dispatch disabled |
| LEASES_IDEMPOTENCY | NOT_YET_PROVEN | Existing RPC inspected, no behavioral canary |
| RESOURCE_GOVERNOR | DEGRADED | Real resource observation, zero dispatch policy |
| LOCAL_WORKER_POOLS | NOT_YET_PROVEN | No canonical executions observed |
| CLOUDFLARE | DEGRADED | Deployed fabric, scheduler dry-run, heavy queue without consumer |
| SUPABASE | PASS_WITH_LIMITATIONS | Live inspection and counts work; runtime transitions unproven |
| R2 | DEGRADED | Read-back works, one hash/key inconsistency; write canary unperformed |
| OPENCLAW | NOT_YET_PROVEN | Service live; no authorized job execution proof |
| QWEN | NOT_YET_PROVEN | Service live; no authorized job invocation proof |
| GAP_DETECTOR | NOT_YET_PROVEN | No generated work observed |
| MONITORING | DEGRADED | Existing rows do not prove current checks |
| RETRY_DLQ | NOT_YET_PROVEN | Configuration/RPC only |
| ACADEMY | NOT_YET_PROVEN | Observation row only |
| PRODUCER_INTAKE | NOT_YET_PROVEN | Confirmed paused, zero receipt files |
| CANONICAL_VALIDATION | FAIL | Observer reports absent; zero validation rows |
| TEMPORAL_CURRENTNESS | NOT_YET_PROVEN | No live validation |
| SESSION_INDEPENDENCE | FAIL | Observer persists; required research executive does not operate |
| RESTART_RECOVERY | NOT_YET_PROVEN | No restart performed |
| SECURITY | NOT_YET_PROVEN | Some boundaries inspected; complete negative checks unperformed |
| DEPLOYMENT_LINEAGE | DEGRADED | Source, host release and Worker version records differ |

## Work attributable to this pass
No research jobs were manually or automatically initiated by this pass. No live activation canaries were performed.
REAL_CANONICAL_JOBS_CREATED=0 observed in this pass
REAL_CANONICAL_JOBS_COMPLETED=0 observed in this pass
REAL_RETRIEVALS=0 new source retrievals initiated
REAL_EVIDENCE_OBJECTS=0 new objects
REAL_MONITORING_CHECKS=0 proven new source comparisons
REAL_GAPS_CREATED=0 proven
REAL_VALIDATION_RUNS=0
REAL_PRODUCER_PACKAGES_RECEIVED=0 observed locally

## Remaining work
Complete remaining canon review and full physical scheduler/source reconciliation; identify an approved HERMES database access path; resolve deployment/service access within current policy or request narrowly scoped authorization; integrate existing ledger and implementation branches without replacing valid work; repair evidence integrity; execute remaining runbook phases and all canaries before intake unpause.

No claim is made that all independent safe work has been completed or all remaining work is human-blocked.

## Owner acceptance question
IF CODEX, GOOGLE AND ALL INTERACTIVE SESSIONS CLOSE NOW, WILL CIVICLENZ CONTINUE OPERATING AUTONOMOUSLY?
NO for the requested end-to-end canonical research organization.
The five base services and observer remain running, but that is not canonical autonomous research.

No services were restarted/stopped, no intake pause removed, no database migrations applied, no evidence deleted and no production publication performed.
