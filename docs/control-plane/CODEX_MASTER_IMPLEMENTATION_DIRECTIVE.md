# CivicLenZ — Codex Master Production Activation Directive

## Mission
Move CivicLenZ from the current partially proven Cloudflare/Supabase runtime into a continuously operating, evidence-first Florida civic intelligence system whose normal operation does not depend on a human opening PowerShell or on Codex/GrokBot/ChatGPT remaining online.

This directive is implementation work, not a redesign. The five-step architecture in this directory is authoritative.

## Read first
Read `CODEX_START_HERE.md` and every required file listed there before changing architecture, Cloudflare, Supabase, the VPS, HERMES, OpenClaw, workers, or UI.

## Non-negotiable runtime model
- Permanent anchor: Seat.
- Supabase: canonical structured civic/operational state.
- R2: raw evidence payloads.
- Cloudflare Workers/Queues: distributed deterministic execution fabric.
- CivicLenZ VPS: persistent HERMES/OpenClaw/local-model control plane.
- Vercel/Next: protected operator UI and later public projection.
- GitHub: source, contracts, parsers, tests, deployment/config documentation; not the live civic database.
- CivicsLenZz/Gemini may later feed `extracted_unreviewed` research packages through a producer bridge; it is never a second source of truth.

## Operating doctrines
1. No synthetic civic data or simulated production metrics.
2. No global `COMPLETE` state for a Person, Candidate, Seat, or profile.
3. Bounded scopes may be `CURRENT_AS_OF`, `SCOPE_RECONCILED_AS_OF`, or `DATASET_RECONCILED_THROUGH`, then enter monitoring.
4. `CAPABILITY_NOT_IMPLEMENTED` must never be represented as `CHECKED_NO_AUTHORITATIVE_RESULT` and must not create a factual claim.
5. Research workers submit candidate claims/evidence; they do not self-verify material civic facts.
6. Deterministic-first: HTTP/HTML/API/JSON/CSV/XML/RSS/PDF extraction/GIS/database reconciliation before LLM escalation.
7. Search/browser discovery may locate evidence; snippets/search rankings are not evidence.
8. Event-first orchestration, heartbeat backstop.
9. Maximum safe utilization: fill useful idle capacity while preserving operational headroom, source rate limits, and stability.
10. Evolution is core: every worker executes, measures, learns, proposes/test improvements, and gets better within its authorized scope. Truth/publication standards do not silently evolve.

# Execution plan — seven stages

## Stage 1 — Production reality audit and activation baseline
Before writes beyond reversible documentation/config work:

1. Record current GitHub main SHA.
2. Inventory current deployed Cloudflare Workers, Queues, R2 bindings, routes, cron/triggers, environment variables by name only, and deployment IDs.
3. Query physical Supabase schema and production row counts for jurisdictions, seats, persons, occupancies, elections/candidates where present, sources, retrievals, evidence, claims, claim_evidence, contradictions, monitoring, jobs, worker_runs, ResearchContracts and fields.
4. Reconstruct the Governor fixture state from physical rows and job history. Do not create a second Governor job.
5. Identify schema/code/deployment drift.
6. Audit the current operator/public routes and whether they read canonical data or static fixtures.
7. Produce `docs/control-plane/CURRENT_PRODUCTION_REALITY.md` with timestamps, physical counts, deployment IDs, and known blockers. Never estimate.

Do not bulk-activate Florida during Stage 1.

### Stage 1 exit gate
A reproducible baseline exists and every currently deployed component is classified as ACTIVE/READY/DEGRADED/FAILED/NOT_IMPLEMENTED from real evidence.

## Stage 2 — CivicLenZ VPS foundation
Target host: dedicated CivicLenZ Ubuntu VPS, approximately 4 vCPU / 16 GB RAM, enrolled in SentinelX under `civiclenz-prod-ai`.

Build a reconstructible runtime rooted under `/opt/civiclenz` with least privilege and no secrets in Git.

Required outcomes:
- OS/security baseline and updates.
- Dedicated CivicLenZ service identity/permissions.
- swap sized as safety headroom, not routine model memory.
- Docker Engine + Compose unless a simpler existing supported runtime is demonstrably better.
- directories for `hermes`, `openclaw`, `models`, `config`, `runtime`, `scripts`, `logs`, `backups`.
- log rotation and health checks.
- llama.cpp serving Qwen3-4B Q4_K_M on localhost only.
- local model health/latency benchmark on actual hardware.
- OpenClaw installed/configured as the conversational/tool runtime.
- HERMES Prime installed as a persistent service, initially in observation/no-dispatch mode.
- service definitions committed to Git without secrets.
- recovery instructions sufficient to rebuild the VPS from GitHub + Supabase + R2 + secret stores.

Do not expose llama.cpp or internal HERMES APIs publicly without an authenticated gateway.

### Stage 2 exit gate
After reboot, SentinelX, HERMES, OpenClaw and local Qwen health checks recover automatically; no unique civic evidence exists only on the VPS.

## Stage 3 — HERMES control plane and semantics
Implement/finish the persistent HERMES executive.

Required subsystems:
- capability registry with declared implementation state and runtime state separated;
- work planner driven by ResearchContracts and currentness/reconciliation gaps;
- event intake and event-driven follow-up;
- heartbeat reconciliation/backstop;
- expired lease/job recovery awareness;
- priority/resource governor;
- source-health supervisor;
- cohort controller;
- retry/dead-letter policy;
- model/tool router;
- monitoring planner;
- Academy/evolution subsystem;
- operator command/audit path.

### Heartbeat model
Use event-driven reactions immediately where possible. Use benchmarked/tiered reconciliation loops rather than one expensive cron:
- fast health/work reconciliation: seconds-scale as safe;
- planning/capacity fill: roughly minute-scale;
- completeness/currentness planning: minutes-scale;
- Academy/evolution review: sample/event/hour/day driven as appropriate.

Do not hardcode these intervals as doctrine. Benchmark the VPS and queue behavior and record chosen defaults plus reasons.

### Resource governor
Continuously observe CPU, load, RAM, swap pressure, disk, queue depth, browser sessions, local-model latency, source rate limits, error rates and external spend. Increase/decrease concurrency to maximize useful safe throughput while retaining headroom for HERMES, urgent events and operator actions.

### Evolution contract
Every logical role has:
- mission;
- allowed tools/sources;
- evidence obligations;
- metrics;
- failure/escalation policy;
- evolution charter.

Evolution flow: observation -> lesson -> proposal -> test -> benchmark -> safe/governed promotion -> post-deploy measurement.

Workers may improve HOW they research. Verification/publication truth standards require governance.

### Critical semantic remediation
Find and remove any logic that turns `NOT_IMPLEMENTED` into a claim such as `checked_no_authoritative_result`. Operational incapability is not a civic fact.

### Stage 3 exit gate
HERMES can inspect real Supabase state, derive work without inventing claims, route only to READY capabilities, record why work is blocked, and continue after Codex disconnects.

## Stage 4 — Cloudflare reconciliation and direct Codex/HERMES control
Cloudflare should remain the high-throughput execution fabric, not be replaced by the VPS.

Use scoped Cloudflare credentials, never a Global API Key. Production configuration must be reproducible from GitHub + secret stores.

Inspect/reconcile:
- `civiclenz-scheduler`;
- `civiclenz-collector`;
- `civiclenz-validator`;
- queues and consumers;
- R2 bucket/bindings;
- wrangler configuration;
- routes/triggers;
- deployment automation;
- operator endpoint and auth;
- lease/recovery behavior;
- source registry and parser families.

Repair dashboard-only drift by encoding non-secret configuration in GitHub.

Normal HERMES flow should be:
HERMES identifies canonical job -> persists/dedupes -> dispatches queue -> worker leases -> collects/persists -> terminal worker/job state -> validation -> HERMES observes -> next work.

Manual PowerShell/operator calls remain emergency controls only.

### Governor canary
Use the existing Governor/Florida seat path as the canary. Do not hand-insert civic facts to make it pass. Fix the first real pipeline blocker until the end-to-end path proves retrieval/evidence/claim/validation/currentness/monitoring behavior.

### DRY_RUN gate
Do not blindly flip DRY_RUN. Before enabling autonomous dispatch prove from physical production behavior:
- lease/reaper recovery;
- one terminal worker_run per execution path;
- duplicate delivery safety;
- claim/evidence persistence;
- validation flow;
- currentness/completeness planning;
- source health and zero-record fail-closed behavior;
- cohort pause controls;
- no unresolved schema mismatch on canary path.

When all conditions are satisfied, prepare/perform the smallest safe activation permitted by existing authorization and document it.

### Stage 4 exit gate
A normal job can be planned, dispatched, executed, validated and followed up without PowerShell; Cloudflare remains reproducible from GitHub/config + secrets.

## Stage 5 — Florida factory activation
Do not stop after one Governor success. Roll out controlled cohorts while enrichment continues in parallel.

Suggested order:
1. Florida statewide executive Seats.
2. Florida Senate.
3. Florida House.
4. Florida federal delegation.
5. Miami-Dade, Broward, Palm Beach.
6. remaining Florida counties.
7. municipalities.
8. school boards and special districts.

Cohort expansion is based on physical health/error/duplicate/parser/evidence signals, not hardcoded expected counts alone.

Discovery, enrichment, validation and monitoring operate concurrently. A Seat/person is never globally complete.

Candidate/election work is first-class:
Seat -> Election -> CandidateCampaign -> Person -> result -> later SeatOccupancy if elected.

### Stage 5 exit gate
At least the first safe Florida cohorts are progressing autonomously, with real jobs/workers/evidence and fail-closed cohort controls.

## Stage 6 — Research depth, search/browser, monitoring and Civic Events
Implement/activate the reusable capability families defined in the worker catalog, starting deterministic and adding local Qwen only where useful.

Core families include discovery, identity, elections/candidates, background, finance/disclosure, government activity, accountability/promises/statements, relationships, evidence/validation, monitoring/events and GIS.

Add Search Discovery and Browser Research as first-class capabilities:
known authoritative source -> deterministic collector;
unknown source -> search discovery -> browser/source inspection -> raw evidence -> extracted_unreviewed claim -> validation.

Search results/snippets never become evidence directly.

Research is recursive: discovered committees, prior jurisdictions, prior offices, businesses, promises, filings, sources and relationships create new scoped research obligations.

Finite datasets must reconcile expected units through a cutoff; they are not 'complete' merely because records were found.

Material validated changes should produce structured Civic Events powering timelines, feeds, later RSS/alerts/notifications and user follow behavior.

### Stage 6 exit gate
Monitoring continually reopens stale/changed scopes; user-demand research can enter HERMES; evidence/currentness/events are observable.

## Stage 7 — Operator/product wiring and steady-state autonomy
Build/finish the protected CivicLenZ Command Center against physical canonical/runtime data.

It must show real:
- infrastructure health;
- HERMES/OpenClaw/Qwen/Cloudflare state;
- workers/capabilities and last success;
- queue/job states;
- source health;
- Seats/occupancies/candidates/elections;
- research/currentness/reconciliation gaps;
- claims/evidence/validation/contradictions;
- monitoring/events;
- resource utilization and model/tool usage;
- cohort state.

Build one canonical Seat/Profile projection with operator overlays. The public projection must later use the same civic graph but only publication-eligible information.

OpenClaw should support:
- answer from existing eligible civic data;
- create HERMES research requests when information is missing/stale/insufficient;
- notify/return results when ready;
- later user follows, alerts and civic-action workflows.

### Stage 7 exit gate — production activation definition
CivicLenZ continues useful work after Codex disconnects and after a reboot. Normal collection/research/validation/monitoring does not require PowerShell. Operator UI exposes physical state. Failures recover or remain visibly blocked/dead-lettered. Academy generates measurable improvement proposals. Florida coverage continues expanding under safety gates.

# Parallel CivicsLenZz/Gemini harvester
Do not wait on it to begin the canonical build. Prepare a versioned producer/ingest boundary so external producers can submit evidence-backed `extracted_unreviewed` research packages. Canonical CivicLenZ must independently dedupe/entity-resolve/validate/reject them.

# Change discipline
- Inspect before editing.
- Preserve useful working behavior.
- Prefer additive/reversible changes.
- Use PRs for governed changes.
- Run existing tests and add tests for every production failure mode repaired.
- Do not apply reconstruction/destructive migrations merely because a local schema differs.
- Do not create duplicate jobs/Seats/Persons/occupancies to bypass broken state.
- Never log or commit secret values.
- Report physical counts and deployment identifiers only.

# When to stop for the operator
Continue autonomously through non-destructive implementation and testing. Stop only when a genuine operator action/approval is required, including:
- a missing credential that cannot be obtained through an authorized integration;
- a destructive/irreversible production change;
- a production-impacting schema migration requiring explicit review;
- a new paid-service commitment;
- a safety gate that requires human judgment.

When blocked, give the smallest exact operator action needed, then continue after it is satisfied.

# Required ongoing reports
At each stage, update `docs/control-plane/CURRENT_PRODUCTION_REALITY.md` and report:
- main SHA;
- deployment/service versions;
- physical DB counts relevant to the stage;
- worker/runtime states based on real runs;
- jobs/queues/errors;
- data/evidence created;
- current blocker;
- next autonomous action.

Never call planned functionality ACTIVE.

# Final target
The system is successful when it continuously performs:

DISCOVER -> RESEARCH -> RECONCILE CURRENT SCOPE -> VALIDATE -> PUBLISH IF ELIGIBLE -> MONITOR -> DETECT CHANGE -> RESEARCH AGAIN

while simultaneously:

EXECUTE -> MEASURE -> LEARN -> PROPOSE -> TEST -> IMPROVE

with HERMES remaining the persistent orchestrator and truth remaining evidence-governed.