# HERMES + OpenClaw Runtime

## Purpose
HERMES Prime is the persistent CivicLenZ orchestrator. It does not replace Cloudflare collectors; it decides what work exists, what is missing, what is stale, what needs escalation, and what should run next.

## Initial VPS target
- 4 vCPU
- ~16 GB RAM
- Ubuntu 24.04 LTS
- Docker/Compose
- llama.cpp
- Qwen3-4B Q4_K_M
- OpenClaw
- HERMES Prime

## Core HERMES responsibilities
- heartbeat / liveness
- stale-lease recovery awareness
- work discovery
- ResearchContract completeness comparison
- missing-work generation
- prioritization and rate limiting
- worker/capability registry
- source-health awareness
- retry/dead-letter policy
- model routing
- monitoring schedules
- cohort safety gates
- operator reporting
- Academy/evolution reviews

## Evolution / Academy
Each logical worker should periodically evaluate whether it can improve its process within its authorized scope. Improvements must be proposed/tested, not silently rewrite production behavior. Track failure patterns, source changes, parser drift, false positives, duplicate creation, cost, latency, and validation outcomes.

## Local model role
The local model is a low-cost helper for bounded decisions such as:
- classify job type
- route to worker
- summarize worker result
- identify likely escalation need
- compare structured completeness state
- detect obvious anomaly patterns

It must not self-declare civic facts verified.

## Escalation ladder
1. deterministic parser/database logic
2. local Qwen model
3. inexpensive external model (for example Gemini Flash)
4. stronger external reasoning model only when justified

## Runtime isolation
- llama.cpp binds to localhost only by default.
- HERMES internal APIs bind locally or behind authenticated access.
- secrets stay in server secret stores/environment, never Git.
- worker permissions are scoped to required resources.

## Normal operation
Human PowerShell/manual operator triggers are emergency controls, not the operating model. Normal work should be generated, queued, recovered, and monitored by HERMES plus the Cloudflare control plane.