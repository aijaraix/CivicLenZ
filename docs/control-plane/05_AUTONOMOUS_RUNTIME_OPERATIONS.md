# Step 5 — Autonomous Runtime, Infrastructure, and Maximum Safe Utilization

## Responsibility map
- HERMES Prime: persistent autonomous orchestration/control plane
- OpenClaw: conversation, research requests, action/tool workflows
- Qwen local: cheap bounded reasoning utility
- External models: exceptional escalation only
- Cloudflare Workers/Queues: distributed deterministic execution
- Supabase: structured civic operational/canonical state
- R2: raw evidence vault
- Vercel/Next: protected operator and public UI projections
- SentinelX: VPS operations/visibility
- GitHub: code, contracts, docs, tests, schemas, deployment configuration
- Codex/GrokBot: builders/debuggers, never runtime dependencies

## Event-first, heartbeat-backstop doctrine
Immediate events should trigger orchestration where possible: job completion, failure, source change, user research request, monitoring event, and capability availability. Heartbeats reconcile missed events, recover state, rebalance work, and drive continuous planning/evolution.

Suggested starting cadences to benchmark rather than hardcode forever:
- fast health/lease/queue/resource heartbeat: ~15–30 seconds
- planning/capacity heartbeat: ~1–2 minutes
- monitoring/due-work sweep: a few minutes, with source-specific schedules
- completeness/research planning: ~5–15 minutes or event-triggered
- Academy/evolution review: hourly, daily, or after sufficient sample volume

## Maximum safe utilization doctrine
The paid VPS should not intentionally idle while useful eligible backlog exists. HERMES continuously allocates available capacity to the highest-priority work while preserving operational headroom, source rate limits, stability, and recovery capacity.

Resource Governor observes:
- CPU/load
- RAM/swap pressure
- disk and I/O
- network
- local Qwen latency/concurrency
- browser sessions
- queue depth/throughput
- Cloudflare limits
- source 429/error rates
- external API/model cost

Use dynamic concurrency rather than a single fixed worker count. Increase deterministic concurrency when resources are healthy and backlog exists; reduce/stop new work under saturation, memory pressure, source throttling, or failure spikes. Preserve emergency/interactive headroom.

## Priority classes
Typical ordering:
0. system health / recovery / data-integrity protection
1. live election, officeholder, candidate, vacancy, certification changes
2. current monitoring, validation, contradictions, user-requested urgent research
3. baseline civic/research gaps
4. deep enrichment
5. historical backlog, source discovery, Academy benchmarking

Idle capacity automatically drains lower-priority work when higher-priority queues are empty.

## Job lifecycle
IDENTIFIED → QUEUED → LEASED → RUNNING → RESULT_SUBMITTED/VALIDATING → terminal state.

Required properties:
- idempotent dedupe key
- lease-before-work
- lease expiry/recovery
- duplicate-delivery protection
- machine-readable error_class
- explicit retry limit/backoff
- terminal worker run on every path
- dead-letter visibility
- audited manual controls
- no routine PowerShell dependency

## Cohort controller
Activate civic expansion in controlled cohorts such as Florida executive, Senate, House, federal delegation, counties, municipalities, school boards, and special districts.

Cohort states may include PREPARED, CANARY, ACTIVE, PAUSED, DEGRADED, SCOPE_RECONCILED_AS_OF, MONITORING.

Expansion gates examine parser yield, unexpected zero records, duplicates, schema/evidence writes, validation health, queue depth, source health, and unexplained record-count shifts.

## Cloudflare
Preserve and improve existing scheduler/collector/validator/queue/R2 work. Cloudflare is the high-throughput deterministic fabric; HERMES is the higher-level planner. Normal flow: HERMES creates canonical job → queue dispatch → worker leases → executes/writes evidence/state → terminalizes → HERMES observes result and creates follow-up work.

Cloudflare production configuration must be reproducible from GitHub plus secret stores. Codex may manage Workers/Queues/R2 through Wrangler/API using scoped Cloudflare tokens; never require the Global API Key.

## Heavy/browser work
Do not force browser automation, difficult PDFs, or long-running deep research into edge limits when VPS/OpenClaw is more appropriate. Large documents can be processed incrementally page/section at a time using deterministic/local tools rather than escalating solely for speed.

## Search/browser validation
Search Discovery and Browser Research are first-class capabilities. Search engines are discovery/corroboration aids, not source authority. Preserve and evaluate the underlying source. Repeated discoveries of authoritative systems should feed the Source Registry and evolve into reusable deterministic adapters.

## Model/resource economics
Default runtime path: deterministic code → local Qwen → external model only when genuinely necessary → human review for unresolved/high-risk cases.

The governor is primarily a Resource Governor, not just an LLM budget governor. Track compute, source politeness, storage, queues, browsers, network and model spend. Background work may trade latency for lower marginal cost but should still use available capacity efficiently.

## Monitoring/currentness
Each scope/source has a volatility-based schedule and stores current_as_of + next_check_at. Urgent election/candidate/result sources may run far more frequently than stable education/history fields. Successful scope reconciliation transitions immediately into monitoring, not a permanent complete state.

## Civic Events
Material validated changes create structured Civic Events which power operator/public timelines, alerts, RSS, notifications, and later citizen-action workflows.

## Academy/evolution runtime
Academy uses worker/source/model/validation telemetry to propose and test improvements. A major objective is to replace unnecessary model-assisted work with cheaper deterministic adapters as recurring structures become understood.

## Fail-closed behavior
Pause the smallest affected scope/source/capability on unexpected zero records, parser/duplicate spike, schema mismatch, evidence/claim persistence failure, validation spike, source throttling/unavailability, runaway spend, or repeated dead letters. Do not produce bad data to maintain throughput.

## Recovery design
The VPS must be reconstructable from GitHub + Supabase + R2 + securely restored secrets. Unique civic evidence must not exist only on the VPS. Back up configuration/state needed to recreate HERMES/OpenClaw; periodically test database/runtime restore procedures.

## Healthy autonomous state
Codex, GrokBot, ChatGPT and operators may all be offline while CivicLenZ continues recovering failures, dispatching eligible work, checking due sources, collecting evidence, validating, recalculating research scopes, generating Civic Events, monitoring, and expanding approved cohorts.
