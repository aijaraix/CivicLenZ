# CivicLenZ Research Work Ledger, Scheduler & Backlog Execution Contract

## 1. Purpose
This document defines the mandatory execution contract that keeps CivicLenZ continuously alive as an autonomous research organization. It specifies how research needs become durable work, how work is identified, prioritized, reserved, scheduled, dispatched, retried, persisted, monitored, reconciled and completed or re-opened over time.

It applies to canonical CivicLenZ/HERMES, OpenClaw, Cloudflare execution components, producer systems including CivicsLenZz, deterministic collectors, browser/model workers, monitoring, Gap Detector, Academy/evolution and future compatible runtime implementations.

This contract complements the Master Autonomous Research Operating Contract, Subject Research Enrichment and Completeness Contract, Agent Runtime Topology/Handoff/Tool Authority, Worker Catalog and ResearchContracts, HERMES/OpenClaw Runtime, Data/Evidence/Verification and all observability/monitoring/producer contracts.

## 2. Core doctrine
1. CivicLenZ is backlog-driven, not prompt-driven.
2. The persistent scheduler/orchestrator, not Google/Codex/ChatGPT, decides what eligible work runs next under canonical policy.
3. Every applicable missing/stale/conflicting research scope must either have durable work, a current-with-evidence state, an explicit unresolved/dependency state or a policy-defined not-applicable state.
4. A blank field without a reason/work item is a system defect.
5. A registered capability is not useful unless real backlog can reach it.
6. One blocked job must not prevent unrelated eligible work from being dispatched.
7. Research completion is temporal; dynamic scopes can become stale and re-enter backlog.
8. Work must survive interactive-session closure and ordinary supervised restarts.
9. Metrics must derive from persisted physical events, never synthetic activity.

## 3. Required objects
The execution plane must physically represent at least:

### 3.1 ResearchNeed
A normalized statement that a subject/scope requires work.
Fields should include:
- research_need_id
- subject_type
- subject_id
- ResearchContract ID/version
- scope_id
- reason (`MISSING`, `STALE`, `CONFLICTING`, `EVIDENCE_DEFICIENT`, `MONITORING_DUE`, `FRONTIER`, `CANONICAL_REQUEST`, `RETRY`, `ACADEMY_REMEDIATION`, etc.)
- priority inputs
- created_at
- discovered_by
- current state

### 3.2 ResearchWorkIdentity
A deterministic identity used to suppress redundant work. It should incorporate, as applicable:
- subject
- research scope
- office/seat/election/cycle context
- dataset/reference period
- source scope
- contract version
- purpose/currentness window

### 3.3 ResearchReservation / Lease
A durable reservation preventing duplicate concurrent work.
Fields include:
- reservation_id
- work_identity
- worker/service
- leased_at
- expires_at
- heartbeat/renewal
- state

### 3.4 Job
A schedulable unit of work linked to one ResearchNeed and ResearchWorkIdentity.
Fields include:
- job_id
- subject/scope
- capability owner
- queue
- priority
- dependencies
- eligible_at
- attempt count
- state
- created/started/completed timestamps
- result/handoff/evidence refs

### 3.5 Attempt / Run
Each execution attempt is separate and immutable enough for audit.
Track:
- attempt_id/run_id
- worker/runtime identity
- trace_id
- started/ended
- tool/source selection
- physical retrieval/result stats
- failure class
- retry decision
- resource usage

### 3.6 Dependency
Explicit work dependency. No implicit serialization.
Track:
- upstream job/scope
- downstream job/scope
- dependency type
- satisfied state
- reason

### 3.7 MonitoringSchedule
Persistent due-time state for dynamic scopes.

### 3.8 DeadLetter / Exception
Durable unresolved terminal/retry-exhausted work.

## 4. Work-generation sources
ResearchNeeds may be created by:
- subject discovery
- ResearchContract completeness comparison
- Gap Detector
- source change detection
- monitoring due-time
- contradiction detection
- finite-dataset reconciliation gaps
- canonical HERMES assignment
- producer handoff feedback
- election/calendar events
- vacancy/occupancy events
- boundary version change
- stale evidence/currentness
- failure retry
- Academy-approved remediation
- operator-approved bounded request

Interactive prompts may initiate a legitimate ResearchNeed but must not bypass durable work creation.

## 5. Subject fan-out
When a new researchable subject is created, the system MUST evaluate all applicable ResearchContract scopes.

For each scope, produce one of:
- `CURRENT_WITH_EVIDENCE`
- `NOT_APPLICABLE`
- explicit unresolved/dependency state
- durable ResearchNeed/job

No subject may enter the system with applicable unclassified research scopes.

## 6. Scheduler heartbeat and cadence
The scheduler must run independently of interactive sessions.

Implementation may use event-driven wakeups plus frequent polling. For low-latency local/runtime work, a scan interval on the order of seconds (for example 5–15 seconds) may be appropriate, but the exact cadence must be controlled by resource/load policy rather than hard-coded globally.

Persist/expose:
- last scheduler heartbeat
- last eligibility scan
- last job created
- last dispatch
- next wakeup
- eligible backlog count
- blocked backlog count
- starved capability count

## 7. Eligibility
A job is eligible when:
- required dependencies are satisfied
- eligible_at <= now
- no conflicting active reservation exists
- source/policy gates permit execution
- worker/capability is available
- Resource Governor permits dispatch

Blocked work remains durable with a machine-readable reason.

## 8. Priority model
Priority must be explicit and reproducible. Inputs may include:
- canonical HERMES priority
- election/event urgency
- active candidate/election stage
- monitoring deadline
- staleness severity
- evidence deficiency
- contradiction severity
- research-scope gap
- frontier/cohort priority
- queue age
- source availability window
- finite dataset deadline
- operator escalation
- resource cost
- Academy remediation urgency

Do not use political preference, partisan considerations or unsupported subjective importance.

## 9. Work-conserving behavior
If eligible work exists and allowed capacity is available, useful work should be dispatched.

If workers are idle while eligible backlog exists, the system must be able to explain why via:
- dependency gate
- Resource Governor
- source health/rate limit
- permission/tool unavailability
- queue/routing defect
- worker liveness defect

Otherwise create a scheduler/starvation exception.

## 10. Fairness across research domains
Do not let one high-volume domain permanently starve others.

Resource allocation should balance:
- structural discovery
- first-pass enrichment
- deep dossiers
- active election/candidate work
- monitoring/currentness
- GIS/address work
- evidence repair
- contradiction/root-cause work
- Academy remediation
- frontier expansion

Quota/weighted scheduling may be used where needed.

## 11. Deep-research backlog
Maintain real backlog counts by research domain, not only total jobs.

At minimum support backlog metrics for:
- identity
- biography
- education
- career
- prior offices
- election history
- campaign website
- platform/promises
- campaign finance
- disclosures
- legislation
- votes
- committees
- executive/government activity
- public statements
- relationships
- lobbying/PAC
- contracts/grants
- GIS/boundary
- constituency
- public resources
- media
- monitoring

## 12. Queue states
Recommended semantic states:
- CREATED
- QUEUED
- ELIGIBLE
- RESERVED
- RUNNING
- WAITING_DEPENDENCY
- WAITING_SOURCE
- RETRY_SCHEDULED
- COMPLETED
- PARTIAL
- UNRESOLVED
- CONFLICTING
- DEAD_LETTER
- CANCELLED
- SUPERSEDED

Exact storage literals may adapt to live schema, but these semantics must remain distinguishable.

## 13. Reservation and duplicate suppression
Before material execution, obtain a reservation/lease on ResearchWorkIdentity.

Rules:
- only one active reservation per equivalent work identity unless policy explicitly permits parallel sharding
- retries reuse identity lineage
- monitoring iterations may create distinct executions tied to same scope
- expired leases are recoverable
- process death must not create permanent lock

## 14. Concurrency
Concurrency is governed at multiple layers:
- global runtime
- worker class
- source/domain
- model/browser pool
- database/queue
- subject/scope where collision risk exists

Resource Governor enforces limits while scheduler remains work-conserving.

## 15. Source-aware throttling
Per-source controls may include:
- max concurrency
- requests/time window
- Retry-After
- backoff
- circuit breaker
- health state

A degraded source should not globally pause unrelated sources/capabilities.

## 16. Worker dispatch contract
A dispatched job must include enough context to execute without relying on chat history:
- job_id
- ResearchWorkIdentity
- subject/context identifiers
- ResearchContract scope
- capability_id
- source/tool authority
- expected output schema
- evidence requirements
- currentness/reference period
- dependency context
- retry/timeout policy
- trace context

## 17. Execution completion
A job may be considered successfully completed only when required outputs are persisted and required handoff/acknowledgment semantics are satisfied.

For evidence-producing jobs this generally means:
- physical retrieval/execution occurred
- extraction/result persisted
- evidence/locator references persisted
- coverage state updated
- handoff receiver acknowledged where required

A function returning without persistence is not durable completion.

## 18. Partial and unresolved outcomes
Jobs must support truthful non-success outcomes such as:
- source checked; no eligible data found
- data found but identity unresolved
- partial finite-dataset coverage
- document inaccessible
- conflicting authoritative sources
- public data not available

Do not convert inability to find data into a negative fact.

## 19. Retry model
Retry decisions must be based on failure class.

Retryable examples:
- transient network failure
- 429/rate limit
- temporary 5xx
- expired auth refreshed by approved mechanism
- worker crash

Non-retry/needs-remediation examples:
- schema incompatibility
- invalid identity
- permanent policy rejection
- unsupported source format
- malformed contract

Retries use bounded exponential backoff/jitter and persist next eligible time.

## 20. Dead-letter and escalation
After bounded retries or terminal failure, create a durable dead-letter/exception with:
- job/work identity
- failure class
- first/last failure
- attempts
- source/tool
- data-loss flag
- unresolved outputs
- recommended next action
- responsible capability

Dead-letter items remain visible to operator/Academy and may generate remediation ResearchNeeds.

## 21. Failure isolation
The scheduler must continue dispatching unrelated eligible work when one job/scope/source fails.

Required:
- one job failure does not stop subject
- one scope failure does not stop sibling scopes
- one subject failure does not stop cohort
- one source failure does not stop other sources
- bridge outage does not stop producer research
- canonical validation outage does not stop extracted_unreviewed harvesting

## 22. Starvation detection
For every capability compute:
- eligible backlog
- queued backlog
- recent jobs received
- recent completions
- oldest eligible work

If eligible backlog remains > 0 beyond capability service expectation with no justified dispatch, create `AGENT_STARVATION_EXCEPTION`.

## 23. Queue-stall detection
Detect conditions including:
- queue depth increasing with zero completions
- running jobs with expired leases
- repeated reservation failures
- handoff backlog not consumed
- retry queue never re-entering eligibility
- one queue monopolizing resources

Create operator-visible incidents and continue unaffected queues.

## 24. Monitoring-generated work
Monitoring is a first-class work producer.

At due time:
- create/resolve monitoring job
- retrieve authoritative source
- compare current state/hash
- persist changed/no-change event
- update current_as_of/last_checked/next_check
- create follow-up ResearchNeeds when material change detected

No-change still counts as monitoring execution, not new fact extraction.

## 25. Event-triggered cascading work
Examples:
- new candidate filing -> CandidateCampaign + campaign-source + finance work
- vacancy -> Occupancy + Election/special-election research
- new vote -> vote + promise/action linkage work
- new disclosure -> disclosure + relationship work
- boundary update -> GIS + address reconciliation
- new campaign site -> platform/promise/media research

Events must create durable downstream work rather than session-local subroutines.

## 26. Finite-dataset reconciliation
For enumerable universes, scheduler must support sharded/batched work with explicit expected-unit reconciliation.

Track:
- expected units
- queued
- retrieved
- parsed
- persisted
- failed
- missing
- reconciled cutoff

Examples: candidate filings, votes, finance reports, disclosures, executive orders, election results.

## 27. Open-ended research
For non-enumerable domains, work generation follows source-family coverage/currentness standards rather than false exhaustive completion.

Examples: biography, public statements, relationships, campaign platform.

Persist source families attempted, successful evidence, unresolved gaps and next-check logic.

## 28. Backlog burn-down
Operator metrics must distinguish:
- new ResearchNeeds created
- jobs created
- jobs completed
- gaps closed
- new gaps discovered
- current scopes advanced
- deep dossiers advanced
- stale scopes refreshed

High job volume without backlog reduction is not success.

## 29. Historical versus current work
Historical research and current-state monitoring are separate.

A scope may be historically researched while requiring current-state refresh.

Scheduling must consider valid-time and currentness policy.

## 30. Academy integration
Academy consumes real scheduler/runtime outcomes such as:
- queue latency
- failure patterns
- source drift
- parser failures
- duplication
- starvation
- retries
- resource usage
- low evidence yield
- canonical rejection feedback

Academy may propose changes to parser/routing/cadence/resource policy but changes must be tested and governed before promotion.

## 31. Producer backlog behavior
Producer systems such as CivicsLenZz may maintain their own durable backlog while canonical HERMES intake is unavailable.

Rules:
- continue independent eligible research
- persist extracted_unreviewed results
- package idempotently
- retry bridge delivery according to policy
- do not self-validate
- do not discard ready packages

## 32. Canonical intake feedback as work
Canonical acknowledgments may generate producer/canonical ResearchNeeds:
- `NEEDS_IDENTITY_RESOLUTION`
- `NEEDS_MORE_EVIDENCE`
- `CANONICAL_CONFLICT`
- `PARTIALLY_ACCEPTED`
- `RETRY_LATER`

These must become durable work or retry states, not ephemeral log messages.

## 33. Persistence boundary
Required execution state must not rely solely on memory. Use approved durable state for:
- jobs
- work identities
- leases
- retries
- dependencies
- monitoring schedules
- dead letters
- handoffs
- bridge backlog
- coverage/gaps

## 34. Restart recovery
On supervised restart:
- identify expired leases
- requeue recoverable work
- preserve completed work
- reconstruct due monitoring
- resume retries
- preserve dead letters
- preserve bridge backlog

No duplicate active work should be generated merely because a process restarted.

## 35. Session-independence proof
A conforming runtime must demonstrate an observation interval in which:
- interactive AI/manual execution is not used to invoke individual research jobs
- scheduler heartbeat advances
- eligible jobs are created/dispatched automatically
- workers retrieve real sources
- results/evidence persist
- monitoring advances

If this cannot be proven, runtime autonomy is unproven.

## 36. Physical activity accounting
Scheduler/runtime metrics must come from persisted events:
- jobs created/started/completed
- reservations
- retrievals
- bytes
- pages/documents/API units
- claims/relationships/evidence
- retries/failures
- handoffs
- monitoring checks
- Academy observations

Do not synthesize activity counters.

## 37. Service-level expectations
Each capability should declare expected service timing, e.g.:
- high-urgency election monitoring: minutes/hours as appropriate
- ordinary dynamic official state: daily or event-driven
- finance filing cadence: source/event aligned
- static biography: longer refresh cadence

No single global cadence applies to all research.

## 38. Security
Scheduler/work ledger must enforce:
- least-privilege service identity
- authenticated queue/service access
- no secrets in job payloads unless explicitly encrypted/authorized
- no secrets in logs/telemetry
- producer/canonical permission separation
- no worker self-escalation
- audit logging for privileged control actions

## 39. Operator controls
Operators may:
- pause/resume bounded queues/capabilities
- reprioritize authorized work
- inspect/retry dead letters
- quarantine a source/parser
- request bounded research
- approve governed remediations

Operators should not need to manually trigger normal next-job progression.

## 40. Operator dashboard truth
Expose at least:
- scheduler heartbeat
- queued/running/retrying/dead-letter counts
- eligible backlog
- oldest eligible job
- worker/capability liveness
- starvation exceptions
- queue throughput
- deep research backlog by scope
- monitoring due/stale/failed
- bridge-ready/waiting packages
- recent failures
- recent gaps closed

Metrics must be drillable to underlying jobs/events.

## 41. Acceptance criteria — scheduler alive
Scheduler is operational only if physically proven to:
- run persistently
- scan/receive work independently of chat
- detect eligible work
- dispatch within policy
- respect dependencies and reservations
- remain work-conserving
- isolate failures
- persist/recover state

## 42. Acceptance criteria — backlog execution
Backlog execution is operational only if:
- real subject/scope gaps become jobs
- jobs reach intended capabilities
- physical research occurs
- results persist
- coverage changes
- failed scopes remain represented
- sibling work continues
- monitoring reopens stale scopes

## 43. Acceptance criteria — no orphan gaps
For every applicable ResearchContract scope one must be true:
- current with sufficient evidence
- queued/running/retrying
- partial/unresolved/conflicting with next action
- blocked with explicit dependency/policy reason
- not applicable

An unexplained blank is a contract violation.

## 44. Conformance report
Google/CivicsLenZz and canonical Codex/HERMES must be able to report separately:
- ledger persistence
- scheduler process/runtime
- heartbeat
- eligible backlog
- queue states
- capability queue mapping
- starvation exceptions
- deep research backlog by scope
- recent automatic jobs/retrievals/evidence
- monitoring-generated jobs
- retry/dead-letter state
- restart recovery proof
- session-independence proof

## 45. Final directive
The work ledger and scheduler exist to turn civic knowledge gaps into continuous physical research.

The required cycle is:

```text
DISCOVER SUBJECT/CHANGE/GAP
        -> CLASSIFY RESEARCH NEED
        -> CREATE RESEARCH WORK IDENTITY
        -> RESERVE
        -> PRIORITIZE
        -> SCHEDULE
        -> ROUTE
        -> EXECUTE
        -> RETRIEVE
        -> PRESERVE / EXTRACT
        -> HAND OFF
        -> UPDATE COVERAGE
        -> MONITOR
        -> REOPEN WHEN STALE/CHANGED
        -> NEXT ELIGIBLE WORK
```

No interactive AI session, passing test suite, capability registry, one-time proof object or manual button may substitute for this continuous persistent loop.
