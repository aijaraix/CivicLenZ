# CivicLenZ Physical Capability Registry & Swarm Execution Contract

## 1. Purpose

CivicLenZ must distinguish the research organization it intends to have from the workers that are physically executable now.

A logical capability name, ResearchContract field, class named Agent, queue declaration, source registration, prompt, or documentation entry does not prove that a real worker can execute that responsibility.

This contract makes the physical capability registry mandatory and turns it into the bridge between ResearchContracts, HERMES Prime, worker pools, tools/sources, evidence, validation, monitoring, and operator visibility.

## 2. Core invariant

For every declared research capability CivicLenZ must be able to answer from durable physical state:

- capability key and family;
- implementation state;
- implementing module/process/service;
- runtime location;
- queue/wakeup/lease path;
- allowed tools and source classes;
- accepted job contract;
- output contract;
- evidence obligations;
- dependency requirements;
- maximum/current concurrency policy;
- last real production job;
- last real successful run;
- last real retrieval/evidence produced;
- current backlog;
- recent failures/dead letters;
- current health/state;
- whether it can produce canonical work now;
- whether it has an independent validation/audit path;
- monitoring/currentness behavior after bounded completion.

If any required physical path is absent, the capability is not ACTIVE.

## 3. Capability state semantics

Use these states honestly:

- DECLARED: canonical capability exists conceptually.
- NOT_IMPLEMENTED: no physical execution path exists.
- IMPLEMENTED_UNPROVEN: code exists but no valid production execution proof.
- READY: implementation/deployment/tooling are present and eligible for a bounded production proof.
- ACTIVE: recent real production work proves lease -> execution -> evidence/output -> handoff/terminal state.
- DEGRADED: execution exists but material failure/quality/source issues reduce capability.
- BLOCKED: implementation exists but dependency, source, credential, security, or policy gate prevents current execution.
- DISABLED: deliberately turned off.
- FAILED: repeated terminal failures require repair.

ACTIVE must never be inferred from code existence or configuration alone.

## 4. Reusable capability pools, not one agent per politician

CivicLenZ uses reusable capability pools. A `campaign_finance` capability may process Person A, then Person B, then Person C. A `portrait` capability may process one subject and immediately lease the next eligible portrait task.

Logical capabilities may share a physical worker process when the implementation is safe and observable. Likewise one capability may use many physical worker instances under Resource Governor control.

Therefore:

`logical capability count != process count != concurrent worker count`.

The operator UI must show all three separately.

## 5. Mandatory registry fields

Implement or project a machine-readable registry with equivalent fields:

```text
capability_key
family
state
implementation_version
worker_module
service_or_deployment
runtime
queue_or_wakeup
accepted_job_types
accepted_scope_keys
allowed_tool_classes
allowed_source_classes
requires_identity_resolution
requires_dependencies
output_contract
canonical_authority
verification_authority
publication_authority
current_concurrency
max_safe_concurrency
last_job_id
last_worker_run_id
last_started_at
last_succeeded_at
last_evidence_at
backlog_eligible
backlog_blocked
recent_failures
recent_dead_letters
health_reason
next_action
```

Verification and publication authority must remain false for ordinary research workers/producers.

## 6. ResearchContract to capability mapping

Every applicable ResearchContract scope must resolve to one of:

1. a physical ACTIVE/READY capability route;
2. a truthful dependency blocker;
3. CAPABILITY_NOT_IMPLEMENTED.

No applicable scope may silently disappear because no worker exists.

ResearchContracts should be granular enough to express the actual depth obligations. A coarse field such as `campaign_finance` may own many child work identities including filing periods, committees, transactions, amendments, expenditure universes, reconciliation, and independent coverage audit.

A 1,000–2,000+ data-point dossier target should be implemented through normalized scopes/records/related datasets, not a 2,000-column Person row.

## 7. No sibling-wait execution barrier

Independent work for the same subject must not serialize.

Once a subject is sufficiently identity-resolved, HERMES may create the full applicable graph. Each eligible node enters the appropriate global capability pool.

A worker terminalizes its bounded task and immediately becomes eligible for the next task in that pool, regardless of whether sibling tasks for the prior subject remain open.

Only real dependency edges may block work.

## 8. Resource Governor

HERMES Prime controls how much physical work runs concurrently.

Concurrency is based on measured:

- CPU/RAM/swap;
- database connection and latency pressure;
- queue depth and lease health;
- network/storage I/O;
- browser capacity;
- model/local inference capacity;
- Cloudflare/provider limits;
- source rate limits/429/error rates;
- validation backpressure;
- retry/dead-letter rate;
- external cost policy;
- reserved recovery/interactive headroom.

Fixed cohort sizes are production-proof/safety tools, not steady-state throughput policy after a capability is proven.

## 9. Physical communication path

For every capability prove the path appropriate to that worker:

```text
ResearchNeed / ResearchWorkIdentity
-> scheduler/reservation
-> lease
-> queue/tool invocation
-> worker execution
-> retrieval/raw artifact where applicable
-> evidence/extraction/output
-> durable worker_run
-> result/handoff
-> independent canonical validation/reconciliation
-> scope coverage update
-> Gap Detector
-> monitoring obligation / next work
```

The operator must be able to drill from capability -> job -> worker_run -> retrieval/evidence -> validation -> coverage state.

## 10. Aggregation and persistence

Worker output is not complete merely because a worker returned JSON.

All useful output must be durably reconciled into the approved structured stores and evidence graph. Raw evidence belongs in the evidence/object path; normalized entities, claims, relationships, dataset units, coverage/currentness, and monitoring state belong in canonical structured storage.

A producer-local or worker-local result that has not reached durable canonical state must remain visibly pending/unpublished.

## 11. Collector / coverage auditor / validator separation

High-value deep-research scopes use at least three logical boundaries where applicable:

1. Collector/researcher acquires and extracts the defined universe.
2. Coverage/completeness auditor independently checks exhaustion, missing units/source families/open leads, and rediscovery misses.
3. Canonical validator/reconciler checks identity, evidence, temporal semantics, contradiction state, dataset reconciliation, and publication eligibility.

One worker cannot self-certify exhaustive research or material civic truth.

## 12. Monitoring workers

Persistent monitoring is represented as durable obligations, cursors/fingerprints/schedules/events, not one permanent process per politician.

Due obligations generate eligible work for reusable monitoring capabilities. Workers check the source, preserve change evidence, terminalize, update the cursor/fingerprint/currentness state, and return to the pool.

## 13. Physical agent/capability operator view

The private operator dashboard must include:

- declared capabilities by family;
- ACTIVE / READY / BLOCKED / NOT_IMPLEMENTED / DEGRADED counts;
- physical worker services/processes/deployments;
- current effective concurrency;
- jobs running/queued/leased/retrying/dead-lettered;
- backlog by capability and scope;
- last successful run/evidence timestamp;
- source/tool dependencies and health;
- validation backlog;
- monitoring due/overdue;
- capability implementation gaps preventing dossier depth.

Do not display a misleading single number called `agents running` without defining whether it means logical capabilities, physical processes, or concurrent leased work.

## 14. Current audit checkpoint — 2026-09-17

This section is a dated checkpoint, not permanent truth. Revalidate before implementation.

At canonical repo `9ab9b5f103322dd5bbc677611110d362f22c067c` and the then-live database/runtime:

- the canonical worker catalog declares 73 reusable capabilities across 10 families;
- only 8 distinct worker keys had durable `worker_runs`;
- those worker keys were primarily scheduler/collector/validator plus HERMES evidence/extraction/validation/validation-followup/producer-receipt-validation paths;
- canonical Supabase contained one active ResearchContract: `STATE_GOVERNOR` version 1 with 25 coarse contract fields;
- the deployed HERMES release was `3379f55583a2ea8fef28088779ccf38b5cad1e0e`;
- the deployed canonical `capability_router.py` routed only `scope_key=evidence` to `authoritative_evidence_retrieval`; other scope requirements failed closed as `CAPABILITY_NOT_IMPLEMENTED`;
- current physical canonical counts were 1 Person, 1 Seat, 1 Occupancy, 2 Claims, 0 verified Claims, and 5 active monitoring records;
- there were 30 queued and 2 leased `contract_scope_research` jobs at the audit moment, plus other historical/monitoring queues.

This proves that the broad logical swarm design exists in canon but the majority of deep-research capabilities are not yet physically executable.

## 15. Immediate implementation priority

Do not create 73 separate long-lived services merely to match the catalog.

Instead:

1. build the physical capability registry from live state;
2. group compatible capabilities into efficient reusable worker implementations;
3. implement/activate the highest-value STATE_GOVERNOR deep-dossier capability routes first;
4. prove each new route with real work and evidence;
5. after proof, allow Resource Governor scheduling continuously;
6. use Academy telemetry to evolve recurring browser/model work into deterministic adapters;
7. keep unsupported capabilities explicitly visible until implemented.

Priority capability lanes for the reference dossier include identity/foundation, portrait/contact/social, biography/history, finance/disclosure, government activity, promises/statements, media/news, relationships/public-record accountability, GIS/elections, evidence validation, completeness audit, and monitoring.

## 16. Acceptance

The physical swarm is not proven until:

- every applicable reference-dossier scope has a physical route or explicit blocker;
- multiple independent capabilities execute concurrently;
- workers move to the next eligible task without sibling-wait barriers;
- results survive restart/session disconnect through durable stores;
- evidence/validation/reconciliation is inspectable end to end;
- capability state is derived from real telemetry;
- the private operator UI reflects the same physical state;
- public projection receives only publication-eligible canonical results.
