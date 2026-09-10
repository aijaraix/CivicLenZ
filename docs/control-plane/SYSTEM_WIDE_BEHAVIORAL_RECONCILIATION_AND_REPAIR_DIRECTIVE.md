# CivicLenZ System-Wide Behavioral Reconciliation & Repair Directive

## 1. Purpose
This directive defines the mandatory step-by-step procedure for reconciling the CURRENT CivicLenZ/CivicsLenZz implementation with the canonical autonomous research architecture without restarting from scratch, destroying genuine research, or accepting proof-shaped simulations as production behavior.

It is written for Codex, Google/Gemini, engineers and operators.

It converts the architecture into an executable repair program.

Read first:
- `BEHAVIORAL_EXECUTION_PROOF_AND_ANTI_SIMULATION_CONTRACT.md`
- `PHYSICAL_RUNTIME_TOPOLOGY_AND_COMPONENT_CONNECTION_MATRIX.md`
- `SINGLE_ORCHESTRATOR_MULTI_PRODUCER_AND_WORKER_AUTHORITY_CONTRACT.md`
- `END_TO_END_ACCEPTANCE_CONFORMANCE_AND_PRODUCTION_PROOF_CONTRACT.md`

Then follow the master package reading order.

## 2. Non-negotiable objective
The target system is:

`ONE canonical HERMES control plane -> ONE canonical work/lease authority -> MANY producers/workers/tools -> ONE canonical validation/currentness/publication path`.

Google/CivicsLenZz, Cloudflare workers, OpenClaw, Qwen and future producers/workers are participants, not competing canonical organizations.

## 3. Repair doctrine
For every requirement:

`REQUIRED BEHAVIOR -> ACTUAL EXECUTION -> DURABLE EVIDENCE -> INDEPENDENT VERIFICATION -> CLAIM`.

Never reverse this sequence.

Do not repair a status string while leaving the behavior wrong.

## 4. Preserve before changing
Before any material repair:
- fetch current GitHub heads
- inventory running services/processes
- inventory queues/timers/crons
- inventory state stores
- preserve raw evidence
- preserve legitimate research outputs
- preserve incidents/audit history
- preserve credentials without exposing them
- record deployment/runtime identity

No force-push, blind reset, production DB rebuild or indiscriminate deletion.

## 5. Classify every component
Every discovered component must be classified:
- CANONICAL_AUTHORITY
- CANONICAL_WORKER
- PRODUCER
- PRODUCER_LOCAL_WORKER
- TOOL_RUNTIME
- MODEL_RUNTIME
- OBSERVATION_ONLY
- LEGACY_REACHABLE
- TEST_ONLY
- SYNTHETIC/DEMO_ONLY
- UNKNOWN

UNKNOWN requires investigation before replacement.

## 6. Classify implementation status
For every canonical responsibility:
- EXISTS_AND_BEHAVIORALLY_PROVEN
- EXISTS_NOT_CONNECTED
- EXISTS_SHAPE_ONLY
- EXISTS_SYNTHETIC_PROOF
- PARTIAL
- MISSING
- LEGACY_CONFLICT
- FUTURE_GATED
- NOT_APPLICABLE

Do not use `IMPLEMENTED` alone.

## 7. Find first incorrect transition
When a defect is found, trace backward until the first transition where physical reality diverges from the required behavior.

Examples:
- fake HTTP 200 created after network failure
- producer writes consumer acknowledgement
- heartbeat changes state but no job is dispatched
- queue counter increments without queue object
- local file path returned without file creation
- old scheduler still dispatches after new scheduler activation

Repair there first.

## 8. Anti-simulation source audit
Search all production-reachable code for patterns including:
- synthetic fallback payloads
- fabricated HTTP status/latency/bytes
- generated evidence bodies
- hashes of descriptive strings
- `verified=true` written by producer
- `acknowledged_by_consumer=true` written by sender
- hard-coded completion counters
- hard-coded accuracy/competency scores
- seeded success histories
- randomized proof metrics
- fixture/golden data imports
- fallback prose masking tool/model failure
- source health initialized as healthy
- generated locators marked verified without artifact lookup

Each finding becomes an incident/gap.

## 9. Production-proof engine audit
Any component whose purpose is to prove production must itself be treated as untrusted.

It may query/aggregate independent telemetry.

It MUST NOT manufacture the event it claims to prove.

If it can create jobs, evidence, acknowledgements and success metrics inside one function, its output cannot independently prove those transitions.

## 10. Test audit
Classify tests:
- BEHAVIORAL_LIVE
- BEHAVIORAL_INTEGRATION
- CONTRACT
- UNIT
- SHAPE/STATIC
- FIXTURE

Shape/static tests cannot satisfy production acceptance.

Tests must not expose golden answers to the solver under evaluation.

## 11. Runtime inventory
On the canonical VPS physically inventory:
- systemd units
- loaded unit definitions
- on-disk unit definitions
- processes/PIDs/parents
- users/groups
- listening ports
- environment/config presence
- state directories
- memory/CPU limits
- restart policies
- boot enablement
- logs

Compare loaded versus disk definitions.

## 12. Current known VPS baseline
At the latest physical inspection, expected components included:
- `civiclenz-hermes-prime` — observation runtime
- `civiclenz-openclaw`
- `civiclenz-qwen`
- `civiclenz-hermes-ingest`
- `civiclenz-cloudflared-ingest`

Treat this only as a checkpoint. Re-inspect before acting.

## 13. Systemd reconciliation
If systemd reports unit files changed on disk:
1. diff loaded/effective versus disk definitions
2. determine intended version
3. verify no secret exposure
4. `daemon-reload` only when safe
5. restart services one at a time only if needed
6. verify readiness/function after each
7. preserve unrelated healthy services

Do not mass-restart blindly.

## 14. HERMES observer reconciliation
Determine whether current HERMES is:
- observation only
- partial dispatcher
- full executive

Do not infer from service name.

Trace actual entrypoint and behavior.

## 15. Canonical executive activation prerequisites
Before full HERMES dispatch:
- one authoritative work ledger exists
- scheduler logic exists
- leases/idempotency exist
- resource governor exists
- worker registry/interfaces exist
- monitoring planner exists
- Gap Detector exists
- retry/dead-letter exists
- producer intake exists
- validation handoff exists
- competing schedulers are removed/subordinated
- behavioral canary passes

## 16. Scheduler census
Enumerate every mechanism capable of creating/dispatching work:
- systemd timers
- cron
- Cloudflare cron
- queue triggers
- Node/Python intervals
- Google Harvester loops
- HERMES loops
- app startup callbacks
- database triggers

For each record authority and scope.

## 17. Duplicate scheduler remediation
If two schedulers overlap canonical responsibility:
- identify authoritative one
- stop new leases from legacy scheduler
- allow/checkpoint in-flight work
- reconcile duplicate jobs
- disable/reclassify legacy path
- verify it cannot restart automatically
- preserve history

## 18. Work ledger reconciliation
Prove the canonical ledger physically stores:
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

Producer-local ledgers remain separate and labeled.

## 19. Supabase reconciliation
Physically verify the intended Supabase project/schema before migration or writes.

Inventory existing tables, migrations, roles and row counts.

Do not create duplicate canonical tables because they were not immediately visible.

Implement only missing canonical durable state.

## 20. R2 reconciliation
Inventory approved buckets/prefixes and bindings.

Verify real object bytes and metadata.

Do not treat an object key string as persisted evidence.

## 21. Cloudflare reconciliation
Inventory deployed:
- Workers
- versions
- routes
- cron triggers
- Queues
- producers/consumers
- R2 bindings
- environment flags including DRY_RUN

Code in GitHub is not deployment proof.

## 22. DRY_RUN truth
A worker configured `DRY_RUN=true` must not be reported as performing production writes/actions.

If activation is authorized, change through controlled deployment and prove resulting physical execution.

## 23. OpenClaw reconciliation
Prove:
`job -> OpenClaw request -> real browser/tool action -> raw response/artifact -> worker result`.

Starting Chrome or producing step descriptions is insufficient.

## 24. Browser proof
For browser-required work, prove actual navigation/DOM interaction when the ResearchContract requires browser behavior.

Direct API calls executed from a browser context do not automatically prove a customer/browser journey.

## 25. Qwen reconciliation
Prove actual requests reach Qwen from authorized workers.

Record safe request metadata, response metadata, model identity and job lineage.

Do not count service liveness as model utilization.

## 26. Qwen resource review
Re-check current memory ceiling and actual peak usage before increasing local concurrency.

Resource changes require observed evidence, not assumptions.

## 27. Gemini/CivicsLenZz audit
Audit current producer code specifically for proof-shaped synthetic behavior.

Quarantine/remove production reachability of synthetic proof paths while preserving legitimate tests/fixtures under explicit test-only boundaries.

## 28. Preserve genuine producer research
Do not delete producer artifacts merely because their status/proof was overstated.

Classify each artifact:
- REAL_RETRIEVAL_PROVENANCE_VALID
- REAL_RETRIEVAL_PROVENANCE_INCOMPLETE
- SYNTHETIC_TEST
- GENERATED_PROOF_ONLY
- UNKNOWN

Retain valid raw evidence and regenerate downstream assertions.

## 29. Producer scheduler conversion
If CivicsLenZz has a master scheduler that overlaps canonical HERMES:
- retain frontier/local scheduling only
- remove canonical/global authority
- map canonical jobs to producer work identities
- submit results through bridge

Do not destroy independent producer frontier capability.

## 30. Producer deployment to shared VPS
If deploying CivicsLenZz locally:
- create dedicated service identity
- dedicated state directory
- bounded resources
- explicit start command
- supervised restart
- no canonical DB direct write
- no canonical service-control privilege
- no unrelated secret access
- bridge-only canonical result path

## 31. Bridge reconciliation
Required proof:
1. producer creates real package from real artifacts
2. producer signs/authenticates
3. network request reaches canonical receiver
4. receiver authenticates
5. receiver durably records receipt
6. receiver generates acknowledgement
7. producer receives acknowledgement
8. hashes/counts reconcile

No sender-created consumer acknowledgement.

## 32. Intake pause
If canonical intake is paused, preserve the pause until activation prerequisites are satisfied.

Do not fake canonical receipt/validation to continue testing.

Producer research continues offline/durably.

## 33. Canonical validation wiring
After intake activation, prove:
`received -> validation queue -> identity -> evidence -> temporal -> contradiction -> dataset reconciliation -> canonical decision`.

Each boundary produces independent durable state.

## 34. Subject fan-out reconciliation
Use a real newly discovered/incomplete subject.

Prove ResearchContracts create independent applicable gaps/jobs automatically.

Do not prebuild expected jobs in the test fixture.

## 35. Gap Detector reconciliation
Prove a real missing/stale scope creates a durable gap and then a real scheduled job.

Gap count cannot be generated from the same expected summary object used for reporting.

## 36. Monitoring reconciliation
Prove:
`scheduled check -> physical retrieval -> comparison -> change/no-change event -> follow-up work when needed`.

Source registration alone is not monitoring.

## 37. Source-health reconciliation
Health must be derived from physical checks.

Remove production metrics based on initialized/prefilled healthy states.

UNKNOWN remains UNKNOWN until checked.

## 38. Evidence reconciliation
For sampled evidence:
- object/file exists
- bytes can be read
- SHA-256 recomputes
- retrieval points to actual source transaction
- locator resolves into artifact
- claim matches artifact

## 39. Constructed-hash detection
Search for hashes derived from:
- expected claim strings
- IDs
- fixture labels
- generated `live_bytes_*` strings
- descriptions

Such hashes cannot prove source retrieval.

## 40. Acknowledgement reconciliation
Search all code for acknowledgement fields.

For each, identify the component authorized to write it.

Sender-written receiver acknowledgement is invalid and must be regenerated from actual receiver state.

## 41. Metric reconciliation
Every dashboard/operational metric must identify:
- authoritative store/event
- exact query/aggregation
- denominator
- currentness
- exclusions for test/synthetic data

Counters local to a proof engine are not authoritative production metrics.

## 42. Deep-dossier reconciliation
Recalculate deep dossiers only from physical applicable scope/evidence state after synthetic proof is quarantined.

Do not preserve historical counts for appearance.

## 43. Currentness reconciliation
Preserve generalized temporal repairs.

Re-run current authoritative roster/directory comparisons after behavioral cleanup to ensure synthetic or stale evidence was not supporting current projection.

## 44. Academy reconciliation
Separate:
- production observation
- proposal
- test
- promotion decision
- deployed change
- post-change measurement

A local `promoted=true` field is not canonical Academy promotion proof.

## 45. Academy authority consolidation
If producer Academy exists, convert its promotions into proposals to canonical Academy governance where changes affect shared semantics/production behavior.

## 46. Failure-path truth
When a tool/source/model fails:
- record failure
- retry/fallback according to policy
- mark degraded/unknown if unresolved

Never fabricate successful-looking output merely to preserve pipeline shape.

## 47. Fallback policy
Fallbacks are allowed only when they are real alternative execution paths.

Example:
primary API unavailable -> approved authoritative alternate source physically retrieved.

Not allowed:
primary API unavailable -> generated replacement payload labeled live.

## 48. Security reconciliation
Verify service identities, filesystem permissions, secrets, bridge auth, database roles, Cloudflare bindings and deployment credentials.

No repair may broaden privileges merely for convenience.

## 49. Prompt-injection boundary
External pages/documents are untrusted data.

Browser/model workers must not obey instructions embedded in civic source content that attempt to alter system behavior, expose secrets or broaden permissions.

## 50. Deployment lineage
For every production service record:
- source repository
- source commit
- build/image/artifact identity
- deployed version
- runtime PID/service

Local Google/Codex code is not deployment until physically deployed.

## 51. Git synchronization
Before and after changes:
- fetch remote
- reconcile concurrent work
- commit
- push
- fetch remote again
- verify remote head

Google AI Studio local changes are not remote until its actual push completes.

## 52. Behavioral canary design
Canaries must use real bounded work without hard-coded expected answers in production code.

Choose subjects/jobs through deterministic selection from persisted state where possible.

## 53. Canonical end-to-end canary
After prerequisites:
`real gap -> canonical HERMES -> job -> worker/producer -> real retrieval -> evidence -> bridge/return -> canonical receipt -> validation -> current state -> monitoring`.

Record independent evidence at each boundary.

## 54. Session-independence proof
After canary, allow runtime to continue without manually invoking research.

Observe additional legitimate work generated/completed by persistent runtime.

## 55. Restart proof
Perform controlled restart only after runtime is stable.

Prove ledger, queues, leases, monitoring, incidents, Academy and bridge state recover.

Do not combine first executive activation with an unnecessary full host reboot.

## 56. Resource proof
Measure CPU/memory/disk/network/queue latency during real work.

Tune limits only from observed behavior.

## 57. Shared-VPS resource policy
Reserve headroom for HERMES and critical services.

Bound browser/model concurrency.

Use Cloudflare for scalable lightweight parallel execution where appropriate.

## 58. Non-blocking repair
A defect in one capability must not globally stop independent research unless integrity/security requires it.

Continue safe sibling scopes and subjects.

## 59. No restart-from-scratch
Do not rebuild working infrastructure simply to match document terminology.

Map existing components first.

## 60. No duplicate personalities
Do not create a new agent because a contract introduces a responsibility name.

Prefer existing worker capability unless a real execution/security/scaling boundary requires separation.

## 61. No cosmetic compliance
Renaming classes/files, adding status fields or copying canonical docs is not remediation unless runtime behavior changes accordingly.

## 62. Proof-state invalidation
When synthetic/self-certified proof is discovered:
- invalidate affected proof/status assertions
- preserve underlying genuine evidence
- determine blast radius
- regenerate proof from physical telemetry

Do not automatically delete research data.

## 63. Historical report handling
Prior Google/Codex reports derived from invalid proof machinery should be marked `HISTORICAL_UNTRUSTED_PROOF` or equivalent for audit purposes.

Do not use them as acceptance evidence.

## 64. Repair regression tests
Every systemic repair needs a regression test that proves behavior, not merely the new function/string exists.

## 65. Independent verifier requirement
Critical transitions should be attested by a component other than the producer whenever technically possible.

Examples:
- receiver attests receipt
- storage verifier recomputes hash
- validator attests validation
- scheduler ledger attests dispatch
- consumer attests consumption

## 66. Stop conditions
Pause only affected work when:
- corruption risk
- security compromise
- destructive migration risk