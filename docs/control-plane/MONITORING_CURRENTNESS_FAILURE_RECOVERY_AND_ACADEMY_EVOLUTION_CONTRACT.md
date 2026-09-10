# CivicLenZ Monitoring, Currentness, Failure Recovery & Academy Evolution Contract

## 1. Purpose
This document defines the mandatory continuous-operation contract for monitoring, freshness, change detection, failure isolation, retries, recovery, incident handling, source health, worker starvation, re-research, and Academy/evolution across CivicLenZ and compatible producer systems.

It exists to ensure that research does not stop after first-pass collection and that one failure does not silently freeze unrelated work.

This contract applies to HERMES Prime, canonical workers, producer systems including CivicsLenZz, monitoring services, schedulers, queues, source adapters, parsers, model-assisted workers, browser workers, evidence systems, Gap Detector, validation, publication projection, operator observability and Academy.

## 2. Core operating doctrine
Civic facts change. Therefore no dynamic subject or scope is permanently complete.

The mandatory lifecycle is:

```text
MISSING
 -> RESEARCH
 -> CURRENT_WITH_EVIDENCE
 -> MONITOR
 -> CHANGE | STALE | FAILURE
 -> RESEARCH/REVALIDATE
 -> CURRENT_WITH_EVIDENCE
 -> MONITOR
 -> REPEAT
```

A valid historical fact may remain historically valid while no longer being current.

## 3. Monitoring is a first-class producer of work
Monitoring MUST create durable work when it detects or suspects material change.

Monitoring is not merely a dashboard heartbeat.

A monitoring check can result in:
- NO_CHANGE
- CHANGE_CANDIDATE
- SOURCE_DEGRADED
- SOURCE_UNAVAILABLE
- SCHEMA_DRIFT
- IDENTITY_CHANGE_CANDIDATE
- TEMPORAL_CHANGE_CANDIDATE
- EVIDENCE_REVALIDATION_REQUIRED
- RESEARCH_SCOPE_STALE
- CONTRADICTION_CANDIDATE

Each non-trivial result must have a defined next action.

## 4. Monitoring scope
Monitoring is attached to specific subjects/scopes/sources, not only to whole projects.

Examples:
- current occupancy for Seat X
- candidate status for Election Y
- campaign finance reporting for CandidateCampaign Z
- roll-call activity for legislative Person P
- disclosure filings for Person P
- committee assignment for Occupancy O
- campaign website content for CandidateCampaign C
- official roster for chamber R
- boundary layer version for district D
- source endpoint health for Source S

## 5. Required monitoring fields
Each monitoring scope should persist, where applicable:
- monitoring_scope_id
- subject_id
- ResearchContract scope
- source_id(s)
- capability owner
- cadence policy
- last_checked
- current_as_of
- next_check
- stale_after
- previous fingerprint/hash
- current fingerprint/hash
- last_change_at
- last_change_type
- consecutive_failures
- source_health state
- current monitoring state
- next action

## 6. Monitoring states
At minimum distinguish:
- NOT_CONFIGURED
- CONFIGURED
- DUE
- RUNNING
- CURRENT
- CHANGE_DETECTED
- STALE
- DEGRADED
- RETRYING
- FAILED
- BLOCKED_BY_DEPENDENCY
- SOURCE_UNAVAILABLE
- DISABLED_BY_POLICY

Exact schema literals may differ, but the semantics must remain distinguishable.

## 7. Domain-specific cadence
Cadence MUST reflect how quickly a fact can change.

Examples:
- election/candidate status: high cadence near statutory deadlines/election events
- campaign finance: cadence aligned to reporting schedules plus event checks
- current chamber rosters: frequent enough to catch vacancies/resignations
- votes/legislation: aligned to sessions/meeting activity
- campaign websites/social: moderate/event-aware cadence
- biography/education: low cadence unless new evidence appears
- boundaries: low cadence plus redistricting/event triggers
- source health: operational cadence based on source importance

Do not assign one global cadence to every domain.

## 8. Event-first monitoring
Where reliable events/webhooks/feed/version markers exist, prefer event-first monitoring with heartbeat as backstop.

Polling remains acceptable where events do not exist.

## 9. Change detection
Change detection MUST compare meaningful source state, not only HTTP status.

Possible fingerprints:
- raw artifact SHA-256
- normalized DOM/section fingerprint
- API record/version cursor
- row count/record IDs
- GIS layer/version hash
- filing list/reporting period
- source-provided ETag/Last-Modified

A source returning HTTP 200 does not mean relevant content is unchanged or healthy.

## 10. Change candidate versus canonical change
A detected difference creates a change candidate.

Default path:

```text
CHANGE DETECTED
 -> RETRIEVE/PRESERVE
 -> EXTRACT
 -> EVIDENCE
 -> VALIDATE/RECONCILE
 -> SUPERSEDE CURRENT STATE IF APPROVED
 -> UPDATE PROJECTION
 -> CONTINUE MONITORING
```

Monitoring MUST NOT silently rewrite canonical truth unless a narrowly defined deterministic promotion rule explicitly permits it.

## 11. Staleness
A scope becomes stale when its currentness policy is exceeded or when a material upstream dependency changes.

Staleness MUST be explicit.

Do not continue showing stale data as current without an appropriate stale/currentness indicator in operator/public projection policy.

## 12. Currentness propagation
If an upstream fact changes, dependent research may require refresh.

Examples:
- Seat occupancy change -> biography/current-role/contact/committee monitoring may reopen
- Candidate status change -> campaign/finance/platform monitoring may reopen
- boundary version change -> address resolution and constituency data may require recomputation
- committee reassignment -> governance/activity scope becomes stale
- finance reporting period closes -> finance reconciliation work becomes due

Dependencies must be encoded rather than assumed mentally.

## 13. Failure is a durable record
Material failures MUST be persisted as first-class records, not only logs.

A failure record should include:
- failure_id
- trace_id
- ResearchWorkIdentity/job
- subject/scope
- agent/capability
- tool/parser
- source
- retrieval/attempt
- failure class
- input summary
- output summary
- data-loss flag
- retryable flag
- attempt count
- next retry
- affected handoff
- downstream impact
- remediation owner
- created_at
- resolved_at

## 14. Failure classes
Support at least semantic classes equivalent to:
- SOURCE_UNAVAILABLE
- NETWORK_TIMEOUT
- RATE_LIMIT
- AUTHORIZATION_FAILURE
- PARSER_FAILURE
- SCHEMA_DRIFT
- EXTRACTION_FAILURE
- IDENTITY_AMBIGUITY
- EVIDENCE_HASH_MISMATCH
- SOURCE_LOCATOR_FAILURE
- HANDOFF_FAILURE
- QUEUE_FAILURE
- BRIDGE_REJECTION
- CANONICAL_INTAKE_FAILURE
- VALIDATION_FAILURE
- CONTRADICTION_UNRESOLVED
- MONITORING_STALE
- PROJECTION_FAILURE
- WORKER_STARVATION
- SCHEDULER_STALL
- RESOURCE_THROTTLE
- STORAGE_FAILURE

## 15. Smallest-scope failure isolation
A failure MUST block only the smallest dependency-bound unit.

Required invariants:
- one source failure != whole subject blocked
- one research scope failure != whole dossier blocked
- one subject failure != cohort blocked
- one worker failure != system blocked
- one producer bridge outage != producer research stopped
- one canonical validator issue != unrelated validation stopped

Independent eligible work MUST continue.

## 16. Retry policy
Retry policy MUST be failure-class-aware.

Consider:
- idempotency
- Retry-After
- rate limits
- exponential backoff
- jitter
- source health
- alternate approved source path
- maximum attempts
- deadline/urgency
- resource cost

Do not retry terminal policy/schema/identity failures indefinitely.

## 17. Retry states
At minimum distinguish:
- RETRYABLE
- RETRY_SCHEDULED
- RETRYING
- RETRY_EXHAUSTED
- TERMINAL
- RECOVERED

## 18. Circuit breakers
Repeated source/tool failures should trigger bounded circuit-breaker behavior.

Circuit breaker states may include:
- CLOSED
- OPEN
- HALF_OPEN

Opening a circuit for one source MUST NOT globally stop other sources or scopes.

## 19. Dead-letter behavior
After retry exhaustion, persist the work as dead-letter/exception state.

Dead-letter records MUST remain visible and actionable.

Required metadata:
- reason
- lineage
- last evidence/retrieval
- attempts
- whether alternate sources exist
- data-loss assessment
- responsible capability
- next remediation option

## 20. Root-cause incident workflow
When a discrepancy is discovered, do NOT patch the visible symptom first.

Mandatory workflow:

```text
DISCREPANCY
 -> CREATE INCIDENT
 -> TRACE FULL LINEAGE BACKWARD
 -> FIND FIRST INCORRECT TRANSITION
 -> CLASSIFY ROOT CAUSE
 -> DETERMINE BLAST RADIUS
 -> FIX GENERALIZED RULE
 -> INVALIDATE/SUPERSEDE AFFECTED OUTPUTS
 -> REGENERATE THROUGH NORMAL PIPELINE
 -> ADD REGRESSION TEST
 -> MONITOR RECURRENCE
```

## 21. Incident record
Persist:
- incident_id
- severity
- detected_by
- affected subject/scope
- first incorrect transition
- root cause
- capability/tool/source involved
- blast radius
- affected records/packages/projections
- generalized fix
- tests added
- records regenerated
- current status
- opened_at/resolved_at

## 22. Blast-radius audit
When a systemic defect is found, inspect all records produced by the same vulnerable rule/path/version.

Examples:
- stale source precedence -> audit all current-state claims using that resolver
- campaign identity collision -> audit all CandidateCampaign IDs from affected builder version
- parser field shift -> audit outputs from affected parser version
- handoff schema defect -> audit all packages created under affected contract build

Do not assume an observed error is isolated until proven.

## 23. Supersession, not silent overwrite
Incorrect or stale outputs should remain traceable.

Preserve:
- original state
- original evidence
- incident link
- superseded reason/time
- replacement state

Do not rewrite history to hide mistakes.

## 24. Worker starvation detection
A worker/capability can be unhealthy even if its process is alive.

If applicable backlog exists and the responsible capability receives no real work beyond its service expectation, create `AGENT_STARVATION_EXCEPTION`.

Investigate:
- scheduler
- routing
- queue
- dependencies
- resource governor
- source health
- permissions
- worker process

## 25. Scheduler stall detection
If eligible work + available capacity exists but no dispatch occurs, create `SCHEDULER_STALL_EXCEPTION`.

Track:
- last scheduler heartbeat
- last work scan
- last job created
- last dispatch
- eligible backlog
- blocked backlog
- next wakeup

## 26. Queue stall detection
Persist and alert on:
- oldest eligible job age
- queue depth trend
- jobs stuck RUNNING beyond lease
- retry pile-up
- dead-letter growth
- unconsumed handoffs
- queue/worker imbalance

## 27. Lease recovery
Expired/stale job leases MUST be recoverable.

Recovery must preserve attempt lineage and avoid duplicate side effects.

## 28. Source health
Every registered production source should have a health state derived from actual source-family/endpoint behavior.

Track:
- last success
- last failure
- consecutive failures
- latency
- HTTP/error state
- schema fingerprint
- parser compatibility
- rate-limit state
- authentication/access state
- next check

## 29. Source health states
At minimum:
- HEALTHY
- DEGRADED
- RATE_LIMITED
- SCHEMA_DRIFT
- UNAVAILABLE
- AUTH_FAILURE
- UNKNOWN
- DISABLED

UNKNOWN MUST NOT be reported as HEALTHY.

## 30. Source health versus research truth
Source health describes the ability to access/process a source, not factual correctness.

A healthy endpoint can still contain historical/irrelevant data for a claim.

## 31. Schema drift detection
For stable structured sources, preserve schema fingerprints or equivalent parser expectations.

On drift:
- stop unsafe parsing for affected path if needed
- preserve retrieval
- create schema-drift failure
- route parser remediation
- continue unaffected sources
- add regression fixture/test after repair

## 32. Parser quality monitoring
Track per parser/adapter:
- success rate
- empty extraction rate
- parse errors
- locator validation failures
- duplicate rate
- canonical rejection feedback
- source schema versions
- latency/cost

## 33. Evidence-chain monitoring
Continuously detect:
- claims without evidence
- evidence without claims where unexpected
- broken R2/artifact references
- hash mismatch
- SourceLocator that no longer resolves to stored artifact
- stale evidence used for current-state claims
- missing retrieval lineage

## 34. Handoff monitoring
For every material handoff reconcile:
- sent
- received
- acknowledged
- retrying
- failed
- dead-letter
- hash mismatch
- record-count mismatch
- unconsumed age

Sender-only success is insufficient.

## 35. Bridge outage behavior
If canonical bridge/intake is unavailable:
- persist producer packages durably
- retain idempotency
- schedule retry
- continue unrelated research
- keep evidence locally/durably as designed
- do not self-promote data

## 36. Canonical validation outage behavior
If a validation subsystem is unavailable:
- preserve accepted intake
- queue validation work
- continue independent validators/scopes
- do not publish unvalidated data

## 37. Monitoring coverage assurance
Compare expected dynamic monitoring scopes against configured scopes.

Track:
- EXPECTED
- CONFIGURED
- CURRENT
- DUE
- STALE
- FAILED
- MISSING

Missing monitoring must create Gap Detector work.

## 38. Gap Detector integration
Monitoring/failure/currentness feed Gap Detector.

Examples:
- stale finance -> finance refresh job
- vacant Seat detected -> occupancy/election research jobs
- candidate filing appears -> CandidateCampaign/dossier jobs
- campaign site changed -> platform/promise extraction job
- new vote -> vote + accountability-evidence job
- boundary updated -> GIS/address reconciliation job

## 39. Backlog continuity
The system must continue burning down research backlog while incidents/failures are investigated.

Reserve only the resources necessary for remediation.

## 40. Currentness metrics
Do not report one global freshness percentage.

Track currentness by:
- cohort
- subject type
- ResearchContract scope
- source family
- monitoring policy

## 41. Academy purpose
Academy improves HOW research is performed using real operational telemetry.

Academy does not define civic truth, legal status, publication policy, or canonical verification standards.

## 42. Academy inputs
Eligible real observations include:
- parser failures
- schema drift
- source degradation
- repeated browser fallbacks
- repeated model fallbacks
- duplicate work
- identity collisions
- contradiction patterns
- canonical rejection feedback
- SourceLocator failures
- rate limits
- queue starvation
- handoff failures
- resource inefficiency
- operator corrections
- validation outcomes

Test/fixture-only observations must be distinguishable from real production cases.

## 43. Academy case
Each Academy case should include:
- academy_case_id
- source incident/telemetry
- affected capability/parser/source
- hypothesis
- proposed change
- expected benefit
- risk level
- required tests
- rollback plan
- owner
- state

## 44. Academy lifecycle
Mandatory lifecycle:

```text
OBSERVE
 -> MEASURE
 -> FORM HYPOTHESIS
 -> PROPOSE CHANGE
 -> BUILD TEST
 -> RUN REGRESSION
 -> EVALUATE
 -> PROMOTE OR REJECT
 -> MONITOR AFTER PROMOTION
 -> ROLLBACK IF NEEDED
```

## 45. Academy promotion gates
No high-impact change may silently promote itself.

Promotion requires:
- passing targeted tests
- passing relevant regression suites
- no security/authority expansion
- preserved evidence semantics
- measured improvement where possible
- rollback ability

Additional human/canonical approval may be required by risk class.

## 46. Academy forbidden actions
Academy may not autonomously:
- weaken validation standards
- redefine legal/election semantics
- broaden privacy collection
- increase tool permissions
- bypass source restrictions
- grant producer canonical write authority
- remove audit history
- auto-publish unsupported claims

## 47. Parser/adapter evolution
When a recurring source is valuable, Academy may propose deterministic adapters to replace repeated expensive/manual discovery.

Promoted adapters must be versioned and monitored.

## 48. Model routing evolution
Academy may propose lower-cost or more reliable model/tool routes, subject to quality/security tests.

Do not replace deterministic methods with models merely because a model is available.

## 49. Source precedence evolution
Changes to source precedence are high-impact because they affect truth selection/currentness.

They require explicit tests covering historical/current source conflicts and claim-type authority.

## 50. Identity-rule evolution
Entity identity changes require blast-radius analysis before promotion.

CandidateCampaign, Seat, Person, Organization and Boundary identities must remain temporally/contextually safe.

## 51. Regression suite requirements
Each repaired systemic defect should produce at least one generalized regression test.

Tests should exercise the failure class rather than hard-coding only the observed person/Seat.

## 52. Post-promotion monitoring
For every promoted Academy change, track before/after:
- error rate
- extraction yield
- locator validity
- canonical rejection rate
- latency
- cost/resource use
- duplicate rate

Rollback on material regression according to policy.

## 53. Operator-visible monitoring dashboard
Operator surfaces should expose physical current state including:
- scheduler heartbeat
- queues
- last job created/completed
- last retrieval
- last evidence
- last monitoring check
- source health
- stale scopes
- starved capabilities
- active incidents
- dead-letter work
- Academy cases/promotions
- bridge backlog

## 54. No simulated observability
Metrics MUST come from physical events and persisted records.

Do not generate fake heartbeats, fixed latencies, fake retrieval counts or constructed activity merely to satisfy tests/dashboards.

## 55. Session independence
Monitoring, retries, Gap Detector, scheduler and Academy observation intake must continue independently of interactive Google/Codex/ChatGPT sessions.

If an interactive session is required to wake these functions, classify the subsystem as SESSION_BOUND and therefore non-conforming.

## 56. Restart survival
Durable monitoring and recovery state must survive supervised process restart.

Recover:
- next monitoring due times
- retry timers
- stale leases
- incidents
- dead-letter state
- bridge backlog
- Academy cases

Restart survival must be tested or reported as unproven.

## 57. Security
Monitoring/Academy systems follow least privilege.

Never expose:
- secrets
- tokens
- shared bridge keys
- protected internal endpoints
- private source credentials

Telemetry should redact sensitive values.

## 58. Required acceptance tests
At minimum prove:
1. scheduled monitoring creates real checks without interactive invocation
2. detected real change creates follow-up research work
3. a retry/degraded source does not block unrelated research
4. stale leases recover safely
5. source health distinguishes UNKNOWN from HEALTHY
6. schema drift creates an explicit failure/remediation path
7. worker starvation is detectable
8. handoff receiver acknowledgment is reconciled
9. incident root-cause tracing reaches the first incorrect transition
10. generalized repair regenerates affected work and adds regression coverage
11. Academy consumes real production observations separately from fixtures
12. promoted Academy changes are versioned/tested/reversible
13. restart/session closure does not stop monitoring/retry/backlog progression

## 59. Conformance report
Each implementation should report:
- persistent monitoring process/service
- scheduler/queue identities
- monitoring scopes expected/configured/current/stale/failed/missing
- source health counts by state
- retry/dead-letter counts
- starved capabilities
- active incidents
- Academy real cases/proposals/tests/promotions/rejections/rollbacks
- restart survival state
- session-independence state
- physical proof references

## 60. Final invariant
A CivicLenZ research system is not continuously autonomous merely because it once collected good data.

It is continuously autonomous only when it can repeatedly:

```text
OBSERVE REALITY
 -> DETECT DUE/CHANGED/FAILED/STALLED WORK
 -> CREATE DURABLE WORK
 -> ROUTE TO THE RIGHT CAPABILITY
 -> CONTINUE UNRELATED WORK DURING FAILURES
 -> PRESERVE EVIDENCE
 -> REVALIDATE/SUPERSEDE WHEN NEEDED
 -> LEARN FROM REAL OUTCOMES
 -> SAFELY IMPROVE THE RESEARCH MACHINERY
 -> SCHEDULE THE NEXT CHECK
 -> REPEAT WITHOUT AN INTERACTIVE SESSION
```

That behavior is mandatory.