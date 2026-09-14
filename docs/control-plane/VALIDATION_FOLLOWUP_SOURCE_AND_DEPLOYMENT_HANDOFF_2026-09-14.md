# Bounded validation follow-up — source and deployment handoff

## Status and authority

Source implementation only. No production writes, deployment, canary, budget changes, credential creation, or intake activation were performed by this session. The owner supplied a fresh independent SentinelX supervisor preflight for `civiclenz-prod-ai`: HERMES active, PID 155831, source `c2d301bc15f8314e622dc290ca96e1590bddf4fa`. This satisfies source preflight; deployment must use that existing authorized channel. Reconcile newer legitimate work before deployment.

Base: `aijaraix/CivicLenZ`, main `c2d301bc15f8314e622dc290ca96e1590bddf4fa` (fetched through GitHub connector). The isolated source checkout starts from that exact commit; other dirty worktrees are preserved. Contract manifest: version 1.2.0, Git blob `ebc3cfb7de567218f10b8215893883086bb133e6`, 48 required documents present. The manifest's older working-branch authority label is retained; owner-directed current main is the implementation base. Canonical validation contract sections 10–19, 34, 39 and 45 govern identity, temporal semantics, dataset applicability, publication, and certification. No contract or source-level certification standard is weakened.

## Changes and limits

| Requirement | Source implementation | Production acceptance |
|---|---|---|
| Future receipt lifecycle | Handler captures one start clock, explicitly writes start and clamped completion | New row ordering must be inspected; old receipt untouched |
| Validation telemetry | Reads accepted receipt + succeeded canonical job + worker/deployment lineage + HERMES acknowledgement | Expected `RECEIPT_PROVEN_FURTHER_VALIDATION_PENDING`, never PASS/COMPLETE |
| Durable validation backlog | Reuses four existing needs/jobs; dependencies point to receipt job; evidence need records required gate relationships | Must inspect persisted links after staging; no duplicate need/job insertion |
| Minimum route | Only `current_occupant` can resolve; uses registered Florida governor HTTP endpoint and existing deterministic profile parser | One HTTP/R2/pending-evidence/assessment unit, not complete identity verification |
| Separate allowance | Default off, max one cumulative initial attempt across the permanent allowance marker | Existing 3/2/1 attempts must remain unchanged |
| Independent acknowledgement | HERMES verifies separate worker, artifact lineage, ordered assessment, protected truth snapshots, complete Seat/period contradiction query | Supervisor must also recompute R2 SHA-256 independently |
| Canonical decision | `NEEDS_FURTHER_VALIDATION`; publication eligibility false | Full autonomous acceptance NOT_YET_PROVEN |

The existing parser can return a single metadata-derived holder. That is insufficient to certify page role, independently identify the canonical Person, or establish effective tenure. This pass deliberately records official office context, exact evidence, candidate IDs, and parser limitations. It does not implement automatic identity resolution, tenure inference, or schema certification. A same-name Person or existing pending Occupancy does not close a gate. All four scope needs remain unreconciled, including after successful worker execution. Further authoritative identity/currentness work remains required; the one-unit allowance does not silently authorize another job.

A new current-office observation uses a distinct follow-up retrieval and artifact, with its own job/run lineage. It does not retry or overwrite the original retrieval, extraction, accepted receipt, Claim, or ClaimEvidence. Dataset applicability is explicitly NOT_APPLICABLE to the single current_occupant assertion (no finite-universe completeness assertion). HERMES's contradiction query has no row LIMIT: it includes all relevant Seat/field claims at retrieval time, includes unknown intervals conservatively, and separately includes all Seat/field contradiction records. Timeout fails the acknowledgement rather than returning a sampled clear result. Contradiction results live in the HERMES job checkpoint; the worker's immutable assessment retains `PENDING_HERMES_COMPLETE_QUERY` with that subsequent acknowledgement relationship.

## Changed files

New HERMES modules:
- `services/hermes-prime/validation_followup.py`: planner, bounded candidate selection, recovery, protected snapshots, independent acknowledgement and contradiction assessment.
- `services/hermes-prime/validation_telemetry.py`: read-only receipt evidence telemetry; query failure is UNKNOWN.

Changed HERMES modules:
- `services/hermes-prime/contract_dispatcher.py`: connects follow-up to the existing serialized selection and `hermes_ops.lease_job`; sends to existing ingest queue.
- `services/hermes-prime/observer.py`: persists actual receipt-derived telemetry.

Cloudflare:
- New `workers/cloudflare/shared/src/contract-followup.ts`.
- Changed `workers/cloudflare/collector/src/index.ts` dispatches only the dedicated follow-up envelope to that worker function.
- Changed `workers/cloudflare/shared/src/contract-validation.ts` fixes future receipt times.
- Collector and validator deployments are both required. Scheduler deployment is not required. No binding, queue, credential, source registry, global source flag, SQL schema or privilege changes are required.

Tests:
- New `services/hermes-prime/tests/test_validation_followup.py`.
- New `services/hermes-prime/tests/test_followup_dispatch.py`.
- New `workers/cloudflare/tests/contract-followup.test.ts`.
- Extended `workers/cloudflare/tests/contract-validation.test.ts`.

## Tests and review

Run from reviewed repository root:

```bash
python3 -m unittest discover -s services/hermes-prime/tests -v
node --experimental-strip-types --no-warnings --test workers/cloudflare/tests/*.test.ts
python3 -m py_compile services/hermes-prime/*.py
git diff --check
```

Local validation: 20/20 Python tests and 133/133 Cloudflare tests passed. Strict TypeScript check of the new worker and its imported shared modules passed with `--noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --lib es2022,dom`.

Classification: UNIT/FIXTURE. Real parser, hashing, byte locator, persistence sequencing and dispatcher code execute against isolated fixtures. No tests here prove PostgreSQL RLS, production lease acquisition, Cloudflare deployment or public-source execution. The supervisor must verify those boundaries after deployment. No local fixture is loaded by production source.

## Environment and activation states

Preserve all existing settings, scoped credentials and verified queue IDs. Add these non-secret settings to the existing HERMES configuration:

| Variable | Default | First deployment | Staging route verification | One canary |
|---|---|---|---|---|
| `HERMES_VALIDATION_FOLLOWUP` | false | false | true | true |
| `HERMES_VALIDATION_FOLLOWUP_BUDGET` | 0 | 0 | 0 | 1 |
| `HERMES_VALIDATION_FOLLOWUP_RECEIPT_ID` | absent, fail closed | `78963717-dcaa-588f-b201-99c3ea65e066` | same | same |
| `HERMES_VALIDATION_FOLLOWUP_WORKER_DEPLOYMENT` | absent, fail closed | actual newly verified collector version ID | same | same |

After deploying collector, update existing `HERMES_EVIDENCE_WORKER_DEPLOYMENT` to its verified version as well. After deploying validator, update existing `HERMES_VALIDATOR_DEPLOYMENT` to its verified version. These environment values describe active deployments; do not rewrite historical worker/job deployment IDs.

Keep `HERMES_CONTRACT_DISPATCH_BUDGET=5`, `HERMES_VALIDATION_RECEIPT_BUDGET=1`, `HERMES_INGEST_INTAKE_PAUSED=true` and all original attempt rows. Setting the new allowance to 0 pauses additional follow-up dispatch without erasing the consumed attempt. Re-enabling it or changing the receipt ID does not restore the single lifetime allowance.

HERMES restart is required to load source/environment changes. No other VPS service restart is required.

## Exact supervisor deployment sequence

Use existing SentinelX access and existing scoped Cloudflare deployment tooling. Do not create a server identity or broaden a token. No source-session deployment is authorized by this document alone; the owner explicitly assigned this step to the supervisor.

1. Obtain the reviewed PR head or reviewed merge SHA from GitHub. Set `CIVIC_REVIEWED_SHA` to that full SHA in the supervisor environment. Fetch current main/PR, inspect the diff and ensure the SHA contains this source package. Preserve newer valid commits; do not reset/force-push. Record previous collector and validator version IDs and the existing HERMES ExecStart/drop-ins/pointer for rollback. Check that no canonical job is actively leased before the cutover. Do not restart a healthy unrelated service.
2. From the checked-out reviewed tree, run tests above, then use the existing authorized Wrangler installation:

```bash
wrangler deploy --config workers/cloudflare/collector/wrangler.jsonc
wrangler deploy --config workers/cloudflare/validator/wrangler.jsonc
```

Record each actual version ID, verify the existing `/health` response/deployment metadata, queue bindings and R2 binding. Do not deploy scheduler. Existing producer intake and all exhausted budgets remain unchanged throughout. Do not dispatch a canary from Wrangler or invoke worker functions manually.

3. Install the exact reviewed tree into `/opt/civiclenz/releases/$CIVIC_REVIEWED_SHA` with existing release permissions. Use the existing release procedure; do not overwrite another release directory. Point only `/opt/civiclenz/hermes/current` at that release's `services/hermes-prime` directory. Leave `/opt/civiclenz/current` unchanged at its legacy target. Retain existing systemd credentials, sandboxing and service user.
4. Update the existing HERMES unit configuration so its effective ExecStart is exactly:

```text
/usr/bin/python3 /opt/civiclenz/releases/<CIVIC_REVIEWED_SHA>/services/hermes-prime/database_bootstrap.py
```

When using an ExecStart drop-in, clear the inherited ExecStart before defining this command. Set first-deployment variables from the table (false/0). Reload systemd, inspect effective ExecStart/Environment/credential references, and restart **only** the existing HERMES unit (`civiclenz-hermes-prime`, verify name against the supervisor's established unit before executing):

```bash
systemctl daemon-reload
systemctl show civiclenz-hermes-prime --property=ExecStart,FragmentPath,DropInPaths
systemctl restart civiclenz-hermes-prime
systemctl show civiclenz-hermes-prime --property=ActiveState,MainPID,ExecStart
```

5. Verify new process SHA/path/PID, receipt-derived telemetry, receiver health and governor. With follow-up disabled, there must be no new follow-up run or consumed allowance.
6. Set follow-up true, budget **0**, using the same receipt selector and verified collector version. Reload/restart only HERMES. Allow its normal tick to route the existing four scope relationships. Check exact receipt/job/need links, current contract/source policy, and that only the expected current_occupant job has the follow-up capability; no job attempts may increase. A security, dependency, source policy, missing need or ambiguous duplicate blocker must be investigated, not hand-cleared.
7. Independently confirm the correct staged job and source below. Set only the follow-up budget to **1**, reload/restart HERMES. Its normal supervised tick must acquire the canonical lease and dispatch. Do not call `lease_job` manually and do not hand-insert outputs. Resource governor continues to gate dispatch.
8. Observe one attempt through worker result and independent HERMES acknowledgement, or preserved failure. Validate assertions below. Disable follow-up again (false/0) after terminal observation. Keep the deployed recovery-capable source while any follow-up lease remains live. Do not increase any old allowance or reset the new one after a failure.

## Expected canary selection (checkpoints, not hard-coded routing)

| Scope | Existing ResearchNeed | Existing job |
|---|---|---|
| current_occupant — sole executable first unit | `6b6f767f-833c-4560-84b9-c4f0a957dd4c` | `11b039af-58ba-4b76-b31d-e6514c49bec7` |
| identity — linked, still blocked | `7b15bed8-db7b-4166-9a47-5887be90f4d5` | `2bbd0c76-e882-4474-a208-734a0c4fd4c9` |
| occupancy — linked, still blocked | `cfecd905-42f2-4284-b639-f78d2bc2165c` | `3477b076-9e87-4e05-ade3-5053cf6d82c6` |
| person — linked, still blocked | `e683ddbc-9adc-4856-afc9-bbf76c738f48` | `480e3e8f-dcfe-4eca-b5fd-b2c817950532` |

Selected ResearchWorkIdentity remains `work:v1:1fa0d70d3bfcf23c5f0abec2ccfbb3a3ceb8f6e5fb6182acbd7b12bd8a64c10f` if those checkpoint rows remain current. Routing resolves current contract/Seat rows; it does not hard-code these IDs or civic facts.

Source: registry key `florida-governor-official`, exact bounded endpoint `https://www.flgov.com/eog/`, no redirects, 1 MiB maximum, 15-second HTTP timeout, immutable per-run R2 key with read-back SHA-256. Election-calendar policy cannot substitute for current-office evidence.

## Physical assertions and expected transitions

Capture before/after under the existing authorized database identity; no new privilege grant:

- Remote reviewed SHA, deployed HERMES SHA, effective ExecStart, HERMES pointer and PID; broad pointer unchanged.
- Collector and validator actual version IDs, queue identities, worker key `hermes.cloudflare.validation_followup`.
- Original jobs remain succeeded with attempts 3 / 2 / 1. Failed runs remain present and unchanged. Historical receipt byte-for-byte unchanged, including the known 42.042 ms inverted timestamps.
- No duplicate ResearchNeeds or jobs created. Existing `dedupe_key` values unchanged. Four dependency edges point to the accepted receipt job; evidence need basis contains the required scope relationships. Job success is explicitly not scope reconciliation.
- Selected job: queued/0 → leased/1 through `hermes_ops.lease_job` → succeeded/1 after HERMES consumes the artifact, or dead_letter/1 after failure/expiry. No second follow-up execution.
- Follow-up need: BLOCKED → OPEN during staging → AWAITING_RESULT at lease → AWAITING_RESULT with `NEEDS_FURTHER_VALIDATION` reason after success. Failure becomes BLOCKED with allowance-exhausted reason. Original evidence need `d0657d06-1e4c-4e95-b407-81fa6c97f25a` remains AWAITING_RESULT; only prerequisite metadata is added.
- Worker started → succeeded/failed with exact lease token, job, need, work identity, receipt and deployment lineage. Queue acceptance or HTTP 200 alone is not success.
- New raw retrieval, pending EvidenceObject, immutable R2 bytes, exact excerpt locator, new `validation_runs` assessment. Independently retrieve R2 bytes and recompute digest/size and excerpt range. These artifact IDs derive from the real attempt and must be reported after execution, not fabricated in advance.
- New validation row has explicit non-null `started_at <= completed_at`; decision NEEDS_FURTHER_VALIDATION, schema_certified false, identity unresolved, no effective tenure dates, publication_eligible false. Currentness records observation time only, not tenure start or validated current_as_of.
- HERMES job checkpoint contains independent acknowledgement, complete contradiction assessment (with query cutoff and IDs), and artifact links. A detected competitor leaves CONTRADICTION_PENDING; no competing claim never closes positive identity/currentness gates.
- Dataset decision NOT_APPLICABLE for this single assertion, with explicit reason; parser/source certification stays false.
- Original claim `986e7902-17c5-5fd3-832f-eebf35c69f4f` stays collected_unreviewed; original evidence `0544818c-24d4-5075-b4b1-25e2f8ee7691` stays pending; Person `d612250c-3711-4f04-a756-dd2c58aa6fa8` stays unverified; Occupancy `6ec931cd-12d4-4cac-a076-52ba7e8aae28` stays current/pending with start_date, assumed_office_date, sworn_in_date and end_date still null.
- Producer intake stays PAUSED. Publication remains separately gated. Full autonomous acceptance remains NOT_YET_PROVEN.

## Rollback

1. Disable only follow-up dispatch (`HERMES_VALIDATION_FOLLOWUP=false`, budget 0), reload/restart HERMES with this recovery-capable source. Preserve intake pause and all old budgets.
2. If an attempt exists, allow it to finish/acknowledge or expire under existing canonical lease recovery. Never reset attempts, erase failed runs, rewrite receipts, remove dependency/history rows, or release an uncertain delivery manually. If source failure prevents recovery, preserve the leased row and stop only this path for supervisor repair.
3. Once no follow-up lease remains, restore the previous HERMES ExecStart/HERMES-specific pointer and previous environment/drop-in configuration, and restore collector/validator to the recorded prior version IDs using the existing Cloudflare rollback procedure. Reload/restart only HERMES and independently verify source/PID/health. Leave broad legacy pointer unchanged.
4. Retain follow-up artifacts, validation assessment, dependencies and work/need basis for audit. No DDL rollback is needed. The original software will ignore the versioned follow-up capability; its exhausted generic budget remains unchanged. Original telemetry may again show the known NOT_IMPLEMENTED defect if reverting the telemetry source too; report that regression explicitly.

Do not merge deployment claims with source-test results. This handoff closes source preparation only; the supervisor must return the actual physical acceptance identifiers and remaining gate decisions.
