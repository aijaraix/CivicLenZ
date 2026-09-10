# CivicLenZ Control Plane — Authoritative Documentation Index

This directory is the implementation reference for building and operating CivicLenZ as a continuous, evidence-first civic intelligence system.

## Mandatory master entry point
Before reading or implementing individual control-plane documents, read:

`AUTONOMOUS_RESEARCH_CONTROL_PLANE_MASTER_INDEX_AND_IMPLEMENTATION_ORDER.md`

That file is the authoritative navigation, precedence, reconciliation and mandatory implementation-order index for the complete autonomous research control-plane package. It governs how the older foundation documents, domain contracts and newer integration contracts are interpreted together.

The complete package must be implemented as one coherent system. Selective reading or implementation of isolated documents is non-conforming.

## Integrated autonomous research operating contracts
After the master index, the current integration layer includes:

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

These documents consolidate and connect the previously defined architecture. They do not erase valid specialized domain requirements.

## Foundation: the five locked architecture steps
The following remain authoritative foundation documents and must be read in the order established by the master index:
1. `01_TRUTH_RESEARCH_LIFECYCLE.md`
2. `02_HERMES_AGENTS_EVOLUTION.md`
3. `03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md`
4. `04_OPERATOR_PUBLIC_PRODUCT.md`
5. `05_AUTONOMOUS_RUNTIME_OPERATIONS.md`

## Supporting architecture
Also read the current specialized architecture according to the master index, including:
- `PRODUCT_MISSION_AND_NONNEGOTIABLES.md`
- `SYSTEM_ARCHITECTURE.md`
- `HERMES_OPENCLAW_RUNTIME.md`
- `WORKER_CATALOG_AND_RESEARCH_CONTRACTS.md`
- `DATA_EVIDENCE_VERIFICATION.md`
- `PRODUCER_INDEPENDENCE_AND_FRONTIER_HARVESTING.md`
- `CANONICAL_RESEARCH_CONTRACT_PACKAGE.md`
- Seat/Election/Candidate contracts
- GIS/address/boundary contracts
- territory/public-resource contracts
- relationship/influence contracts
- promise/position/evidence contracts
- research observability/evidence/metric/public-UI/failure/media contracts
- national coverage/expansion contracts

## Authority
These files describe the intended end-state architecture and operating rules. Existing implementation details may lag these documents. When code and these documents differ, do not silently invent behavior. Identify the mismatch, determine whether the document or implementation is stale, and reconcile through a reviewed change.

Newer integration contracts organize and make explicit the behavior already required by the foundation and specialized contracts. Where a genuine contradiction exists, follow the precedence and contradiction-resolution rules in the master index rather than silently choosing one interpretation.

## Core architecture
- Seat-centric civic graph.
- No global profile `COMPLETE`; bounded scopes are reconciled/current as-of a cutoff and remain monitored.
- Discovery of a researchable subject creates applicable ResearchContract responsibility and durable backlog automatically.
- Research is scope-oriented and parallel; there is no canonical one-agent-per-politician model.
- Logical capability count does not equal physical autonomous-agent/process count.
- HERMES Prime is the canonical persistent orchestration/control plane.
- Producers such as CivicsLenZz may operate persistent independent research runtimes but remain subordinate and emit `extracted_unreviewed` results.
- Google/Gemini, Codex, ChatGPT, browsers and engineering sessions are not production orchestrators or autonomous worker proof.
- Supabase is operational canonical relational state.
- R2 is raw immutable evidence storage.
- Cloudflare Workers/Queues are distributed deterministic collection/validation fabric where configured.
- OpenClaw is conversational gateway and execution/tool layer subordinate to HERMES and policy.
- Local Qwen is a bounded inexpensive reasoning utility; external models are escalation resources, not default processing or truth authorities.
- Search/browser workers are discovery/corroboration tools; underlying sources become evidence, not search snippets.
- GitHub stores code, schemas, contracts, parsers, documentation, tests, and deployment configuration — not the live civic database.
- Workers, queues, schedulers, monitoring, Gap Detector and Academy must remain operational independently of interactive sessions.

## HERMES doctrine
CivicLenZ is continuously operating and continuously improving. Every worker executes, measures, learns, and improves within its authorized scope. Monitoring keeps civic knowledge current; Academy/evolution improves the machinery that produces that knowledge. HERMES may evolve research methods but must not silently lower or change verification/publication truth standards.

## Efficiency doctrine
Use deterministic collection first. Allocate paid compute continuously to the highest-priority eligible backlog under maximum safe utilization, preserving operational headroom, rate limits, stability, and recovery capacity. Prefer event-driven reactions with heartbeats as reconciliation/recovery backstops.

A healthy runtime is work-conserving: when eligible backlog exists and authorized capacity is available, useful work should be dispatched. A registered capability with applicable backlog but no real work is a starvation condition, not proof of activity.

## Evidence and validation doctrine
The system must preserve the distinction among retrieval, extraction, schema validity, evidence-backed research, canonical receipt, acceptance for validation, canonical validation, publication eligibility and publication.

Every material fact must be traceable through the applicable evidence lineage. Historical authoritative sources do not automatically establish current-state truth. Identity ambiguity fails closed. Producers may not self-promote extracted results to canonical truth.

## Absolute rules
Never trade truth for impressive scale. No synthetic officeholders, fake phone numbers, placeholder portraits presented as real, fabricated verification states, simulated worker activity, estimated physical production counts, or sample-to-universe completion claims.

`CAPABILITY_NOT_IMPLEMENTED` is not evidence and must never be transformed into `CHECKED_NO_AUTHORITATIVE_RESULT` without an actual implemented search of the defined authoritative scope.

No implementation may claim `ALL AGENTS WORKING`, `100% OPERATIONAL`, `FULLY VALIDATED`, or equivalent merely because capabilities are registered or tests pass. Use the End-to-End Acceptance, Conformance & Production Proof Contract.
