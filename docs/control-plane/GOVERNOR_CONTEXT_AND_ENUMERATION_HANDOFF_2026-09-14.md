# Governor context research and enumeration preparation

## Current source and scope

Current main fetched before work: `1a46cc4dd24b639f172ed6c2955338dddffb87d2`.
The supervisor reports that commit deployed with healthy persistent HERMES, no
active leases, inventory proven, the catalog installed and intake paused.
This source session made no production writes, registrations, deployment or leases.

The next bounded source phase prepares one existing governor prerequisite for
real authoritative context research. It does not claim that identity, person or
occupancy is resolved. The retrieved Florida leadership/profile pages returned
access challenges in this session. The alternate Department of State governors
page also returned HTTP 403 with `cf-mitigated: challenge`. No challenge was solved
or bypassed; cached search text is not a canonical artifact or parser fixture.

**Keep the new route disabled.** The proposed leadership-card structure has unit
fixtures only; its compatibility with real permitted production markup is unproven.
An authorized source response and review of its actual structure are prerequisites
for activation. If they differ, repair the parser from those bytes before spending
the bounded attempt. Do not deploy a speculative parser as a proven capability.

## Source files

- `services/hermes-prime/governor_context.py`: explicit scope routing, distinct
  cumulative allowance, reuse of existing jobs/needs, accepted-receipt and proven
  follow-up dependencies, independent artifact acknowledgement and contradiction
  reconsideration. No civic truth writes or need replacement.
- `services/hermes-prime/contract_dispatcher.py`: integrates the new route into the
  existing resource-governed atomic lease and existing ingest queue. Recovery runs
  even after the feature is disabled.
- `workers/cloudflare/shared/src/governor-context-parser.ts`: narrow, fail-closed
  leadership-card parser; unique Governor-labelled article, profile link, exact
  excerpt locator and Seat context. No hard-coded person name or date. Access
  challenges, ambiguous cards and metadata-only pages fail closed.
- `workers/cloudflare/shared/src/contract-followup.ts`: uses the established artifact
  persistence path for the new envelope. Preserves R2 readback/hash checks, timestamps,
  pending evidence, immutable attempts and failure history. Review and certification
  remain unsatisfied gates. HTTP 401/403 becomes an access-restriction failure.
- `workers/cloudflare/collector/src/index.ts`: accepts the distinct context envelope.
- `services/hermes-prime/seat_enumeration.py`: non-activating staging primitive for
  the Senate roster, requiring registered source plus matching canonical raw bytes.
  Persists enumeration proposals/blockers in the existing incident ledger.
- Tests: `test_governor_context.py`, `test_seat_enumeration.py`, updated
  `test_followup_dispatch.py` and `contract-followup.test.ts`.

No v2 catalog changes or reinstall. No schema migration or privilege expansion.
No validator worker change. No new production dependencies.

## Tests and review limitations

- 36 Python tests passed, including canonical atomic-dispatch envelope selection,
  existing need/job reuse, distinct cumulative budget and fail-closed enumeration.
- 139 Cloudflare tests passed, including original canary regressions, all three
  context scopes, preserved review gates, missing-parent rejection, HTTP 200
  challenge/metadata rejection, HTTP 403 failure lineage and ordered timestamps.
- Strict TypeScript check passed for the changed shared worker/parser modules.
  A wider collector check reports the same diagnostics on this head and base
  `1a46cc4` (missing Cloudflare ambient types and existing shared-module errors).
  It is not reported as a clean full collector typecheck.
- `git diff --check` passed. No production execution was performed by these tests.

Reproduce Python and Cloudflare suites from the repository root:

```sh
python -m unittest discover -s services/hermes-prime/tests
npm run test:collection-runtime
```

Source fixtures intentionally use fictional names and are not production parser
certification. The current access restriction is a real activation blocker.

## Physically re-read existing prerequisite work

A targeted read of the current database confirmed these rows during this session:

| Scope | ResearchNeed | Job | State / attempts |
|---|---|---|---|
| identity | `7b15bed8-db7b-4166-9a47-5887be90f4d5` | `2bbd0c76-e882-4474-a208-734a0c4fd4c9` | BLOCKED / queued / 0 |
| person | `e683ddbc-9adc-4856-afc9-bbf76c738f48` | `480e3e8f-dcfe-4eca-b5fd-b2c817950532` | BLOCKED / queued / 0 |
| occupancy | `cfecd905-42f2-4284-b639-f78d2bc2165c` | `3477b076-9e87-4e05-ade3-5053cf6d82c6` | BLOCKED / queued / 0 |
| prior current_occupant | `6b6f767f-833c-4560-84b9-c4f0a957dd4c` | `11b039af-58ba-4b76-b31d-e6514c49bec7` | AWAITING_RESULT / succeeded / 1 |

ResearchWorkIdentities, in that order:

```text
work:v1:82e5d9d85156ec37c98e3a567fd0de0ceec471dcfef5f56a4811fd53e19e1abd
work:v1:cfda44267e62c1e7d92f18cc58ac4d7c7e9d79a8cdb893527b185a12fc4cbfdf
work:v1:1a839464b28f05b689d349d0bd23dee0f73541bf149384686823291a9f1cbf8b
work:v1:1fa0d70d3bfcf23c5f0abec2ccfbb3a3ceb8f6e5fb6182acbd7b12bd8a64c10f
```

The router resolves current rows, not these hard-coded IDs. It selects only the
configured scope and refuses ambiguous duplicate work or unrelated security holds.
Original receipt `78963717-dcaa-588f-b201-99c3ea65e066` and its defective historical
timestamps remain unchanged. The successful current-occupant job is a prerequisite,
never selected for another attempt. Dependencies append under a separate basis key.

## Source authority and temporal boundary

Governor registry role stays `florida-governor-official`, base `https://www.flgov.com/`.
New bounded endpoint: `https://www.flgov.com/eog/leadership`. No source role is newly
registered for this route; the actual field policy must allow the existing source.
Person and occupancy retain their persisted `review` requirement. Routing transport
does not satisfy review.

A matched article produces an authoritative-context *candidate*: name, official
profile URL, Seat/jurisdiction/office and exact source excerpt. A unique canonical
name candidate is proposed, not resolved. Current-as-of stays null until source role
and parser certification are established. No tenure start, assumed-office date,
swearing-in date or term end is inferred. The code does not extract the date range
shown in a cached profile search result as canonical tenure evidence.

Canonical reconsideration records all-period-inclusive current-occupant claim and
contradiction queries at the retrieval cutoff. No competing claim is not positive
identity proof. Single-assertion dataset applicability remains explicitly
NOT_APPLICABLE. Identity, review, evidence sufficiency, source suitability,
currentness and parser certification keep the canonical decision at
NEEDS_FURTHER_VALIDATION. No claim, Person, Occupancy, linked Evidence or original
ResearchNeed is verified/reconciled; no publication eligibility changes.

## Configuration and deployment

| Variable | Default | Initial post-verification setting |
|---|---|---|
| HERMES_GOVERNOR_CONTEXT | false | true only after source-access/parser gate |
| HERMES_GOVERNOR_CONTEXT_BUDGET | 0 | 1 |
| HERMES_GOVERNOR_CONTEXT_SCOPE | identity | identity |
| HERMES_GOVERNOR_CONTEXT_RECEIPT_ID | absent | accepted receipt UUID above |
| HERMES_GOVERNOR_CONTEXT_WORKER_DEPLOYMENT | absent | independently verified collector version ID |

Allowance `governor-context-initial-v1` is cumulative across the three scopes;
maximum 3, and each existing job may attempt only once. Start with 1. Changing the
receipt, toggling the feature or restarting does not reset consumption. Any later
increase requires evaluating the first result and establishing that another scope
actually needs another retrieval; do not repeat identical source work for optics.
Keep old consumed attempts at retrieval 3 / extraction 2 / receipt 1 / follow-up 1.
Keep producer intake PAUSED and national v2 inactive/unbound.

Supervisor sequence, through the existing secure channel only:

1. Review/merge this PR; fetch the actual reviewed full SHA and compare current
   remote/deployed state. Preserve newer work. Record current collector deployment,
   HERMES-specific pointer, effective unit/drop-ins, SHA/PID and active leases.
2. Materialize the reviewed release. Deploy **collector only** through its existing
   Cloudflare deployment configuration. Record/verify its actual version ID and
   existing queue bindings. Do not redeploy validator, enable legacy queue fan-out,
   change broad `/opt/civiclenz/current`, or reinstall catalog SQL.
3. Keep new variables false/0. Update the existing HERMES unit ExecStart to
   `/usr/bin/python3 /opt/civiclenz/releases/<REVIEWED_SHA>/services/hermes-prime/database_bootstrap.py`
   and its HERMES-specific pointer to that release's `services/hermes-prime`.
   Preserve existing credentials, exhausted budgets and intake pause. Clear the
   inherited ExecStart in the drop-in, then run:

   ```sh
   systemctl daemon-reload
   systemctl restart civiclenz-hermes-prime
   systemctl show civiclenz-hermes-prime --property=ActiveState,MainPID,ExecStart
   ```

4. Independently verify runtime health/source/PID, unchanged civic truth and budgets.
   **Stop activation here while source access/markup is unproven.** No new credential,
   access-control bypass or speculative canonical execution is authorized by this doc.
5. After permitted source access and parser compatibility are physically established,
   configure the initial values above using the existing environment mechanism and
   restart only HERMES. Observe one real identity job through atomic lease → actual
   collector HTTP → immutable raw/R2 → pending Evidence → validation assessment →
   independent HERMES acknowledgement. No success merely from HTTP 200.

Expected successful context execution: selected job queued/0 → leased/1 →
succeeded/1; need BLOCKED → OPEN → AWAITING_RESULT, still awaiting actual identity
validation. New raw retrieval, pending Evidence and NEEDS_FURTHER_VALIDATION run
have exact job/need/work/receipt/prior-job/lease/deployment lineage, coherent explicit
started_at <= completed_at, and byte-verifiable locator. Access/parser failure:
worker failed, preserved raw artifact if HTTP 200 bytes were stored, canonical
job dead_letter/1 and need BLOCKED after independent recovery. Never replay it.
Report actual new IDs and all before/after civic states; none are predicted here.

## National enumeration preparation

The first staging parser supports the real public Senate XML source:
`https://www.senate.gov/general/contact_information/senators_cfm.xml`.
Required registry role is `us-senate-official-membership-roster`. It is **not
registered by this change**. This session could inspect its public XML structure;
those locally fetched bytes are not canonical retrieval artifacts or execution proof.

`seat_enumeration.stage(cursor, retrieval_id, bytes)` validates the registered role,
exact endpoint, authoritative tier, successful stored raw retrieval, URI, size and
hash before parsing the entire bounded XML. It uses state plus Senate class rather
than names or roster positions to propose permanent Seat identifiers. Duplicate
state/class contexts, unsafe XML, missing structure and empty rosters fail closed.
It persists a source-linked SEAT_ENUMERATION_REVIEW incident with all proposed
contexts and unresolved universe/jurisdiction/source-role/capability/Seat gates.
No canonical Seat insert, contract binding or activation is implemented here.
No persistent national enumeration worker is claimed. Other office classes remain
CAPABILITY_NOT_IMPLEMENTED; no national count is manufactured. Election/candidate
and monitoring obligations are retained in the staging assessment for eventual
canonical Seat acceptance.

## Legacy reconciliation plan

A targeted read confirmed one existing inventory observation for each of the 73
jobs: 12 ingest and all 60 monitor jobs have no linked worker runs or raw
retrievals; one ingest job has 15 worker runs and two raw retrievals. The latter
counts alone do not establish provenance or REAL_PROVEN status. No jobs or
incident conclusions were mutated by this read.

Use the existing LEGACY_PROVENANCE_REVIEW incident for each queued job. Work in
batches of at most 20 incident IDs, with a complete saved ID list and remaining
count; keep all 13 ingest and 60 monitor jobs undispatched.

For each job, trace its actual worker attempts to raw retrieval IDs, registered
sources, immutable object URIs, hashes/readback and downstream evidence. Record
any missing links. Payload declarations and succeeded strings are insufficient for
REAL_PROVEN. TEST/SYNTHETIC require independent fixture/test provenance. Otherwise
retain UNKNOWN or LEGACY_UNPROVEN with the exact missing evidence.

A migration proposal must identify the canonical Seat, active contract scope,
ResearchWorkIdentity, existing matching need/job and evidence dispositions. Reuse
matching canonical work. Before any supersession, independently verify no active
legacy execution and that retained artifacts remain addressable. Record old→new
lineage and operator/decision evidence; never rewrite an old attempt as HERMES work.
Retirement/supersession remains a separate reviewed mutation, not an inventory tick.

## Google canary preparation

No signing/sending/unpause occurs. Require the producer's zero-synthetic repair,
persistent deployed runtime, configured canonical endpoint, exact registered producer
ID, secret-presence proof without secret exposure and extracted_unreviewed-only
output. Verify the deployed receiver implementation/version and its actual signing
protocol before preparing the envelope; its source is not present in this checkout.
Do not invent a parallel ingress or signing convention.

Reserve one canonical ResearchWorkIdentity, then independently verify authenticated
producer → durable receipt → reservation/work reconciliation → hash/locator integrity
→ canonical validation queue → HERMES acknowledgement. Preserve duplicate/replay
handling and producer subordination. Broad intake remains paused pending that proof.

## Rollback and remaining limits

Disable HERMES_GOVERNOR_CONTEXT and set budget 0. Allow existing canonical recovery
to acknowledge/expire any outstanding attempt. Preserve consumed allowances, failed
runs, artifacts, receipt history and dependencies. After no affected lease remains,
restore captured prior collector deployment and HERMES-specific release/unit, then
restart only HERMES. Leave broad pointer, catalog, intake pause and legacy jobs alone.

Source tests do not close governor canonical identity/currentness or national
acceptance. Actual authorized source access, production parser certification,
identity and review decisions, supported tenure evidence where required, receiver
source lineage, and persistent national enumeration/binding workers remain work.
