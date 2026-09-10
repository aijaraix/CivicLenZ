# CivicLenZ Deployment, Runtime Supervision, Recovery & Disaster Continuity Contract

## 1. Purpose
This document defines the mandatory physical-runtime and continuity contract for CivicLenZ. It governs deployment topology, process/service supervision, boot recovery, runtime health, queue durability, database/object-store continuity, deployment reconciliation, backup/restore, disaster recovery, degraded operation, failover boundaries, incident recovery, and proof that autonomous research continues independently of interactive engineering sessions.

This contract defines required behavior and evidence, not one mandatory hosting vendor or deployment technology.

## 2. Core continuity doctrine
CivicLenZ is not operational merely because code exists or an interactive development session can invoke it.

The production research organization must remain capable of safe autonomous operation when:
- Google/Gemini closes
- Codex stops
- ChatGPT closes
- browser/IDE closes
- operator logs out
- an individual worker crashes
- a supervised process restarts
- a source becomes temporarily unavailable
- canonical intake is temporarily unavailable
- a producer is temporarily disconnected
- a deployment fails and must roll back

No interactive AI session is a production supervisor.

## 3. Required physical layers
The deployment architecture must identify the physical implementation of, as applicable:
- HERMES Prime/orchestrator
- scheduler
- Research Work Ledger
- durable queues
- queue consumers/workers
- OpenClaw/browser runtime
- local-model runtime
- producer bridge receiver/dispatcher
- canonical validation workers
- monitoring/source-health workers
- Gap Detector
- Academy
- Supabase/Postgres
- R2/evidence object storage
- Cloudflare Workers/Queues/Tunnel/DNS where used
- public/API projection services
- operator dashboard
- logging/telemetry

Each component must have an explicit owner, deployment location and durability class.

## 4. Runtime inventory
Maintain a machine-readable runtime inventory containing, where applicable:
- service_id
- component_role
- environment
- host/runtime
- deployment identifier/version
- repository/commit
- process/container/service identity
- supervisor
- autostart mechanism
- dependencies
- ports/bindings
- queues consumed/produced
- databases/storage used
- service identity
- health probe
- restart policy
- state/durability class

Unknown physical placement is an operational gap.

## 5. Environment separation
At minimum distinguish development/test/owner-review/production where those environments exist.

Production credentials, canonical data and publication authority must not be casually reused in development/test.

Environment identity must be observable in logs/health without exposing secrets.

## 6. Source-to-deployment reconciliation
Every deployed production service must be attributable to approved source code/configuration.

Track:
- repository
- branch/ref policy
- commit SHA
- build artifact/image digest where applicable
- deployment timestamp
- deployment actor/automation
- configuration version

If runtime source cannot be reconciled to durable source/configuration, classify `DEPLOYMENT_PROVENANCE_UNKNOWN`.

## 7. Deployment authority
Only authorized human/service identities may deploy production components.

Research workers, models and producers may not independently modify production infrastructure unless explicitly granted a narrowly scoped deployment capability.

Academy proposals do not equal deployment authorization.

## 8. Safe deployment sequence
Production changes should follow, where applicable:
1. fetch/reconcile current source
2. validate migrations/configuration
3. build
4. tests
5. security/policy checks
6. stage/canary where appropriate
7. deploy bounded component
8. health/readiness checks
9. interoperability checks
10. observe
11. continue or roll back

Do not declare success at deployment API acceptance alone.

## 9. Concurrency-safe deployment
Multiple engineering agents may work concurrently.

Required rules:
- fetch current branch before edits/deploy
- preserve newer legitimate work
- no force-push
- no blind replacement of live infrastructure
- reconcile overlapping changes
- small isolated commits/deployments where practical
- do not recreate credentials/resources because they were not immediately visible

## 10. Service supervision
Every persistent service must be supervised by an appropriate mechanism such as systemd, container orchestration, Cloudflare runtime, managed database/platform supervision or equivalent.

For each persistent service define:
- start command/runtime
- autostart
- restart policy
- restart limits/backoff
- dependencies/order
- graceful shutdown behavior
- health/readiness
- log destination

A terminal session/background shell alone is not sufficient production supervision.

## 11. Boot survival
Critical persistent components must automatically return after host reboot/platform restart according to dependency order.

Boot recovery should restore:
- orchestrator
- scheduler
- queue consumers
- bridge receiver/dispatcher
- monitoring
- local model/OpenClaw where required
- tunnels/proxies where required

Boot survival must be physically tested or explicitly reported `NOT_YET_PROVEN`.

## 12. Process crash recovery
On unexpected worker/service exit:
- supervisor records failure
- service restarts according to policy
- active leases expire/reconcile safely
- incomplete work returns to retry/eligible state
- idempotency prevents duplicate corruption
- unrelated services continue

A worker crash must not erase durable jobs/evidence.

## 13. Graceful shutdown
Where possible services should:
- stop accepting new leases
- finish or safely checkpoint active work
- release/expire leases
- flush durable state
- close connections
- emit final heartbeat/state

Forced termination recovery must still be safe through durable state/idempotency.

## 14. Durable state classification
Classify state as:
- RECONSTRUCTIBLE_CACHE
- DURABLE_OPERATIONAL_STATE
- IMMUTABLE_EVIDENCE
- SOURCE_CODE_CONFIGURATION
- SECRET_CONFIGURATION
- TELEMETRY

Recovery/backup requirements depend on class.

## 15. Research Work Ledger durability
The following cannot depend only on process memory:
- ResearchNeeds
- ResearchWorkIdentities
- jobs/attempts
- leases/reservations
- dependencies
- retries/dead letters
- coverage/gaps
- monitoring schedules
- incidents
- handoff state
- bridge backlog
- Academy cases

## 16. Queue durability
Queues must preserve work across consumer restart and temporary downstream failure.

Verify:
- acknowledgement semantics
- visibility/lease timeout
- retry policy
- dead-letter policy
- ordering requirements where relevant
- duplicate/idempotency handling
- queue depth/age telemetry

Queue existence is not proof consumers are processing it.

## 17. Lease recovery
On restart/crash, stale leases must be detectable and recoverable.

Do not permanently strand jobs in RUNNING because the owning worker disappeared.

Track worker/lease heartbeat, expiry and recovery reason.

## 18. Canonical database continuity
Canonical structured state should reside in the approved canonical database (currently Supabase/Postgres where applicable).

Define:
- migration authority
- backup policy
- restore procedure
- transaction/integrity expectations
- connection pooling
- least-privilege service roles
- schema version tracking

Producers must not bypass canonical intake with direct canonical DB writes.

## 19. Evidence object-store continuity
Raw evidence/artifacts in R2 or approved immutable evidence storage require:
- stable object identity/key policy
- content hash
- metadata/provenance
- retention policy
- access controls
- integrity checks
- backup/replication policy if required
- restore/reconciliation procedure

Database records referencing missing evidence are integrity incidents.

## 20. GitHub role
GitHub stores source code, contracts, migrations, tests and durable engineering documentation.

GitHub is NOT the live civic research database and MUST NOT be used to commit secrets or high-volume live evidence/runtime stores merely for durability.

## 21. Configuration durability
Non-secret runtime configuration should be versioned/reproducible where appropriate.

Secret values must be supplied through approved secret mechanisms, never committed to Git.

After restart/deploy, services must load configuration deterministically and report safe configuration-presence/version state without exposing values.

## 22. Secret continuity
Secret recovery/rotation procedures must avoid unnecessary secret exposure.

A service restart should not require a human to repaste secrets if an approved persistent secret mechanism exists.

If secret loading fails, fail closed for the affected authenticated operation while unrelated safe work continues.

## 23. Dependency graph
Maintain explicit dependencies among components.

Examples:
- queue consumer depends on queue + ledger + required source credentials
- canonical validator depends on canonical DB + evidence access
- bridge receiver depends on secret/config + durable intake
- public projection depends on canonical state, not Harvester staging

Do not encode accidental dependencies on interactive sessions.

## 24. Health versus readiness
Distinguish:
- LIVENESS: process/runtime exists
- READINESS: capable of accepting assigned work
- FUNCTIONAL_HEALTH: recently completed real work
- DEPENDENCY_HEALTH: required downstream/upstream available

A process can be alive but not ready or functionally healthy.

## 25. Health probes
Health probes should expose safe non-secret status including:
- service/version
- uptime
- dependency summary
- queue connectivity
- database/storage connectivity where safe
- last successful work
- readiness state

Private/internal telemetry need not be publicly exposed.

## 26. Functional canaries
Use bounded real or safely representative canaries to prove end-to-end functionality.

Canary success should require physical progression through relevant stages, not merely HTTP 200.

Do not create synthetic civic truth in production to run canaries.

## 27. External/public ingress
Public endpoints must expose only intended routes.

Use TLS, authentication where required, rate limiting and narrow routing.

Private telemetry/admin routes should remain private unless explicitly designed for secure operator access.

## 28. Cloudflare Tunnel/proxy continuity
Where Cloudflare Tunnel/proxy is used:
- tunnel service is supervised/autostarted
- origin target is explicit
- public hostname is authoritative/configured
- TLS/routing is verified
- private routes remain inaccessible
- tunnel health is monitored

Tunnel health does not prove origin application correctness.

## 29. Cloudflare Workers continuity
For each Worker track:
- script/deployment version
- bindings
- cron triggers
- queue bindings
- R2 bindings
- environment flags such as DRY_RUN
- last execution
- last successful real work
- errors

Do not infer activation from script existence.

## 30. Scheduled/cron continuity
Every schedule must have:
- owner capability
- cadence
- last scheduled fire
- last actual execution
- next fire
- missed-run detection
- catch-up policy

A configured cron with no execution evidence is not operational proof.

## 31. Queue consumer continuity
For each consumer:
- last message received
- last acknowledged
- last failure
- throughput
- consumer liveness
- queue age

If queue depth grows while consumer is nominally healthy, create stall/starvation incident.

## 32. Producer independence
Advance producers such as CivicsLenZz continue safe extracted_unreviewed research when canonical intake is unavailable.

They must:
- persist results durably
- preserve evidence/provenance
- retain bridge-ready packages
- continue independent eligible work
- retry canonical delivery under policy

They must not self-promote because canonical is unavailable.

## 33. Canonical outage behavior
If canonical HERMES/intake is unavailable:
- producer research continues
- packages remain durable
- canonical validation/publication pauses
- public canonical state remains last validated state with currentness indicators
- monitoring/gap work that does not require canonical intake may continue

Do not discard research backlog.

## 34. Producer outage behavior
If a producer is unavailable:
- canonical HERMES continues with other sources/producers
- outstanding producer-targeted work remains visible
- retries/fallback routing may occur if allowed
- no global outage unless a genuine shared dependency exists

## 35. Source outage behavior
A source outage should degrade only dependent scopes.

Circuit breakers/backoff prevent hammering unavailable sources.

Other sources, subjects and capabilities continue.

## 36. Database outage behavior
If canonical DB is unavailable, components requiring canonical writes fail closed and queue/retry safely.

Do not substitute uncontrolled local truth stores as canonical DB.

Read-only/public behavior should follow approved degraded-mode policy.

## 37. Evidence-store outage behavior
If raw evidence cannot be durably stored, evidence-required claims must not be promoted as though evidence capture succeeded.

Retry/quarantine affected work while unrelated safe work continues.

## 38. Model/provider outage
External/local model outage must not globally stop deterministic work.

Use approved fallback routing where available; otherwise mark model-dependent scopes degraded/retrying.

Never lower evidence/validation standards merely because a model is unavailable.

## 39. Browser runtime outage
Browser-dependent work may retry/fallback where policy allows.

Deterministic API/parser work continues.

Do not classify source data as absent merely because browser execution failed.

## 40. Resource exhaustion
Monitor:
- CPU
- memory
- disk
- network
- DB connections
- queue latency
- browser slots
- model concurrency

Resource Governor should throttle safely before exhaustion causes cascading failure.

Disk exhaustion is especially critical for evidence/spool/queue durability and requires alerts before hard failure.

## 41. Capacity state
Classify runtime capacity:
- UNDERUTILIZED_WITH_BACKLOG
- APPROPRIATELY_UTILIZED
- SATURATED
- THROTTLED
- DEGRADED

Idle capacity with large eligible backlog requires routing/scheduler investigation.

## 42. Deployment rollback
Every material production deployment should have a rollback strategy appropriate to the component.

Rollback must consider schema/data compatibility; reverting code after irreversible migration may be unsafe.

Record rollback reason and resulting version.

## 43. Database migrations
Migrations require:
- version control
- review/test
- forward/backward compatibility assessment
- backup/restore consideration
- execution audit
- schema-version verification

Never rebuild/drop production DB as a routine remediation unless explicitly approved and justified.

## 44. Backup policy
Define backup coverage for:
- canonical database
- critical operational ledger state
- configuration necessary to reconstruct services
- evidence metadata/object storage according to retention policy

Backup existence must be measurable; successful restore must be tested periodically.

## 45. Restore testing
A backup is not proven until restoration is tested in a safe environment or through an approved restore validation method.

Track:
- last backup
- last successful restore test
- recovery point achieved
- recovery time observed
- failures/gaps

## 46. Recovery objectives
Define service/data-specific objectives where appropriate:
- RPO (acceptable data-loss window)
- RTO (target restoration time)

Different components may have different objectives. Immutable evidence and canonical ledger state may require stricter objectives than reconstructible caches.

## 47. Disaster scenarios
Continuity planning should include at least:
- VPS/host loss
- database outage/corruption
- object-store outage
- Cloudflare/Tunnel outage
- queue outage
- repository/deployment mismatch
- credential compromise/rotation
- source-wide outage
- accidental bad deployment
- runaway worker/resource exhaustion

## 48. Host loss recovery
Recovery from host loss should rely on durable external state/configuration where possible rather than unique local disk assumptions.

Document/reconstruct:
- services
- supervisor units/container definitions
- runtime config
- secret injection process
- queues
- database connections
- evidence storage
- tunnel/routing

## 49. Local spool durability
If local durable spools are used (e.g., producer bridge packages), define:
- filesystem path
- permissions
- atomic write behavior
- fsync/transaction semantics where appropriate
- size monitoring
- backup/migration policy
- replay/idempotency

A local spool is not disaster-resistant if host loss destroys the only copy; report that risk honestly.

## 50. Split-brain prevention
Do not allow multiple orchestrators/workers to independently believe they own the same exclusive work without lease/reservation semantics.

Use ResearchWorkIdentity, leases, idempotency and authoritative ledger state.

## 51. Duplicate execution after recovery
At-least-once delivery/recovery may re-execute work. All material writes/handoffs must be idempotent or duplicate-aware.

Recovery must prefer harmless duplicate suppression over data loss.

## 52. Monitoring continuity
Monitoring schedules must survive restart/outage.

After recovery, detect missed monitoring windows and apply catch-up policy based on urgency/currentness rather than blindly replaying every missed tick.

## 53. Academy continuity
Academy state/proposals/tests/promotions must be durable.

Academy may pause during infrastructure incidents but must not silently lose production observations or promote untested changes during recovery.

## 54. Incident continuity
Active incidents must survive restart and preserve:
- incident ID
- classification
- affected components/scopes
- first incorrect transition where known
- blast radius
- remediation
- current state
- regression/recovery evidence

## 55. Audit-log continuity
Security/deployment/validation/audit logs must follow retention and access policy.

Operational recovery must not intentionally erase logs needed to understand the incident.

## 56. Disaster recovery authority
High-impact recovery actions require appropriate human/service authorization, especially:
- restoring canonical DB
- rotating root/high-value credentials
- changing public DNS/routing
- disabling validation/publication safeguards
- deleting/rebuilding production resources

Autonomous agents may execute pre-approved bounded recovery actions only within explicit authority.

## 57. Fail-safe publication
During uncertain canonical state or recovery, prefer last known validated public state with explicit currentness/staleness handling over publishing unvalidated replacement data.

Harvester staging must never become emergency public truth.

## 58. Security incident recovery
If