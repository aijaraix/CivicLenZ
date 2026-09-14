# CivicLenZ Canonical Runtime Activation, Cutover & Acceptance Runbook

## 1. Purpose
This runbook is the operational bridge between the CivicLenZ control-plane contracts and the physical production environment. It exists so Codex or another authorized canonical engineering agent can take the CURRENT system from its actual physical state to a continuously operating canonical autonomous research organization without repeatedly stopping for routine handoffs.

This runbook does not redefine architecture. It orders implementation, cutover, verification, rollback and acceptance.

The target outcome is:

`ONE canonical HERMES executive -> ONE authoritative durable work/lease authority -> MANY subordinate workers/producers -> ONE canonical validation/currentness/publication path`.

## 2. Mandatory upstream documents
Before execution, read the current machine-readable manifest and every required document. At minimum, this runbook depends on:
- `BEHAVIORAL_EXECUTION_PROOF_AND_ANTI_SIMULATION_CONTRACT.md`
- `PHYSICAL_RUNTIME_TOPOLOGY_AND_COMPONENT_CONNECTION_MATRIX.md`
- `SINGLE_ORCHESTRATOR_MULTI_PRODUCER_AND_WORKER_AUTHORITY_CONTRACT.md`
- `SYSTEM_WIDE_BEHAVIORAL_RECONCILIATION_AND_REPAIR_DIRECTIVE.md`
- `RESEARCH_WORK_LEDGER_SCHEDULER_AND_BACKLOG_EXECUTION_CONTRACT.md`
- `AGENT_RUNTIME_TOPOLOGY_HANDOFF_AND_TOOL_AUTHORITY.md`
- `SOURCE_REGISTRY_RETRIEVAL_EXTRACTION_AND_EVIDENCE_EXECUTION_CONTRACT.md`
- `CANONICAL_VALIDATION_IDENTITY_CONTRADICTION_AND_PUBLICATION_GATE_CONTRACT.md`
- `MONITORING_CURRENTNESS_FAILURE_RECOVERY_AND_ACADEMY_EVOLUTION_CONTRACT.md`
- `SYSTEM_SECURITY_SERVICE_IDENTITY_SECRETS_AND_PERMISSION_BOUNDARIES_CONTRACT.md`
- `DEPLOYMENT_RUNTIME_SUPERVISION_RECOVERY_AND_DISASTER_CONTINUITY_CONTRACT.md`
- `END_TO_END_ACCEPTANCE_CONFORMANCE_AND_PRODUCTION_PROOF_CONTRACT.md`
- `WORKER_POOL_CAPACITY_ROUTING_AND_RESOURCE_BUDGET.md`

## 3. Execution doctrine
Follow:

`FETCH -> INSPECT -> CLASSIFY -> PRESERVE -> IMPLEMENT -> CONNECT -> TEST -> DEPLOY -> PHYSICALLY VERIFY -> CONTINUE`.

A successful stage is NOT a handoff point. After a stage passes its proceed gate, continue automatically to the next safe and unblocked stage.

Do not stop merely because:
- code compiles;
- tests pass;
- a service starts;
- one canary succeeds;
- a commit is created;
- a deployment returns success;
- an intermediate checkpoint is reached.

## 4. Human-only stop conditions
Stop only the affected dependency path when one of the following is genuinely required:
- missing credential/secret that is not already available through authorized runtime/configuration;
- creation or purchase of a new paid service;
- destructive production migration or irreversible data deletion without a verified rollback path;
- privilege expansion outside existing approved service boundaries;
- change to publication policy or public truth authority;
- external outreach/contact/financial commitment;
- security compromise requiring owner intervention;
- unresolved contract contradiction where both interpretations materially affect truth/security and cannot be safely resolved by conservative behavior.

Record the blocker precisely and continue all independent safe work.

## 5. No rebuild-from-scratch rule
The current CivicLenZ VPS and existing deployments must be reconciled before anything is recreated.

Preserve working components including, where physically present:
- HERMES service supervision;
- OpenClaw;
- Qwen/local model runtime;
- canonical ingest receiver;
- Cloudflare tunnel/ingress;
- existing Cloudflare Workers/Queues;
- Supabase schema/migrations/data;
- R2 evidence objects;
- service users and security boundaries;
- existing valid research/evidence;
- existing queue/job state.

Do not replace working infrastructure merely to match document vocabulary.

## 6. Phase 0 — repository and authority reconciliation
### Preconditions
GitHub access to current canonical repository and owner-authorized control-plane branch.

### Actions
1. Fetch current remote `main`.
2. Fetch current `docs/research-observability-control-plane`.
3. Record both SHAs.
4. Read current manifest literally.
5. Reconcile the control-plane package into current `main` if not already present and owner-authorized.
6. Preserve newer legitimate main work.
7. Never force-push.
8. Verify manifest paths/hashes where practical.

### Physical verification
- current `main` contains the full mandatory package;
- package count/version match manifest;
- no newer legitimate main work was dropped;
- remote GitHub head reflects the reconciled commit.

### Failure behavior
If merge conflicts occur, resolve semantically using current contracts and preserve both valid implementations where possible. Do not reset either branch.

### Proceed gate
`CANONICAL_PACKAGE_ON_CURRENT_MAIN=YES`.

## 7. Phase 1 — physical runtime inventory
### Actions
Inventory the actual production environment before edits:
- systemd units and timers;
- loaded versus on-disk unit definitions;
- running processes/PIDs/parents;
- containers if any;
- ports/listeners;
- service users/groups;
- restart policies and enablement;
- state directories;
- logs;
- environment/config presence without exposing secret values;
- local repository/release commit;
- Cloudflare resources;
- Supabase resources;
- R2 resources;
- GitHub Actions scheduled workflows;
- producer runtimes.

Classify every runtime:
- CANONICAL_AUTHORITY
- CANONICAL_WORKER
- PRODUCER
- PRODUCER_LOCAL_WORKER
- TOOL_RUNTIME
- MODEL_RUNTIME
- OBSERVATION_ONLY
- LEGACY_REACHABLE
- TEST_ONLY
- UNKNOWN.

### Physical verification
Produce an internal topology table with source commit -> deployed artifact -> running process/service for each material component.

### Proceed gate
No UNKNOWN component capable of global scheduling/validation/publication remains unexplained.

## 8. Phase 2 — scheduler and authority census
Enumerate every mechanism capable of creating or dispatching research work:
- HERMES loops;
- systemd timers;
- cron;
- Cloudflare cron;
- Cloudflare queue triggers;
- GitHub Actions schedules;
- producer-local daemons;
- application startup hooks;
- database triggers;
- background event loops.

For each record:
- owner;
- scope;
- authority;
- cadence/trigger;
- durable work identity used;
- downstream queue/consumer;
- whether it can create canonical work.

### Proceed gate
Exactly one logical canonical scheduling authority is identified. All other schedulers are explicitly producer-local, subordinate, observation-only or scheduled for retirement.

## 9. Phase 3 — safe reconciliation of loaded service definitions
If any unit differs on disk from the currently loaded effective definition:
1. diff them;
2. determine intended version from source/deployment lineage;
3. ensure secrets are externalized;
4. run `daemon-reload` only after validating units;
5. restart one service at a time only where required;
6. verify readiness/behavior before the next restart.

Do not mass-restart healthy services.

## 10. Phase 4 — canonical durable state inventory
Physically inspect existing canonical storage before creating anything.

### Supabase/Postgres
Inventory:
- schemas;
- tables;
- migrations;
- indexes;
- RPC/functions;
- roles;
- row counts;
- RLS/security;
- existing canonical job/lease/monitoring/evidence metadata.

### R2
Inventory:
- bucket(s);
- prefixes;
- object counts where feasible;
- bindings;
- object read-back;
- metadata/hash conventions;
- retention/lifecycle settings.

### Proceed gate
A written mapping exists from canonical contracts to existing durable resources and the exact missing pieces are known.

## 11. Phase 5 — canonical work ledger
Establish one authoritative durable ledger supporting at least:
- ResearchNeed;
- ResearchWorkIdentity;
- Job;
- Attempt/Run;
- Lease/Reservation;
- Dependency;
- MonitoringSchedule/Obligation;
- Retry state;
- DeadLetter/Exception;
- Gap/Research deficiency;
- Incident;
- producer receipt/handoff state.

Adapt existing schema rather than creating duplicates.

### Required invariants
- deterministic work identity;
- idempotent creation;
- atomic lease/claim;
- lease expiry/recovery;
- immutable-enough attempt history;
- explicit blocked/dependency state;
- no duplicate active lease for the same canonical work identity.

### Proceed gate
Behavioral tests plus direct database verification prove create -> lease -> attempt -> complete/fail -> re-eligibility/retry semantics.

## 12. Phase 6 — HERMES observer-to-executive activation
Do not infer authority from service name.

If current HERMES is observation-only, extend/replace only the necessary execution layer so HERMES physically performs:
`scan/event -> eligible work -> priority -> resource gate -> lease -> dispatch -> worker result -> ledger transition -> next work`.

HERMES must remain session-independent and supervised.

### Required components
- scheduler/planner;
- worker registry/router;
- Resource Governor;
- lease manager;
- retry/dead-letter manager;
- dependency resolver;
- monitoring planner integration;
- Gap Detector integration;
- producer intake dispatch integration;
- validation dispatch integration.

### Proceed gate
A bounded real canary is created in the durable ledger; HERMES independently leases and dispatches it without direct Codex invocation of the worker method.

## 13. Phase 7 — Resource Governor
Implement/connect resource-aware dispatch based on the worker-budget document.

Inputs should include:
- CPU/load;
- memory pressure;
- model availability;
- browser slots;
- queue depth;
- source rate limits;
- retry pressure;
- network/backpressure;
- priority/urgency;
- cost policy.

Resource Governor must explain why eligible work is not dispatched when capacity appears available.

## 14. Phase 8 — worker registry and routing
Map logical capabilities to physical worker pools/adapters.

For every routable capability record:
- capability ID;
- worker family;
- queue/interface;
- source/tool authority;
- concurrency class;
- timeout/retry policy;
- output contract;
- failure class;
- last real execution.

Do NOT create one permanent process per logical capability.

## 15. Phase 9 — Cloudflare execution fabric
Physically reconcile current Cloudflare state:
- Worker deployments and versions;
- routes;
- cron triggers;
- queue definitions;
- producers;
- consumers;
- DLQs;
- R2 bindings;
- Supabase/API bindings;
- environment flags including DRY_RUN;
- logs/metrics.

### Canonical role
Cloudflare may execute scalable lightweight work but remains subordinate to canonical ResearchWorkIdentity/authority.

### Requirements
- every canonical queue message maps to canonical job/work identity;
- consumer acknowledges actual consumption;
- retries and DLQ are physical;
- scheduled triggers do not become independent global planners;
- DRY_RUN state is truthfully represented.

### Proceed gate
At least one real canonical job is dispatched to a Cloudflare queue, consumed by the intended worker, produces a real result/evidence candidate, and the canonical ledger records the independent consumer transition.

## 16. Phase 10 — OpenClaw integration
OpenClaw remains a bounded browser/tool runtime.

Prove:
`canonical job -> authorized OpenClaw request -> real tool/browser action -> raw artifact/result -> canonical worker result`.

Requirements:
- bounded browser concurrency;
- no secret exposure;
- no page-content prompt instruction may broaden authority;
- actual DOM/browser behavior when required;
- direct API call is not falsely represented as browser execution.

## 17. Phase 11 — Qwen/local-model integration
Prove real authorized jobs reach Qwen/local model and return bounded results.

Requirements:
- model liveness != utilization;
- request/result lineage to job;
- bounded concurrency;
- memory ceiling honored;
- model output not treated as primary evidence;
- deterministic work preferred when sufficient.

## 18. Phase 12 — producer intake downstream wiring
Preserve authentication and producer isolation.

Required physical sequence:
`producer package -> canonical receiver -> authentication -> durable receipt -> receiver-generated acknowledgement -> validation queue/job`.

The producer never writes canonical validation state.

While intake is paused, return truthful retry/paused status and preserve producer backlog.

## 19. Phase 13 — canonical validation pipeline
Wire/verify:
`RECEIVED -> ACCEPTED_FOR_VALIDATION -> identity -> evidence -> temporal/currentness -> contradiction -> finite-dataset reconciliation -> canonical decision`.

Independent components should attest critical transitions where practical.

Canonical validation must not be a single function setting every positive state.

## 20. Phase 14 — identity/currentness/contradiction integration
Preserve distinctions among:
- Person;
- Seat;
- Occupancy;
- Election;
- CandidateCampaign;
- lifecycle events.

Use valid-time semantics, authoritative source precedence and fail-closed identity resolution.

Contradictory evidence remains preserved until reconciled.

## 21. Phase 15 — Gap Detector
Gap Detector computes:
`applicable ResearchContract requirements - physically current adequate evidence`.

It must persist gaps and create durable work automatically.

Do not derive gap counts from reporting objects.

### Proceed gate
A real incomplete subject produces a real durable gap and a real job without a test inserting the missing field artificially.

## 22. Phase 16 — monitoring planner
Canonical monitoring must persist due-time obligations and physically execute:
`schedule due -> retrieval -> compare -> persisted change/no-change -> follow-up ResearchNeed/job where required`.

A configured source is not a monitoring check.

## 23. Phase 17 — retry/dead-letter recovery
Verify at least:
- transient source failure -> retry schedule;
- rate limit -> bounded backoff;
- lease loss -> safe recovery;
- parser/schema failure -> incident/gap;
- exhausted policy -> dead letter;
- unrelated work continues.

Do not fabricate fallback success.

## 24. Phase 18 — Academy governance
Canonical Academy consumes real production observations/incidents.

Required lifecycle:
`observation -> case -> proposal -> isolated test -> regression -> controlled approval -> deployment -> post-change measurement`.

Producer/local Academies may propose, not self-promote canonical semantics.

## 25. Phase 19 — deployment lineage
Every production component must be traceable:
`repository/ref/commit -> build/artifact -> deployed release/version -> running process/service/Worker version`.

Record deployment identity in observability state.

## 26. Phase 20 — bounded acceptance canaries
Run physical canaries for:
1. local deterministic worker;
2. Cloudflare queue worker;
3. OpenClaw/browser worker if available;
4. Qwen/model-assisted worker if applicable;
5. producer package receipt;
6. canonical validation;
7. Gap Detector;
8. monitoring;
9. retry/DLQ;
10. Academy observation/proposal.

The verifier observes rather than impersonating the subsystem under test.

## 27. Phase 21 — session-independence observation
After explicit setup/canaries, stop manually invoking worker methods.

Observe the persistent runtime for a bounded window and record:
- jobs eligible;
- jobs created by runtime;
- jobs leased;
- jobs completed;
- retries;
- real retrievals;
- evidence objects;
- monitoring checks;
- gaps;
- Academy cases;
- worker starvation.

The runtime must continue without Codex, browser or operator session remaining open.

## 28. Phase 22 — controlled restart/recovery proof
Only after stable operation:
- checkpoint state;
- perform a controlled service restart where safe;
- verify ledger persists;
- leases recover/expire correctly;
- monitoring schedules remain;
- queues continue;
- incidents remain;
- no duplicate scheduler starts.

Do not combine first activation with a full host reboot.

## 29. Phase 23 — intake-unpause gate
Canonical producer intake may be unpaused only when all of the following are physically proven:
- canonical durable receipt;
- validation queue/consumer;
- identity/evidence/currentness validation;
- contradiction handling;
- canonical status transitions;
- receiver-owned acknowledgement;
- retry/backpressure;
- observability;
- no competing canonical scheduler;
- rollback/pause mechanism.

If any required element is not proven, keep intake paused and continue all independent canonical work.

## 30. Phase 24 — live producer canary
After unpause, accept ONE bounded producer package.

Verify:
`producer SENT -> canonical RECEIVED -> durable receipt -> validation -> canonical disposition -> receiver acknowledgement -> producer observes acknowledgement`.

Then expand gradually rather than releasing an uncontrolled backlog all at once.

## 31. Phase 25 — backlog ramp
Use Resource Governor and queues to ramp intake/dispatch safely.

Monitor:
- queue depth;
- validation latency;
- CPU/memory;
- Qwen memory;
- OpenClaw/browser concurrency;
- Cloudflare failures;
- Supabase pressure;
- R2 throughput;
- producer backlog;
- DLQ growth.

Pause/rate-limit only the affected pipeline when thresholds are exceeded.

## 32. Phase 26 — final acceptance
Execute the current End-to-End Acceptance contract.

Use separate classifications per subsystem:
- PASS
- PASS_WITH_LIMITATIONS
- DEGRADED
- FAIL
- NOT_YET_PROVEN
- NOT_APPLICABLE.

No single global PASS may hide unproven dimensions.

## 33. Automatic continuation rule
Codex/authorized engineering agent must automatically continue from each successful proceed gate to the next safe stage.

Do not ask the owner for routine confirmation to:
- create missing non-destructive schema objects already required by canon;
- deploy non-destructive worker code;
- create queues/consumers defined by canon;
- reload validated systemd units;
- restart one bounded service when required for an authorized deployment;
- run tests/canaries;
- configure resource limits inside existing approved infrastructure;
- create internal monitoring/observability state;
- pause/retry a defective internal pipeline.

The owner authorization embodied in this runbook covers those routine implementation steps, subject to the explicit human-only stop conditions.

## 34. Non-blocking principle
A failure/blocker in one component must not stop unrelated implementation or research.

Examples:
- R2 issue does not block scheduler/lease implementation;
- browser worker issue does not block deterministic collectors;
- producer bridge pause does not block internal monitoring;
- Qwen issue does not block deterministic validation.

## 35. Rollback principle
Every material deployment step should preserve a rollback route:
- prior release/commit;
- migration rollback or forward-fix plan;
- service unit backup;
- feature/activation flag;
- queue pause;
- intake pause.

Do not use destructive rollback that loses valid civic evidence/history.

## 36. Git safety
For every material code pass:
`FETCH -> RECONCILE -> EDIT -> TEST -> COMMIT -> PUSH -> FETCH -> VERIFY REMOTE HEAD`.

Never force-push.

## 37. Final required report
Return only physically grounded state, including:

### Source/deployment
- CANONICAL_MAIN_HEAD
- CONTROL_PLANE_SOURCE_REF
- DEPLOYED_HERMES_COMMIT
- DEPLOYED_WORKER_VERSIONS

### Canonical runtime
- HERMES_CLASSIFICATION
- SCHEDULER
- WORK_LEDGER
- LEASES
- RESOURCE_GOVERNOR
- GAP_DETECTOR
- MONITORING
- RETRY_DLQ
- ACADEMY

### External fabric
- CLOUDFLARE_WORKERS
- CLOUDFLARE_QUEUES
- SUPABASE
- R2
- OPENCLAW
- QWEN

### Intake/validation
- PRODUCER_INTAKE
- CANONICAL_RECEIPT
- VALIDATION_PIPELINE
- IDENTITY
- EVIDENCE
- CURRENTNESS
- CONTRADICTION

### Acceptance
- SESSION_INDEPENDENT
- RESTART_RECOVERY
- LIVE_PRODUCER_CANARY
- INTAKE_STATE
- REMAINING_BLOCKERS

Do not manufacture PASS or fill unknown fields with optimistic assumptions.

## 38. Completion condition
This runbook is complete only when the canonical system is either:

A. physically running end-to-end and accepted under the canonical acceptance contract; or

B. every independent safe stage has been completed and the remaining blocked stage(s) are explicitly human-only under Section 4.

Do not stop at intermediate checkpoints.