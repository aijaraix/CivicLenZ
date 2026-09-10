# CivicLenZ Autonomous Research Control Plane — Master Index & Mandatory Implementation Order

## 1. Purpose
This document is the authoritative navigation, precedence, implementation-order and conformance index for the CivicLenZ autonomous research control plane.

It exists so that Codex, Google/Gemini, HERMES, OpenClaw, engineers, operators and future compatible producers do not selectively read isolated documents, implement only convenient portions, or create divergent interpretations of the research organization.

This document does not replace the contracts it indexes. It defines how they must be read and implemented together.

## 2. Canonical repository and authority
Canonical repository: `aijaraix/CivicLenZ`.

Canonical CivicLenZ/HERMES is the sole authority for canonical models, validation standards, identity resolution, canonical truth, publication policy and public projection eligibility.

Producer systems such as `aijaraix/CivicsLenZz` remain untrusted advance research producers and may not override canonical authority.

## 3. No conversational assumptions
Implementers MUST NOT assume knowledge from prior ChatGPT, Codex, Gemini, engineering or owner conversations.

If a requirement is necessary for correct operation, it must be represented in canonical documentation, machine-readable contract/configuration, implementation code or an explicitly referenced authority.

`We discussed this before` is not an implementation dependency.

## 4. Mandatory reading rule
Before implementing or materially modifying the autonomous research system, an engineering/research agent MUST read this index and then the mandatory documents in the order below.

If a referenced file has moved or been superseded, resolve the current canonical path and document the reconciliation. Do not silently skip it.

## 5. Tier 0 — repository orientation
Read current repository orientation/start files first, including:
1. `CODEX_START_HERE.md` or current canonical successor
2. repository/system architecture orientation referenced by that file
3. current master implementation directive(s)
4. current canonical data-model/schema orientation

This establishes repository reality before specialized control-plane interpretation.

## 6. Tier 1 — master autonomous operating doctrine
Read:
1. `docs/control-plane/CIVICLENZ_MASTER_AUTONOMOUS_RESEARCH_OPERATING_CONTRACT.md`
2. `docs/control-plane/SUBJECT_RESEARCH_ENRICHMENT_AND_COMPLETENESS_CONTRACT.md`
3. `docs/control-plane/AGENT_RUNTIME_TOPOLOGY_HANDOFF_AND_TOOL_AUTHORITY.md`

These answer:
- what the research organization is
- what happens to each subject
- what capabilities/workers/agents mean
- how work is allowed to execute and hand off

Do not proceed with a contradictory worker architecture after reading these.

## 7. Tier 2 — work generation and execution
Read:
1. `docs/control-plane/RESEARCH_WORK_LEDGER_SCHEDULER_AND_BACKLOG_EXECUTION_CONTRACT.md`
2. existing `HERMES_OPENCLAW_RUNTIME.md`
3. existing `WORKER_CATALOG_AND_RESEARCH_CONTRACTS.md`
4. existing autonomous runtime operations contracts/directives

These define how missing/stale/conflicting research becomes durable work and how HERMES/schedulers/workers execute it.

## 8. Tier 3 — source, retrieval, extraction and evidence
Read:
1. `docs/control-plane/SOURCE_REGISTRY_RETRIEVAL_EXTRACTION_AND_EVIDENCE_EXECUTION_CONTRACT.md`
2. `docs/control-plane/EVIDENCE_LOCATOR_AND_CLAIM_PROVENANCE.md`
3. existing `DATA_EVIDENCE_VERIFICATION.md`
4. existing evidence/provenance producer rules
5. `docs/control-plane/MEDIA_ASSET_IDENTITY_AND_PROVENANCE.md`

These define how research becomes auditable evidence rather than unsupported data.

## 9. Tier 4 — canonical truth gates
Read:
1. `docs/control-plane/CANONICAL_VALIDATION_IDENTITY_CONTRADICTION_AND_PUBLICATION_GATE_CONTRACT.md`
2. existing canonical research/ingest contracts
3. current canonical entity/identity schemas
4. publication/public-projection policy

These define the boundary between extracted research and canonical/public truth.

## 10. Tier 5 — observability, monitoring and evolution
Read:
1. `docs/control-plane/RESEARCH_CONTROL_AND_OBSERVABILITY_PLANE.md`
2. `docs/control-plane/AGENT_TOOL_SOURCE_EXECUTION_LINEAGE.md`
3. `docs/control-plane/DASHBOARD_METRIC_TRUTH_AND_RECONCILIATION.md`
4. `docs/control-plane/PUBLIC_OPERATOR_UI_TRUTH_CONTRACT.md`
5. `docs/control-plane/FAILURE_EXCEPTION_AND_MONITORING_ARCHITECTURE.md`
6. `docs/control-plane/MONITORING_CURRENTNESS_FAILURE_RECOVERY_AND_ACADEMY_EVOLUTION_CONTRACT.md`
7. `docs/control-plane/OPERATOR_DASHBOARD_METRICS_BACKLOG_AND_SYSTEM_TRUTH_CONTRACT.md`

These define how operators and the system know what actually happened, what failed, what is stale and what must happen next.

## 11. Tier 6 — security and physical continuity
Read:
1. `docs/control-plane/SYSTEM_SECURITY_SERVICE_IDENTITY_SECRETS_AND_PERMISSION_BOUNDARIES_CONTRACT.md`
2. `docs/control-plane/DEPLOYMENT_RUNTIME_SUPERVISION_RECOVERY_AND_DISASTER_CONTINUITY_CONTRACT.md`
3. current environment/deployment/security runbooks referenced by repository canon

These define permission boundaries, deployment topology, supervision, recovery and disaster continuity.

## 12. Tier 7 — civic-domain contracts
Read all domain contracts applicable to the implementation, including current canonical successors of:
- Seat/Election/Candidate parallel research
- address/boundary/election-map architecture
- boundary and Seat evolution
- civic territory/public-resource graph
- organization relationship/influence graph
- promise/position/evidence alignment
- national coverage/expansion
- producer independence/frontier harvesting

A generic research runtime does not replace domain semantics.

## 13. Tier 8 — acceptance
Finally read:
`docs/control-plane/END_TO_END_ACCEPTANCE_CONFORMANCE_AND_PRODUCTION_PROOF_CONTRACT.md`.

Implementation is not complete until the physical system is reconciled against that contract.

## 14. Precedence model
Where documents overlap, interpret precedence in this order:
1. current explicit legal/security/publication restriction
2. current canonical data/schema contract
3. this master index for reading/implementation hierarchy
4. newer explicit master operating contracts
5. specialized current domain contracts
6. older implementation notes/design guidance
7. historical/audit-only documents

A newer document does not silently erase an older specialized requirement unless it explicitly supersedes it or they are genuinely contradictory.

## 15. Contradiction between canonical documents
If two current canonical documents materially conflict:
- do not choose silently
- create a documentation/contract contradiction issue
- identify both clauses
- determine scope/impact
- resolve in canonical documentation
- add/update conformance tests where appropriate

Until resolved, prefer the safer interpretation that does not fabricate truth, broaden authority or destroy data.

## 16. Supersession registry
Maintain a registry/table identifying documents that are:
- CURRENT_AUTHORITATIVE
- CURRENT_SPECIALIZED
- COMPLEMENTARY
- SUPERSEDED
- HISTORICAL_AUDIT_ONLY
- DEPRECATED_PENDING_REMOVAL

Do not delete useful historical architecture merely because newer integration contracts exist; mark its authority clearly.

## 17. Implementation phases
Implement/reconcile in this order unless an explicit dependency justifies deviation:

### Phase A — inventory and reality
- fetch current source
- inventory physical services/data/agents/capabilities
- map current implementation to canonical contracts
- identify divergences
- preserve working infrastructure

### Phase B — durable orchestration
- Research Work Ledger
- ResearchWorkIdentity/reservations
- scheduler
- queues
- persistent workers
- Resource Governor
- liveness/starvation

### Phase C — subject fan-out and backlog
- applicable ResearchContracts
- subject-scope coverage
- Gap Detector
- independent jobs
- backlog prioritization

### Phase D — source/evidence execution
- Source Registry
- retrievals
- artifact storage/hash
- extraction
- precise SourceLocators
- claims/relationships

### Phase E — handoffs and producer bridge
- durable handoff receipts
- receiver acknowledgement
- producer authentication
- idempotency/retries
- offline retention

### Phase F — canonical validation
- schema/policy
- identity
- evidence
- temporal/currentness
- contradiction
- finite-dataset reconciliation
- canonical decisions

### Phase G — monitoring/evolution
- domain monitoring
- source health
- change detection
- failure localization
- Academy

### Phase H — operator/public truth
- operator metrics/dashboard
- publication gates
- public projection truth
- evidence access

### Phase I — security/continuity
- least privilege
- secrets/service identities
- supervision
- restart/reboot
- backup/restore
- disaster recovery

### Phase J — production proof
- end-to-end conformance matrix
- live canaries
- sustained observation
- failure/recovery proof
- final classification

## 18. Do not rebuild working infrastructure blindly
Before implementing a requirement, determine:
- EXISTS_AND_WORKING
- EXISTS_BUT_DISCONNECTED
- PARTIAL
- MISSING
- FUTURE_GATED
- CONTRADICTS_CANON

Prefer reconciling/extending working components over creating duplicates.

## 19. No personality proliferation
New documentation may introduce clearer responsibility names. This does not require a new named agent/personality for each term.

Map responsibilities to existing workers/capabilities first.

Create a new worker only when a distinct execution/security/scaling boundary justifies it.

## 20. Capability registry requirement
Maintain a canonical responsibility/capability registry mapping:
- requirement
- ResearchContract scopes
- implementation worker(s)
- runtime type
- tools
- sources
- queue/wakeup
- permissions
- evidence output
- handoff
- monitoring
- Academy metrics
- current proof level

Do not report logical capability count as physical autonomous agent count.

## 21. Producer conformance
Every producer must document:
- producer_id
- authority limits
- supported ResearchContracts/capabilities
- runtime topology
- source/tool policy
- evidence contract
- bridge/transport
- offline durability
- security identity
- conformance differences from canonical

Producers may specialize but cannot redefine canonical truth semantics.

## 22. Google/CivicsLenZz implementation rule
Google/Gemini work in CivicsLenZz MUST:
- remain subordinate to canonical CivicLenZ contracts
- sync/reconcile current contracts
- map its implementation rather than invent a parallel architecture
- distinguish Google interactive execution from persistent Harvester runtime
- continue extracted_unreviewed research independently when canonical intake is unavailable
- preserve GitHub source synchronization without committing secrets/live evidence stores

## 23. Codex/canonical implementation rule
Codex working on canonical CivicLenZ MUST:
- treat repository canon as authoritative
- preserve concurrent legitimate changes
- reconcile physical infrastructure before replacing it
- implement canonical validation/publication authority only on canonical side
- consume producer results through governed contracts
- prove persistent HERMES operation independently of Codex session

## 24. HERMES/OpenClaw rule
HERMES Prime is the canonical persistent orchestrator. OpenClaw/browser/tool runtimes are execution mechanisms, not alternative truth authorities.

A model or browser worker cannot bypass HERMES work identity, evidence, validation, security or monitoring requirements.

## 25. Subject research rule
Every newly discovered or materially changed subject must be evaluated against applicable ResearchContracts.

Discovery -> coverage evaluation -> gaps -> durable jobs -> workers -> evidence -> handoff/validation -> monitoring.

No human prompt should be required to initiate each applicable domain.

## 26. Independent-scope rule
Biography, finance, votes, relationships, GIS, media, candidate research and other independent scopes must not be serialized without genuine dependencies.

A failure in one scope does not stop sibling scopes.

## 27. Backlog rule
A blank/missing applicable field must have a physical reason/state and next action.

The system is backlog-driven, not prompt-driven.

## 28. Source rule
Workers use the strongest appropriate authoritative source path for the claim and time context.

Historical authority is not automatically current-state authority.

## 29. Evidence rule
Every material claim/relationship must be traceable through SourceLocator, artifact/hash, retrieval, source and execution lineage according to applicable contracts.

## 30. Validation rule
Producer extraction and local schema validation never equal canonical validation.

Canonical validation requires explicit canonical processing.

## 31. Monitoring rule
Dynamic truth is never `DONE_FOREVER`.

Current-with-evidence -> monitor -> change/stale -> research/revalidate.

## 32. Failure rule
Fix generalized failure points, not individual symptoms.

Trace to first incorrect transition, determine blast radius, repair, supersede/regenerate, regression-test and monitor.

## 33. Academy rule
Academy improves research machinery from real production outcomes. It cannot silently change truth, security, legal semantics or publication standards.

## 34. Security rule
Least privilege applies across every component. No secrets in Git, no producer direct canonical DB writes, no secret leakage in telemetry/prompts, no autonomous permission broadening.

## 35. Runtime-independence rule
Google/Codex/ChatGPT/browser closure must not stop normal production research.

If it does, the system is SESSION_BOUND and fails autonomous-runtime conformance.

## 36. GitHub role
GitHub is durable source/configuration/documentation history, not the live research database or evidence archive.

## 37. Storage role
Canonical structured state, raw evidence, runtime ledger and source code must remain in their approved storage classes. Do not substitute one storage layer merely because another is temporarily unavailable.

## 38. Operator truth rule
Operator metrics must be physically derivable and drillable. Unknown != healthy. Registered != active. Schema-valid != validated. Sample != universe.

## 39. Public truth rule
Public UI/API cannot imply a stronger state than canonical data supports.

## 40. Acceptance rule
No agent may return `COMPLETE`, `100% OPERATIONAL`, `ALL AGENTS WORKING`, `FULLY VALIDATED`, or equivalent without satisfying the relevant End-to-End Acceptance contract dimensions and providing physical proof.

## 41. Partial success
A subsystem may be PASS while another is NOT_YET_PROVEN or DEGRADED.

Report dimensions separately rather than hiding gaps behind a global green status.

## 42. Checkpoint behavior
A checkpoint report is not a stop condition.

After a safe checkpoint, autonomous research continues unless:
- human-only action is genuinely required
- continuing would violate security/policy
- data-loss/corruption risk requires bounded pause
- explicit owner directive stops work

## 43. Concurrent engineering
Before source changes:
FETCH -> READ CURRENT HEAD -> RECONCILE -> EDIT -> TEST -> COMMIT -> PUSH -> VERIFY.

Never force-push or overwrite newer canonical work.

## 44. Documentation changes
When this package changes:
- update affected implementation/conformance matrices
- identify superseded/conflicting clauses
- update tests where semantic behavior changed
- sync producer copies through governed contract-sync mechanisms

Do not copy stale documents indefinitely.

## 45. Machine-readable package manifest
Maintain or create a machine-readable manifest for this control-plane package containing:
- document path
- version/commit
- authority state
- dependencies
- supersedes/complements
- required readers/implementers

This allows agents to verify they loaded the current package.

## 46. Contract-sync verification
Producer contract sync must verify:
- source canonical commit/version
- expected documents
- hashes/content identity where practical
- compatibility
- last sync time

Missing/outdated contracts create a sync exception; they do not authorize invention of substitute semantics.

## 47. Implementation drift detection
Continuously or periodically compare:
- canonical contract
- code implementation
- runtime configuration
- deployed version
- producer implementation

Create `IMPLEMENTATION_DRIFT_EXCEPTION` when meaningful divergence is detected.

## 48. Documentation drift detection
Detect stale copies, conflicting duplicate docs and producer-local modifications that diverge from canonical semantics.

## 49. Schema drift versus contract drift
Keep distinct:
- external source schema drift
- internal data schema drift
- research contract drift
- producer contract drift
- deployment/config drift

Each routes to different remediation.

## 50. Evidence of reading
Engineering agents should record in their implementation/audit report:
- documents read
- canonical commit/ref
- skipped/not-applicable docs with reason
- contradictions found

This is not ceremonial; it makes stale-context failures visible.

## 51. Implementation deliverables
A conforming implementation should leave durable artifacts including:
- code/configuration
- migrations where needed
- Responsibility Contracts
- source registry/adapters
- tests
- runtime/service definitions
- monitoring/metrics
- conformance matrix
- audit/proof report
- Git commit(s)

## 52. No synthetic completion
Synthetic fixtures are valuable for tests but cannot be counted as live civic production output.

Production metrics must exclude or explicitly label test/synthetic execution.

## 53. No silent assumptions about infrastructure
If an agent cannot verify whether a Worker, queue, R2 bucket, Supabase table, VPS service, model or credential exists, it must inspect or report UNKNOWN—not recreate it blindly.

## 54. Preserve live valid work
Audits/reconciliation should not stop healthy frontier research, monitoring or producer operation unless required for safety/integrity.

## 55. Canonical outage does not stop producer research
Producer extracted_unreviewed work continues and persists durably while canonical intake is unavailable.

## 56. Producer outage does