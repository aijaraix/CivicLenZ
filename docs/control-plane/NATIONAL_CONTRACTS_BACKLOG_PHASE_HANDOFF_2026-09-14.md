# National contracts and safe backlog inventory — bounded source phase

## Scope and evidence boundary

Base main fetched and independently compared with GitHub:
`204dbc60bb07833d0dc2ac59b706eccfda4f1453` (merged PR #62).
Use the reviewed head/merge SHA of the PR containing this document for deployment;
do not deploy a floating branch. No production database or VPS mutation was made
by this source session. The supervisor's supplied counts and follow-up proof are
checkpoints, not fresh measurements by this session.

This phase adds inactive reusable contracts and durable implementation/provenance
backlog. It does **not** finish governor identity/person/occupancy validation,
implement missing source-specific workers, reconcile legacy jobs, or activate
Google. Those remain required work, not production successes inferred from tests.
The existing proven canaries must not be repeated.

## Changed source and dependencies

- `contracts/research/national-v2.json`, `contracts/research/README.md`: 16 classes,
  41 reusable scope definitions, 493 field instances. Atomic, relationship,
  dataset and defined open scopes retain all policies; finite datasets require
  exhaustive reconciliation, amendments, missing units and cutoffs.
- `services/hermes-prime/contract_library.py`: offline, deterministic SQL compiler
  for existing tables. Inserts immutable inactive v2 contracts/fields and 493
  implementation incidents. No schema migration, new role or runtime grant.
- `services/hermes-prime/gap_planner.py`: linked evidence now suppresses only the
  matching Seat/field gap. Existing need/work identities and counters are stable.
- `services/hermes-prime/backlog_inventory.py`: inventories up to 200 queued
  unowned ingest/monitor jobs and 200 capability-blocked needs per tick; oldest
  observation first prevents starvation. Writes only incidents. Changed observed
  facts append an observation; repeat observations preserve operator resolution.
- `services/hermes-prime/observer.py`: runs inventory in the persistent existing
  process every 300 seconds, behind `HERMES_BACKLOG_INVENTORY=true` (default false).
- Three new test files under `services/hermes-prime/tests`.

No Cloudflare worker file changed. **No worker deployment is required.** HERMES
restart is required to load the planner fix and optional inventory loop. No new
production dependency; psycopg2 is already required by database_bootstrap.

## Source verification

Executed in source workspace:

```sh
python -m unittest discover -s services/hermes-prime/tests
npm run test:collection-runtime
npm install --prefix /tmp/civiclenz-pg-test --no-audit --no-fund @electric-sql/pglite@0.3.14
PGLITE_MODULE=/tmp/civiclenz-pg-test/node_modules/@electric-sql/pglite/dist/index.js node --test services/hermes-prime/tests/contract_library_sql.test.mjs
python services/hermes-prime/contract_library.py --sql /tmp/national-v2.sql
git diff --check
```

28 Python tests, 133 Cloudflare tests, 3 embedded PostgreSQL tests pass. SQL tests
use canonical contract table definitions and the existing incident migration;
verify installation/reinstallation, immutable-drift rejection, field-specific
planner behavior, runtime incident grants, resolved-history preservation and
unchanged legacy job status/attempts/payload. Embedded PostgreSQL is not production
RLS, VPS, queue, producer or canonical validation proof.

## Exact supervisor deployment sequence

1. Fetch current main and the reviewed PR. Record the full reviewed SHA, current
   HERMES SHA, PID, effective ExecStart, HERMES pointer, unit/drop-ins and environment.
   Preserve newer legitimate changes. Record active leases; use a lease-safe
   restart window. Keep the current producer-intake pause and all exhausted
   retrieval/extraction/receipt/follow-up allowances unchanged.
2. Materialize the reviewed commit into
   `/opt/civiclenz/releases/<REVIEWED_SHA>` using the established release mechanism.
   Include `contracts/research/` as well as `services/hermes-prime/`. Verify the
   release tree matches the reviewed commit. Do not change `/opt/civiclenz/current`.
3. Generate the install script from that exact release:

   ```sh
   python3 /opt/civiclenz/releases/<REVIEWED_SHA>/services/hermes-prime/contract_library.py --sql /tmp/civiclenz-national-v2.sql
   ```

   Inspect its transaction and reported digest. Through the **existing operator
   database channel**, run this exact SQL with error-stop enabled (for an existing
   configured psql session: `psql -X -v ON_ERROR_STOP=1 -f /tmp/civiclenz-national-v2.sql`).
   Do not create a credential or give HERMES contract-write privileges. Installation
   only inserts inactive v2 records and incidents; it binds no Seat. On any mismatch,
   retain the error and inspect drift; do not overwrite existing definitions.
4. Point `/opt/civiclenz/hermes/current` to the new release's
   `services/hermes-prime`. Update only the existing HERMES unit's effective
   ExecStart to:

   ```text
   /usr/bin/python3 /opt/civiclenz/releases/<REVIEWED_SHA>/services/hermes-prime/database_bootstrap.py
   ```

   Clear the inherited ExecStart in its drop-in before replacing it. Keep all
   existing credential references and queue/deployment IDs. Leave the new variable
   unset/false for the first restart:

   ```sh
   systemctl daemon-reload
   systemctl restart civiclenz-hermes-prime
   systemctl show civiclenz-hermes-prime --property=ActiveState,MainPID,ExecStart
   ```

5. Independently verify health/source/PID, intake PAUSED, and unchanged allowance
   consumption and civic states. Then set only `HERMES_BACKLOG_INVENTORY=true` in
   the established HERMES environment configuration and reload/restart that unit.
   This activates operational observation, not worker dispatch. Allow one tick,
   inspect incidents and telemetry. `INVENTORY_FAILED` is a failed path, not an
   empty backlog. Over 200 in either population reports PARTIAL_ROTATING_INVENTORY;
   verify later ticks cover outstanding IDs before asserting complete inventory.

## Expected physical assertions

| Item | Expected transition |
|---|---|
| Existing STATE_GOVERNOR v1 and Seat binding | Unchanged |
| Library | +16 inactive `_V2` contracts, +493 field definitions on first install |
| Catalog implementation backlog | +493 CAPABILITY_NOT_IMPLEMENTED incidents on first install; no factual no-result |
| Existing blocked capability needs | Same IDs/state/work; linked implementation incidents added |
| Legacy queued ingest/monitor | Same status, payload, authority, attempts and history; provenance-review incidents added |
| Legacy classifications | UNKNOWN with no worker history; LEGACY_UNPROVEN with unattested worker history |
| REAL_PROVEN / TEST / SYNTHETIC | Never inferred from payload declaration; independent evidence review required |
| Governor claims / evidence / Person / Occupancy | Unchanged; no verified or publication-eligible transition |
| Original evidence and follow-up needs | Remain pending canonical gate decisions |
| Raw retrievals / validation runs | No new artifacts from this phase; no repeated canary |
| Producer intake | PAUSED throughout |
| Runtime | Persistent existing HERMES, unchanged bounded worker pools and dispatch budgets |

There is **no selected follow-up job or new atomic lease in this phase**. Do not
reinterpret an inventory tick or catalog installation as a validation canary.
With the supplied 25 existing governor needs, the planner should insert no
additional needs for those same contract scopes. Any unexpected count must be
explained from actual field/contract lineage, not normalized to the checkpoint.
Report exact IDs and before/after states from the supervisor's queries.

## Required subsequent phases

1. Governor: reuse existing identity/person/occupancy needs and accepted validation
   lineage. Implement and physically prove authoritative source-specific identity
   context and current-office parsing. Name equality and existing candidates are
   insufficient. Narrow parser certification requires actual source/Seat/locator
   invariants. Preserve current-as-of separately from unsupported tenure dates.
   Re-evaluate evidence/source sufficiency, complete period-scoped contradictions,
   dataset applicability and canonical decision. Publication stays separate.
2. Legacy: independently review each incident's real job/run/artifact provenance.
   Append evidence-backed REAL_PROVEN, TEST or SYNTHETIC conclusions only where
   warranted; retire/supersede/migrate only after proving lineage. This inventory
   grants no migration or dispatch authorization and does not claim resolution.
3. Google: supervisor must provide the safety-repair and persistent-runtime proof.
   Verify the deployed ingress source/deployment lineage; this checkout has no
   receiver implementation for the running `/v1/harvester` service. Reuse that
   canonical ingress implementation, not a second receiver. Prepare exactly one
   authenticated/signed canary using the existing signature protocol and a reserved
   ResearchWorkIdentity. Verify durable receipt, replay/idempotency, artifact hash,
   producer/contract/lease lineage and canonical validation acknowledgement before
   any intake unpause. No canary is signed or sent by this phase.
4. National execution: bind contracts only after source applicability and exact
   capabilities are supported. Implement durable Seat enumeration, due-currentness
   evaluation, applicable full-dataset reconciliation and recurring monitoring.
   The new catalog and incidents are prerequisites, not national autonomous
   acceptance or an implementation of all these loops.

## Rollback

Set `HERMES_BACKLOG_INVENTORY=false` and restart HERMES to stop inventory. If code
rollback is necessary, restore the captured prior HERMES-specific pointer/unit
and restart only HERMES after accounting for active leases. Preserve all existing
budgets, failed runs, receipts and intake pause. Retain inactive v2 contracts and
all incident history; no DROP/DELETE or counter reset is needed. Leave the broad
legacy pointer and Cloudflare deployments unchanged. No civic data rollback is
necessary because this phase performs no canonical truth mutation.
