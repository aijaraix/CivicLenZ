# CivicLenZ Unattended Resource Governor & Weekend Operations — 2026-09-18

## Objective
Keep the autonomous research machine usefully busy unattended while preserving evidence integrity, source limits, validation capacity and operational headroom.

## Continuous loop
`eligible backlog -> reserve/lease -> execute bounded work -> persist retrieval/evidence/output -> handoff -> terminalize/retry/dead-letter -> release capacity -> immediately select next eligible work`.

Interactive engineering sessions are not runtime dependencies.

## Capacity model
Concurrency is measured, not an arbitrary permanent batch size. Resource Governor observes:
- CPU/load;
- memory;
- DB connections/load/latency;
- queue depth and lease age;
- R2/object/network throughput;
- source-specific rate limits/throttling;
- provider/model capacity;
- validation backlog;
- worker failure/retry rate;
- reserved recovery/operator headroom.

After a capability is physically proven, increase concurrency gradually while thresholds remain healthy. A constrained source throttles its lane, not unrelated work.

## Fairness and work selection
Maintain progress across discovery, deep enrichment, validation, completeness and monitoring. Prevent one giant dataset from starving other critical families. Workers select the highest-priority eligible compatible work under canonical dependencies and reservations.

## Lane-local failure doctrine
Permission, credential, parser, rate-limit or source failures block only the affected lane and true dependents. Record exact blocker and required human action; continue unrelated safe work.

Global stop is reserved for shared integrity/security failures such as unavailable/corrupt canonical ledger, compromised authority boundary, or evidence persistence failure that makes continued work unsafe.

## Retry/dead-letter
Preserve attempts and lineage. Never reset attempts to manufacture success. Retry only under canonical policy and changed/retryable conditions. Dead-lettered work remains inspectable and must not freeze unrelated backlog.

## Validation backpressure
Collection may outpace validation only within bounded safe backlog. If validation debt crosses configured thresholds, reduce acquisition concurrency and allocate capacity to validation. Never bypass validation to maintain throughput.

## Source politeness
Respect source terms, robots/access controls where applicable, explicit API quotas, HTTP throttling and reasonable request rates. Prefer deterministic APIs/datasets when authoritative and available. Do not circumvent access controls.

## Evidence durability
A worker is not considered productively complete until required durable output/handoff exists. Logs alone are insufficient. Uncertain attribution remains quarantined.

## Monitoring
Dynamic scopes create durable monitoring obligations. Due monitoring competes in Resource Governor scheduling according to priority/currentness. Monitoring changes generate new evidence/reconciliation work.

## Unattended health
Persist heartbeat/telemetry sufficient to detect:
- orchestrator stopped;
- queue stalled;
- leases expired;
- repeated worker failures;
- source degradation;
- validation backlog growth;
- DB/object-store pressure;
- no-progress intervals.

Recovery must be supervised/restart-safe and must not require Codex.

## Weekend ramp
1. prove current generic collector/router;
2. prove several independent capability families;
3. prove multiple subjects;
4. observe a bounded low-concurrency period;
5. verify durable growth and error rates;
6. raise concurrency incrementally;
7. repeat until measured safe operating level;
8. leave safety headroom rather than chasing maximum utilization.

## Weekend handoff snapshot
Record:
- deployed SHAs/deployments/PIDs;
- safety gates;
- enabled capabilities and effective concurrency;
- subject/Seat/candidate counts;
- queue/lease/dead-letter counts;
- worker throughput by family;
- retrieval/evidence/structured-unit growth;
- validation backlog/throughput;
- monitoring due/overdue;
- source health;
- resource utilization;
- unresolved human blockers.

## Monday evaluation
Measure growth rather than relying on UI completeness: discovered subjects, active dossiers, completed work units, evidence, normalized domain records, finance units, social-account candidates, promises/statements, government actions, GIS/boundaries, validations, coverage state, monitoring and unresolved leads.

A beautiful UI is not evidence of a running machine. Durable weekend growth is.
