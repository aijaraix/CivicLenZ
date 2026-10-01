# CivicLenZ National Acquisition Campaign — Master Index

Status: PLANNING / EXECUTION CONTRACT
Date: 2026-09-30
Runtime source authority: Internal Forge / Recovery, NOT this documentation branch.

## Critical source rule
This documentation branch was created from provider main `0467e3534b358e2c9f40640d8a05acf5dcabab0a` because the current governed application checkpoint is preserved in Internal Forge/Recovery and is not published to the GitHub provider.

Latest recovered governed application checkpoint:
`47e7a847ed84b2bfc89018da4197dae5a205117f`
Branch identity: `recovery/civiclenz-full-swarm-commissioning`
Reported: Accepted Head = Internal Forge; immutable Recovery preserved; Truth Audit IN_SYNC; 333 regression tests PASS; TypeScript PASS; PostgreSQL acceptance PASS; no production deployment.

A Worker MUST physically revalidate that governed source before source mutation. Never use this docs branch as application source and never merge it over the governed application branch.

## Mission
Build the fastest evidence-safe national Seat + current official + Election + CandidateCampaign acquisition and monitoring system possible on existing infrastructure, while preserving HERMES as the single canonical authority.

Do not hard-code 500,000 or 513,200 as the current Seat total. The 2026 Census government universe is a seed; elected Seats must be derived.

## Read in this order
1. `CAMPAIGN_OPERATING_CONTRACT.md`
2. `SWARM_RECONCILIATION_AND_EXECUTION_MAP.md`
3. `RESOURCE_MAXIMIZATION_AND_CONCURRENCY_PLAN.md`
4. `WAVES_AND_ACCEPTANCE_GATES.md`
5. `WORKER_CAMPAIGNS.md`
6. Existing canonical control-plane documents referenced below.

## Mandatory existing canon
- docs/control-plane/AUTONOMOUS_RESEARCH_CONTROL_PLANE_MASTER_INDEX_AND_IMPLEMENTATION_ORDER.md
- docs/control-plane/WORKER_POOL_CAPACITY_ROUTING_AND_RESOURCE_BUDGET.md
- docs/control-plane/UNATTENDED_RESOURCE_GOVERNOR_AND_WEEKEND_OPERATIONS_2026_09_18.md
- docs/control-plane/SEAT_ELECTION_CANDIDATE_PARALLEL_RESEARCH.md
- docs/control-plane/NATIONAL_COVERAGE_ATLAS_AND_EXPANSION.md
- docs/control-plane/RESEARCH_WORK_LEDGER_SCHEDULER_AND_BACKLOG_EXECUTION_CONTRACT.md
- docs/control-plane/SOURCE_REGISTRY_RETRIEVAL_EXTRACTION_AND_EVIDENCE_EXECUTION_CONTRACT.md
- docs/control-plane/MONITORING_CURRENTNESS_FAILURE_RECOVERY_AND_ACADEMY_EVOLUTION_CONTRACT.md

## Repository roles
- `aijaraix/CivicLenZ`: canonical product/backend/evidence/validation authority.
- `aijaraix/CivicsLenZz`: historical/producer lineage and responsibility taxonomy. It is not canonical publication authority.

## Execution doctrine
Logical responsibilities do not equal machines. Preserve the historical responsibility catalog, execute it through reusable capability families and horizontally scaled pools, and let HERMES allocate concurrency from measured resource headroom.

Every meaningful application change:
COMMIT -> Gateway checkpoint -> Internal Forge -> immutable Recovery -> Accepted Head -> VERIFY -> CONTINUE.

No production deployment is authorized merely by this campaign package.
