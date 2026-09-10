# CivicLenZ End-to-End Acceptance, Conformance & Production Proof Contract

## 1. Purpose
This document defines the final acceptance and conformance standard for the CivicLenZ autonomous research organization. It specifies what must be physically demonstrated before any implementation—canonical HERMES/Codex, CivicsLenZz/Google, or future compatible producer/runtime—may claim that a capability, subsystem, research domain, cohort, or the overall system is operational.

This contract does not replace specialized contracts. It proves that they have been implemented together as one functioning system.

## 2. Governing principle
Documentation is not completion.

Code existence is not completion.

A registered capability is not completion.

A passing unit test is not completion.

A constructed proof object is not completion.

One successful fetch is not completion.

One researched official is not completion.

A schema-valid package is not canonical validation.

A running process is not proof it is doing useful work.

Acceptance requires physical end-to-end evidence.

## 3. Conformance scope
Conformance must cover the current canonical contract package, including at minimum:
- Master Autonomous Research Operating Contract
- Subject Research Enrichment and Completeness Contract
- Agent Runtime Topology, Handoff and Tool Authority Contract
- Research Work Ledger, Scheduler and Backlog Execution Contract
- Source Registry, Retrieval, Extraction and Evidence Execution Contract
- Canonical Validation, Identity, Contradiction and Publication Gate Contract
- Monitoring, Currentness, Failure Recovery and Academy Evolution Contract
- System Security, Service Identity, Secrets and Permission Boundaries Contract
- Operator Dashboard, Metrics, Backlog and System Truth Contract
- Deployment, Runtime Supervision, Recovery and Disaster Continuity Contract
- existing Seat/Election/Candidate, GIS/address, territory/resource, relationship/influence, promise/position, media, evidence/provenance, producer and observability contracts

## 4. Implementation conformance matrix
Every implementation must maintain a matrix with columns equivalent to:
- requirement_id
- canonical document/section
- semantic requirement
- implementation component
- runtime location
- responsibility owner
- physical proof
- test proof
- live-source proof
- monitoring proof
- status
- gap
- remediation

Statuses:
- NOT_IMPLEMENTED
- IMPLEMENTED_NOT_PROVEN
- TEST_PROVEN
- LIVE_SOURCE_PROVEN
- AUTONOMOUS_RUNTIME_PROVEN
- MONITORING_PROVEN
- DEGRADED
- BLOCKED
- NOT_APPLICABLE

## 5. Google versus canonical conformance
Google/CivicsLenZz and canonical HERMES/Codex may use different physical topologies.

They must not diverge semantically.

The conformance matrix must explicitly compare:
- canonical responsibility
- canonical implementation
- producer implementation
- shared contract/version
- differences
- allowed producer limitation
- unresolved divergence

Producer implementations may stop before canonical validation/publication but must preserve compatible evidence, identity context, ResearchWorkIdentity and handoff contracts.

## 6. No fixed-agent-count acceptance
Do not use a number such as `47 agents` as a global acceptance criterion.

Acceptance asks:
- are all required responsibilities owned?
- do they have executable paths?
- are real workers/services consuming real backlog?
- do they produce the required outputs/evidence?
- are handoffs consumed?
- are failures isolated?
- is monitoring active?

Logical capability count and physical process count are separate metrics.

## 7. Overall acceptance dimensions
The final acceptance report must classify separately:
- ARCHITECTURE_CONFORMANCE
- RUNTIME_LIVENESS
- SESSION_INDEPENDENCE
- SCHEDULER
- QUEUES
- CAPABILITY_EXECUTION
- SUBJECT_ENRICHMENT
- DEEP_RESEARCH
- SOURCE_REGISTRY
- RETRIEVAL
- EXTRACTION
- EVIDENCE
- HANDOFFS
- IDENTITY_RESOLUTION
- CANONICAL_VALIDATION
- CONTRADICTION_HANDLING
- ELECTION_CURRENTNESS
- GIS_ADDRESS_READINESS
- MONITORING
- GAP_DETECTOR
- ACADEMY
- SECURITY
- OPERATOR_TRUTH
- DEPLOYMENT_PROVENANCE
- RESTART_SURVIVAL
- DISASTER_CONTINUITY
- PRODUCER_BRIDGE
- PUBLICATION_GATE

Never collapse these into one unqualified PASS.

## 8. Acceptance classifications
Use:
- PASS
- PASS_WITH_LIMITATIONS
- DEGRADED
- FAIL
- NOT_YET_PROVEN
- NOT_APPLICABLE

Every non-PASS state requires reason and remediation/next action.

## 9. Physical-proof hierarchy
Proof strength increases through:
1. documentation/contract
2. implementation inspection
3. unit/contract test
4. integration test
5. live source execution
6. persistent autonomous execution
7. longitudinal monitoring
8. failure/recovery execution
9. restart/recovery proof
10. sustained production observation

Claims must state the achieved level.

## 10. Real-source requirement
LIVE_SOURCE_PROVEN requires:
- real job
- real capability/worker
- real approved source/tool
- physical retrieval
- actual response bytes/records
- parser/extraction
- precise locator
- evidence/artifact/hash
- persistence
- handoff/result

Fixtures/static strings cannot satisfy live-source proof.

## 11. Autonomous-runtime requirement
AUTONOMOUS_RUNTIME_PROVEN requires work to be generated and executed by persistent scheduler/event/queue mechanisms without manual invocation of the individual research function.

Google/Codex/ChatGPT must not be the hidden orchestrator.

## 12. Session-independence canary
Record a before-state:
- timestamp
- scheduler heartbeat
- queue depth
- jobs created/completed
- retrieval count
- evidence count
- monitoring checks
- Gap Detector state

Allow the persistent runtime to operate without manually invoking research functions.

Record after-state and prove legitimate advancement from scheduler/events.

If eligible work exists but nothing advances, investigate rather than manufacturing work.

## 13. Persistent orchestrator proof
Verify:
- process/service identity
- supervisor/autostart
- start time
- heartbeat
- last work scan
- last dispatch
- runtime/source version
- durable dependencies

An in-process object instantiated by the interactive session is not sufficient.

## 14. Scheduler proof
With eligible backlog, prove scheduler:
- scans due work
- resolves dependencies
- prioritizes
- reserves
- dispatches
- records state
- continues to next work

Also prove no-dispatch states are explained by resource/dependency/policy conditions.

## 15. Queue proof
For each material queue prove:
- enqueue
- consumer receipt
- lease/visibility semantics
- acknowledgement
- retry
- dead-letter path
- restart persistence
- idempotency

Queue existence alone is insufficient.

## 16. Capability liveness proof
For every required capability report:
- implementing worker/service
- eligible backlog
- last real job
- last real source/retrieval
- last real output/evidence
- last handoff
- next eligible work
- failure state

A capability with backlog and no work beyond service expectation is STARVED, not healthy.

## 17. Subject fan-out proof
Choose real newly discovered or materially incomplete subjects and prove that ResearchContracts automatically create independent applicable work across multiple domains without a human manually requesting each domain.

The fan-out should include applicable identity, biography, career, Election/CandidateCampaign, contact, campaign, finance, disclosure, government activity, statements, relationships, GIS, media and monitoring scopes.

## 18. Missing-field proof
For sampled and aggregate subjects, every applicable missing scope must have a physical reason/state and next action.

A blank without state/job/reason is a failure.

## 19. Deep-research proof
Deep research must demonstrate multiple applicable source families and evidence objects for a subject.

Do not call a dossier deep because one record exists per domain.

For enumerable domains reconcile expected versus processed units.

## 20. Research-depth metrics
Report separately:
- structural discovery
- first pass
- partially enriched
- deep research active
- current with applicable evidence
- current monitoring
- canonical validated

Use physical denominators.

## 21. Enrichment-velocity proof
Over an observation window measure:
- subjects advanced
- scope cells advanced
- gaps closed
- new gaps
- evidence created
- relationships created
- deep dossiers advanced
- backlog start/end

Success means real backlog progress, not job-count inflation.

## 22. Source-registry proof
Audit all registered sources for:
- authority/source role
- domains served
- adapter/parser
- health/currentness
- last success/failure
- dependent capabilities

Important research domains with no authoritative source path are gaps.

## 23. Source-discovery proof
For a legitimate gap lacking a known source, demonstrate:
gap -> source discovery -> authority evaluation -> Source Registry -> retrieval -> extraction/evidence.

Stable repeated sources should be candidates for deterministic adapters through Academy.

## 24. Retrieval proof
Sample physical retrieval records and verify actual bytes/records, timestamps, HTTP/source metadata, hashes and lineage.

Constructed expected payloads must not be counted as retrievals.

## 25. Precise-evidence proof
For sampled claims verify:
claim -> EvidenceObject -> SourceLocator -> preserved artifact -> retrieval -> source.

The locator must physically resolve to supporting material.

Generic homepages fail where a precise locator is reasonably available.

## 26. Evidence integrity proof
Verify sampled raw artifacts against stored SHA-256 and byte metadata.

Detect:
- missing artifacts
- hash mismatch
- claim without evidence
- evidence without expected claim linkage
- broken locator

## 27. Extraction proof
For HTML/PDF/API/GIS/finance source families verify actual processed units and parser versions.

Do not infer pages inspected from document page count.

## 28. Identity-resolution proof
Use cases containing:
- same/similar names
- historical/current campaigns
- same district numbers across office types
- Seat occupant changes
- organization name variants

Prove identity resolution fails closed on ambiguity and prevents cross-cycle/cross-office collisions.

## 29. Temporal-truth proof
Use current/historical cases to prove:
- historical evidence remains preserved
- current projection uses appropriate current evidence
- valid-time transitions are modeled
- stale evidence cannot silently satisfy current-state requirements

## 30. Vacancy/occupancy canary
Use a real occupancy change/vacancy case from authoritative current sources.

Prove monitoring detects the change generically, preserves past Occupancy, creates current Seat/vacancy state, generates follow-up research and does not require hard-coded subject logic.

## 31. Election lifecycle proof
For current Election cycles prove legal states are separately represented and sourced:
filing -> qualifying -> withdrawal/ballot -> primary/result -> general nominee/ballot -> result/certification where applicable.

Do not infer legal qualification from campaign existence.

## 32. CandidateCampaign isolation proof
Prove CandidateCampaign identity includes sufficient office/Seat/cycle/filing-authority context to prevent historical or cross-office contamination.

## 33. Finite-dataset reconciliation proof
For representative enumerable datasets prove:
- universe enumerated
- expected count
- processed count
- missing/failed units
- reconciliation state
- reference period

Sampling cannot yield `complete`.

## 34. Contradiction proof
Use naturally occurring or safe test contradictions to prove:
- both evidence chains preserved
- contradiction candidate created
- current projection does not silently choose unsupported value
- reconciliation routes correctly

## 35. Root-cause proof
For a real defect demonstrate:
incident -> lineage trace -> first incorrect transition -> generalized failure class -> blast radius -> generalized repair -> invalidation/supersession -> regeneration -> regression test -> monitoring.

A hard-coded subject patch fails this criterion.

## 36. Non-blocking failure proof
During a real retry/degraded incident prove:
- affected scope retries/degrades
- sibling scopes continue
- other subjects continue
- scheduler continues
- monitoring continues
- Gap Detector continues
- Academy continues

Do not intentionally damage production merely to create failure.

## 37. Handoff proof
For material handoffs verify both sender and receiver state:
- prepared/sent
- received
- acknowledged
- manifest/hash/record-count reconciliation

Sender-created receipt alone is insufficient.

## 38. Producer bridge proof
For CivicsLenZz or another producer prove:
- producer authentication
- schema/version
- idempotency
- evidence manifest
- extracted_unreviewed status
- durable offline retention
- retry/backoff
- canonical acknowledgement mapping

Transport success must not be reported as canonical validation.

## 39. Canonical intake proof
When canonical intake is active, prove:
producer -> authenticated receiver -> durable intake -> validation queue/ledger -> evidence access -> identity/evidence/contradiction processing -> canonical decision.

If intake is paused, classify this NOT_YET_PROVEN rather than simulating success.

## 40. Canonical metric truth
Verify counts separately for:
- received
- accepted for validation
- validated current
- validated historical
- publication eligible
- published

Zero must remain zero when no canonical processing occurred.

## 41. GIS/address proof
Use bounded public test addresses/coordinates across different jurisdictions.

Prove:
input -> geocode -> boundary versions -> overlapping Seats -> current Occupancies -> active Elections/CandidateCampaigns.

Verify against authoritative GIS/source layers.

Do not use private-person addresses as fixtures.

## 42. Boundary-version proof
Demonstrate preservation of historical and current geometry, legal versus operational source distinction and geometry hash/versioning.

## 43. Contact-data proof
For public official/campaign contact research, sample:
- phone
- email
- contact page/form
- mailing address where appropriate
- social account

Verify public source, provenance, currentness and subject/context identity.

Missing contact data remains unresolved/not found as of scope, not invented.

## 44. Media proof
For sampled Persons verify:
context page -> direct asset -> retrieval -> hash -> identity association -> rights/usage state -> eligibility.

No stock/generated/unrelated portrait may pass.

## 45. Money-domain proof
Audit campaign finance, public money, disclosures and lobbying separately.

Verify record identity, reporting period, source evidence and reproducible derived totals where used.

## 46. Relationship proof
Sample relationship edges and verify evidence supports the exact relationship type/context.

No motive/influence inference is implied merely by an edge.

## 47. Promise/position proof
Sample promises/positions and verify original evidence/context plus any later action evidence candidates.

Unsupported fulfillment/broken judgments must not be auto-generated.

## 48. Monitoring proof
For representative dynamic scopes show multiple real checks over time:
previous state/hash -> new check -> changed/no-change -> currentness -> next check -> follow-up work where changed.

Configured cadence alone is insufficient.

## 49. Monitoring-coverage proof
Compare expected dynamic monitoring scopes to physically configured/current scopes.

Report missing/stale/failed monitoring explicitly.

## 50. Gap Detector proof
Use real incomplete subjects to prove missing/stale/conflicting ResearchContract scopes create real work that enters the scheduler and executes.

## 51. Academy proof
Academy acceptance requires real production observations separate from fixtures.

Demonstrate:
observation -> case -> hypothesis/proposal -> test -> regression -> controlled promotion/rejection -> post-change observation.

Academy may not weaken truth/security/publication rules.

## 52. Security proof
Audit:
- service identities
- least privilege
- producer isolation
- secret redaction
- no secrets in Git
- authenticated service traffic
- replay/idempotency controls
- database write boundaries
- evidence integrity
- model/browser permissions
- deployment authority

## 53. Negative security tests
Where safe, verify:
- invalid producer auth rejected
- unauthorized direct canonical write rejected
- unsupported schema rejected/quarantined
- secret not returned in telemetry
- private route not publicly exposed
- producer cannot self-promote validation/publication

## 54. Prompt-injection resilience proof
Treat external source content as untrusted data.

Demonstrate that malicious/instruction-like source text cannot cause workers/models to change system rules, expose secrets, broaden permissions, bypass evidence, or execute unrelated actions.

## 55. Dashboard truth proof
For sampled dashboard metrics trace displayed number/status to physical query/event records and metric definition.

Reject metrics with unclear denominators, sample extrapolation or hidden synthetic values.

## 56. Agent/capability display proof
Dashboard must distinguish logical capability from worker/process and show real last-work/backlog/liveness state.

`47 capabilities` must not automatically render as `47 autonomous agents active`.

## 57. Resource-governor proof
With eligible backlog, demonstrate useful dispatch within resource limits.

Verify throttling under constrained conditions without global stall.

Idle capacity with backlog requires explanation.

## 58. Deployment-provenance proof
For each critical service reconcile running deployment to:
- repository
- commit/build/image digest
- configuration version
- deployment timestamp
- supervisor/runtime

Unknown deployment provenance is a failure/degraded state.

## 59. Restart-survival proof
Perform or cite a recent physical supervised restart/reboot test.

Verify recovery of:
- orchestrator
- scheduler
- workers
- queues
- leases/retries
- monitoring deadlines
- incidents
- bridge backlog
- Academy state

If not physically tested, report NOT_YET_PROVEN.

## 60. Crash-recovery proof
For safe test/non-destructive conditions, prove worker/process crash does not erase durable work and stale leases recover.

## 