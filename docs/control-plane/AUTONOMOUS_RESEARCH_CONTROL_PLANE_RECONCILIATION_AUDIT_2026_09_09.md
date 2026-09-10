# CivicLenZ Autonomous Research Control Plane — Package Reconciliation Audit

**Audit date:** 2026-09-09  
**Canonical repository:** `aijaraix/CivicLenZ`  
**Working branch audited:** `docs/research-observability-control-plane`

## 1. Purpose
This audit reconciles the newly expanded autonomous-research operating package against the pre-existing CivicLenZ control-plane doctrine before Google/CivicsLenZz is instructed to implement it.

The objective is to detect contradictions, duplicated semantics, ambiguous terminology, missing integration requirements and unsafe implementation assumptions without restarting or redesigning working systems.

## 2. Executive result
**PACKAGE_RECONCILIATION: PASS_WITH_IMPLEMENTATION_RECONCILIATION_REQUIRED**

The new package is directionally and semantically compatible with the established CivicLenZ doctrine. No material contradiction was found that requires discarding the package or redesigning the research architecture.

The principal remaining work is physical implementation/conformance: Google/CivicsLenZz and canonical HERMES must map their actual processes, queues, workers, data stores, tools and runtime behavior to the contracts and prove conformance.

The package intentionally tightens earlier broad guidance in several areas: capability-versus-worker terminology, session independence, durable backlog, receiver-acknowledged handoffs, source/currentness semantics, canonical validation state separation, starvation detection, security boundaries, operator metric truth, restart/disaster continuity and production-proof standards.

## 3. Established doctrine confirmed
The pre-existing package already establishes the following compatible principles:

### HERMES Prime
`02_HERMES_AGENTS_EVOLUTION.md` defines HERMES Prime as the persistent executive control plane responsible for priorities, scheduling, retries, lease recovery, source health, cohort control, resource governance, model routing, monitoring and evolution.

The new master package preserves this role and makes the distinction between orchestration and truth authority more explicit.

### Directors and workers
The existing document defines logical directors as orchestration roles that are not necessarily separate processes and workers as reusable capabilities rather than one worker per politician.

This is fully compatible with the new capability/worker/runtime-topology contract and confirms that a reported number such as `47 capabilities` must not be interpreted as `47 persistent autonomous processes`.

### ResearchContracts
`03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md` already defines bounded research scopes, recursive work generation, finite-dataset reconciliation, open-ended research, monitoring/currentness and evidence-backed scope completion.

The new Subject Research Enrichment and Work Ledger contracts expand these concepts into explicit subject fan-out, physical backlog states, scheduling, starvation detection and completeness accounting.

### Autonomous runtime
`05_AUTONOMOUS_RUNTIME_OPERATIONS.md` already establishes event-first orchestration with heartbeat backstops, dynamic concurrency, priority classes, leases, retries, dead-letter visibility, Cloudflare execution, VPS/OpenClaw heavy work, Resource Governor behavior and operation while Codex/ChatGPT/operators are offline.

The new runtime, deployment and acceptance contracts make these requirements physically testable.

## 4. Reconciled terminology
The following terminology is now authoritative for implementation discussions:

### Capability
A logical responsibility that must be fulfilled.

### Worker
An execution component that performs one or more capabilities.

### Persistent worker
A supervised execution component independent of interactive development sessions.

### Director
A logical orchestration domain. A Director does not imply a separate process.

### Adapter/parser
Reusable deterministic source-processing code. It is not automatically an autonomous worker.

### Model-assisted worker
An approved execution path using a model for bounded semantic work; model output is not primary evidence.

### Interactive development/control session
Google/Gemini, Codex, ChatGPT, browser/IDE or terminal used to build/inspect/control the system. It is never counted as autonomous runtime merely because it executed research during a conversation.

## 5. HERMES truth-authority wording reconciliation
Two formulations appear across the package:
- HERMES Prime is not itself civic truth authority.
- canonical CivicLenZ/HERMES validation plane is the canonical truth authority.

These are NOT contradictory when interpreted correctly.

**Authoritative interpretation:**
- **HERMES Prime** is the persistent orchestrator/planner and may not invent or self-declare civic truth.
- **Canonical CivicLenZ validation/reconciliation processes operating under HERMES/control-plane governance** are the only system path allowed to advance extracted research into canonical validation/publication states.

Future implementation/reporting MUST preserve this distinction.

## 6. Agent-count reconciliation
No canonical requirement mandates exactly 47 agents, 47 daemons or 47 processes.

Google's current `47 capabilities` may remain a producer implementation registry if they map correctly to canonical responsibilities.

Google must now report separately:
- logical capabilities
- physical persistent workers
- queue consumers
- scheduled workers
- event-driven workers
- deterministic adapters/parsers
- browser workers
- model-assisted workers
- session-invoked functions

A capability may be implemented by shared workers; a worker may implement multiple capabilities if responsibility, security, evidence and scaling boundaries remain correct.

## 7. Scheduler cadence reconciliation
Earlier doctrine suggests benchmark cadences such as 15–30 second fast health/lease/queue/resource heartbeats and longer planning/monitoring intervals.

The new package does not require every worker to poll every 15 seconds.

**Authoritative interpretation:**
- event-driven execution is preferred where possible;
- a frequent central scheduler/heartbeat may reconcile due work;
- source-specific monitoring uses volatility-appropriate cadence;
- Resource Governor dynamically controls concurrency;
- no fixed cadence may become an excuse for idle eligible backlog or abusive source polling.

## 8. Research depth reconciliation
Existing ResearchContracts already reject global `complete` for open-ended research.

The new package reinforces separate states:
- structural discovery
- first pass
- partial enrichment
- deep research active
- current with applicable evidence
- monitoring
- canonical validation

Google's historical reports that treated structural records, a small sample, or one proof per capability as broad completion must no longer be used as the metric standard.

## 9. Source/evidence reconciliation
No conflict found.

The reconciled standard is:
`Source -> Retrieval -> Raw Artifact -> Hash -> SourceLocator -> Extraction -> EvidenceObject -> Claim/Relationship -> Validation -> Projection`.

Search/model output is discovery/derivative assistance, not primary evidence.

Generic homepages do not satisfy precise evidence when a deeper locator is available.

Historical authority must not be confused with current-state authority.

## 10. Validation-state reconciliation
The package now unambiguously separates:
- extracted_unreviewed
- schema-valid
- bridge-ready
- canonical-received
- accepted-for-validation
- canonical-validated
- publication-eligible
- published

Google/CivicsLenZz may produce only producer-authorized states. It may not report local schema validation as canonical validation.

## 11. Storage-role reconciliation
Established and new contracts are compatible:
- GitHub: code/contracts/docs/tests/schema/deployment configuration
- canonical Supabase/Postgres: structured canonical operational state where current architecture uses it
- R2/approved evidence storage: raw/immutable evidence artifacts
- durable queues/ledger: operational work state
- producer-local durable spool: temporary/offline producer retention where required

Unique evidence must not exist only on an ephemeral/session filesystem.

## 12. Runtime-placement risk identified
The largest implementation risk revealed by prior Google audits is **session-bound or subroutine execution masquerading as autonomous runtime**.

The package now requires physical proof of:
- orchestrator process/service
- scheduler heartbeat
- durable queue/ledger
- wake-up mechanism
- worker consumers
- autonomous jobs created without manual invocation
- evidence created without interactive invocation
- monitoring advancement
- restart/session independence

Google must treat this as a primary conformance question, not assume its current port-3000 process satisfies it.

## 13. Data-enrichment risk identified
A second major risk is a large structural universe without proportional deep enrichment.

The package now requires actual backlog accounting by domain, including biography, public official/campaign contact, websites/socials, finance, disclosures, legislation/votes, statements, relationships, GIS, media and monitoring.

A discovered Person must automatically fan out into applicable ResearchContract scopes; missing scopes must create physical work or explicit unresolved/not-applicable states.

## 14. Contact-data boundary reconciled
The research system may collect appropriately public, civically relevant official/campaign/professional contact information with provenance/currentness.

It must not turn public-office research into indiscriminate private-person contact harvesting.

Missing contact information remains unresolved/not found within defined public source scope; it is never invented.

## 15. Failure/root-cause reconciliation
The SD39 and CandidateCampaign collision incidents validate the need for systemic lineage.

The canonical remediation model is:
`detect -> incident -> trace first incorrect transition -> blast radius -> generalized fix -> supersede/invalidate affected outputs -> regenerate -> regression test -> monitor`.

Direct subject-specific patches are non-conforming except as temporary quarantines explicitly marked as such.

## 16. Non-blocking operation reconciled
No conflict found.

The smallest affected dependency-bound scope pauses/retries while independent:
- research scopes
- subjects
- cohorts
- sources
- producer research
continue where safe.

Canonical intake outage must not stop CivicsLenZz extracted_unreviewed research.

## 17. Academy reconciliation
No conflict found.

Academy improves research machinery using real production outcomes. It may propose/test parser, routing, source, retry, caching, cost and model improvements.

It may not silently alter truth standards, legal semantics, sensitive-data policy, security permissions or publication rules.

## 18. Security reconciliation
The new security contract is complementary and stricter, not contradictory.

Google/CivicsLenZz must preserve producer least privilege and may not:
- write canonical DB directly
- self-validate
- self-publish
- override identity/truth policy
- expose secrets
- broaden its own credentials

Canonical and producer credentials remain separately scoped.

## 19. Operator-metric reconciliation
The new dashboard contract supersedes ambiguous shorthand reporting such as:
- `47 agents active`
- `100% monitoring`
- `100% evidence`
- `fully validated`
when denominators/proof do not support those statements.

Future reports must use physically defined denominators and distinguish UNKNOWN, NOT_YET_PROVEN, DEGRADED and canonical states.

## 20. Deployment/continuity reconciliation
Existing runtime doctrine already expects operation while engineering sessions are offline and VPS reconstruction from durable systems.

The new continuity contract adds explicit proof requirements for:
- supervisor/autostart
- boot survival
- crash/lease recovery
- deployment provenance
- backup/restore
- local spool risk
- queue durability
- disaster continuity

No contradiction found.

## 21. Domain contracts remain authoritative
The new integration package does not replace specialized civic semantics.

Seat/Election/Candidate, GIS/address, boundary evolution, territory/resource, relationships/influence, promises/positions, media, evidence and national coverage contracts remain mandatory for applicable work.

## 22. Existing documents that remain current/complementary
The following older/core documents remain semantically active and should not be deleted merely because newer integration contracts exist:
- `01_TRUTH_RESEARCH_LIFECYCLE.md`
- `02_HERMES_AGENTS_EVOLUTION.md`
- `03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md`
- `04_OPERATOR_PUBLIC_PRODUCT.md`
- `05_AUTONOMOUS_RUNTIME_OPERATIONS.md`
- `HERMES_OPENCLAW_RUNTIME.md`
- `WORKER_CATALOG_AND_RESEARCH_CONTRACTS.md`
- `DATA_EVIDENCE_VERIFICATION.md`
- domain-specific control-plane documents
- the seven research observability/evidence/UI-truth documents

They are specialized/foundational companions unless a later explicit canonical change marks a specific clause superseded.

## 23. New integration documents reconciled
The following new documents form the integration/assurance layer:
1. `CIVICLENZ_MASTER_AUTONOMOUS_RESEARCH_OPERATING_CONTRACT.md`
2. `SUBJECT_RESEARCH_ENRICHMENT_AND_COMPLETENESS_CONTRACT.md`
3. `AGENT_RUNTIME_TOPOLOGY_HANDOFF_AND_TOOL_AUTHORITY.md`
4. `RESEARCH_WORK_LEDGER_SCHEDULER_AND_BACKLOG_EXECUTION_CONTRACT.md`
5. `SOURCE_REGISTRY_RETRIEVAL_EXTRACTION_AND_EVIDENCE_EXECUTION_CONTRACT.md`
6. `CANONICAL_VALIDATION_IDENTITY_CONTRADICTION_AND_PUBLICATION_GATE_CONTRACT.md`
7. `MONITORING_CURRENTNESS_FAILURE_RECOVERY_AND_ACADEMY_EVOLUTION_CONTRACT.md`
8. `SYSTEM_SECURITY_SERVICE_IDENTITY_SECRETS_AND_PERMISSION_BOUNDARIES_CONTRACT.md`
9. `OPERATOR_DASHBOARD_METRICS_BACKLOG_AND_SYSTEM_TRUTH_CONTRACT.md`
10. `DEPLOYMENT_RUNTIME_SUPERVISION_RECOVERY_AND_DISASTER_CONTINUITY_CONTRACT.md`
11. `END_TO_END_ACCEPTANCE_CONFORMANCE_AND_PRODUCTION_PROOF_CONTRACT.md`
12. `AUTONOMOUS_RESEARCH_CONTROL_PLANE_MASTER_INDEX_AND_IMPLEMENTATION_ORDER.md`

## 24. Remaining documentation actions
The package is sufficient to begin implementation reconciliation. The following should be completed by implementation agents as part of the work rather than blocking Google now:
- machine-readable package manifest
- explicit document authority/supersession registry
- implementation conformance matrix
- runtime inventory
- responsibility-to-worker mapping
- metric-definition registry
- deployment inventory

These are required deliverables, not reasons to postpone safe reconciliation work.

## 25. Google/CivicsLenZz immediate implementation objective
Google must now stop treating its current reported architecture as automatically conforming.

It must reconcile physical CivicsLenZz against the canonical package and determine for every requirement:
- EXISTS_AND_WORKING
- EXISTS_BUT_DISCONNECTED
- PARTIAL
- MISSING
- FUTURE_GATED
- CONTRADICTS_CANON

It must preserve working research and repair/reconnect before creating duplicates.

## 26. Critical Google questions
Google must physically answer:
1. What persistent process is the Harvester orchestrator?
2. Does it survive the Google session closing?
3. What durable ledger/queue contains subject research backlog?
4. How does a new Person automatically generate dozens of applicable research scopes?
5. Which physical workers consume those scopes?
6. Which reported capabilities are merely functions/modules?
7. How many real Persons have biography/contact/social/media/finance/disclosure/vote/relationship evidence?
8. What is the domain backlog for the remainder?
9. Are workers consuming that backlog without manual prompts?
10. Are source/evidence artifacts stored durably and precisely?
11. Are handoffs receiver-acknowledged?
12. Does monitoring create new work?
13. Does Academy use real production telemetry?
14. Does one failure leave unrelated work running?
15. What survives process/host restart?

## 27. Do not restart Google implementation
This reconciliation does NOT authorize rebuilding CivicsLenZz from scratch.

Google must preserve:
- valid runtime
- real harvested data/evidence
- working adapters
- bridge contracts
- GitHub synchronization
- active safe research

Repair systemic gaps in place where practical.

## 28. Do not stop research during conformance work
Safe independent research continues during reconciliation.

The audit itself should prove non-blocking operation.

## 29. Canonical/Codex later reconciliation
When Codex resumes, canonical CivicLenZ must perform the same conformance exercise against this package, with additional responsibility for canonical validation, persistence and publication gates.

Google conformance does not prove canonical conformance.

## 30. Acceptance before global completion claims
Neither Google nor Codex may claim overall completion based solely on implementation mapping.

Use `END_TO_END_ACCEPTANCE_CONFORMANCE_AND_PRODUCTION_PROOF_CONTRACT.md` for final physical proof.

## 31. Final audit classification
- DOCUMENT PACKAGE COHERENCE: PASS
- CORE DOCTRINE COMPATIBILITY: PASS
- CAPABILITY/WORKER TERMINOLOGY: RECONCILED
- HERMES AUTHORITY TERMINOLOGY: RECONCILED
- RESEARCH DEPTH MODEL: RECONCILED
- EVIDENCE MODEL: RECONCILED
- VALIDATION STATE MODEL: RECONCILED
- FAILURE/RECOVERY MODEL: RECONCILED
- SECURITY MODEL: RECONCILED
- CONTINUITY MODEL: RECONCILED
- GOOGLE PHYSICAL CONFORMANCE: NOT_YET_PROVEN
- CANONICAL/CODEX PHYSICAL CONFORMANCE: NOT_YET_PROVEN

## 32. Next action
Proceed with Google/CivicsLenZz physical implementation reconciliation using the Master Index as the entry point. Preserve autonomous research while auditing and repairing the runtime. Do not accept documentation/test-only proof where the acceptance contract requires physical runtime proof.