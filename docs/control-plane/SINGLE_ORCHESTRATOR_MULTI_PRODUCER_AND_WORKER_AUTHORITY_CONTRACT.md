# CivicLenZ Single-Orchestrator, Multi-Producer & Worker Authority Contract

## 1. Purpose
This contract defines the authority topology of the CivicLenZ autonomous research organization.

Its primary invariant is simple:

> CivicLenZ has ONE canonical operational control plane and ONE canonical scheduling/truth authority. It may have many producers, worker pools, adapters, models, browsers, collectors and engineering agents.

The purpose is to prevent duplicate schedulers, competing HERMES instances, split-brain work ownership, producer self-promotion, parallel truth stores, duplicate Academies, and the accidental creation of several autonomous organizations that happen to share a GitHub repository.

This contract must be read with:
- `BEHAVIORAL_EXECUTION_PROOF_AND_ANTI_SIMULATION_CONTRACT.md`
- `PHYSICAL_RUNTIME_TOPOLOGY_AND_COMPONENT_CONNECTION_MATRIX.md`
- `RESEARCH_WORK_LEDGER_SCHEDULER_AND_BACKLOG_EXECUTION_CONTRACT.md`
- `AGENT_RUNTIME_TOPOLOGY_HANDOFF_AND_TOOL_AUTHORITY.md`
- `CANONICAL_VALIDATION_IDENTITY_CONTRADICTION_AND_PUBLICATION_GATE_CONTRACT.md`
- `SYSTEM_SECURITY_SERVICE_IDENTITY_SECRETS_AND_PERMISSION_BOUNDARIES_CONTRACT.md`

## 2. Core authority invariant
There MUST be exactly one canonical authority for each of the following functions:
- canonical ResearchNeed/work identity
- global scheduling/prioritization
- authoritative lease/reservation ownership
- canonical validation coordination
- canonical current-state reconciliation
- canonical contradiction state
- canonical monitoring obligations
- canonical Gap Detector/backlog truth
- Academy production promotion authority
- publication eligibility
- public canonical projection

Multiple physical services may implement parts of these functions for scalability, but they MUST participate in one logical canonical control plane and one authoritative state model.

## 3. HERMES Prime
HERMES Prime is the canonical persistent executive/orchestration authority.

HERMES Prime owns or governs:
- work planning
- ResearchWorkIdentity creation/deduplication
- dependency resolution
- prioritization
- resource-aware routing
- dispatch
- lease policy
- retry/dead-letter policy
- monitoring planning
- Gap Detector routing
- validation orchestration
- Academy governance
- downstream continuation

A service named HERMES is not automatically HERMES Prime. Physical authority must be proven through durable behavior under the Behavioral Execution Proof contract.

## 4. Current observer versus future executive
The physically observed CivicLenZ VPS currently includes a HERMES observation runtime.

An observation/no-dispatch runtime MUST NOT be represented as the full canonical executive merely because it has the HERMES Prime name.

Transition to full executive authority requires physical proof of:
`ResearchNeed -> durable work identity -> scheduling -> dispatch -> lease -> execution -> result -> downstream consumption -> next work`.

Until that transition is proven, classify the runtime accurately as observation/partial execution state.

## 5. Engineering agents are not production orchestrators
Codex, ChatGPT, Google/Gemini AI Studio and human IDE/browser sessions are engineering/operator environments.

They may:
- inspect
- design
- write code
- write tests
- deploy within authorization
- audit
- repair
- trigger explicitly authorized administrative actions

They MUST NOT be required to remain open for normal production research.

Their conversational loops MUST NOT be treated as production scheduler heartbeats or autonomous runtime proof.

## 6. Producer definition
A producer is an external or semi-independent research system that can discover, collect, extract and package research for canonical consumption.

Examples include:
- CivicsLenZz / Google-Gemini Harvester
- future state/local collectors
- approved partner research systems
- specialized bulk importers

A producer is not canonical merely because it performs sophisticated research.

## 7. Producer authority
A producer MAY:
- discover subjects/sources
- perform approved research
- retrieve public source material
- preserve raw artifacts
- extract claims/relationships
- create evidence locators
- perform producer-local deduplication
- maintain producer-local offline queues
- perform producer-local source monitoring
- package results
- retry delivery
- receive canonical acknowledgement
- continue safe research while canonical intake is unavailable

A producer MUST emit results as `extracted_unreviewed` unless a more restrictive state applies.

## 8. Producer prohibitions
A producer MUST NOT independently:
- declare canonical validation
- publish canonical truth
- write directly to canonical production tables outside an explicitly authorized intake role
- overwrite canonical identity
- overwrite canonical current-state decisions
- resolve contradictions as canonical truth
- create canonical publication eligibility
- issue its own canonical acknowledgement
- set `acknowledged_by_consumer=true` without a real consumer acknowledgement
- create a competing global scheduler
- create a competing canonical Gap Detector
- create a competing Academy promotion authority

## 9. CivicsLenZz role
`aijaraix/CivicsLenZz` is an advance research producer/worker organization subordinate to canonical CivicLenZ contracts.

It may retain a producer-local scheduler for producer-internal frontier work only where necessary for independent harvesting, but that scheduler MUST NOT become a second canonical scheduler.

Producer-local work identity must map deterministically to canonical ResearchWorkIdentity when canonical work was assigned or when a result is submitted.

## 10. Producer-local scheduler boundary
A producer-local scheduler MAY answer:
- which producer-local frontier source to inspect next
- which producer-local retry is due
- which local extraction task should use available producer resources

It MUST NOT answer canonical questions such as:
- which canonical research gap is globally highest priority
- which canonical worker owns a global lease
- whether a claim is canonically validated
- whether public state changes
- whether Academy changes become canonical production behavior

## 11. Worker definition
A worker is an execution capability that consumes bounded work and returns bounded results.

Workers may be:
- persistent processes
- queue consumers
- scheduled functions
- event-driven functions
- deterministic adapters
- parsers
- GIS workers
- browser/OpenClaw workers
- local-model workers
- external-model workers
- Cloudflare workers

A logical capability does not require a dedicated process/personality.

## 12. Worker authority
Workers MAY:
- consume authorized jobs
- call approved tools/sources
- persist permitted intermediate state
- create extraction/evidence candidates
- emit results/errors/telemetry
- request follow-up work

Workers MUST NOT independently alter global scheduling, canonical truth or publication policy.

## 13. Worker identity and leases
Every canonical dispatched job must carry:
- ResearchWorkIdentity
- job ID
- capability/responsibility
- subject/scope
- attempt ID
- lease/reservation identity where applicable
- authority context
- evidence/output contract

Workers may not silently create a second independent job identity for the same canonical work and later count both as progress.

## 14. Lease authority
Canonical leases/reservations have one authoritative ledger.

A producer may use producer-local leases for local work, but they are not canonical leases.

Cloudflare visibility timeouts, local queue leases and database reservations must map to the canonical work state when executing canonical jobs.

## 15. Split-brain prevention
Before activating a new scheduler/orchestrator, physically enumerate all existing schedulers, timers, cron jobs, queue consumers, event loops and background processes that can create or dispatch research work.

No new canonical executive may be activated until competing/legacy authority is either:
- retired
- converted to subordinate worker/producer role
- explicitly isolated to a non-overlapping responsibility

Two services must never simultaneously believe they exclusively own the same global scheduling function.

## 16. Legacy runtime handling
Do not delete legacy runtimes merely because a new architecture exists.

First classify:
- ACTIVE_AUTHORITY
- ACTIVE_SUBORDINATE
- OBSERVATION_ONLY
- LEGACY_STILL_REACHABLE
- DISABLED
- UNKNOWN

Then reconcile safely.

A legacy scheduler that remains reachable is an incident even if the new scheduler appears healthy.

## 17. Canonical work ledger
Canonical work state must have one authoritative durable ledger.

The ledger includes, as applicable:
- ResearchNeeds
- ResearchWorkIdentities
- jobs
- attempts
- leases
- dependencies
- retries/dead letters
- completion/result state
- monitoring obligations
- gap state
- incidents

Producer-local JSON/SQLite stores are producer operational state, not canonical work truth.

## 18. Canonical data store
Canonical structured civic state resides only in the approved canonical data layer (currently planned/implemented through Supabase/Postgres where applicable).

No producer, model or browser worker may treat its local JSON store as canonical simply because canonical storage is unavailable.

## 19. Evidence storage
Raw evidence belongs in the approved evidence store (R2 or approved equivalent) with canonical metadata/provenance references.

Producer-local evidence may be retained until delivery, but canonical evidence acceptance requires canonical receipt/storage/verification.

## 20. Supabase authority
Supabase/Postgres may provide canonical durable state, but the database itself is not the orchestrator.

Only authorized services may write each table/domain.

Direct producer writes are prohibited unless a narrowly scoped canonical intake mechanism explicitly authorizes them.

## 21. R2 authority
R2 is evidence/object storage, not a truth authority.

The existence of an object does not mean its associated claim is validated.

## 22. Cloudflare execution fabric
Cloudflare Workers/Queues may provide distributed execution and scheduling triggers.

They are subordinate to canonical work identity and authority.

A Cloudflare cron may wake work but must not silently become an independent global planner.

Queue consumers must report actual consumption/acknowledgement to canonical state.

## 23. Cloudflare producer boundary
A collector running on Cloudflare may act as:
- canonical worker
- producer
- monitoring worker

Its authority must be explicit per deployment.

Do not infer authority from hosting location.

## 24. OpenClaw role
OpenClaw is a tool/browser execution runtime.

It may execute bounded browsing/tool jobs delegated through authorized work paths.

It is not:
- canonical scheduler
- validator
- publisher
- Academy authority

OpenClaw output remains untrusted research/tool output until consumed by the appropriate downstream boundary.

## 25. Qwen role
Qwen/local models provide bounded reasoning/extraction assistance.

They do not establish evidence or canonical truth.

Model output must be traceable to the job and supporting source material.

Qwen may not self-route unrestricted work or broaden its own permissions.

## 26. Gemini role
Gemini may serve two distinct roles that MUST remain separate:

### Engineering Gemini
Google AI Studio may inspect/write/test CivicsLenZz source.
It is not production runtime.

### Runtime model/provider
If an approved worker routes a bounded production task to Gemini, Gemini is a model/tool provider for that job.
It does not become the orchestrator.

## 27. Codex role
Codex is primarily an engineering/deployment/audit agent for canonical CivicLenZ.

Codex may finish canonical infrastructure and deploy approved services, but Codex itself is not HERMES Prime.

Normal research must continue when Codex session ends.

## 28. Model router authority
Only the canonical or explicitly subordinate approved routing layer may decide which model/provider executes a job.

Workers must not arbitrarily escalate to paid/external models outside policy.

Model routing decisions must be observable.

## 29. Resource Governor
Canonical HERMES/Resource Governor owns global resource policy for canonical work.

It considers:
- CPU
- memory
- disk
- network
- queue pressure
- browser slots
- model concurrency
- source rate limits
- cost policy

Producer-local resource governors may manage producer resources but cannot reserve canonical resources without coordination.

## 30. Shared VPS doctrine
A single CivicLenZ VPS may host multiple services from different implementation origins.

Shared host does NOT mean shared authority.

Services must have:
- explicit identity
- bounded permissions
- bounded state directories
- bounded ports
- resource limits
- documented input/output
- supervisor

Codex-built and Google-built services may coexist only when their authority boundaries are explicit and non-conflicting.

## 31. Recommended VPS service model
The intended service topology may include:
- `civiclenz-hermes-prime`
- `civiclenz-openclaw`
- `civiclenz-qwen`
- `civiclenz-hermes-ingest`
- `civiclenz-cloudflared-ingest`
- `civicslenzz-harvester` or equivalent producer worker service if deployed locally

Names are illustrative until physically verified/deployed. A name does not prove a service exists.

## 32. Harvester-on-VPS rule
If CivicsLenZz is deployed on the canonical VPS:
- it receives its own service identity
- it cannot write canonical DB directly
- it cannot control HERMES service lifecycle
- it cannot read unrelated secrets
- it cannot bind canonical ports
- it cannot run a competing canonical scheduler
- its output flows through canonical ingest

## 33. Service-to-service communication
All component communication must use explicit interfaces:
- queue
- API
- database role
- object-store reference
- local IPC only if documented

Components must not coordinate by secretly reading/writing each other's internal files.

## 34. Producer -> canonical bridge
Required flow:
`producer result -> HMAC/authenticated transport -> canonical receiver -> durable receipt -> canonical acknowledgement -> producer observes acknowledgement`.

Producer cannot manufacture receiver state.

## 35. Canonical -> producer work
If canonical HERMES delegates work to a producer:
`canonical ResearchWorkIdentity -> authenticated job envelope -> producer receipt -> producer execution -> result package -> canonical receipt`.

Both directions require independent acknowledgement.

## 36. Validation authority
Only canonical validation components may transition research into canonical validation states.

Producer-local validation may detect malformed output or run quality checks, but its strongest positive state remains producer quality/contract-valid, not canonical validated.

## 37. Identity authority
Producers may suggest identity candidates.

Canonical entity resolution owns canonical identity merge/split decisions.

Ambiguous producer identities must fail closed into resolution work.

## 38. Current-state authority
Producers may report current-state evidence/candidates.

Canonical current-state reconciliation determines canonical Occupancy/Seat/CandidateCampaign projection.

Producer current-state mistakes must not directly alter public truth.

## 39. Contradiction authority
Any worker/producer may detect a contradiction candidate.

Canonical contradiction reconciliation owns resolution state.

Preserve both evidence chains.

## 40. Monitoring authority
There is one canonical monitoring obligation model.

Producers may perform additional source monitoring, but canonical monitoring truth must distinguish:
- canonical monitoring obligation
- producer monitoring coverage
- actual last check
- currentness state

Producer registration does not satisfy canonical monitoring unless integrated and acknowledged.

## 41. Gap Detector authority
There is one canonical definition of research gaps derived from ResearchContracts and canonical evidence/currentness state.

Producer-local gap detectors may identify candidate gaps but cannot redefine canonical completeness.

## 42. Academy authority
There is one canonical Academy governance/promotion authority.

Producer-local learning systems may propose improvements.

They MUST NOT autonomously promote changes that alter canonical:
- truth semantics
- source precedence
- legal semantics
- security
- publication
- identity policy

without canonical governance.

## 43. Academy proposal flow
Preferred flow:
`production observation -> proposal -> isolated test -> regression suite -> canonical Academy review/governance -> controlled promotion -> post-promotion monitoring`.

No producer may mark its own proposal canonically promoted merely because its local tests pass.

## 44. Publication authority
Only canonical publication/projection components may mark data publication eligible or published.

No producer, worker, model or Academy component may bypass this gate.

## 45. Dashboard authority
Operator dashboard reads canonical operational state and clearly labeled producer telemetry.

It must never merge them into ambiguous counts.

Examples:
- producer bridge ready != canonical received
- producer extracted != canonical validated
- producer source monitored != all canonical scopes monitored

## 46. Metric ownership
Every important metric must have one authoritative data source.

If producer and canonical counts differ, display both with semantic labels rather than selecting whichever looks healthier.

## 47. Acknowledgement ownership
Only the receiving component can attest receipt.

Examples:
- queue consumer attests consumption
- canonical receiver attests package receipt
- validator attests validation result
- projection service attests publication

The sender cannot set the receiver's acknowledgement field.

## 48. Verification ownership
A component may perform internal checks but cannot provide the sole independent proof of its own success.

Critical transitions require downstream/independent attestation under the Anti-Simulation Contract.

## 49. Failure ownership
The component detecting a failure records it, but remediation authority follows the affected layer.

A producer may not rewrite canonical state to hide a producer failure.

A validator may not modify raw evidence to make validation pass.

## 50. Incident blast radius
Cross-boundary incidents must identify:
- producer(s)
- canonical services
- workers
- queues
- data stores
- evidence objects
- projections
- monitoring scopes

Repair the first incorrect transition and regenerate downstream state.

## 51. Scheduler activation gate
Before activating full canonical HERMES dispatch:
1. enumerate all current schedulers/event loops/cron triggers
2. identify their authority
3. disable/reclassify competing canonical schedulers
4. verify one authoritative work ledger
5. verify lease/idempotency semantics
6. verify worker interfaces
7. run behavioral canary
8. observe autonomous continuation

##