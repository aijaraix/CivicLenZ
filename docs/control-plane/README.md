# CivicLenZ Control Plane — Authoritative Documentation Index

This directory is the implementation reference for building and operating CivicLenZ as a continuous, evidence-first civic intelligence system.

## Read order
1. `PRODUCT_MISSION_AND_NONNEGOTIABLES.md`
2. `SYSTEM_ARCHITECTURE.md`
3. `HERMES_OPENCLAW_RUNTIME.md`
4. `WORKER_CATALOG_AND_RESEARCH_CONTRACTS.md`
5. `DATA_EVIDENCE_VERIFICATION.md`
6. `USER_PRODUCT_AND_ACTIONS.md`
7. `FLORIDA_ACTIVATION_PLAN.md`
8. `INFRASTRUCTURE_DEPLOYMENT_RUNBOOK.md`
9. `SECURITY_SECRETS_ACCESS.md`
10. `OPERATIONS_SRE_AUTONOMY.md`
11. `AI_AGENT_OPERATING_INSTRUCTIONS.md`

## Authority
These files describe the intended end-state architecture and operating rules. Existing implementation details may lag these documents. When code and these documents differ, do not silently invent behavior. Identify the mismatch, determine whether the document or implementation is stale, and reconcile through a reviewed change.

## Core architecture
- Seat-centric civic graph.
- Supabase is operational canonical relational state.
- R2 is raw immutable evidence storage.
- Cloudflare Workers/Queues are distributed collection and validation fabric.
- HERMES Prime on the CivicLenZ VPS is the persistent orchestration/control plane.
- OpenClaw provides agent/runtime integration where useful.
- Local quantized LLM handles inexpensive routing/judgment; external models are escalation resources.
- GitHub stores code, schemas, contracts, parsers, documentation, tests, and deployment configuration — not the live civic database.

## Absolute rule
Never trade truth for impressive scale. No synthetic officeholders, fake phone numbers, placeholder portraits presented as real, fabricated verification states, or simulated worker activity in production counts.