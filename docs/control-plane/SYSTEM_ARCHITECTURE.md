# System Architecture

## Runtime layers

### 1. CivicLenZ VPS — persistent control plane
Runs continuously and survives model-credit/session limits.

Primary components:
- HERMES Prime orchestrator
- OpenClaw runtime/integration layer
- local llama.cpp server with Qwen3-4B Q4_K_M initially
- work planner
- completeness engine
- monitoring planner
- source-health supervisor
- resource scheduler
- operator/control API
- health/metrics/logging

The VPS is the brain, not the high-volume scraper.

### 2. Cloudflare — distributed worker fabric
Keep distributed fetch/parse/validate workloads here:
- scheduler worker
- collector workers
- validator workers
- queue consumers
- dead-letter queues
- cron triggers where appropriate
- R2 raw evidence storage

Cloudflare should scale collection horizontally while HERMES decides what work should happen.

### 3. Supabase — canonical operational data
Supabase stores relational civic state, jobs, claims, evidence metadata, completeness and monitoring state. It is the operational source of truth for runtime civic state.

### 4. GitHub — engineering source of truth
GitHub stores:
- code
- schemas/migrations
- ResearchContracts
- worker definitions
- parsers
- tests
- docs
- deployment configuration

Do not use GitHub as the live civic database.

### 5. Public applications
Web/mobile experiences read publication-eligible canonical data. They must not expose raw unreviewed extraction as verified fact.

## Core graph
- Jurisdiction
- Seat
- Person
- SeatOccupancy
- Election
- CandidateCampaign
- Claim
- EvidenceObject
- ClaimEvidence
- CivicEvent
- ResearchContract
- Completeness state
- Monitoring state
- UserFollow
- Petition / civic Action

## Address resolution
Future required flow:
`street address -> geocode -> intersect federal/state/county/municipal/school/special-district geometry -> applicable Seats -> current occupants/elections/candidates`.

## Control loop
HERMES repeatedly performs:
`recover stale work -> discover -> assess completeness -> generate missing work -> prioritize -> dispatch -> collect -> validate -> reconcile -> publish eligible changes -> monitor -> repeat`.

## Model-routing principle
Use deterministic code first. Use the local model for inexpensive classification/routing/judgment. Escalate only tasks that genuinely require stronger reasoning to Gemini/Grok/OpenAI or other approved models.