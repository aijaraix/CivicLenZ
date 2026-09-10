# CivicLenZ End-to-End Acceptance, Conformance & Production Proof Contract

## 1. Purpose
This document defines the final acceptance standard for CivicLenZ, canonical HERMES/Codex, CivicsLenZz/Google and future compatible producers/workers.

It proves that the required architecture is physically implemented as a functioning autonomous system rather than represented by names, status objects, synthetic traces, counters or self-certified proof.

## 2. Mandatory companion contracts
Acceptance requires conformance with:
- `BEHAVIORAL_EXECUTION_PROOF_AND_ANTI_SIMULATION_CONTRACT.md`
- `PHYSICAL_RUNTIME_TOPOLOGY_AND_COMPONENT_CONNECTION_MATRIX.md`
- `SINGLE_ORCHESTRATOR_MULTI_PRODUCER_AND_WORKER_AUTHORITY_CONTRACT.md`
- `SYSTEM_WIDE_BEHAVIORAL_RECONCILIATION_AND_REPAIR_DIRECTIVE.md`
- all other documents required by the current package manifest

These are mandatory, not advisory.

## 3. Governing proof sequence
Every acceptance claim must follow:

`REQUIRED_BEHAVIOR -> ACTUAL_EXECUTION -> DURABLE_EVIDENCE -> INDEPENDENT_VERIFICATION -> CLAIM`.

If a component can manufacture the proof object that certifies its own success, that object alone is insufficient acceptance evidence.

## 4. Non-proof examples
The following do not independently establish production operation:
- class/function names
- registration
- configuration
- initialized state
- generated traces
- generated source-health rows
- generated hashes over expected strings
- generated evidence paths
- status booleans
- local counters
- heartbeat updates
- shape/static tests
- local builds
- Google AI Studio workspace state
- sender-created acknowledgements
- producer-created validation state

## 5. Acceptance dimensions
Classify independently:
- CONTRACT_SYNC
- ARCHITECTURE_CONFORMANCE
- SINGLE_ORCHESTRATOR_AUTHORITY
- PHYSICAL_RUNTIME_TOPOLOGY
- DEPLOYMENT_PROVENANCE
- RUNTIME_LIVENESS
- SESSION_INDEPENDENCE
- SCHEDULER
- WORK_LEDGER
- QUEUES
- LEASES
- CAPABILITY_EXECUTION
- SUBJECT_FANOUT
- SUBJECT_ENRICHMENT
- DEEP_RESEARCH
- SOURCE_REGISTRY
- SOURCE_HEALTH
- RETRIEVAL
- EXTRACTION
- EVIDENCE
- HANDOFFS
- PRODUCER_BRIDGE
- CANONICAL_INTAKE
- IDENTITY_RESOLUTION
- TEMPORAL_CURRENTNESS
- CONTRADICTION_HANDLING
- CANONICAL_VALIDATION
- ELECTION_CURRENTNESS
- GIS_ADDRESS_READINESS
- MONITORING
- GAP_DETECTOR
- ACADEMY
- SECURITY
- OPERATOR_TRUTH
- RESTART_SURVIVAL
- DISASTER_CONTINUITY
- PUBLICATION_GATE

Do not collapse these into a single unqualified PASS.

## 6. Acceptance classifications
Use only:
- PASS
- PASS_WITH_LIMITATIONS
- DEGRADED
- FAIL
- NOT_YET_PROVEN
- NOT_APPLICABLE

Every non-PASS state requires reason and next action.

## 7. Proof maturity states
For a requirement/capability use:
- DECLARED
- IMPLEMENTED
- CONNECTED
- EXECUTED
- PERSISTED
- CONSUMED
- INDEPENDENTLY_VERIFIED
- MONITORED

A higher state requires physical evidence of every prior state.

## 8. Independent attestation rule
Critical transitions require an attesting component different from the producer whenever technically possible.

Examples:
- scheduler ledger attests dispatch
- queue/consumer attests receipt/consumption
- storage verifier recomputes artifact hash
- canonical receiver attests bridge receipt
- validator attests validation state
- projection service attests publication
- monitoring service attests currentness check

The producer cannot write the receiver's acknowledgement.

## 9. Single-orchestrator proof
Acceptance requires proof that one canonical HERMES authority owns global:
- ResearchWorkIdentity
- scheduling/prioritization
- canonical leases
- validation coordination
- currentness reconciliation
- monitoring obligations
- canonical Gap Detector
- Academy promotion authority
- publication eligibility

Enumerate all timers, crons, queue triggers, schedulers and event loops capable of creating/dispatching work and prove competing canonical authority does not remain reachable.

## 10. Observer-versus-executive proof
A HERMES observer process is not the full executive.

Full executive acceptance requires:
`ResearchNeed -> persisted work -> scheduler dispatch -> lease -> worker execution -> result -> downstream consumption -> next eligible work`.

A heartbeat/state change without this chain is insufficient.

## 11. Physical runtime topology proof
For each critical service provide:
- source repository/commit
- deployed artifact/version
- host/runtime
- process/service identity
- parent/supervisor
- user/service identity
- port/binding where applicable
- input
- output
- state store
- downstream consumer
- health/readiness

Unknown deployment lineage is DEGRADED or NOT_YET_PROVEN.

## 12. Local/remote/deployed distinction
Report separately:
- canonical contract commit
- implementation remote commit
- local runtime/workspace commit
- deployed artifact/runtime commit

Local source cannot establish deployment.

## 13. Session-independence proof
Without manually invoking the research function during the observation window, record before/after:
- scheduler heartbeat
- jobs created/completed
- queue depth
- retrievals
- evidence
- monitoring checks
- gaps

Prove persistent runtime generated legitimate new work while interactive Google/Codex/ChatGPT activity was not required.

## 14. Scheduler proof
With eligible backlog and available resources, prove:
- due-work scan
- dependency resolution
- prioritization
- reservation
- dispatch
- durable state transition
- subsequent next-work dispatch

Heartbeat-only schedulers fail.

## 15. Work-ledger proof
Physically verify durable storage of, as applicable:
- ResearchNeeds
- ResearchWorkIdentities
- jobs
- attempts
- leases
- dependencies
- retries/dead letters
- monitoring obligations
- gaps
- incidents

Derived counts must identify their exact query/path.

## 16. Queue proof
For every material queue prove:
- real enqueue
- consumer receive
- lease/visibility semantics
- actual acknowledgement
- retry behavior
- dead-letter behavior
- idempotency
- persistence across process restart where required

A queue-depth counter alone is insufficient.

## 17. Capability proof
For each required logical capability identify:
- physical worker/process/module
- wakeup mechanism
- input queue/work source
- last real job
- last real retrieval/tool execution
- last durable output/evidence
- downstream consumer
- eligible backlog
- failure state

Registered capability != active agent.

## 18. Subject fan-out proof
Select a real newly discovered/materially incomplete subject from persisted data.

Prove applicable ResearchContracts automatically create independent durable research work without manually prebuilding expected jobs.

## 19. Enrichment proof
Population coverage metrics require:
- authoritative store/table/path
- exact numerator
- applicability denominator
- currentness rule
- evidence requirement
- test/synthetic exclusion

Generated summary objects cannot establish population counts.

## 20. Deep research proof
Deep dossier qualification must follow the canonical Subject Research Enrichment contract, not an arbitrary number of evidence categories.

For finite domains, reconcile expected versus discovered/retrieved/parsed/evidence-backed units.

## 21. Real-source proof
LIVE_SOURCE_PROVEN requires:
- real approved source
- real network/file/API transaction
- actual response bytes/records
- recorded retrieval metadata
- parser/extraction execution
- persisted raw artifact/evidence
- precise locator

Synthetic fallback payloads do not qualify.

## 22. Synthetic fallback prohibition
If a primary retrieval fails and no approved real alternate source succeeds:
- record failure/degraded state
- retry/backoff according to policy

Do not manufacture a successful payload, HTTP status, latency, byte count, evidence artifact or claim.

## 23. Constructed-hash prohibition
SHA-256 used as source/evidence proof must derive from actual artifact bytes.

Hashes over IDs, expected values, generated strings, labels or `live_bytes_*` placeholders do not prove retrieval.

## 24. Evidence persistence proof
For sampled evidence:
- artifact/object physically exists
- bytes can be read
- SHA-256 recomputes
- retrieval lineage resolves
- SourceLocator resolves into the artifact
- extracted claim matches supporting material

Returning an object path string is not persistence proof.

## 25. Evidence independence
An evidence producer may mark extraction metadata but cannot be the sole verifier of evidence integrity/consumption when an independent storage/validator boundary exists.

## 26. Handoff proof
For every critical handoff verify both sides:
- sender prepared/sent
- receiver physically received
- receiver acknowledged
- hashes/record counts reconcile

Sender-generated receipt alone is insufficient.

## 27. Producer bridge proof
For CivicsLenZz/future producer prove:
- producer authentication
- correct schema/version
- ResearchWorkIdentity/idempotency
- real evidence manifest
- `extracted_unreviewed` state
- durable offline retention
- bounded retry/backoff
- physical canonical receiver acknowledgement

Bridge-ready is not canonical-received.

## 28. Canonical intake proof
When intake is active prove:
`producer -> receiver -> durable intake -> validation work -> identity/evidence/currentness/contradiction processing -> canonical decision`.

If intake is paused, report NOT_YET_PROVEN for downstream intake/validation rather than simulating it.

## 29. Canonical validation proof
Report separately:
- RECEIVED
- ACCEPTED_FOR_VALIDATION
- VALIDATED_CURRENT
- VALIDATED_HISTORICAL
- NEEDS_IDENTITY_RESOLUTION
- NEEDS_MORE_EVIDENCE
- CONTRADICTION_PENDING
- REJECTED
- PUBLICATION_ELIGIBLE
- PUBLISHED

Local schema-valid records are not canonical validated.

## 30. Identity proof
Use cases with similar names, cross-office district numbers, historical/current campaigns and Seat changes.

Prove canonical identity resolution prevents collisions and fails closed on ambiguity.

## 31. Temporal/currentness proof
Current projection must derive from valid-time state and current authoritative sources.

Prove historical evidence remains historical, succession/appointment closes prior conflicting occupancy where appropriate, resignations use effective dates, candidate campaigns transition correctly, and current Seat/district is resolved from current authority.

## 32. Contradiction proof
For a real or safe controlled contradiction:
- preserve both evidence chains
- create contradiction candidate
- avoid unsupported current projection
- route to canonical reconciliation

## 33. Root-cause proof
For a real defect prove:
`incident -> lineage -> first incorrect transition -> blast radius -> generalized repair -> supersession/regeneration -> behavioral regression -> monitoring`.

A person-specific hard-coded patch fails acceptance.

## 34. Non-blocking failure proof
During a real naturally occurring retry/degradation prove unaffected subjects/scopes continue.

Do not intentionally harm production merely to manufacture a failure test.

## 35. Source Registry proof
Every recurring source must physically declare authority/role, domains, coverage, endpoint family, adapter/parser, currentness role, health, last success/failure and dependent capabilities.

## 36. Source-health proof
UNKNOWN stays UNKNOWN until a physical check occurs.

Prefilled latency/fingerprint/healthy metadata cannot establish monitoring health.

## 37. Monitoring proof
Monitoring requires:
`scheduled/event wakeup -> physical retrieval/check -> comparison -> persisted changed/no-change state -> follow-up work when needed`.

Source registration alone is not monitoring.

## 38. Gap Detector proof
A real missing/stale/conflicting applicable scope must create a durable gap and then enter real scheduler execution.

The reporting component cannot manufacture both the denominator and the successful remediation count.

## 39. Academy proof
Academy acceptance requires:
`real production observation -> proposal -> isolated test -> regression -> authorized promotion -> deployed change -> post-change measurement`.

A local `promoted=true` field or generated score is insufficient.

## 40. Academy independent authority
Producer Academy may propose; canonical Academy governance controls shared production-semantic promotion.

No local producer may independently weaken truth, legal, security or publication rules.

## 41. Tool/browser proof
When a job requires browser behavior prove actual browser/DOM execution.

Launching Chrome, producing step text, or making a direct API request from browser context does not automatically prove the requested browser journey.

## 42. Model proof
Qwen/Gemini/model liveness is not utilization proof.

Show authorized job -> model request -> response metadata -> downstream consumption.

Model output is not primary evidence.

## 43. Cloudflare proof
For Workers/Queues prove deployed version, bindings, trigger execution, real message production/consumption and resulting durable state.

GitHub code or cron configuration alone is not production proof.

## 44. Supabase proof
Verify actual project/schema/table/role/migration state and physical writes through authorized components.

Do not create parallel canonical truth stores.

## 45. R2 proof
Verify actual evidence object bytes, hashes, metadata and access boundaries.

An R2 key string is not object persistence proof.

## 46. Security proof
Audit:
- service identities
- least privilege
- producer isolation
- secret redaction
- no secrets in Git
- authenticated service traffic
- replay/idempotency
- database write boundaries
- evidence integrity
- model/browser permissions
- deployment authority

## 47. Negative security proof
Where safe verify:
- invalid producer auth rejected
- producer cannot self-promote
- unauthorized canonical write rejected
- unsupported schema rejected/quarantined
- secrets absent from telemetry
- private routes not publicly exposed

## 48. Prompt-injection proof
External civic source content is untrusted data.

Prove it cannot alter instructions, expose secrets, broaden permissions or trigger unrelated actions.

## 49. Operator metric truth proof
Sample dashboard metrics and trace each to physical durable state and an explicit metric definition.

Reject unclear denominators, sample extrapolation, generated counters and synthetic/test contamination.

## 50. Currentness metric truth
Distinguish:
- structural discovery
- any parent source monitored
- each applicable dynamic scope monitored
- current with evidence
- deep research
- canonical validated

Do not label these interchangeably.

## 51. Deployment provenance proof
For every critical service reconcile:
`GitHub source -> build/artifact -> deployment -> loaded configuration -> running PID/service`.

If systemd definitions differ on disk vs loaded state, reconcile before declaring deployment conformance.

## 52. Duplicate runtime proof
Enumerate legacy/current schedulers, workers, timers and event loops.

Prove an old implementation is not still reachable and producing competing truth/work.

## 53. Restart-survival proof
When safe, verify supervised restart preserves/reconciles:
- ledger
- queues
- leases
- retries
- monitoring deadlines
- incidents
- producer backlog
- Academy state

If not physically tested, report NOT_YET_PROVEN.

## 54. Resource proof
Measure actual CPU/memory/disk/network/browser/model usage during real work.

Resource tuning must follow observed behavior.

## 55. Session-independent sustained observation
After activation, observe normal work without interactive invocation and report:
- legitimate jobs created/completed
- retrievals
- artifacts/evidence
- gaps opened/closed
- monitoring checks
- queue age
- failures/retries

This is stronger than a one-shot canary.

## 56. Historical proof invalidation
If earlier reports relied on synthetic/self-certified proof machinery, classify those proof assertions as historical untrusted proof.

Do not automatically discard underlying real evidence.

## 57. Test classification
Every test suite used for acceptance must disclose whether it is:
- BEHAVIORAL_LIVE
- BEHAVIORAL_INTEGRATION
- CONTRACT
- UNIT
- SHAPE_STATIC
- FIXTURE

Only appropriate behavioral/physical evidence may satisfy production acceptance dimensions.

## 58. No golden-answer leakage
Independent evaluation cannot expose expected/golden answers to the component being evaluated in a way that lets it pass by construction.

## 59. No cloned proof
One real execution cannot be cloned/relabelled to establish many capabilities unless those capabilities genuinely share the same execution and the proof explicitly states that fact without multiplying work counts.

## 60. No counter inflation
Incrementing an in-memory/local proof counter is not proof of jobs, pages, evidence, acknowledgements or monitoring.

Metrics must derive from authoritative persisted execution events.

## 61. Finite dataset reconciliation
For enumerable domains report:
- EXPECTED
- DISCOVERED
- RETRIEVED
- PARSED
- EVIDENCE_BACKED
- MISSING/FAILED
- reference period

Sampling cannot equal complete.

## 62. GIS/address proof
Use bounded public test locations to prove geocode -> applicable boundary versions -> Seats -> current Occupancies -> active Elections/CandidateCampaigns, verified against authoritative GIS.

## 63. Contact-data proof
For public official/campaign contacts verify source, context identity, currentness and provenance. Missing information remains unknown/not found as of search scope, not invented.

## 64. Media proof
Verify official/context page -> direct asset -> real bytes -> hash -> identity association -> rights/eligibility state.

No stock/generated/unrelated portrait may pass as official media.

## 65. Money-domain proof
Audit campaign money, public/government money, personal/public disclosures and lobbying separately with source/reporting-period provenance.

## 66. Relationship proof
Evidence must support the exact relationship type/context. Relationship existence does not itself establish motive or influence.

## 67. Promise/position proof
Preserve original statement/context and separately link later action evidence. Unsupported fulfilled/broken judgments must not be generated.

## 68. Conformance matrix requirement
Maintain a durable matrix containing:
- requirement_id
- canonical document/section
- required behavior
- implementation component
- runtime location
- producer/consumer
- durable evidence
- independent attestor
- test classification/proof
- live proof
- monitoring proof
- maturity state
- acceptance classification
- gap/remediation

## 69. Required final report lineage
Every final production report must include:
- canonical manifest version/blob SHA
- canonical contract commit
- implementation remote commit
- local runtime commit
- deployed runtime/artifact commit
- test files/counts/classification
- current active queues/workers
- real physical activity window
- unresolved gaps

## 70. Acceptance gate
A subsystem may be declared PASS only when its required behavior is physically executed, durably evidenced, independently attested where technically possible, and consistent with canonical authority/security/currentness rules.

If Google/Codex can generate the same PASS report without the intended production path actually occurring, the evidence is insufficient.

## 71. Final owner-level question
The final acceptance question is:

> With Google, Codex, ChatGPT and browser sessions closed, does the deployed CivicLenZ organization continue to identify real work, dispatch the one authorized orchestration path, execute real workers/tools, retrieve real sources, persist real evidence, receive independent acknowledgements, reconcile canonical currentness, monitor change, learn under governed Academy controls, and advance only through the authorized validation/publication path?

If an applicable element has not been physically demonstrated, classify it NOT_YET_PROVEN rather than manufacturing completion.