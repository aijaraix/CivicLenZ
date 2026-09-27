# CivicLenZ Full Swarm Commissioning Directive — 2026-09-27

## Authority and purpose

This directive converts the accepted CivicLenZ Capability Factory into a staged commissioning program. It does **not** redesign CivicLenZ, recreate preserved engineering, authorize production deployment, or weaken evidence/identity/publication gates.

Canonical project identity:

- Project: `civiclenz`
- Repository role: `application`
- Repository: `aijaraix/CivicLenZ`
- Repository ID: `1278897859`
- Provider main observed at audit: `0467e3534b358e2c9f40640d8a05acf5dcabab0a`
- Gateway Accepted Head / Internal Forge Head: `270edb04393e5ccdc3b2fbbcf7f0f4f70c7cde7e`
- Immutable Recovery: `VERIFIED`
- Deployment authorization: **SEPARATE**

Fresh Gateway truth always wins.

## Physical audit baseline

The 2026-09-27 physical audit found:

- HERMES Prime service running from release `0467e353...`, not Accepted Head `270edb0...`.
- HERMES startup evidence reported `dispatch_active: false`.
- Host load was effectively zero, with about 9.6 GiB available RAM and 59 GiB free disk; compute capacity was not the immediate bottleneck.
- Production contained 301 jobs: 180 succeeded, 112 queued, 8 dead-letter, 1 cancelled.
- Worker runs: 233 succeeded, 38 failed, 8 remained `started`.
- 20 Seats existed but only 1 Person and 1 SeatOccupancy.
- 14 sources existed; only 3 reported `ok`, while 11 remained `UNOBSERVED`.
- 45 evidence objects and 2 claims existed.
- Readiness migrations are present, but lifecycle migrations 13000/14000/15000 are not in production migration history.

The objective is not a cosmetic ACTIVE count. The objective is verified subjects automatically progressing toward increasingly deep, evidence-backed dossiers through normal planner-generated work.

## Governing doctrine

A Person is never globally COMPLETE.

Finite datasets reconcile only against an explicit cutoff. Open-ended research uses bounded saturation/currentness, independent rediscovery, unresolved-lead closure, coverage auditing and persistent monitoring.

No fabricated civic truth. No manually manufactured production jobs merely to satisfy acceptance. No attempt resets. No historical lineage deletion. Occupancy remains independently gated. Publication remains independently gated.

## Automatic advancement rule

Stages 1–3 are non-production engineering/acceptance stages.

When a stage passes all of its acceptance criteria, the Worker SHALL:

1. preserve evidence;
2. commit any legitimate engineering changes;
3. submit through Gateway;
4. verify immutable Recovery and Internal Forge;
5. route publication through the Control Plane;
6. perform provider reread, Truth Audit and Compliance Attestation where applicable;
7. proceed immediately to the next stage.

Do not return to the owner between successful Stages 1–3.

A failed acceptance criterion stops advancement and returns exact evidence. Do not cosmetically repair a failure.

**HARD STOP:** production migration, deployment, service restart/release switch, production feature-flag enablement, production-data mutation, DNS change, or concurrency increase requires separate explicit authorization. Stage 3 must produce the bounded production commissioning package and stop at that gate.

---

# Stage 1 — Production-faithful lifecycle SQL acceptance

## Mission

Validate the exact Accepted Head implementation and its lifecycle schema outside production.

Required migrations:

- `20260923013000_capability_result_lifecycle.sql`
- `20260923014000_capability_coverage_audit_loop.sql`
- `20260923015000_capability_continuity_finalization.sql`

Prepared harness reference:

- `POSTGRES_CAPABILITY_LOOP_E2E.md`
- `services/hermes-prime/tests/capability_continuity_finalization_sql.test.mjs`

## Required work

- Obtain source only from Gateway-selected Recovery/Internal Forge Accepted Head.
- Verify source head is exactly the current Gateway-selected head.
- Inspect all three migrations for ordering, idempotency assumptions, constraints, grants, indexes, trigger/function dependencies and compatibility with the current production schema.
- Run the prepared lifecycle SQL harness against a disposable production-faithful PostgreSQL/PGlite environment.
- Run the focused Capability Factory/controller/lifecycle tests.
- Do not use production Supabase as the disposable test database.
- Record exact test commands, versions and results.

## PASS

`POSTGRES_E2E=PASS`, focused tests pass, migrations are compatible in order, and no unresolved production-schema incompatibility remains.

On PASS, publish evidence/legitimate engineering through Gateway and automatically enter Stage 2.

---

# Stage 2 — Throughput, queue, source and identity root-cause audit

## Mission

Explain physically why CivicLenZ is not turning discovered seats/roster units into verified people and deep dossiers at useful scale.

## Required analyses

### Dispatch and queue

Inventory the production work ledger without mutating it:

- queued jobs by age, capability, source family, subject/seat, attempt count and dependency state;
- dead-letter jobs by terminal cause;
- `started` worker runs by age, lease/run state and whether they are genuinely stale;
- queue selection/lease eligibility;
- HERMES dispatch gates and environment/configuration;
- planner generation versus dispatcher consumption;
- validation/audit/monitoring backpressure.

Do not reset attempts or leases.

### Identity/name conversion

Trace the authoritative path from:

`unresolved_roster_units → ResearchNeed/ResearchWork → evidence → identity resolution → Person → independently verified Occupancy`

Explain physically why the current state is approximately:

`20 Seats → 19 unresolved roster units → 1 Person → 1 Occupancy`.

Do not weaken identity or occupancy verification to improve counts.

### Sources

For all registered source families:

- classify observed/healthy, unobserved, blocked, rate-limited, parser failure, contract failure or not-yet-dispatched;
- verify that one failing source (including Florida DOS) cannot block independent source families;
- determine why 11 registered sources remain UNOBSERVED;
- identify missing source-family work generation versus retrieval/parser/runtime failure.

### Capability families

Measure backlog and actual successful execution by capability family. Verify that generalized planner/router/lifecycle code is reachable through the normal HERMES loop.

### Non-production fixes

If Stage 2 reveals genuine code/configuration defects that can be repaired without production mutation:

- implement bounded fixes;
- add regression tests;
- commit;
- submit through Gateway;
- verify Recovery/Forge/publication evidence.

Do not deploy those fixes.

## PASS

Stage 2 passes when every major bottleneck has a physically evidenced cause and all necessary non-production fixes are tested/preserved, producing an exact commissioning candidate.

Automatically enter Stage 3.

---

# Stage 3 — Production commissioning package

## Mission

Produce one exact, reviewable production change package. Do not execute it.

The package must identify:

- exact canonical application SHA to deploy;
- exact migration files and order;
- preflight schema checks;
- migration fail-closed conditions;
- rollback/forward-repair strategy;
- exact HERMES and collector release source;
- required environment changes, including whether `HERMES_CAPABILITY_CONTINUITY=true` is required;
- dispatch activation prerequisites;
- safety gates that must remain unchanged;
- post-migration and post-deployment verification queries;
- queue acceptance criteria;
- identity/name-flow acceptance criteria;
- source-family acceptance criteria;
- validation/coverage/remediation/monitoring acceptance criteria;
- resource thresholds for later concurrency ramp;
- exact production actions requiring owner authorization.

## Production acceptance sequence to prepare

After later explicit authorization, the intended physical sequence is:

1. Preflight.
2. Apply migrations 13000 → 14000 → 15000.
3. Verify schema.
4. Deploy exact canonical HERMES/collector release.
5. Enable continuity/dispatch only after prerequisites pass.
6. Observe **existing normal planner-generated backlog**; do not manufacture acceptance jobs.
7. Prove queue leasing and natural backlog consumption.
8. Prove multiple subjects progress concurrently.
9. Prove multiple capability families execute.
10. Prove multiple source families are physically observed.
11. Prove semantic structured/unresolved outputs.
12. Prove independent validation.
13. Prove coverage audit.
14. Prove deterministic audit remediation without duplicates.
15. Prove monitoring obligations without duplicates.
16. Prove unchanged evidence does not reopen work.
17. Prove timestamp-only changes do not reopen work.
18. Prove a changed stable evidence marker creates exactly one bounded reopened ResearchWork.
19. Prove telemetry READY → ACTIVE only from real successful execution.
20. Verify publication, identity and occupancy gates remain intact.
21. Measure resources and only then consider concurrency 4 → 8 → higher.

## HARD STOP

At completion of Stage 3 return the commissioning package and request the single consequential production authorization. Do not perform Stage 4+ actions in the same authority envelope.

---

# Stage 4+ — Post-authorization physical commissioning

This section is planning authority only until separately authorized.

Once production authorization is explicitly granted, execute the prepared sequence continuously. A successful gate advances automatically. A failed gate stops and preserves evidence.

## Stage 4 — Migrate
Apply the tested lifecycle migrations in order and verify physical schema state.

## Stage 5 — Deploy
Deploy the exact authorized canonical HERMES/collector release. No unrelated source changes.

## Stage 6 — Activate
Enable only the reviewed continuity/dispatch settings. Preserve all safety gates.

## Stage 7 — Natural backlog proof
Use existing normal planner-generated work. Demonstrate leasing, execution and queue-age reduction.

## Stage 8 — Multi-subject/name proof
Demonstrate multiple eligible subjects moving concurrently from discovery/identity leads into evidence-backed Persons/dossiers without weakening identity/occupancy gates.

## Stage 9 — Perpetual-loop proof
Demonstrate validation, coverage auditing, remediation, monitoring and bounded change reopening across multiple capability/source families.

## Stage 10 — Resource-measured scaling
Measure CPU/load, memory, disk, DB latency/connections, queue depth/age, source rate limits/429s, worker failure/dead-letter rate, validation backlog, audit backlog and monitoring backlog. Increase concurrency only while useful throughput improves safely.

---

# Product success metrics

Report these after commissioning:

- verified Persons created per day;
- active dossiers progressing concurrently;
- subjects with multiple source families observed;
- evidence objects per subject and per day;
- validated claims per subject;
- unresolved leads and closure rate;
- jobs completed/hour;
- oldest queued job age;
- dead-letter rate;
- validation lag;
- coverage-audit backlog;
- remediation backlog;
- monitoring obligations;
- changed-evidence reopenings;
- source health/429/error rate;
- resource utilization.

Do not optimize for fabricated fact counts or a global Person COMPLETE state.

# Final target

`FULL_DEEP_SWARM_ACTIVE` is allowed only after physical production evidence demonstrates multi-subject, multi-capability, multi-source perpetual research with evidence preservation, semantic structuring, independent validation, coverage-driven next work, monitoring/change reopening, healthy resources and intact safety/publication/identity gates.
