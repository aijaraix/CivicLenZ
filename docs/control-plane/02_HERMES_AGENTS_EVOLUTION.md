# Step 2 — HERMES, OpenClaw, Directors, Workers, and Evolution

## HERMES Prime
HERMES Prime is the persistent executive control plane. It owns priorities, scheduling, capability availability, retries, lease recovery, source health, cohort control, resource governance, model routing, monitoring, and evolution.

HERMES is not itself the civic truth authority and is not a one-shot researcher.

## Logical directors
Recommended functional domains:
- Discovery Director
- Identity Director
- Election Director
- Background Director
- Finance & Disclosure Director
- Government Activity Director
- Accountability Director
- Evidence & Verification Director
- Monitoring & Civic Events Director
- Geospatial Director
- Publication Director
- Academy / Evolution Director

Directors are logical orchestration roles, not necessarily separate processes.

## Worker doctrine
Workers are reusable capabilities, never one worker per politician. Every worker must have:
- mission
- accepted job contract
- inputs
- allowed sources/tools
- deterministic/AI-assisted mode
- expected outputs
- evidence obligations
- bounded completion/currentness rule
- freshness/monitoring rule
- retry/escalation behavior
- prohibited behavior
- telemetry
- evolution charter

Each worker continuously maintains its assigned scope rather than merely 'finding some information'.

## OpenClaw
OpenClaw is both a tool-execution layer and CivicLenZ conversational gateway.

Three modes:
1. Reader: answer from eligible existing civic data.
2. Research request: if data is missing/stale/insufficient, submit a HERMES research request and notify the requester when appropriate.
3. Action: later support follows, alerts, petitions, messages, civic actions, and related workflows.

OpenClaw never invents missing civic facts. User demand may raise work priority but never lower evidence or verification standards.

## Named agents
Human-friendly names may be assigned to directors/workers, but names/personality never change evidence rules. Each named agent must still have a strict functional charter, tools, limits, and prohibited behavior.

## Local Qwen
Qwen3-4B Q4_K_M via llama.cpp is a cheap local reasoning utility for routing, classification, lightweight extraction, telemetry summaries, anomaly detection, and escalation decisions. It is not an authority for political/civic truth.

## Deterministic-first doctrine
Use HTTP, HTML/DOM, JSON, CSV, XML, RSS, APIs, PDF text extraction, hashing, diffs, database logic, reconciliation, and GIS before model inference whenever practical.

Discovery escalation ladder:
1. known authoritative API/feed
2. known authoritative HTML/document
3. Source Registry alternatives
4. search-engine discovery
5. browser exploration
6. local Qwen interpretation
7. external model only if still necessary
8. human review where required

Search-engine snippets or AI summaries are navigation aids, not evidence. Follow and preserve the underlying source.

## Evolution is a primary HERMES purpose
Every role has two responsibilities: perform its civic function and continuously improve its ability to perform that function within policy.

Evolution loop:
WORK → OBSERVE → MEASURE → IDENTIFY WEAKNESS → LESSON → IMPROVEMENT PROPOSAL → TEST → VALIDATE → SAFE PROMOTION → MEASURE AGAIN.

Academy records should include observation, telemetry, lesson, affected role, proposal, risk, test plan, benchmark, result, approval state, version introduced, and post-deployment outcome.

### Safe evolution
Examples: parser improvements, source ranking, retry tuning, caching, deterministic extraction, batching, cost/latency improvements.

### Governed evolution
Requires review/gating: verification standards, publication rules, ResearchContract changes, source authority policies, sensitive-data categories, relationship inference rules, production schema changes.

Absolute rule: HERMES may evolve how it researches; it may not silently evolve what counts as truth.

## Heartbeats
Operational heartbeats maintain liveness, leases, queues and work dispatch. Evolution heartbeats separately inspect worker telemetry, source performance, failures, corrections, costs, validation rejection patterns, and improvement opportunities.
