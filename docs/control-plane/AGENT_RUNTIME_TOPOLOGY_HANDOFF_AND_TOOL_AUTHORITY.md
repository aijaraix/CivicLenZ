# CivicLenZ Agent Runtime Topology, Handoff & Tool Authority

## 1. Purpose
This document defines the mandatory runtime topology for CivicLenZ research execution: what an agent is, what a capability is, which components may execute autonomously, how work moves between components, what tools and sources each component may use, how permissions are constrained, how failures are isolated, and how physical liveness is proven.

This contract applies to canonical CivicLenZ/HERMES, OpenClaw, Cloudflare execution infrastructure, deterministic collectors/adapters, model-assisted workers, browser workers, producer systems including CivicsLenZz, monitoring, Gap Detector, Academy/evolution, and future compatible implementations.

It complements, and does not replace, the Master Autonomous Research Operating Contract, Subject Research Enrichment and Completeness Contract, Worker Catalog and ResearchContracts, HERMES/OpenClaw Runtime, Data/Evidence/Verification, observability, evidence locator, monitoring, media, Seat/Election/Candidate, GIS, territory, relationship and producer contracts.

## 2. Non-negotiable doctrine
1. CivicLenZ does **not** require one process per politician or one process per logical capability.
2. A named capability is not automatically an agent.
3. A class/function named `Agent` is not proof of autonomous operation.
4. Codex, Gemini/Google, ChatGPT, browser sessions and developer terminals are development/control clients, not the persistent production orchestrator.
5. HERMES Prime owns persistent work orchestration for canonical CivicLenZ.
6. Producer implementations may have their own persistent scheduler/orchestrator, but must remain subordinate to canonical contracts and producer authority.
7. Every required responsibility must have exactly understood ownership, an executable path, an observable runtime state, evidence-producing behavior where applicable, and a defined handoff.
8. One failure must block only the smallest dependency-bound work unit.
9. No worker may self-promote extracted material into canonical verified truth.
10. All machine identities, permissions and tool access follow least privilege.

## 3. Canonical vocabulary
### 3.1 Capability
A logical responsibility the system must fulfill, e.g. `current_occupancy`, `candidate_discovery`, `campaign_finance`, `votes`, `boundary_evolution`, `portrait`, `evidence_capture`, `contradiction_detection`.

A capability defines **what must be possible**, not how many operating-system processes must exist.

### 3.2 Responsibility Contract
Machine-readable contract assigning mission, subject types, accepted jobs, inputs, outputs, ResearchContracts served, source families, tools, permissions, dependencies, retries, handoffs, evidence requirements, currentness, monitoring and Academy metrics.

### 3.3 Worker
An execution component that performs one or more capabilities. A worker may be deterministic code, queue consumer, scheduled task, event-driven service, browser automation, model-assisted process or another approved execution unit.

### 3.4 Persistent worker
A worker that exists independently of an interactive development session and consumes work through a durable scheduler/queue/event mechanism.

### 3.5 Queue consumer
A persistent or supervised component that leases/reserves jobs from a durable queue and acknowledges completion/failure.

### 3.6 Scheduled worker
A worker activated by a scheduler, cron, due-time or monitoring deadline.

### 3.7 Event-driven worker
A worker activated by a durable event such as subject discovery, dependency completion, source change, canonical assignment, Gap Detector output or failure retry.

### 3.8 Deterministic adapter/parser
Versioned code that interacts predictably with a known API, dataset, document structure, HTML family, GIS service or other repeatable source. It is not an autonomous agent by itself unless it also owns persistent scheduling/queue behavior.

### 3.9 Browser/discovery worker
A worker allowed to use browser/search navigation where deterministic access is insufficient or for source discovery. Browser output is not automatically evidence.

### 3.10 Model-assisted worker
A worker using an approved model for bounded semantic work such as classification, extraction assistance, comparison, summarization, anomaly detection or escalation. Model output is derivative and not primary evidence.

### 3.11 Interactive development/control session
Codex, Gemini/Google, ChatGPT, terminal, IDE or browser session used to build, inspect or operate the system. Interactive sessions MUST NOT be counted as autonomous research workers and MUST NOT be required to remain open for normal research execution.

### 3.12 Orchestrator
The persistent control component that determines eligible work, dependencies, priority, routing, reservations, retries, monitoring deadlines and resource allocation. Canonical CivicLenZ uses HERMES Prime for this role.

## 4. Logical capability count versus physical topology
No canonical document may infer physical worker count directly from logical capability count.

Example: 47 logical capabilities may physically execute through 15 persistent workers, 20 deterministic adapters, 3 queue consumers, a browser pool and model routing. Another conforming implementation may use a different topology.

Conformance is determined by responsibility coverage and physical proof, not process count.

For every capability maintain:
- capability_id
- responsibility_contract_version
- implementing worker/service IDs
- runtime type
- source/tool authority
- queue/wakeup path
- last real execution
- current runtime state
- monitoring state
- evidence/handoff proof

## 5. Required runtime topology
Conceptually:

```text
ResearchContracts / Monitoring / Gap Detector / Frontier / Canonical Requests
                              |
                              v
                         HERMES PRIME
                              |
                   Research Work Ledger
                              |
              ResearchWorkIdentity + Reservation
                              |
                         Scheduler
                              |
                Resource Governor / Router
                              |
       +----------------------+----------------------+
       |                      |                      |
       v                      v                      v
Deterministic Workers   Browser/Discovery     Model-Assisted Workers
       |                      |                      |
       +----------------------+----------------------+
                              |
                           Sources
                              |
                         Retrievals
                              |
                       Raw Evidence
                              |
                         Extraction
                              |
                  Claims/Entities/Relations
                              |
                           Handoff
                              |
                Canonical Validation/Reconcile
                              |
                  Structured Canonical State
                              |
          Monitoring / Projection / Academy
                              |
                         Next Work
```

Producer systems use the same semantic lifecycle but may stop at an authenticated producer handoff to canonical HERMES.

## 6. HERMES Prime authority
HERMES Prime owns canonical decisions about:
- work discovery
- ResearchContract gap comparison
- work generation
- dependency readiness
- reservations/leases
- priority
- capability routing
- resource allocation
- source-health-aware routing
- retry/dead-letter behavior
- monitoring schedules
- starvation detection
- escalation
- producer intake routing
- operator state
- Academy review scheduling

HERMES Prime does **not** own authority to invent civic facts or bypass evidence/validation/publication rules.

## 7. Work creation triggers
Work may be created only through defined triggers, including:
- new Seat/Person/Occupancy/Election/CandidateCampaign discovery
- ResearchContract missing scope
- stale scope
- conflicting evidence
- evidence deficiency
- monitoring due-time
- detected source/entity change
- finite-dataset reconciliation gap
- canonical HERMES request
- frontier coverage backlog
- failed/retryable job
- dependency completion
- Academy-approved remediation
- operator-approved bounded research request

Interactive prompts may request work but do not replace durable work creation.

## 8. Wake-up mechanisms
Every persistent capability path must declare one or more:
- queue message
- scheduler tick
- cron/due-time
- event notification
- monitoring deadline
- Gap Detector output
- dependency completion
- frontier backlog
- canonical assignment
- retry timer

A capability with applicable backlog but no functioning wake-up mechanism is NOT operationally autonomous.

The scheduler may evaluate eligible work frequently, subject to Resource Governor policy. Canonical contracts do not require hundreds of agents to independently poll every few seconds.

## 9. Job routing
Routing MUST consider:
- ResearchContract scope
- subject/entity type
- capability ownership
- source family
- source health
- dependency state
- urgency/currentness
- resource cost
- worker availability
- model/browser necessity
- security/tool authority

Routing MUST NOT be based only on worker/personality names.

## 10. ResearchWorkIdentity and reservation
Before material execution, create/resolve a deterministic ResearchWorkIdentity describing subject, scope, dataset/reference period, source scope where relevant and contract version.

Reserve/lease work before execution to suppress redundant concurrent work.

Retries retain lineage to the same research need. Monitoring checks remain distinguishable executions while linking to the same monitored scope.

## 11. Responsibility ownership
Every ResearchContract scope must have:
- primary capability owner
- optional fallback/escalation owner
- defined input contract
- defined output contract
- evidence requirement
- handoff destination
- failure behavior
- monitoring owner

No applicable scope may be silently unowned.

If ownership cannot be resolved, create `UNOWNED_RESEARCH_SCOPE_EXCEPTION`.

## 12. Tool authority model
Tools are permissions, not entitlements. A worker may use only tools declared in its Responsibility Contract and granted to its machine identity.

Tool classes include:
- structured HTTP/API client
- deterministic HTML parser
- PDF/document parser
- GIS client/indexer
- database read/write APIs
- queue APIs
- object/evidence storage
- browser/search discovery
- local model
- approved external model
- hashing/crypto
- notification/observability tools

Workers MUST NOT dynamically broaden their own permissions.

## 13. Preferred execution escalation
Where practical use the least expensive reliable method:
1. canonical/internal structured state
2. authoritative structured API/dataset
3. deterministic adapter/parser
4. document/PDF/GIS parser
5. browser/source discovery
6. local model for bounded semantic work
7. inexpensive approved external model
8. stronger external reasoning only when justified

This is a routing principle, not permission to skip evidence requirements.

## 14. Model authority
Models may assist with:
- source discovery
- job classification/routing
- semantic extraction assistance
- document interpretation
- entity-resolution candidate generation
- contradiction candidate generation
- summarization of already-grounded material
- anomaly detection
- Academy hypotheses

Models may not, solely by generation:
- create primary evidence
- declare identity resolved
- declare canonical verification
- declare a candidate legally qualified
- declare an occupancy current
- invent missing contact information
- invent financial values
- override authoritative evidence
- alter publication standards

## 15. Browser authority
Browser workers may discover/navigate publicly accessible sources and retrieve material consistent with source policy.

They may not bypass CAPTCHAs, authentication controls, paywalls, robots/access restrictions or prohibited mechanisms.

When browser discovery identifies a stable recurring source, the Source Registry/Academy should consider a deterministic adapter.

## 16. Source authority
Workers MUST select sources according to claim type and temporal suitability.

A historically authoritative source may not be suitable for a current-state claim. Source authority records should include:
- source role
- claim types supported
- temporal/currentness characteristics
- jurisdiction
- source family
- parser/adapter
- health state

Primary government/election/legislative/court/disclosure/GIS sources are preferred for authoritative civic facts where available.

## 17. Retrieval boundary
A retrieval is a physical event. It MUST record available request/response metadata, bytes/hash, source, worker/job/trace and parser/adapter version.

Constructed strings, fixtures, expected text and model output MUST NOT masquerade as live retrievals.

## 18. Evidence handoff boundary
Workers do not hand off unsupported conclusions. Material outputs should include references to:
- retrievals
- preserved artifacts
- hashes
- SourceLocators
- extracted atomic claims/relations
- temporal context
- worker/run lineage

The receiver MUST be able to reconcile the manifest/hash and record counts where applicable.

## 19. Handoff protocol
Every material inter-worker/inter-service handoff requires a durable HandoffReceipt containing at minimum:
- handoff_id
- trace_id
- from_component
- to_component
- ResearchWorkIdentity/job
- payload type/version
- payload manifest/hash
- record counts where meaningful
- sent_at
- received_at
- acknowledged_at
- state
- retry/failure metadata

Sender-created receipts alone do not prove consumption. Receiver acknowledgment is required for consumed/acknowledged state.

## 20. Handoff states
Recommended semantic states:
- PREPARED
- SENT
- RECEIVED
- ACKNOWLEDGED
- RETRYING
- FAILED
- DEAD_LETTER
- SUPERSEDED

Exact storage literals may adapt to live schema, but semantics must remain distinguishable.

## 21. Producer-to-canonical handoff
CivicsLenZz and other untrusted producers may research independently but must deliver through the governed producer contract/bridge.

Producer restrictions:
- no canonical DB direct writes
- no canonical verification authority
- no publication authority
- no identity override authority
- no truth-standard override

Producer output remains `extracted_unreviewed` until canonical processing.

Canonical transport acknowledgment is not validation.

## 22. Internal canonical handoffs
Canonical HERMES must preserve lineage across:
producer intake -> schema/policy gate -> identity resolution -> evidence validation -> contradiction/dataset reconciliation -> structured persistence -> monitoring/publication eligibility.

A failure at one stage must be attributable to that stage rather than appearing as unexplained missing data.

## 23. Parallel execution
Independent ResearchContract scopes should execute concurrently within Resource Governor limits.

Example: biography, campaign finance, votes, GIS and media for the same subject need not wait for each other unless an actual dependency exists.

A worker must not create artificial dependencies merely to serialize work.

## 24. Failure isolation
Failure scope is the smallest dependency-bound unit.

Required invariants:
- one retrieval failure != entire capability failure
- one capability failure != subject failure
- one subject failure != cohort failure
- one source outage != Harvester failure
- bridge outage != research shutdown
- canonical outage != producer shutdown

Independent eligible work MUST continue.

## 25. Retry authority
Retries must be bounded and policy-driven.

Retry policy considers:
- failure class
- idempotency
- source rate limits
- Retry-After
- backoff/jitter
- maximum attempts
- next eligible time
- alternate approved source/tool path

Permanent/semantic failures should not spin indefinitely.

## 26. Dead-letter behavior
After retry exhaustion or terminal policy/schema failure, persist the job/attempt and create a dead-letter/exception state with:
- reason
- lineage
- evidence/retrieval references
- data-loss assessment
- next action
- owner/capability

Dead-letter work must remain operator-visible and may create Academy cases.

## 27. Starvation detection
For each capability calculate eligible backlog versus recent real work.

If eligible work exists but no work is received within the capability service expectation, create `AGENT_STARVATION_EXCEPTION`.

Investigate:
- scheduler
- queue
- routing
- dependency graph
- Resource Governor
- worker liveness
- source-health gate
- permission/tool failure

A process heartbeat does not clear starvation if useful work is not being consumed.

## 28. Runtime liveness states
Separate:
- DECLARED
- IMPLEMENTED
- TEST_PROVEN
- LIVE_SOURCE_PROVEN
- AUTONOMOUS_RUNTIME_PROVEN
- MONITORING_PROVEN
- DEGRADED
- FAILED
- DISABLED

`ACTIVE` or equivalent operator display requires recent real execution appropriate to the capability, not merely loaded code.

## 29. Worker liveness telemetry
Every persistent worker/service should expose or persist:
- worker/service ID
- process/runtime identity
- start time
- heartbeat
- supervisor
- last job received
- last job started
- last job completed
- last successful source/retrieval
- last evidence/result
- queue depth
- retry count
- failure state
- next eligible work

## 30. Scheduler liveness
Persist/operator-expose:
- last heartbeat
- last work scan
- last job created
- last dispatch
- next wakeup
- eligible backlog
- blocked backlog
- starvation exceptions
- resource-throttled backlog

If eligible work and capacity exist but no dispatch occurs, create a scheduler exception.

## 31. Resource Governor
Resource Governor must protect system stability while remaining work-conserving.

It considers:
- CPU
- memory
- disk
- network
- browser slots
- model concurrency
- source rate limits
- queue latency
- worker concurrency
- external API budgets/policy

It must balance frontier discovery, first-pass enrichment, deep dossiers, election urgency, monitoring, remediation and Academy work.

## 32. Persistence requirements
Durably persist all state necessary to resume work:
- ResearchWorkIdentities
- jobs/attempts
- leases/reservations
- dependencies
- retries/dead letters
- coverage/gaps
- monitoring schedules
- incidents
- handoffs
- bridge backlog
- Academy cases
- structured result/evidence metadata

In-memory-only state is insufficient for required durable work.

## 33. Restart/recovery
Supervised runtime must recover from normal process restart without losing durable work.

Recovery includes:
- expired/stale leases
- queued jobs
- retry timers
- monitoring deadlines
- gap backlog
- handoff state
- bridge packages
- incidents
- Academy cases

Restart survival must be physically tested or reported as unproven.

## 34. Interactive-session independence
Normal research MUST continue if:
- Google/Gemini chat closes
- Codex stops
- ChatGPT closes
- browser closes
- operator logs out

Interactive sessions may inspect/control but are