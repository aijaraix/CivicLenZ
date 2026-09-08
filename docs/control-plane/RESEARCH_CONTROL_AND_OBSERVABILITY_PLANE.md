# Research Control & Observability Plane

## Purpose
CivicLenZ must be able to explain not only what civic information it holds, but how every material result was researched, extracted, evidenced, handed off, validated, monitored, displayed, and—when something fails—where the failure occurred.

The Research Control & Observability Plane is the canonical operational truth layer for research execution. It applies across HERMES, CivicsLenZz/Gemini, Cloudflare workers, OpenClaw/browser workers, local model utilities, deterministic adapters, validators, evidence services, monitoring, and the operator/public projections that consume their outputs.

The dashboard is a projection of physical state. It is never an independent source of truth.

## Core invariant
Every material research result should be traceable through a chain equivalent to:

Research Need -> ResearchWorkIdentity -> Job/Reservation -> Agent/Worker -> Tool/Adapter -> Source -> Retrieval -> Document/Page/Dataset Unit -> Extraction -> Evidence -> Claim/Relationship/Entity Candidate -> Handoff -> Result Package -> Canonical Intake -> Validation/Reconciliation -> Monitoring -> Product Projection.

A missing link must be visible as a gap, not silently reconstructed or fabricated.

## Canonical ledgers
The implementation should converge on seven connected ledgers/projections.

### 1. Research Work Ledger
Answers why work exists and who owns it. It records ResearchWorkIdentity, reservation/lease, subject, ResearchContract/scope, priority, cohort, producer assignment, attempt, deadlines/cutoffs, status, and downstream dependencies.

### 2. Execution Trace Ledger
Answers how work was performed. It records trace/run/span identities, agent/worker and version, tool/adapter/parser and version, timings, external operations, physical work units, retries, handoffs, resource use, and terminal state.

### 3. Evidence Ledger
Answers what physically supports an extraction/claim. It links sources, retrievals, preserved artifacts, byte hashes, precise source locators, extraction method, and claim/relationship support or contradiction.

### 4. Entity / Claim State
Answers what the system currently knows at each trust stage. Harvester extraction remains extracted_unreviewed. Canonical validation/reconciliation controls later states. Operational absence, unresolved identity, contradiction, staleness, and unsupported assertions must remain explicit.

### 5. Monitoring Ledger
Answers when each dynamic scope was last checked, what source/capability checks it, when it is due again, what changed, whether the source is healthy, and whether currentness guarantees are being met.

### 6. Failure & Exception Ledger
Answers where/why work failed or degraded. Failures must be attributable to a stage such as assignment, source discovery, network/retrieval, access/rate limit, parsing, extraction, identity resolution, evidence integrity, handoff, schema/contract, bridge authentication, canonical intake, validation, persistence, monitoring, or product projection.

### 7. Dashboard / Product Projection
Reads from the ledgers/canonical state through reproducible definitions. It must never maintain detached counts, synthetic progress, or manually asserted production truth.

## Agent responsibility contract
Every operational agent/worker/capability must have a machine-readable responsibility contract containing at least:

- agent_id / capability_id;
- role and mission;
- version;
- owning director/domain;
- accepted job types and ResearchContracts/scopes served;
- required inputs;
- expected outputs;
- allowed/preferred tools and fallback tools;
- source classes/source families;
- handoff targets;
- retry/failure policy;
- monitoring cadence where applicable;
- resource limits/governor class;
- Academy metrics;
- prohibited actions.

Avoid vague roles such as `research politician` when responsibility can be expressed as Seat discovery, candidate discovery, campaign finance, votes, GIS, evidence capture, etc. Logical roles need not imply one OS process per role; functional accountability is the requirement.

## Agent / tool / source registry
Maintain persistent registries for agents, workers, tools, adapters, parsers, models, and recurring source families. Every execution/result must identify the relevant versions so an operator can determine which implementation produced a fact and reproduce or invalidate affected outputs after a bug is discovered.

## Trace context
Use OpenTelemetry-compatible trace concepts and semantic conventions where practical. Each research mission receives a trace_id; meaningful operations receive span_id/parent_span_id and optional linked spans. Propagate trace context across queues, handoffs, HTTP/browser retrieval, parsing, evidence creation, result packaging, Harvester/HERMES bridge delivery, canonical validation, and projection jobs.

Retain CivicLenZ domain identifiers alongside trace context: job_id, ResearchWorkIdentity, ResearchReservation, cohort, producer, Seat/Person/Election/CandidateCampaign identifiers where known.

Never put secrets, authentication material, or unnecessary sensitive data into trace attributes.

## Meaningful research spans
Instrument operations where external I/O, duration, failure, handoff, evidence lineage, or cost/resource attribution matters. Examples:

- research.job
- source.discover
- source.fetch
- browser.navigate
- document.download
- document.parse
- dataset.enumerate
- page.inspect
- fact.extract
- fact.normalize
- evidence.capture
- evidence.hash
- relationship.extract
- boundary.fetch
- boundary.compare
- handoff.agent
- result.package
- bridge.submit
- canonical.ack
- validation.run
- monitoring.check
- projection.refresh

Do not create useless high-volume spans for every trivial in-memory function.

## Physical retrieval accounting
For each retrieval, retain non-secret operational metadata where applicable:

- retrieval_id / trace_id / run_id;
- agent/tool/adapter/source identifiers;
- source URL and source family;
- start/end time and latency;
- HTTP/status/access result;
- MIME/content type;
- bytes received;
- content hash;
- cache/reuse state;
- retries/rate-limit state;
- parser selected;
- terminal result state.

Browser work may additionally record pages navigated, documents opened/downloaded, and why browser fallback was required. Counts must derive from physical events.

## Page/document/dataset accounting
Research scopes should expose physical work units rather than vague claims of exhaustive research. Where applicable record:

- pages discovered/requested/retrieved/parsed/skipped/failed;
- documents discovered/downloaded/parsed/failed;
- dataset units expected (when enumerable), retrieved, parsed, rejected, missing;
- records inspected/matched/rejected;
- source endpoints queried and relevant query parameters/periods.

A scope cannot be called reconciled/exhausted unless its defined enumerable universe was actually reconciled under the applicable ResearchContract.

## Extraction accounting
Extraction operations should record physical outputs such as candidate facts, claim candidates, relationship candidates, dataset units, evidence objects, duplicates removed, invalid/unsupported extractions, identity-ambiguous items, contradictions, and items requiring canonical validation.

Metrics describe pipeline behavior; they do not confer truth or verification.

## Handoff receipts
Every material agent/service handoff must be observable. A handoff receipt should identify:

- handoff_id;
- trace_id;
- from/to capability or service;
- payload/result type;
- content or manifest hash where appropriate;
- input/output record counts where meaningful;
- sent/received/acknowledged timestamps;
- status/failure reason.

This must make it possible to locate loss or mutation between stages rather than merely observing that the final output is incomplete.

## Failure taxonomy
Failures and degraded outcomes should be normalized into categories such as:

- WORK_ASSIGNMENT_FAILURE
- SOURCE_NOT_FOUND
- SOURCE_ACCESS_DENIED
- SOURCE_RATE_LIMITED
- SOURCE_UNAVAILABLE
- NETWORK_FAILURE
- RETRIEVAL_INTEGRITY_FAILURE
- PARSER_FAILURE
- SCHEMA_DRIFT
- EXTRACTION_FAILURE
- IDENTITY_AMBIGUITY
- IDENTITY_CONFLICT
- EVIDENCE_MISSING
- EVIDENCE_HASH_MISMATCH
- HANDOFF_FAILURE
- CONTRACT_VERSION_MISMATCH
- BRIDGE_AUTH_FAILURE
- CANONICAL_INTAKE_FAILURE
- VALIDATION_REJECTION
- CONTRADICTION_DETECTED
- PERSISTENCE_FAILURE
- MONITORING_STALE
- PROJECTION_RECONCILIATION_FAILURE
- RESOURCE_GOVERNOR_THROTTLE

Preserve underlying safe error details, retryability, attempt count, first/last occurrence, affected scope, and next action. Never leak credentials through errors.

## Gap detector
Continuously compare applicable ResearchContract scopes against actual evidence/currentness. Generate concrete work for missing or stale scopes rather than waiting for a human to notice blank fields.

Examples:
- Candidate exists + campaign site known + platform not extracted -> platform/promise research.
- Seat exists + boundary unresolved -> GIS discovery.
- Finance scope stale -> finance refresh.
- New vote appears for a tracked promise -> promise-evidence candidate research.

`CAPABILITY_NOT_IMPLEMENTED` must remain distinct from an authoritative no-result outcome.

## Contradiction detection
The Harvester may detect contradictions but must not resolve material civic conflicts by guessing. Preserve both sides, their sources/retrieval dates, the difference, and create contradiction/reconciliation work for canonical HERMES.

Automated consistency checks should include Seat↔official roster, Seat↔GIS district, Person↔official profile, Election↔election authority, CandidateCampaign↔filing authority, and similar high-value invariants.

## Source health
Source health is first-class operational state. Track last success/failure, response/schema fingerprints, parser compatibility, rate limiting, access changes, latency, and consecutive failures. Academy should distinguish source failure from agent/parser failure.

## Monitoring currentness
Dynamic scopes carry last_checked, current_as_of, next_check, stale_after, monitoring capability, source health, last change, and consecutive failures. Cadence is source/scope-specific. Use event-driven triggers where possible and heartbeat sweeps as a backstop, not one polling interval for all civic data.

## Resource observability
Attribute CPU/time/memory/bytes/browser use/model use/queue latency and other measurable resources to useful dimensions such as capability, source family, ResearchContract, cohort, and producer. This supports maximum safe utilization and deterministic optimization without creating artificial load.

## Academy feedback
Operational outcomes feed Academy. Examples:
- high canonical rejection -> inspect source/parser/method;
- repeated identity mismatch -> strengthen identity resolution;
- repeated browser discovery of same portal -> register source/build adapter;
- schema drift -> source-specific drift detector;
- stable expensive semantic extraction -> deterministic parser candidate;
- high duplicates -> improve ResearchWorkIdentity/reservation logic.

Academy may improve methods but may not silently change truth, verification, publication, sensitive-data, or ResearchContract standards.

## Coverage assurance
Maintain cohort/domain coverage assurance showing applicable scopes, researched/current/stale/unresolved/not-started scopes, evidence/source counts, contradictions, monitoring state, and next work. Do not collapse this into a single misleading completion percentage.

Periodically run physical sample audits over real Seats, officials, candidates, Elections, boundaries, and evidence chains to detect systematic omissions. Sampling/audit results must be real and reproducible.

## Dashboard truth invariant
Every operator metric must have a versioned MetricDefinition, explicit inclusion/exclusion criteria, reproducible query or computation, source datastore, computed_at timestamp, and drill-down to the underlying records where feasible.

No `Math.random()`, detached counters, hardcoded production totals, or manually typed progress metrics are permitted.

If dashboard projection and physical state disagree, raise PROJECTION_RECONCILIATION_FAILURE and visibly degrade the affected metric rather than silently displaying a false number.

## Product lineage invariant
Public/operator product surfaces must be able to trace substantive civic assertions back to canonical claim/evidence/currentness state. Development/operator modes should expose deeper lineage (claim, source locator, evidence artifact, agent/run/trace, validation, monitoring). Public UX may collapse this to a simple Sources/Evidence interaction, but the underlying chain remains intact.

Detailed evidence locators, media provenance, dashboard metric contracts, UI projection rules, and exception/monitoring UX are specified by companion control-plane documents.

## Continuous operation
Observability is not a reason to stop research. Instrumentation should be incremental and bounded. A failure in one capability should not stop unrelated eligible work. Successful checkpoints are recorded and execution continues unless a genuine human-only gate exists.