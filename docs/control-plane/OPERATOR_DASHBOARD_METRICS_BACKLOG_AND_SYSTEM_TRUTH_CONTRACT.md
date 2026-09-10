# CivicLenZ Operator Dashboard, Metrics, Backlog & System Truth Contract

## 1. Purpose
This document defines what CivicLenZ operators must be able to see, measure, drill into, reconcile and trust about the autonomous research organization.

The operator dashboard is not a decorative analytics surface. It is the operational truth interface for determining whether HERMES, schedulers, queues, workers/capabilities, producers, sources, evidence pipelines, validation, monitoring, Academy and bridge systems are physically functioning and whether real civic research coverage is advancing.

Every displayed metric MUST derive from physical persisted state or explicitly identified live telemetry. No metric may be fabricated, inferred from documentation, or promoted from a sample to a universe-wide claim.

## 2. Core dashboard doctrine
The dashboard MUST answer, without ambiguity:
- Is the autonomous organization alive?
- Is it independent of interactive Google/Codex/ChatGPT sessions?
- What real work exists?
- What work is running now?
- What is waiting and why?
- Which capabilities are receiving work?
- Which capabilities are starved, degraded or failed?
- Which subjects are structurally known versus deeply researched?
- What information is missing for each subject?
- How quickly is the backlog being reduced?
- Which sources are healthy/degraded/stale/unavailable?
- What evidence was physically retrieved?
- What has canonical HERMES actually received/validated/published?
- Where did a failure occur?
- What is Academy learning/changing?
- What should happen next?

## 3. Truth-state separation
The dashboard MUST NOT collapse these states:

```text
STRUCTURAL_RECORD_EXISTS
EXTRACTED_UNREVIEWED
SCHEMA_VALID
BRIDGE_READY
CANONICAL_RECEIVED
ACCEPTED_FOR_VALIDATION
CANONICAL_VALIDATED
PUBLICATION_ELIGIBLE
PUBLISHED
```

Each state requires its own physical denominator/count where applicable.

## 4. Research-depth separation
For subjects/cohorts display separately:
- STRUCTURAL_DISCOVERY
- FIRST_PASS_RESEARCH
- PARTIALLY_ENRICHED
- DEEP_RESEARCH_ACTIVE
- CURRENT_WITH_APPLICABLE_EVIDENCE
- CURRENT_MONITORING
- STALE
- CONFLICTING
- CANONICAL_VALIDATED

A Seat row is not a deep dossier. One evidence object is not complete research.

## 5. Required top-level health panel
At minimum expose:
- orchestrator state
- scheduler state
- last scheduler heartbeat
- queue state
- worker/capability liveness
- last real job created
- last real job completed
- last real retrieval
- last evidence created
- last monitoring check
- last Gap Detector run
- last Academy observation
- source-health summary
- bridge state
- canonical intake state
- current blockers/incidents

Every status must be drillable to physical records.

## 6. Orchestrator truth
Display:
- orchestrator service/process identity
- runtime/deployment identity
- started_at
- last heartbeat
- supervisor/autostart mechanism
- current version/commit where applicable
- last work scan
- last dispatch
- current eligible backlog
- current blocked backlog

`RUNNING` means physical runtime liveness, not merely code present.

## 7. Scheduler truth
Display:
- last heartbeat
- last eligibility scan
- last job creation
- last dispatch
- next wakeup
- eligible work count
- delayed work count
- dependency-blocked work
- resource-throttled work
- starvation exceptions
- queue-stall exceptions

If eligible work exists and capacity is available but no dispatch occurs, surface an exception.

## 8. Queue truth
For every queue/work class display:
- queued
- leased/reserved
- running
- retrying
- dependency-blocked
- rate-limited
- dead-letter
- completed in window
- oldest eligible age
- average/percentile queue age where useful
- throughput
- consumer count

Do not hide dead-letter or retry queues behind a green global status.

## 9. Capability/worker truth
Do not display `47 agents active` merely because 47 logical capabilities are registered.

For each logical capability show:
- capability_id
- implementing worker/service
- runtime type
- responsibility scope
- eligible backlog
- queue depth
- last real job
- last real source/retrieval
- last real evidence/output
- last handoff
- next eligible work
- recent success/failure rate
- runtime state

Classify separately:
- ACTIVE_REAL_WORK
- IDLE_NO_ELIGIBLE_WORK
- STARVED_WITH_BACKLOG
- DEGRADED
- FAILED
- DISABLED
- IMPLEMENTED_NOT_RUNTIME_PROVEN

## 10. Worker process topology
Operator views should distinguish:
- persistent worker
- queue consumer
- scheduled worker
- event-driven worker
- deterministic adapter/parser
- browser worker
- model-assisted worker
- interactive development session

Interactive Google/Codex/ChatGPT execution MUST NOT count toward autonomous worker liveness.

## 11. Subject universe panel
Display physical counts for relevant entity types, including:
- Seats
- Persons
- Occupancies
- vacancies
- Elections
- CandidateCampaigns
- jurisdictions
- government entities
- organizations
- boundaries
- programs/projects where modeled

Counts must have explicit query/source definitions and `as_of` timestamps.

## 12. Cohort universe panel
Allow breakdown by:
- national backbone
- state
- chamber/body
- county
- municipality
- school district
- special district
- Election cycle
- office type
- geographic frontier/cohort

Never extrapolate sample percentages to unenumerated cohorts.

## 13. Subject enrichment panel
For Persons/CandidateCampaigns expose physical coverage counts for applicable fields/scopes such as:
- identity resolved
- biography
- education
- career
- prior offices
- Election history
- campaign history
- official contact
- campaign contact
- public official/campaign phone
- public official/campaign email
- official website
- campaign website
- official social accounts
- campaign social accounts
- verified portrait/media
- committees
- leadership
- legislation
- sponsored measures
- roll-call votes
- executive/government actions
- public statements
- platform/issues
- promises/positions
- endorsements
- campaign committee
- campaign finance
- financial/ethics disclosures
- organizations/boards
- PAC/lobbying relationships where documented
- public contracts/grants where applicable
- GIS/Seat geography
- constituency/public-resource context
- monitoring sources

Every metric requires an applicability denominator.

## 14. Missing-field truth
For every applicable research scope, missing information MUST have a reason/state:
- NOT_STARTED
- QUEUED
- RUNNING
- PARTIAL
- UNRESOLVED
- CONFLICTING
- STALE
- RETRYING
- DEGRADED
- BLOCKED_BY_DEPENDENCY
- NO_PUBLIC_INFORMATION_FOUND_AS_OF
- CURRENT_WITH_EVIDENCE
- NOT_APPLICABLE

A blank field with no state is an observability defect.

## 15. Contact-data metrics
Where appropriate/public, show coverage for:
- official office phone
- official office email
- official contact page
- campaign phone
- campaign email
- campaign contact form
- public campaign mailing address
- official social accounts
- campaign social accounts

Do not imply missing contact data means none exists. Display research/currentness state and provenance.

## 16. Backlog panel
Backlog is the difference between applicable ResearchContract requirements and physical current evidence.

Display backlog by:
- cohort
- subject type
- scope/domain
- capability owner
- priority
- age
- source availability
- dependency state
- monitoring/currentness urgency

## 17. Domain backlog
At minimum support domain counts for:
- identity
- biography
- career/prior office
- campaign website
- platform/promises
- campaign finance
- disclosures
- legislation
- votes
- committees
- statements
- relationships
- lobbying/PAC
- contracts/grants
- GIS
- constituency
- public resources
- media
- monitoring

## 18. Backlog burn-down
Show over time:
- opening backlog
- new gaps created
- jobs generated
- gaps closed
- gaps reopened by staleness/change
- ending backlog

Job volume alone is not progress.

## 19. Research velocity
Measure physical enrichment velocity such as:
- subjects advanced/hour/day
- scope cells advanced/hour/day
- evidence objects created
- authoritative source retrievals
- gaps closed
- deep dossiers advanced

Separate real production from test/fixture execution.

## 20. Physical work accounting
Expose actual:
- jobs created/started/completed/failed
- sources queried
- retrieval attempts/success/failure
- bytes retrieved
- pages discovered
- pages actually inspected
- documents downloaded
- documents/pages actually parsed
- API pages/records processed
- GIS layers/features processed
- finance filings/transactions processed
- facts/claims extracted
- relationships extracted
- evidence objects created
- contradictions created
- handoffs sent/received/acknowledged

Do not infer pages inspected from document length.

## 21. Evidence panel
Display:
- evidence objects
- raw artifacts
- total evidence bytes
- missing artifacts
- hash mismatches
- broken SourceLocators
- claims without evidence
- evidence without linked claims where unexpected
- generic-homepage locator violations
- stale evidence supporting current claims

All should drill to trace/job/retrieval/locator records under operator permissions.

## 22. Source health panel
For Source Registry show:
- REGISTERED
- DUE_FOR_CHECK
- CHECKED_CURRENT
- HEALTHY
- DEGRADED
- RATE_LIMITED
- SCHEMA_DRIFT
- UNAVAILABLE
- UNKNOWN

UNKNOWN MUST NOT be counted as healthy.

## 23. Per-source drill-down
For each source show:
- source_id
- authority/source role
- domains/capabilities served
- endpoint/page family
- adapter/parser version
- last success
- last failure
- latency
- schema fingerprint
- rate-limit state
- currentness characteristics
- next health check
- dependent jobs/capabilities

## 24. Monitoring panel
Display expected versus configured monitoring scopes:
- expected
- configured
- current
- due
- stale
- failed
- missing

Break down by dynamic domain such as Occupancy, Election, candidate status, finance, votes, campaign websites, disclosures, boundaries and source health.

## 25. Change detection panel
Display recent changes with:
- subject/scope
- previous state/hash
- new state/hash
- source
- detected_at
- follow-up work generated
- canonical validation state
- projection state

A detected change is not automatically canonical truth.

## 26. Election/candidate panel
For active cycles expose separate physical counts for:
- Elections known
- Seats scheduled for election
- filings
- declared/filed candidates
- qualified candidates
- withdrawals
- primary ballot candidates
- primary results
- general-election nominees
- ballot state
- results/certification when applicable
- unresolved candidate identities
- candidate dossiers current

Do not collapse legally distinct states.

## 27. GIS/address panel
By Seat class display:
- Seats expected
- boundaries expected
- direct authoritative boundary match
- authoritative lookup
- inferred
- unresolved
- versioned
- monitored
- address-ready

Do not report GIS=100% when only one boundary class is complete.

## 28. Money-domain panel
Keep separate:
- campaign money
- public/government money
- personal/public disclosures
- lobbying

For each show applicable subjects, reporting periods, records retrieved, evidence, currentness, reconciliation gaps and calculation provenance state.

## 29. Relationship graph metrics
Show evidence-backed edge counts by relationship type, not one undifferentiated total.

Examples:
- committee
- donor/PAC
- organization
- appointment
- board
- lobbying
- contractor/grantee
- endorsement
- disclosed interest

Do not render relationship counts as proof of motive/influence.

## 30. Promise/position metrics
Show:
- source statements discovered
- promises extracted
- positions extracted
- evidence/context preserved
- later action/vote evidence candidates
- unresolved contradictions

Do not display unsupported fulfilled/broken judgments.

## 31. Media metrics
Display:
- verified eligible portraits
- historical-only media
- identity unresolved
- rights unresolved
- no valid media found
- not researched
- invalid/stock/generated media blocked

## 32. Canonical validation panel
Display:
- canonical packages received
- accepted for validation
- identity-resolution pending
- needs more evidence
- contradiction pending
- dataset reconciliation pending
- validated current
- validated historical
- rejected schema/policy/evidence
- stale revalidation required
- publication eligible
- published

No local producer schema-valid count may appear as canonical validated.

## 33. Producer/bridge panel
Per producer display:
- producer_id
- last authenticated contact
- packages ready locally where reported
- canonical received
- acknowledgements
- waiting/retrying
- duplicates
- identity-resolution requests
- needs-more-evidence
- conflicts
- rejected packages
- oldest waiting age

Secrets/signatures MUST NOT be displayed.

## 34. Handoff reconciliation panel
Display:
- SENT
- RECEIVED
- ACKNOWLEDGED
- RETRYING
- FAILED
- DEAD_LETTER
- UNCONSUMED
- HASH_MISMATCH
- RECORD_COUNT_MISMATCH

Sender-generated receipts alone do not prove successful handoff.

## 35. Failure/incident panel
Every material failure should be operator-visible with:
- incident/failure ID
- class
- subject/scope
- worker/capability
- tool/parser
- source/retrieval
- first incorrect transition where known
- data-loss state
- blast radius
- retries
- remediation
- regression-test state
- current resolution state

## 36. Failure classes
Support meaningful classes such as:
- SOURCE_UNAVAILABLE
- NETWORK_TIMEOUT
- RATE_LIMIT
- PARSER_FAILURE
- SCHEMA_DRIFT
- EXTRACTION_FAILURE
- IDENTITY_AMBIGUITY
- EVIDENCE_FAILURE
- HANDOFF_FAILURE
- QUEUE_FAILURE
- SCHEDULER_STALL
- AGENT_STARVATION
- BRIDGE_REJECTION
- CANONICAL_INTAKE_FAILURE
- MONITORING_STALE
- PROJECTION_FAILURE
- SECURITY_POLICY_FAILURE

## 37. Root-cause trace view
Operators should be able to traverse:

```text
Projection
-> Canonical record/claim
-> Validation decision
-> EvidenceObject
-> SourceLocator
-> ExtractionRun
-> Retrieval
-> Source
-> Tool/parser
-> Capability/worker
-> Job
-> ResearchWorkIdentity
```

This view is essential for correcting systemic failures rather than patching symptoms.

## 38. Academy panel
Separate real production learning from tests/fixtures.

Display:
- real observations
- Academy cases
- proposals
- tests
- promotions
- rejections
- rollbacks
- before/after metrics where available
- affected parser/adapter/routing rule

Academy activity is not proof of research truth.

## 39. Security panel
Without exposing secrets, display:
- service identities healthy
- authentication failures
- permission denials
- secret/config presence state only where safe
- credential expiry/rotation due state where available
- replay/rejected-signature events
- policy violations
- unauthorized direct-write attempts
- security incidents

Never display secret values.

## 40. Resource utilization
Expose:
- CPU
- memory
- disk
- network
- browser slots
- model concurrency
- queue latency
- worker utilization
- throttling
- idle capacity with eligible backlog

Classify utilization contextually:
- UNDERUTILIZED_WITH_BACKLOG
- APPROPRIATELY_UTILIZED
- SATURATED
- THROTTLED
- DEGRADED

Do not create artificial work to improve utilization metrics.

## 41. Cost/model routing
Where available expose aggregate operational routing/cost metrics without leaking sensitive prompts or credentials:
- deterministic work volume
- local-model work volume
- browser work volume
- external-model work volume
- fallback/escalation rate
- estimated/actual cost by approved provider where available

The dashboard must distinguish configured provider from actually used provider.

## 42. Session-independence proof
Expose evidence that autonomous runtime advances without interactive sessions:
- persistent orchestrator heartbeat
- jobs created by scheduler/events
- jobs completed without manual invocation
- monitoring checks
- evidence creation
- gap jobs

Google/Codex/ChatGPT activity MUST NOT be counted as proof of autonomous scheduler work.

## 43. Restart-survival truth
Display one of:
- PROVEN
- NOT_YET_PROVEN
- DEGRADED
- FAILED

Restart survival requires physical evidence that durable queues, monitoring deadlines, retries, incidents and bridge backlog recover after supervised restart/reboot. Do not infer it from configuration alone.

## 44. GitHub durability panel
For engineering/operator use show:
- repository
- branch
- local/runtime source commit where known
- remote head
- worktree status where applicable
- unpushed commits
- untracked source files
- deployment/source mismatch

GitHub is source-code durability, not live civic research storage.

## 45. Metric definition registry
Every dashboard metric MUST have a registry entry defining:
- metric_id
- human name
- semantic definition
- numerator
- denominator
- source tables/events
- filters
- aggregation
- `as_of` semantics
- freshness SLA
- owner
- drill-down route/query
- known