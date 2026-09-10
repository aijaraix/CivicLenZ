# CivicLenZ Autonomous Research Control Plane — Reconciliation Report

Date: 2026-09-10
Repository: `aijaraix/CivicLenZ`
Working branch: `docs/research-observability-control-plane`

## 1. Purpose
This report reconciles the newly integrated autonomous-research operating contracts against the existing CivicLenZ control-plane foundation and identifies the remaining wiring required before producer implementations such as CivicsLenZz/Google reconcile their physical runtime to the canonical design.

The objective is not to declare implementation complete. The objective is to establish one coherent written operating system against which Google/CivicsLenZz and canonical HERMES/Codex can be independently conformed and physically proven.

## 2. Documents reviewed for reconciliation
The reconciliation used the current working-branch package, including the existing foundation:
- `01_TRUTH_RESEARCH_LIFECYCLE.md`
- `02_HERMES_AGENTS_EVOLUTION.md`
- `03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md`
- `04_OPERATOR_PUBLIC_PRODUCT.md`
- `05_AUTONOMOUS_RUNTIME_OPERATIONS.md`
- `HERMES_OPENCLAW_RUNTIME.md`
- `WORKER_CATALOG_AND_RESEARCH_CONTRACTS.md`
- `DATA_EVIDENCE_VERIFICATION.md`
- `CANONICAL_RESEARCH_CONTRACT_PACKAGE.md`
- producer/frontier, Seat/Election/Candidate, GIS, territory/resource, relationship/influence, promise/position, national coverage contracts
- existing research observability/evidence/metric/public-UI/failure/media package

and the new integration contracts:
- `CIVICLENZ_MASTER_AUTONOMOUS_RESEARCH_OPERATING_CONTRACT.md`
- `SUBJECT_RESEARCH_ENRICHMENT_AND_COMPLETENESS_CONTRACT.md`
- `AGENT_RUNTIME_TOPOLOGY_HANDOFF_AND_TOOL_AUTHORITY.md`
- `RESEARCH_WORK_LEDGER_SCHEDULER_AND_BACKLOG_EXECUTION_CONTRACT.md`
- `SOURCE_REGISTRY_RETRIEVAL_EXTRACTION_AND_EVIDENCE_EXECUTION_CONTRACT.md`
- `CANONICAL_VALIDATION_IDENTITY_CONTRADICTION_AND_PUBLICATION_GATE_CONTRACT.md`
- `MONITORING_CURRENTNESS_FAILURE_RECOVERY_AND_ACADEMY_EVOLUTION_CONTRACT.md`
- `SYSTEM_SECURITY_SERVICE_IDENTITY_SECRETS_AND_PERMISSION_BOUNDARIES_CONTRACT.md`
- `OPERATOR_DASHBOARD_METRICS_BACKLOG_AND_SYSTEM_TRUTH_CONTRACT.md`
- `DEPLOYMENT_RUNTIME_SUPERVISION_RECOVERY_AND_DISASTER_CONTINUITY_CONTRACT.md`
- `END_TO_END_ACCEPTANCE_CONFORMANCE_AND_PRODUCTION_PROOF_CONTRACT.md`
- `AUTONOMOUS_RESEARCH_CONTROL_PLANE_MASTER_INDEX_AND_IMPLEMENTATION_ORDER.md`

## 3. Reconciliation result
### 3.1 Core doctrine
PASS — no fundamental doctrinal contradiction was found among the principal documents reviewed.

The older and newer documents align on these core rules:
- Seat-centric architecture
- HERMES Prime as canonical persistent orchestration/control plane
- workers as reusable capabilities, not one worker per politician
- logical director/personality names do not require separate processes
- ResearchContracts define bounded research obligations and currentness rather than global profile completion
- deterministic-first source execution
- Supabase for structured canonical state
- R2 for raw evidence
- GitHub for implementation/contracts/configuration, not live civic state
- evidence-first extraction/validation
- monitoring never ends for dynamic scopes
- Academy improves research methods without silently redefining truth standards
- producers remain subordinate and may not self-verify or self-publish
- interactive Codex/Google/ChatGPT sessions are not required production runtime dependencies

### 3.2 Agent/capability semantics
RECONCILED.

The package now explicitly resolves the ambiguous phrase `47 agents`.

Canonical meaning:
- capability = logical responsibility
- worker = execution component
- persistent worker = independently supervised execution
- queue consumer/scheduled/event-driven worker = activation form
- adapter/parser = reusable execution mechanism, not necessarily an autonomous agent
- named director/personality = human-readable orchestration construct, not automatically a process

A producer may implement a different physical worker count from canonical HERMES as long as every responsibility has a conforming, observable, evidence-producing execution path.

### 3.3 Continuous research semantics
RECONCILED.

The older `03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md` already established recursive ResearchContracts and no global COMPLETE state. The new Subject Research Enrichment contract makes the missing operational connection explicit:

subject discovery/change -> applicable contracts -> scope coverage -> gaps -> durable independent jobs -> worker execution -> evidence -> handoff/validation -> monitoring.

This is complementary clarification, not semantic replacement.

### 3.4 Runtime cadence semantics
RECONCILED.

The existing autonomous runtime document establishes event-first orchestration with heartbeat backstops and benchmark starting cadences such as approximately 15–30 seconds for fast health/lease/queue/resource heartbeats.

The new scheduler contract intentionally avoids requiring every individual worker to poll every 15 seconds. The scheduler/event system may wake frequently and feed durable work to workers according to eligibility, resource policy and source cadence.

This is not a contradiction. It is the intended scalable interpretation.

### 3.5 HERMES versus producer orchestration
RECONCILED.

Canonical HERMES Prime owns canonical research intent, validation, identity, canonical truth and publication authority.

A producer such as CivicsLenZz may have its own persistent scheduler/orchestrator for advance extracted_unreviewed research. That producer runtime does not become canonical HERMES and must remain contract-subordinate.

Google/Gemini interactive execution must not masquerade as that producer runtime.

### 3.6 OpenClaw role
RECONCILED.

OpenClaw remains both a conversational/research-request/action gateway and an execution/tool layer where configured. It is subordinate to HERMES and does not become a separate civic truth authority.

### 3.7 Evidence chain
RECONCILED AND STRENGTHENED.

The package consistently requires physical lineage:
source -> retrieval -> raw artifact -> hash -> precise SourceLocator -> extraction -> evidence -> claim/relationship -> validation -> projection.

The newer source/evidence contract adds explicit prevention of generic-homepage shortcuts, fake retrievals, sample-to-universe completion and historical-source misuse for current-state assertions.

### 3.8 Validation boundary
RECONCILED AND STRENGTHENED.

The package now explicitly separates:
STRUCTURAL_RECORD_EXISTS -> EXTRACTED_UNREVIEWED -> SCHEMA_VALID -> BRIDGE_READY -> CANONICAL_RECEIVED -> ACCEPTED_FOR_VALIDATION -> CANONICAL_VALIDATED -> PUBLICATION_ELIGIBLE -> PUBLISHED.

This prevents the metric conflation previously observed in producer reporting.

### 3.9 Failure/incident behavior
RECONCILED AND STRENGTHENED.

The current package requires repair at the first incorrect transition, blast-radius analysis, generalized remediation, supersession/regeneration, regression tests and monitoring.

Subject-specific hard-coded patches are non-conforming.

Failure must be isolated to the smallest dependency-bound scope while independent research continues.

### 3.10 Academy
RECONCILED.

Academy/evolution remains a first-class HERMES purpose. The new contracts clarify that Academy consumes real production telemetry/corrections/failures and may improve source ranking, parsing, routing, retries, caching and model economics, but cannot silently change truth, security, legal or publication rules.

### 3.11 Security/continuity
RECONCILED AND EXPANDED.

The new security and runtime-continuity contracts provide the previously distributed details around service identity, least privilege, secret boundaries, producer isolation, restart survival, queues, backups, restore testing and session independence.

No conflict was identified with the existing Cloudflare/Supabase/R2/VPS architecture doctrine.

## 4. Wiring gaps discovered
The following were documentation/control-plane wiring gaps rather than architectural contradictions.

### Gap A — old README did not point to the complete integrated package
REPAIRED.

`docs/control-plane/README.md` now identifies the master index as the mandatory entry point and lists the integrated operating contracts.

### Gap B — root CODEX_START_HERE did not include the new package
REPAIRED.

`CODEX_START_HERE.md` now begins with the master index and integrated operating contracts and explicitly preserves the older foundation/domain reading requirements.

### Gap C — machine-readable package manifest
OPEN AT TIME OF THIS REPORT.

The master index requires a machine-readable manifest so producers can verify the exact canonical package they consumed. A companion manifest should be created before producer conformance begins.

### Gap D — producer physical conformance
NOT YET PERFORMED.

The Google/CivicsLenZz runtime has reported substantial implementation, but prior reports proved that some activity could be misleading or session-driven. It must now reconcile its physical runtime against this completed package rather than create more local conceptual substitutes.

### Gap E — canonical HERMES/Codex physical conformance
NOT YET PERFORMED FOR THIS NEW PACKAGE.

Codex should later run the same conformance exercise on canonical CivicLenZ/HERMES. Google producer completion does not prove canonical completion.

### Gap F — branch canonicalization
OPEN.

The current package is on `docs/research-observability-control-plane`. It should be reviewed/merged into the intended canonical branch before long-term producer sync treats `main` as containing these exact versions.

Until merge, an owner-authorized implementation pass may consume this working branch explicitly, recording the branch and commit/ref used.

## 5. Remaining semantic ambiguities resolved by policy
### 5.1 How often do agents wake?
No requirement exists for every logical capability to wake independently every fixed number of seconds.

Required behavior is event-first plus scheduled/heartbeat backstop. A fast scheduler/health/lease heartbeat may operate on the order of tens of seconds, while research and monitoring cadences vary by source and scope.

### 5.2 Must every known person have every field?
No. Every applicable scope must have a physical state and work/reason. Publicly unavailable information remains unresolved/not found as-of scope; it must not be invented.

### 5.3 Does one person equal one research job?
No. A Person/Seat/Election/CandidateCampaign fans out into independent ResearchContract scopes.

### 5.4 Does a failure stop the subject?
No. Only dependent work blocks. Sibling scopes and unrelated subjects continue.

### 5.5 Does a successful producer handoff mean validated?
No. Transport acknowledgement and schema validity are separate from canonical validation.

### 5.6 Does `47 capabilities` mean `47 autonomous agents`?
No. Physical topology may use fewer or more workers/services/adapters. Conformance is responsibility- and proof-based.

## 6. Required Google/CivicsLenZz next phase
Google must not simply copy documentation and return PASS.

It must:
1. fetch/reconcile the owner-authorized control-plane package;
2. record exact source branch/commit;
3. compare its current physical CivicsLenZz runtime to every applicable requirement;
4. classify components as EXISTS_AND_WORKING / EXISTS_BUT_DISCONNECTED / PARTIAL / MISSING / FUTURE_GATED / CONTRADICTS_CANON;
5. preserve working runtime/infrastructure;
6. repair systemic gaps without stopping unrelated research;
7. prove persistent scheduler/queue/session independence;
8. prove new/existing subjects automatically generate applicable research backlog;
9. prove specialists actually consume deep research backlog and persist physical evidence;
10. prove contact/social/biography/finance/disclosure/vote/relationship/media/GIS scopes advance where applicable;
11. prove source/evidence lineage and exact locators;
12. prove failure isolation and root-cause repair;
13. prove durable state/restart behavior as safely possible;
14. keep all producer civic outputs `extracted_unreviewed`;
15. continue autonomous frontier/deep research during and after reconciliation;
16. commit/push source/config/test/docs changes to `aijaraix/CivicsLenZz` without committing secrets/live evidence stores;
17. return the End-to-End Acceptance conformance matrix with physical proof, not broad claims.

## 7. What Google must not do
- Do not stop existing healthy Harvester work merely to conduct the audit.
- Do not restart/rebuild from scratch unless the physical reconciliation proves the current subsystem is irreparable and the change is safe/authorized.
- Do not duplicate agents because canonical terminology differs.
- Do not call a module an autonomous worker without persistent execution proof.
- Do not use the interactive Gemini session as the scheduler.
- Do not hard-code individual civic facts to make canaries pass.
- Do not fabricate evidence, contact data, metrics or completion percentages.
- Do not promote producer records to canonical verified/published state.
- Do not wait for canonical HERMES/Codex to resume before continuing independent safe extracted_unreviewed research.

## 8. Reconciliation conclusion
DOCUMENT ARCHITECTURE: RECONCILED
MASTER READING ORDER: WIRED
CODEX ENTRY POINT: UPDATED
CONTROL-PLANE README: UPDATED
MACHINE-READABLE PACKAGE MANIFEST: REQUIRED
GOOGLE PRODUCER PHYSICAL CONFORMANCE: READY TO BEGIN
CANONICAL HERMES PHYSICAL CONFORMANCE: PENDING
BRANCH MERGE/CANONICALIZATION: PENDING

The next producer task is implementation reconciliation and production proof, not creation of another parallel conceptual architecture.
