# Failure, Exception & Monitoring Architecture

## Purpose
CivicLenZ must detect, localize, preserve, surface, retry, and learn from failures across the entire civic research lifecycle. A missing profile field, stale candidate list, wrong district mapping, silent parser drift, failed handoff, or bridge rejection must never be allowed to disappear into an unexplained blank or misleading dashboard state.

This document defines canonical failure/exception objects, monitoring guarantees, retry/dead-letter behavior, escalation, source health, operator visibility, and Academy feedback.

## Core invariant
For every material failure or degraded result, CivicLenZ should be able to answer:

- What failed?
- Where in the pipeline did it fail?
- Which ResearchWorkIdentity/job/trace/run was affected?
- Which agent/capability/tool/parser/source was involved?
- What data entered the stage?
- What data left the stage?
- Was anything lost?
- Is the failure retryable?
- What was retried and when?
- Is downstream state safe/idempotent?
- What remains incomplete/stale?
- Who/what owns the next action?
- Is unrelated work still running?
- Has this failure pattern occurred before?
- What can Academy improve?

## Failure is data
Failures are first-class persistent records, not only log lines. Logs may contain diagnostic detail, but operational truth must survive log rotation and process restarts.

Suggested FailureEvent fields:

```text
failure_id
failure_category
severity
retryability
trace_id
run_id
job_id
research_work_identity
research_reservation_id
producer_id
agent_id
capability_id
tool_id
adapter_or_parser_id
source_id
retrieval_id
handoff_id
canonical_receipt_id
subject_entity_ids
research_scope
cohort
first_occurred_at
last_occurred_at
attempt_count
safe_error_code
safe_error_summary
upstream_state
downstream_state
data_loss_state
next_action
owner_capability
resolved_at
resolution_type
superseded_by
```

Never store secrets/authentication material in failure details.

## Canonical failure taxonomy
Normalize failures into stable categories. The implementation may add subcodes, but top-level categories should include at least:

### Work/control plane
- WORK_ASSIGNMENT_FAILURE
- RESERVATION_CONFLICT
- LEASE_EXPIRED
- DUPLICATE_WORK_SUPPRESSED
- RESOURCE_GOVERNOR_THROTTLE

### Source discovery/access
- SOURCE_NOT_FOUND
- SOURCE_ACCESS_DENIED
- SOURCE_RATE_LIMITED
- SOURCE_UNAVAILABLE
- SOURCE_MOVED
- ROBOTS_OR_POLICY_BLOCK

### Transport/retrieval
- DNS_FAILURE
- TLS_FAILURE
- NETWORK_TIMEOUT
- HTTP_FAILURE
- RETRIEVAL_INTEGRITY_FAILURE
- DOWNLOAD_TRUNCATED

### Parsing/extraction
- PARSER_FAILURE
- SCHEMA_DRIFT
- DOCUMENT_EXTRACTION_FAILURE
- EXTRACTION_FAILURE
- UNSUPPORTED_FORMAT
- LOW_INFORMATION_YIELD

### Identity/semantic
- IDENTITY_AMBIGUITY
- IDENTITY_CONFLICT
- SEAT_OCCUPANCY_CONFLICT
- ELECTION_SEMANTICS_CONFLICT
- BOUNDARY_CONFLICT
- CONTRADICTION_DETECTED

### Evidence
- EVIDENCE_MISSING
- EVIDENCE_LOCATOR_INSUFFICIENT
- EVIDENCE_HASH_MISMATCH
- EVIDENCE_ARTIFACT_UNAVAILABLE
- GENERIC_SOURCE_REMEDIATION_REQUIRED

### Handoff/queue
- HANDOFF_FAILURE
- HANDOFF_NOT_ACKNOWLEDGED
- QUEUE_PUBLISH_FAILURE
- QUEUE_CONSUME_FAILURE
- DEAD_LETTERED

### Bridge/canonical
- BRIDGE_AUTH_FAILURE
- BRIDGE_CONTRACT_MISMATCH
- BRIDGE_RETRY_LATER
- CANONICAL_INTAKE_FAILURE
- CANONICAL_CONFLICT
- CANONICAL_REJECTION
- NEEDS_IDENTITY_RESOLUTION
- NEEDS_MORE_EVIDENCE

### Persistence/monitoring/projection
- PERSISTENCE_FAILURE
- MONITORING_CHECK_FAILURE
- MONITORING_STALE
- SOURCE_HEALTH_DEGRADED
- PROJECTION_RECONCILIATION_FAILURE
- PUBLICATION_GATE_FAILURE

`DUPLICATE_WORK_SUPPRESSED`, `NEEDS_IDENTITY_RESOLUTION`, or `BRIDGE_RETRY_LATER` may be expected operational outcomes rather than defects; preserve them distinctly from unexpected errors.

## Failure localization
Record the narrowest known failing stage. Avoid generic `research failed` when the actual failure is known to be, for example, `Florida DOS adapter schema drift on pagination page 4` or `handoff from candidate discovery to campaign-site research not acknowledged`.

The execution lineage contract must make it possible to compare stage inputs/outputs and identify where records disappeared or changed unexpectedly.

## Data-loss state
Every failure should classify data safety where relevant:

- NO_DATA_LOSS_CONFIRMED
- DURABLY_STAGED
- PARTIAL_OUTPUT_PRESERVED
- POSSIBLE_DATA_LOSS
- DATA_LOSS_CONFIRMED
- NOT_APPLICABLE

Possible/confirmed data loss is high priority and must create remediation/reconciliation work.

## Retryability
Classify failures as:

- RETRY_IMMEDIATELY
- RETRY_WITH_BACKOFF
- RETRY_AFTER_SOURCE_WINDOW
- RETRY_AFTER_DEPENDENCY
- REQUIRES_DIFFERENT_TOOL
- REQUIRES_IDENTITY_RESOLUTION
- REQUIRES_HUMAN_ACTION
- TERMINAL_FOR_SCOPE

Do not endlessly retry terminal failures.

## Retry policy
Retries preserve original ResearchWorkIdentity/trace lineage and increment attempts; they do not create fake unique-work counts.

Use bounded exponential backoff/jitter for transient network/service failures and respect `Retry-After` where supplied. Source-specific policies may use slower cadence for repeated failures.

A retry may change execution strategy (deterministic adapter -> browser fallback, for example) when allowed; record the strategy change.

## Dead-letter handling
Work enters dead-letter/terminal review when bounded retries are exhausted or the failure requires explicit remediation.

Dead-letter records must retain:

- original work identity;
- all attempts;
- last failure;
- preserved partial outputs/evidence;
- retry history;
- source/tool versions;
- recommended remediation;
- owner capability;
- age/priority.

Dead-letter does not mean delete.

## Handoff failures
Every material handoff is receipt-based. Detect:

- sender produced payload but receiver never received it;
- receiver received but did not acknowledge;
- record counts/manifests differ unexpectedly;
- payload hash changed unexpectedly;
- downstream rejected schema/version;
- duplicate handoff was safely suppressed.

Handoff reconciliation jobs should compare sender/receiver manifests and repair safely/idempotently.

## Bridge failures
CivicsLenZz/HERMES bridge outcomes must remain explicit:

- authentication failure;
- contract/version mismatch;
- retry/backpressure;
- duplicate;
- needs identity resolution;
- needs more evidence;
- partial acceptance;
- canonical conflict;
- terminal policy/schema rejection.

A producer retains RESULT_READY/retryable packages durably until canonical acknowledgment or terminal disposition. Canonical HERMES never treats transport success as civic verification.

## Source health model
Maintain SourceHealth state per relevant endpoint/source family, not merely domain homepage.

Suggested fields:

```text
source_id
endpoint_or_scope
health_state
last_check
last_success
last_failure
consecutive_failures
latency_summary
http/access_state
schema_fingerprint
parser_compatibility
rate_limit_state
content_change_state
next_check
active_incident_id
```

Useful states:

- HEALTHY
- DEGRADED
- RATE_LIMITED
- SCHEMA_DRIFT
- ACCESS_CHANGED
- UNAVAILABLE
- UNKNOWN

A homepage HTTP 200 cannot make a failing candidate docket/API/GIS layer `HEALTHY`.

## MonitoringScope
Monitoring is defined per dynamic scope, not per Person globally. Suggested fields:

```text
monitoring_scope_id
subject_type
subject_id
domain
source_ids
capability_id
last_checked
current_as_of
last_change_at
last_change_hash
next_check
stale_after
monitoring_state
consecutive_failures
priority/event sensitivity
```

Domains may include occupancy, candidate filing, election status, campaign finance, votes, legislation, promises/statements, disclosures, social/official sources, public money, relationships, boundaries, source health, and community datasets.

## Monitoring states
Use explicit states such as:

- MONITORING_ACTIVE
- CHECK_DUE
- CHECK_RUNNING
- CURRENT_AS_OF
- CHANGE_DETECTED
- STALE
- DEGRADED
- BLOCKED
- SOURCE_UNAVAILABLE
- CAPABILITY_NOT_IMPLEMENTED
- MONITORING_PAUSED_BY_POLICY

No global `complete` state exists for evolving civic subjects.

## Event-first monitoring
Prefer event-driven work where authoritative events/feeds/change signals exist:

- new candidate filing -> candidate pipeline;
- new bill/vote -> legislative pipeline;
- finance filing -> finance pipeline;
- new boundary version -> GIS reconciliation;
- new contract/grant/audit -> public-resource/oversight pipeline;
- source content hash change -> targeted re-extraction.

Heartbeats/backstop sweeps detect missed events, stale scopes, source health, and queue/service failures. Do not repeatedly refetch unchanged data at maximum frequency merely to show activity.

## Cadence policy
Cadence depends on domain and lifecycle. Examples:

- candidate filing/qualification near deadlines: high frequency;
- election results/certification: event/high frequency during election window;
- legislative votes during session: event-driven/frequent;
- campaign finance: aligned to filing/report periods plus event checks;
- campaign sites/social: change detection with source-aware limits;
- occupancy rosters: periodic plus vacancy/election triggers;
- boundaries: version/source-change monitoring;
- static biography: lower frequency unless contradiction/new evidence appears.

The Resource Governor balances urgency, source limits, backlog, and host headroom.

## Staleness
Every dynamic scope should define `stale_after` or an equivalent currentness policy. When exceeded without a successful check, state becomes STALE even if the last known value may still be correct.

Do not silently continue presenting stale current-state facts as freshly verified.

## Change detection
Monitoring checks should preserve previous/new state hashes or comparable normalized state, classify the change, and generate targeted follow-up work.

Examples:

- officeholder changed;
- candidate filed/qualified/withdrew;
- campaign page changed;
- finance filing posted;
- vote recorded;
- boundary geometry/version changed;
- source schema changed.

Historical state remains preserved.

## Contradiction monitoring
Some changes are contradictions rather than simple updates. If two authoritative/current sources disagree, create a contradiction incident and reconciliation work rather than selecting the newest/most convenient source automatically.

## Incident model
Related failures may be grouped into an Incident when they share a root cause, such as one government portal outage or parser schema change affecting thousands of jobs.

Suggested Incident fields:

```text
incident_id
category
source/tool/service
started_at
last_seen_at
status
severity
affected_work_count
affected_subject_count
root_cause_state
mitigation
resolution
academy_followup
```

This prevents 10,000 identical failures from appearing as 10,000 unrelated problems.

## Cascading failure protection
Detect dependency failures and avoid wasteful downstream execution. Example: if an authoritative source is confirmed unavailable, pause/reduce dependent jobs according to policy rather than generating thousands of identical retries.

Do not allow one degraded source/agent to stop unrelated sources/domains/cohorts.

## Circuit breakers
For repeated systemic failures, use bounded circuit-breaker behavior where appropriate:

CLOSED -> normal execution
OPEN -> suppress repeated calls temporarily after threshold
HALF_OPEN -> limited probes
CLOSED -> recover after successful probes

Circuit state must be visible and source/capability-specific.

## Operator Exceptions & Monitoring surface
The operator dashboard should expose actionable views such as:

- active incidents;
- failures by category/stage;
- dead-letter work;
- retry backlog;
- stale critical scopes;
- degraded/unavailable sources;
- parser/schema drift;
- identity conflicts;
- Seat/Occupancy conflicts;
- election semantics conflicts;
- boundary conflicts;
- evidence integrity failures;
- bridge failures;
- canonical rejections;
- projection reconciliation failures;
- monitoring due/overdue;
- recent changes detected.

Every aggregate drills to physical records/traces.

## Trace-to-failure navigation
From a failure, an operator should be able to inspect:

ResearchWorkIdentity -> job -> agent run -> tool -> source/retrieval -> work unit -> extraction -> evidence -> handoff -> downstream receipt/state.

From a missing/stale profile field, operator tooling should be able to find the applicable ResearchContract scope and determine whether it is not started, running, failed, blocked, unresolved, stale, or awaiting validation.

## Alerting policy
Not every failure deserves a human notification. Route alerts based on severity, duration, blast radius, data-loss risk, election urgency, and whether autonomous remediation exists.

Examples likely to warrant escalation:

- confirmed/possible data loss;
- canonical integrity failure;
- widespread bridge outage;
- evidence hash mismatch;
- all monitoring stopped;
- critical election source unavailable near deadline;
- persistent projection reconciliation failure;
- authentication/security anomaly.

Routine transient retries should remain visible without overwhelming operators.

## Human-only gates
`REQUIRES_HUMAN_ACTION` must identify the smallest exact action needed. One blocked scope does not stop unrelated safe work.

Do not ask humans to resolve failures that the system can safely retry/reconcile autonomously.

## Recovery verification
A failure is not resolved merely because an error stops appearing. Verify recovery physically:

- source succeeds again;
- parser produces expected schema;
- handoff acknowledged;
- queue drains appropriately;
- monitoring currentness restored;
- bridge acknowledgment succeeds;
- dashboard reconciles;
- affected stale/gap work is regenerated where required.

Then close the FailureEvent/Incident with a resolution record.

## Reboot/restart resilience
Persistent jobs, RESULT_READY bridge packages, failures, monitoring schedules, incidents, and dead-letter work must survive process/server restart. Reboot tests should verify recovery without duplicate civic work or lost evidence.

## Academy feedback
Feed normalized failures/incidents into Academy. Examples:

- repeated schema drift -> source-specific drift detector/test fixture;
- repeated browser fallback -> deterministic adapter proposal;
- identity mismatch -> stronger entity consistency checks;
- generic evidence locators -> locator-quality remediation;
- duplicate research -> ResearchWorkIdentity improvement;
- repeated rate limits -> cadence/concurrency tuning;
- recurring handoff mismatch -> manifest/contract improvement.

Academy changes must be tested/regression-verified before promotion.

## Failure metrics
Dashboard metrics must derive from FailureEvents/Incidents, not logs alone. Useful measures include failure count/rate, retry success, dead-letter age, mean time to recovery, stale-scope count, source degradation, handoff loss, canonical rejection reasons, and incident blast radius.

Do not optimize these numbers by suppressing failure records.

## Monitoring assurance audit
Periodically audit monitoring guarantees. For sampled scopes verify:

- expected source exists;
- last check physically occurred;
- next check is scheduled;
- currentness/staleness is correct;
- change detector works;
- failures create visible events;
- follow-up work is generated;
- dashboard state matches ledger state.

Failures of the monitoring system itself create monitoring-assurance exceptions.

## Public UX
Public users generally should not see internal failure codes. Translate them into neutral useful states such as `Research in progress`, `Source temporarily unavailable`, `Conflicting records under review`, or `Last checked ...` while preserving internal detail for operators.

Never convert operational uncertainty into a confident civic assertion.

## Continuous operation
Failure handling and monitoring are part of normal operation. A failure is not automatically a project stopping condition. Persist it, localize it, remediate/retry appropriately, continue unrelated eligible work, verify recovery, feed learning into Academy, and continue.