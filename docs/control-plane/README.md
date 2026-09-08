# CivicLenZ Control Plane — Authoritative Documentation Index

This directory is the implementation reference for building and operating CivicLenZ as a continuous, evidence-first civic intelligence system.

## Foundation: the five locked architecture steps
Read these first and treat them as the current architectural decisions:
1. `01_TRUTH_RESEARCH_LIFECYCLE.md`
2. `02_HERMES_AGENTS_EVOLUTION.md`
3. `03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md`
4. `04_OPERATOR_PUBLIC_PRODUCT.md`
5. `05_AUTONOMOUS_RUNTIME_OPERATIONS.md`

## Supporting architecture
Then read:
6. `PRODUCT_MISSION_AND_NONNEGOTIABLES.md`
7. `SYSTEM_ARCHITECTURE.md`
8. `HERMES_OPENCLAW_RUNTIME.md`
9. `WORKER_CATALOG_AND_RESEARCH_CONTRACTS.md`
10. `DATA_EVIDENCE_VERIFICATION.md`

Additional implementation/runbook documents should be added/reconciled here as they are completed, including product/actions, Florida activation, infrastructure deployment, security/secrets, operations/SRE autonomy, and AI-agent operating instructions.

## Authority
These files describe the intended end-state architecture and operating rules. Existing implementation details may lag these documents. When code and these documents differ, do not silently invent behavior. Identify the mismatch, determine whether the document or implementation is stale, and reconcile through a reviewed change.

## Core architecture
- Seat-centric civic graph.
- No global profile `COMPLETE`; bounded scopes are reconciled/current as-of a cutoff and remain monitored.
- Supabase is operational canonical relational state.
- R2 is raw immutable evidence storage.
- Cloudflare Workers/Queues are distributed collection and validation fabric.
- HERMES Prime on the CivicLenZ VPS is the persistent orchestration/control plane.
- OpenClaw is both conversational gateway and execution/tool layer.
- Local Qwen is a bounded inexpensive reasoning utility; external models are escalation resources, not default processing.
- Search/browser workers are discovery/corroboration tools; underlying sources become evidence, not search snippets.
- GitHub stores code, schemas, contracts, parsers, documentation, tests, and deployment configuration — not the live civic database.
- Codex/GrokBot/ChatGPT are builders/copilots, never runtime dependencies.

## HERMES doctrine
CivicLenZ is continuously operating and continuously improving. Every worker executes, measures, learns, and improves within its authorized scope. Monitoring keeps civic knowledge current; Academy/evolution improves the machinery that produces that knowledge. HERMES may evolve research methods but must not silently lower or change verification/publication truth standards.

## Efficiency doctrine
Use deterministic collection first. Allocate paid compute continuously to the highest-priority eligible backlog under maximum safe utilization, preserving operational headroom, rate limits, stability, and recovery capacity. Prefer event-driven reactions with heartbeats as reconciliation/recovery backstops.

## Absolute rules
Never trade truth for impressive scale. No synthetic officeholders, fake phone numbers, placeholder portraits presented as real, fabricated verification states, simulated worker activity, or estimated physical production counts.

`CAPABILITY_NOT_IMPLEMENTED` is not evidence and must never be transformed into `CHECKED_NO_AUTHORITATIVE_RESULT` without an actual implemented search of the defined authoritative scope.
