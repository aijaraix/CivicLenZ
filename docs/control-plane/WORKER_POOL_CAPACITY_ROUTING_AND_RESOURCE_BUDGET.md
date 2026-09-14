# CivicLenZ Worker Pool Capacity, Routing & Resource Budget

## 1. Purpose
This document defines the initial physical worker topology, routing policy and resource-governance constraints for the CivicLenZ canonical runtime. It exists to prevent two failure modes:

1. treating every logical research capability as a dedicated persistent process/agent; and
2. overloading the shared CivicLenZ VPS with browser/model work that should be bounded or distributed.

This is an initial production operating budget, not a permanent fixed-size topology. The canonical Resource Governor may adjust concurrency from measured load while preserving these authority and safety limits.

## 2. Core doctrine
Logical capabilities are responsibilities. Physical workers are execution pools.

Therefore:
- 47 logical capabilities do NOT imply 47 persistent processes;
- one worker pool may serve many compatible capabilities;
- a capability is ACTIVE only when real routed work has executed recently;
- worker count must be derived from workload, source limits, resource availability and failure isolation;
- canonical HERMES remains the single scheduler/resource authority for canonical jobs;
- producer-local workers remain subordinate for canonical work.

## 3. Current host assumption
The current canonical VPS has been physically observed as a modest shared control-plane host in the approximate class of:
- 4 vCPU;
- 16 GB memory class;
- Ubuntu;
- local Qwen model service consuming a material fraction of available RAM;
- HERMES/OpenClaw/Qwen/ingest/Cloudflare tunnel already hosted.

This is a checkpoint, not a permanent hardware guarantee. Re-measure the host at deployment time.

## 4. Resource priorities
When resource pressure exists, preserve capacity in this order:
1. canonical HERMES scheduler/work ledger/lease integrity;
2. canonical ingest/validation integrity;
3. monitoring/currentness obligations with deadlines;
4. evidence persistence and queue durability;
5. lightweight deterministic workers;
6. producer bridge handling;
7. browser/model-assisted enrichment;
8. low-priority frontier/deep enrichment.

Do not allow optional model/browser work to starve canonical control-plane health.

## 5. Initial physical worker families
The initial canonical organization should use bounded worker families rather than one process per capability.

### 5.1 HERMES executive
Type: persistent canonical service.

Responsibilities:
- eligibility scan/event handling;
- priority planning;
- dependency resolution;
- Resource Governor;
- lease orchestration;
- dispatch;
- retry/DLQ routing;
- monitoring/gap planning;
- worker health/starvation visibility.

Initial physical instances: 1 logical active executive, supervised.

No active-active duplicate authority unless a future explicit HA contract defines leader election/fencing.

### 5.2 Deterministic HTTP/API collection pool
Responsibilities may include:
- rosters;
- candidate filings;
- election data;
- structured finance/disclosure feeds;
- public APIs;
- source health;
- metadata discovery.

Execution locations:
- Cloudflare preferred for scalable lightweight network work where source policy permits;
- VPS/local worker for bounded sources or integration-sensitive work.

Initial VPS concurrency target: 2 simultaneous lightweight tasks maximum unless measured headroom permits more.

Cloudflare concurrency: governed by queue consumer limits, source rate policy and canonical Resource Governor; do not assume unlimited concurrency.

### 5.3 Parser/extraction pool
Responsibilities:
- HTML parsing;
- PDF/text extraction after artifact retrieval;
- structured field extraction;
- finite-dataset enumeration;
- SourceLocator generation;
- deterministic normalization.

Initial local concurrency target: 2–4 lightweight CPU tasks, dynamically bounded by load.

Do not run CPU-heavy extraction concurrently with saturated local-model inference without Resource Governor approval.

### 5.4 Evidence/sealing pool
Responsibilities:
- byte hashing;
- artifact metadata;
- read-back verification;
- precise locator verification;
- evidence-object creation;
- R2 persistence/verification.

Initial concurrency target: 2 lightweight tasks.

Evidence sealing must not fabricate success when R2/storage is unavailable.

### 5.5 Canonical validation pool
Responsibilities:
- schema/contract validation;
- evidence validation;
- identity candidate generation/resolution support;
- temporal/currentness validation;
- contradiction checks;
- finite-dataset reconciliation;
- canonical disposition preparation.

Initial concurrency target: 2 workers/tasks, with priority over low-priority enrichment.

Scale only after observing Supabase/DB and CPU pressure.

### 5.6 GIS/boundary pool
Responsibilities:
- boundary retrieval;
- geometry normalization;
- point-in-polygon/address readiness;
- boundary evolution/version comparison.

Initial local concurrency target: 1 heavy GIS task or 2 lightweight API/geometry tasks.

Large geometry work may be offloaded/distributed if the current architecture supports it.

### 5.7 OpenClaw/browser pool
Responsibilities:
- dynamic sites requiring real browser/DOM execution;
- JavaScript-rendered government portals;
- bounded media/source discovery where deterministic retrieval is insufficient.

Initial browser concurrency target on shared VPS: 1.

Maximum default browser slots: 2 only after physical memory/CPU observation demonstrates safety.

A browser slot is expensive and must not be used when deterministic HTTP/API work is sufficient.

### 5.8 Qwen/local-model pool
Type: shared local model service, not one model per worker.

Responsibilities:
- bounded semantic extraction;
- classification where deterministic parser is insufficient;
- relationship/statement synthesis assistance;
- structured inference that remains evidence-bound.

Initial concurrent inference target: 1.

Increase only when measured memory/latency permits.

Qwen output never substitutes for primary evidence.

### 5.9 External-model routing pool
Gemini/other approved external models may be used only through explicit routing policy.

Use when:
- task materially benefits from model reasoning;
- deterministic/local paths are insufficient;
- cost/security policy permits it.

External-model availability is not required for base canonical runtime health.

### 5.10 Monitoring workers
Responsibilities:
- due-time source checks;
- source-health retrievals;
- content fingerprint comparison;
- change/no-change persistence;
- creation of follow-up ResearchNeeds.

Execution should be mostly lightweight and distributed where practical.

Initial local concurrency target: 1–2 monitoring checks; Cloudflare may absorb larger monitoring volume under source-rate controls.

### 5.11 Gap Detector worker
Gap Detector is primarily a deterministic comparison against canonical ResearchContract/evidence state.

Execution model:
- scheduled/event-driven batches;
- no need for many persistent personalities.

Initial concurrency: 1 logical batch worker, with batching and pagination.

### 5.12 Retry/DLQ worker
One logical recovery pool is sufficient initially.

Responsibilities:
- retry due work;
- classify terminal failures;
- detect poison jobs;
- route dead letters;
- avoid global stalls.

### 5.13 Academy analysis worker
Academy consumes production observations and failures.

Initial execution:
- scheduled/event-driven low-priority worker;
- one local logical worker is sufficient;
- proposals/tests may fan out to bounded test workers.

Academy does not consume resources ahead of canonical runtime stability.

### 5.14 Producer intake worker
Responsibilities:
- authenticate producer packages;
- persist receipt;
- acknowledge from receiver side;
- create validation work.

Initial concurrency target: 1–2 bounded consumers.

When producer backlog is released after an intake pause, throttle/ramp rather than draining everything simultaneously.

## 6. Cloudflare allocation doctrine
Cloudflare should absorb lightweight horizontally scalable execution such as:
- public-source collectors;
- source-health probes;
- scheduled checks;
- queue-based deterministic retrieval;
- lightweight validation transforms;
- event fan-out.

Cloudflare should not independently own:
- canonical priority policy;
- canonical ResearchWorkIdentity semantics;
- canonical identity resolution;
- canonical currentness truth;
- canonical publication.

## 7. Initial queue families
Prefer a small number of semantic queues rather than a queue per logical capability.

Recommended initial families:
- `civic-collect-light`
- `civic-parse`
- `civic-evidence`
- `civic-validate`
- `civic-gis`
- `civic-browser`
- `civic-model`
- `civic-monitor`
- `civic-retry`
- `civic-producer-intake`

Existing queue names may be retained if they cleanly map to these responsibilities. Do not recreate working queues merely to match names.

## 8. Queue routing requirements
Every canonical queue message must contain or reference:
- canonical job ID;
- ResearchWorkIdentity;
- capability/responsibility;
- subject/scope;
- attempt ID where applicable;
- priority;
- deadline/eligible_at;
- required tool/source policy;
- output contract;
- trace/lineage identity.

Consumer acknowledgement must be independent from producer dispatch state.

## 9. Resource Governor inputs
Resource Governor should sample/consider:
- host load average;
- CPU utilization;
- available memory;
- swap pressure;
- disk free space and I/O pressure;
- queue depths;
- DB latency/errors;
- R2/object-store errors;
- network failures;
- OpenClaw browser slot usage;
- Qwen memory/latency;
- source-specific rate limits;
- worker health;
- job priority/age/deadline;
- retry storms;
- producer intake backlog.

## 10. Initial host safety thresholds
These are conservative starting policies and must be tuned from real observation, not treated as immutable truth.

### Memory
- preserve at least ~2 GB host headroom where feasible;
- do not start additional browser/model-heavy tasks under material memory pressure;
- local-model and browser concurrency should be the first optional workloads throttled.

### CPU
- avoid sustained saturation across all cores;
- reserve capacity for HERMES, ingest and system supervision;
- reduce parser/browser/model concurrency when sustained load remains high.

### Disk
- reject/rate-limit artifact-heavy work before filesystem exhaustion;
- maintain a safety margin and alert well before critical fullness;
- large raw evidence should use R2 where approved rather than accumulating indefinitely on VPS disk.

### Swap
Swap use may protect availability but must not become normal model/browser operating capacity.

## 11. Qwen policy
The local Qwen service has previously been observed near a meaningful service memory ceiling.

Before increasing inference concurrency:
- inspect actual service memory limit;
- inspect current/peak RSS;
- inspect inference latency;
- confirm HERMES/system headroom.

Default: one inference at a time.

## 12. Browser policy
OpenClaw browser work is resource-expensive.

Default:
- 1 active browser task;
- queue additional browser work;
- scale to 2 only after measured safety;
- use deterministic alternatives first.

Never open one browser process per logical research capability.

## 13. Backpressure policy
When downstream systems slow:
- do not continue dispatching unbounded upstream work;
- pause/rate-limit the affected queue;
- preserve durable backlog;
- continue unaffected domains.

Backpressure sources include:
- Supabase latency;
- R2 errors;
- source rate limits;
- Cloudflare queue saturation;
- validation backlog;
- browser/model saturation;
- producer-intake bursts.

## 14. Priority classes
Use explicit policy-driven priority classes, for example:

### P0 — integrity/security
- lease corruption;
- invalid canonical transition;
- security incident;
- evidence hash mismatch affecting canonical state.

### P1 — time-critical civic currentness
- vacancy/occupancy change;
- statutory election deadline/event;
- critical monitoring change;
- canonical contradiction on current officeholder.

### P2 — active-cycle research
- candidate status;
- current campaign finance/disclosures;
- votes/legislation/official actions.

### P3 — completeness/deep enrichment
- biography;
- career;
- historical research;
- relationships;
- media enrichment.

### P4 — frontier/low-urgency enrichment
- broad expansion;
- low-priority historical depth;
- Academy experiments.

Priority must remain politically neutral and based on system/currentness obligations, not partisan or ideological considerations.

## 15. Fairness and starvation policy
Even with priorities, prevent indefinite starvation.

HERMES should expose:
- oldest eligible job by queue/domain;
- capability backlog;
- idle worker with eligible backlog;
- starvation duration;
- dispatch denial reason.

Use weighted fairness/aging where needed.

## 16. Source rate limiting
Rate limits belong to source/domain policy rather than a global arbitrary number.

Track per source:
- concurrency;
- minimum interval;
- 429/backoff state;
- robots/access constraints where applicable;
- error rate;
- circuit breaker state.

Do not bypass CAPTCHA/access controls/prohibited restrictions.

## 17. Failure isolation
A failing worker/source should reduce only its smallest necessary blast radius.

Examples:
- finance source outage does not stop biography work;
- browser failure does not stop deterministic API workers;
- Qwen failure does not stop canonical lease/validation work;
- R2 write issue pauses evidence-finalization path while permitted non-destructive work may continue to durable intermediate state.

## 18. Worker health semantics
A worker pool may be:
- READY — deployable but no recent work;
- ACTIVE — real recent successful executions;
- DEGRADED — work executes with elevated failures/latency;
- STARVED — backlog exists but worker receives no work;
- BLOCKED — explicit dependency/resource gate;
- FAILED — cannot perform assigned work;
- DISABLED — intentionally off.

Registration alone is not ACTIVE.

## 19. Worker scaling semantics
Scale based on observed queue pressure and resource headroom.

Scale up when:
- sustained eligible backlog exists;
- workers are healthy;
- downstream systems have capacity;
- source policy allows concurrency;
- resource headroom exists.

Scale down when:
- host pressure rises;
- source throttles;
- validation/storage backs up;
- failure rates increase;
- queues drain.

## 20. Producer/CivicsLenZz routing
CivicsLenZz remains an advance producer with its own producer-local daemon/backlog.

Canonical HERMES may:
- request bounded work from the producer if/when a canonical delegation contract is active;
- ingest producer packages;
- create validation jobs.

CivicsLenZz does not consume canonical VPS resources merely because it shares GitHub contracts unless explicitly deployed as a subordinate service.

If later deployed on the VPS, it receives its own bounded service/user/resources and cannot compete with HERMES for authority.

## 21. GitHub automation policy
GitHub coding-agent automations may be used for engineering maintenance such as:
- contract-drift checks;
- test repair proposals;
- parser-maintenance PRs;
- dependency updates;
- static anti-simulation scans;
- documentation conformance;
- CI triage.

They are not canonical civic research workers and must not become a second production scheduler.

Any experimental multi-model engineering router (for example GitHub tooling that routes coding-agent tasks among models) remains development infrastructure, not canonical runtime authority.

## 22. Work type -> preferred execution route
Preferred routing order:

### Structured public API
Cloudflare/deterministic HTTP worker -> parser -> evidence -> validation.

### Static HTML/document
HTTP collector -> parser -> evidence.

### Dynamic JS/interactive portal
OpenClaw browser worker -> artifact -> parser/evidence.

### PDF/document parsing
artifact retrieval -> deterministic PDF/text extraction -> model-assisted extraction only if needed.

### Semantic statement/platform extraction
retrieval/evidence first -> Qwen/local model -> approved external model only if needed.

### GIS
GIS adapter/worker -> geometry verification -> canonical boundary state.

### Monitoring
Cloudflare/lightweight monitor where possible -> canonical monitoring event.

## 23. Cost-routing doctrine
Use the cheapest mechanism that reliably satisfies the ResearchContract.

Order of preference generally:
1. existing canonical data/current evidence;
2. deterministic code/cache;
3. authoritative structured source;
4. lightweight HTTP/parser;
5. local model;
6. browser;
7. approved external model.

This is not absolute; source/tool requirements override cost preference where necessary for correctness.

## 24. Initial concurrency summary
These are starting targets only:

| Worker family | Initial local concurrency |
|---|---:|
| HERMES executive | 1 authority |
| Deterministic HTTP/API | 2 |
| Parser/extraction | 2–4 lightweight |
| Evidence/sealing | 2 |
| Canonical validation | 2 |
| GIS | 1 heavy / 2 light |
| OpenClaw browser | 1 (max 2 after proof) |
| Qwen inference | 1 |
| Monitoring | 1–2 local + distributed |
| Gap Detector | 1 logical batch |
| Retry/DLQ | 1 logical pool |
| Academy | 1 low-priority logical worker |
| Producer intake | 1–2 |

Do not blindly instantiate these as separate permanent OS processes. They are concurrency budgets/worker-pool semantics.

## 25. Canonical canary load
Initial cutover canaries should use minimal concurrency:
- one local deterministic job;
- one Cloudflare job;
- one validation job;
- one producer package;
- one monitoring check;
- one Gap Detector-generated job;
- one browser/model canary only if those routes are ready.

Do not release full producer backlog during first acceptance.

## 26. Ramp stages
After acceptance:

### Ramp A
Low canonical concurrency; one producer package at a time; observe queues/resources.

### Ramp B
Enable normal deterministic collection/validation throughput; keep browser/model bounded.

### Ramp C
Increase producer intake and distributed Cloudflare workload if validation/storage remains healthy.

### Ramp D
Tune long-term concurrency from measured throughput, latency and error rates.

Each ramp should be reversible through queue/intake throttles.

## 27. Required resource telemetry
Persist/expose at minimum:
- host CPU/load;
- memory available/RSS per major service;
- disk usage;
- Qwen RSS/latency;
- OpenClaw browser slots;
- queue depth by family;
- oldest job age;
- worker success/failure/latency;
- lease contention;
- retry/DLQ counts;
- DB latency/error rate;
- R2 write/read errors;
- source rate-limit/circuit state;
- producer intake rate/backlog.

## 28. Resource decision audit
For every dispatch denied by Resource Governor where eligible backlog exists, persist a machine-readable reason such as:
- MEMORY_PRESSURE;
- CPU_PRESSURE;
- BROWSER_SLOT_FULL;
- MODEL_SLOT_FULL;
- SOURCE_RATE_LIMIT;
- VALIDATION_BACKPRESSURE;
- STORAGE_BACKPRESSURE;
- DEPENDENCY_BLOCKED;
- QUEUE_DISABLED;
- SECURITY_POLICY.

## 29. No artificial utilization requirement
The system should not keep workers busy for appearance.

Idle is correct when:
- no eligible work exists;
- source policy blocks execution;
- Resource Governor is protecting integrity;
- dependencies are genuinely unsatisfied.

The objective is useful evidence-producing work, not activity counters.

## 30. Acceptance criteria
This budget is implemented when:
- canonical worker pools map to real processes/functions/consumers;
- one canonical scheduler controls canonical dispatch;
- concurrency is bounded and observable;
- HERMES maintains headroom under load;
- Cloudflare absorbs appropriate scalable work;
- browser/model routes are constrained;
- backpressure works;
- unrelated work continues when one pool fails;
- worker state derives from real execution;
- resource decisions are explainable.

## 31. Tuning authority
Codex/authorized canonical engineering agents may tune initial concurrency within existing approved infrastructure when physical telemetry demonstrates a need, provided:
- the single-orchestrator invariant remains intact;
- security boundaries are not broadened;
- no paid service is newly introduced without authorization;
- changes are observable/reversible;
- changes are documented in deployment/runtime state.

## 32. Completion report
Report:
- host resources observed;
- worker families deployed;
- actual process/function/queue implementation for each;
- configured concurrency;
- current active concurrency;
- queue depth;
- Resource Governor decisions;
- browser/model limits;
- Cloudflare queue/consumer limits;
- bottlenecks;
- tuning performed;
- remaining capacity constraints.

Do not describe logical capabilities as physical worker counts.