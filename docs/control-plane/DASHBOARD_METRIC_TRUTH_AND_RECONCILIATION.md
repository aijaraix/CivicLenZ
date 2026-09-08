# Dashboard Metric Truth & Reconciliation

## Purpose
Every number, status, chart, funnel, badge, coverage indicator, monitoring indicator, and operational statement displayed by CivicLenZ must be derived from physical records under a versioned definition. The dashboard is a projection of canonical/operational state; it is never an independent database of truth.

This contract applies to operator/development dashboards and to aggregate metrics projected into public CivicLenZ surfaces.

## Absolute invariant
Nothing on the dashboard is a number without lineage.

If the UI says `800 Seats`, an authorized operator must be able to determine which physical Seat records produced that count, which inclusion/exclusion rules were applied, which datastore/query produced it, and when it was computed.

If the UI says `18,421 pages inspected`, that number must correspond to physical page/work-unit inspection records—not a counter increment, estimate, animation, or inferred total document length.

## MetricDefinition
Every material dashboard metric must have a versioned MetricDefinition. Minimum fields:

```text
metric_id
metric_version
display_name
description
semantic_domain
unit
source_datastore
source_entities/events
inclusion_criteria
exclusion_criteria
query_or_computation_reference
aggregation_window
reference_period/currentness rules
refresh_policy
computed_at
owner/capability
allowed_dimensions
drilldown_definition
quality/reconciliation requirements
```

Changes to metric semantics require a new version or an explicitly governed compatible revision. Do not silently change what a long-lived metric means.

## Physical backing rule
Dashboard values must derive from physical records/events such as:

- canonical Seat/Person/Occupancy/Election/CandidateCampaign records;
- extracted_unreviewed intake records;
- Evidence/Source/Retrieval records;
- Research Work Ledger jobs/reservations;
- execution trace/run/span records;
- handoff receipts;
- validation/reconciliation runs;
- monitoring checks;
- failure/exception records;
- source-health observations;
- resource telemetry.

Forbidden sources include hardcoded UI totals, `Math.random()`, fake queues, simulated workers, manually typed progress percentages, or counters with no backing event/record set.

## Drill-down requirement
Every aggregate operator metric should drill down to the records/events that generated it where technically and access-control appropriate.

Examples:

`Seats discovered: 800` -> list/filter the 800 included Seat records.

`CandidateCampaigns needing identity resolution: 22` -> the 22 unresolved records and their contradiction/identity work.

`Parser failures: 14` -> the 14 failure events grouped by source/parser/version.

`Evidence objects: 12,340` -> evidence inventory/filter with source/retrieval/currentness metadata.

A metric without a useful drill-down should be treated as suspect until its provenance is documented.

## No single completion percentage
CivicLenZ must not represent national/state/person/candidate research with one misleading `completion %`.

Coverage is multidimensional. Report applicable dimensions independently, such as:

- Seat structure;
- Occupancy;
- Election;
- CandidateCampaign;
- candidate dossier;
- GIS/boundary;
- address readiness;
- ResearchContract scopes;
- evidence;
- canonical acceptance;
- validation;
- monitoring/currentness.

A cohort may have 100% structural Seat discovery and still have significant candidate, evidence, GIS, or monitoring gaps.

## Trust-state separation
Metrics must never collapse research lifecycle states. At minimum distinguish where relevant:

- HARVESTED;
- EXTRACTED_UNREVIEWED;
- EXPORTED;
- RECEIVED_CANONICALLY;
- ACCEPTED_FOR_VALIDATION;
- NEEDS_IDENTITY_RESOLUTION;
- VALIDATED/CANONICAL state as defined by canonical policy;
- PUBLISHED where applicable.

`HTTP 200`, `parser success`, `exported`, or `bridge accepted` does not mean `VERIFIED`.

## Currentness
Dynamic dashboard metrics require explicit currentness. Store/display where useful:

```text
computed_at
data_current_as_of
reference_period
stale_after
monitoring_state
source_health_state
```

A historically correct metric can be stale for current-state use. The dashboard should communicate that distinction.

## Coverage metrics
Coverage metrics require an explicit denominator. Denominators may be:

- authoritative enumerable Seat universe;
- applicable ResearchContract scope universe;
- known CandidateCampaign universe as-of a cutoff;
- authoritative GIS layer/feature universe;
- scheduled monitoring scope.

Do not invent a denominator merely to create a percentage. If the universe is unknown, report counts and `DENOMINATOR_UNRESOLVED` rather than false coverage.

## Research-work metrics
Useful physical work metrics include:

- jobs queued/running/retryable/blocked/dead-letter/terminal;
- ResearchReservations active/expired;
- unique ResearchWorkIdentity count;
- retries separated from unique work;
- queue wait time;
- run duration;
- handoffs sent/received/acknowledged/failed.

Retries must not inflate unique research counts.

## Retrieval and extraction metrics
Only count physical events. Examples:

- sources queried;
- retrievals attempted/succeeded/failed;
- pages discovered/requested/retrieved/actually inspected;
- documents downloaded/parsed;
- API/dataset units processed;
- bytes processed;
- fact/claim/relationship candidates emitted;
- evidence objects created;
- duplicates removed;
- identity ambiguities;
- contradictions detected;
- unsupported extractions.

Do not equate document page count with pages inspected.

## Pipeline funnels
Important pipelines should expose physical funnels so loss/stalls are visible.

Example Candidate pipeline:

`filing discovered -> identity candidate -> CandidateCampaign -> campaign site -> applicable dossier scopes -> evidence package -> bridge submission -> canonical receipt -> validation/reconciliation`

Example Seat pipeline:

`Seat discovered -> Occupancy -> Election -> CandidateCampaigns -> boundary -> address-ready -> monitoring`

Every stage count derives from records. Operators must be able to inspect the delta between adjacent stages.

Large unexplained deltas create gap/exception work.

## Failure metrics
Failure dashboards should group physical Failure/Exception records by stage/category, source, agent/capability, tool/parser version, cohort, retryability, and age.

Examples:

- source unavailable;
- source rate limited;
- parser/schema drift;
- extraction failure;
- identity ambiguity/conflict;
- evidence integrity failure;
- handoff failure;
- bridge authentication/contract failure;
- canonical rejection;
- monitoring stale;
- projection reconciliation failure.

A blank profile field is not an adequate failure indicator.

## Source-health metrics
Source health should derive from actual checks/retrievals. Useful states may include HEALTHY, DEGRADED, RATE_LIMITED, SCHEMA_DRIFT, ACCESS_CHANGED, UNAVAILABLE, UNKNOWN.

Show last success, last failure, consecutive failures, latency trend, parser compatibility, and next check where useful.

Do not mark a source healthy merely because its homepage returns HTTP 200 if the required endpoint/document/parser is failing.

## Agent/capability metrics
Measure operational outcomes rather than fake intelligence scores. Examples:

- jobs handled;
- success/failure by defined terminal state;
- authoritative sources discovered;
- evidence yield;
- applicable ResearchContract scopes advanced;
- canonical rejection/needs-resolution feedback;
- duplicates;
- contradictions found;
- source/parser failures;
- deterministic vs browser/model fallback;
- resource usage.

Never use these metrics to rate political subjects. Agent performance metrics apply to system components only.

## Resource metrics
Where measurable, expose resource usage by useful dimensions:

- CPU/time;
- memory;
- disk/evidence growth;
- bytes downloaded/processed;
- browser use;
- Gemini/LLM usage;
- local-model usage;
- queue latency;
- source throttling.

The purpose is to maximize safe productive utilization and identify expensive/redundant methods, not to create artificial load.

## Monitoring dashboard
Monitoring health should show actual monitored scopes and checks. Useful summaries include:

- monitoring scopes active;
- checks due/overdue;
- stale scopes;
- sources healthy/degraded;
- changes detected;
- consecutive failures;
- generated follow-up work;
- next scheduled checks.

A heartbeat counter alone is not evidence that monitoring occurred.

## Evidence dashboard
Evidence metrics should distinguish:

- raw/preserved artifacts;
- EvidenceObjects;
- claims with at least one evidence link;
- claims with primary-source evidence;
- claims with conflicting evidence;
- stale-for-current-state evidence;
- integrity failures;
- broken original URLs with preserved artifacts available;
- precise vs generic locators.

Operators should be able to find claims whose only locator is a generic homepage and create remediation work.

## Media dashboard
Media/portrait metrics must derive from MediaAsset records and provenance states. Distinguish verified official/campaign portraits, other verified civic imagery, unresolved identity, rights/usage unresolved, stale/historical, and no valid asset.

Never count generic stock imagery as official/candidate portrait coverage.

## Dashboard Auditor
Implement a periodic Dashboard Auditor that recomputes/reconciles critical metrics against their physical backing stores.

Representative checks:

- Seat metric vs physical Seat query;
- CandidateCampaign metric vs physical records;
- Evidence metric vs EvidenceObject/artifact records;
- failed-run metric vs Failure/Run records;
- monitoring metric vs Monitoring Ledger;
- bridge accepted metric vs canonical receipt/ack records;
- public profile source count vs actual eligible evidence links.

If recomputation disagrees beyond exact/defined tolerances, create:

`PROJECTION_RECONCILIATION_FAILURE`

and mark the affected dashboard metric degraded/untrusted until reconciled.

Do not silently display a known incorrect number.

## Metric snapshot lineage
For material historical/operational reporting, optionally preserve MetricSnapshot records containing metric ID/version, value, dimensions/filters, computed_at, source currentness, query/computation version, and backing-record manifest/hash where practical.

This supports audit of what the dashboard showed at a particular time.

## UI state when metric truth is unavailable
When a metric cannot be computed reliably, show an honest state such as:

- Unavailable;
- Reconciliation required;
- Denominator unresolved;
- Data stale;
- Research in progress.

Do not substitute zero unless zero is physically proven under the metric definition.

`0` and `UNKNOWN` are different states.

## Public aggregate metrics
Public-facing totals must use the same MetricDefinitions or a governed public projection derived from them. Marketing/product copy must not advertise counts that exceed physically eligible public records.

If canonical public coverage is 1 record, a static UI must not claim 192 or 800 canonical profiles merely because staging/Harvester records exist.

## Dashboard architecture
The operator dashboard should organize truth into at least these conceptual surfaces:

### System Overview
Runtime/service health, queues, producers, canonical intake, validation, monitoring, resource health.

### Coverage
Seat/election/candidate/GIS/research/evidence/currentness dimensions by geography/cohort.

### Pipeline
Funnels, work queues, handoffs, bridge flow, validation/reconciliation stages.

### Exceptions & Monitoring
Failures, contradictions, stale scopes, dead letters, source degradation, unresolved identity/GIS, projection reconciliation failures.

### Trace Explorer
Drill from a metric/entity/job/failure into ResearchWorkIdentity, agent runs, tools, sources, retrievals, evidence, handoffs, receipts, validation, and monitoring.

These surfaces may be implemented progressively but must share the same physical truth model.

## Development visibility vs public simplicity
During development/operator testing, expose enough metric lineage to catch errors: metric ID/version, computed time, state, backing-record count, drill-down, trace/evidence links, and reconciliation state.

Public UX may simplify this considerably, but must not change the underlying semantics.

## Acceptance tests
Create automated/integration tests for representative dashboard truth properties:

1. Metric value equals physical backing query.
2. Drill-down record count equals displayed aggregate.
3. Retry attempts do not inflate unique work.
4. `UNKNOWN` does not render as zero.
5. extracted_unreviewed does not render as verified/canonical.
6. stale data visibly reports currentness state.
7. projection mismatch creates PROJECTION_RECONCILIATION_FAILURE.
8. generic/synthetic metrics are rejected.
9. pipeline funnel stages reconcile to physical records.
10. public counts do not exceed eligible canonical/public projection records.

## Continuous operation
Metric reconciliation should run without stopping productive research. A degraded metric creates remediation work while unaffected dashboards and research continue. Successful reconciliation is a checkpoint, not a global completion state.