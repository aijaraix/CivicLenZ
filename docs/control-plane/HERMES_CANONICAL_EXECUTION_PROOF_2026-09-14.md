# HERMES canonical execution proof — 2026-09-14

## Result and limits

Physically proven: real ResearchNeed -> capability route -> OPEN eligibility -> existing atomic lease -> queue publication -> real Cloudflare HTTPS retrieval -> R2 bytes -> matching independent R2 read-back -> raw_retrieval -> successful worker_run -> independent HERMES completion.

Continued beyond retrieval: a separate dependent extraction job read and hashed the stored bytes, invoked the existing official-profile parser, created one exact-locator evidence object in `pending`, and completed through HERMES. A dependent canonical validation handoff exists but remains blocked. No claim, occupancy, civic publication, or validation decision was written by these handlers. The evidence has zero claim links. The ResearchNeed is AWAITING_RESULT, not reconciled.

This proves the bounded internal execution path, not full autonomous acceptance, producer acceptance, or canonical validation. There was no second independently supported research scope among the other 24 needs. The successful retrieval was not replayed to create another PASS; extraction used its stored result.

## Source and deployment

Remote heads were fetched before implementation and after merges. Newer work was preserved. PRs [56](https://github.com/aijaraix/CivicLenZ/pull/56), [57](https://github.com/aijaraix/CivicLenZ/pull/57), [58](https://github.com/aijaraix/CivicLenZ/pull/58), [59](https://github.com/aijaraix/CivicLenZ/pull/59), and [60](https://github.com/aijaraix/CivicLenZ/pull/60) merged normally without forced history changes.

| Item | Physically verified value |
|---|---|
| Initial main | `34801818db87d0ba1be3b53ace19fa414a6e2806` |
| Control-plane source before this report | `e7f34dd4411a496ac8e4f67afed8483a49551cca` |
| Current main / deployed HERMES commit | `819402d5cc74ed4bc6aa325b7a0f004cd2b249ff` |
| Release directory | `/opt/civiclenz/releases/819402d5cc74ed4bc6aa325b7a0f004cd2b249ff` |
| systemd service | `civiclenz-hermes-prime` |
| ExecStart and actual `/proc/PID/cmdline` | `/usr/bin/python3 /opt/civiclenz/releases/819402d5cc74ed4bc6aa325b7a0f004cd2b249ff/services/hermes-prime/database_bootstrap.py` |
| Running PID | `153897` |
| OS / database identity | `civiclenz-hermes` / `hermes_runtime` |
| HERMES-specific pointer | `/opt/civiclenz/hermes/current` -> current release `/services/hermes-prime` |
| Shared pointer, intentionally untouched | `/opt/civiclenz/current` -> `/opt/civiclenz/releases/a32c1fb04bee564210cfcded48ef2853a568b120` |
| Current collector version | `a5928af3-f4f3-4df8-922b-5be7dc0e8c70` |
| Current Cloudflare deployment record | `11f83083-98cf-4eaa-ac7d-1bbf9884e58c`, 100% traffic |
| Successful retrieval collector version | `25c0b360-782b-4776-b912-d02eb213823f` |
| Successful retrieval HERMES release / PID | `d5f4ae1b40e4d2c23b6db68bca4264e4ecbbb262` / `153267` |
| Intake receiver PID | `63755`, still paused |

HERMES source-file SHA-256 values were independently compared with GitHub main for observer, dispatcher, router, extraction planner, and bootstrap: all matched. Service pointer consumers were inspected before changing the HERMES-specific pointer; only the HERMES Prime unit referenced it. The shared pointer is consumed by the intake service and remains a separately documented lineage repair; it was not changed.

Cloudflare deployment API, live health `deploymentId`, and downloaded consumer code were independently checked before each runtime configuration. The production script contains `hermes.contract.v1` and `hermes.extraction.v1`. Worker-side Supabase URL/service-role bindings, `EVIDENCE_BUCKET` -> `civiclenzevidence`, version metadata, and the existing ingest queue consumer remain in place. Worker credentials were not transferred to HERMES.

## Dedicated producer credential

- Account: `26b7bb3e78f1d2d6cd86b78468424c93` only.
- Queue independently reverified: `civiclenz-ingest`, ID `9302857ddec747a4919268ad2f8ffb39`.
- Account-owned token ID: `7a21bbd5bbeb0351d26698b831369376`, name `civiclenz-hermes-queue-producer`.
- Exactly one permission: `Queues Write`, group `366f57075ffc42689627bcf8242a1b6d`.
- Exactly one resource: `com.cloudflare.api.account.26b7bb3e78f1d2d6cd86b78468424c93`.
- Client IP condition: `47.251.111.63/32`. Both external HTTPS checks and the VPS provider's elastic-IP metadata agreed. No IP was guessed.
- No expiration. Token policy/status was independently re-read after creation.
- Root-only source: `/etc/civiclenz/hermes-credentials/cloudflare-queue-producer`, mode 0600 inside mode-0700 directory.
- systemd delivery: `LoadCredential=cloudflare-queue-producer:/etc/civiclenz/hermes-credentials/cloudflare-queue-producer` in `40-contract-routing.conf`.

Actual reads as `civiclenz-hermes` succeeded only through the service credential directory. Reads as `civiclenz` and `nobody` failed. HERMES could not read the root-only source or `/etc/civiclenz/secrets.env`. The dedicated token value was independently confirmed absent from the shared environment file, HERMES operations SQLite, and HERMES journal. No value appears in source, job payloads, this report, or PR text.

The initial provisioning request encountered 403 on token management. After the owner supplied the necessary account-token capability, creation succeeded. The agent did not expand the infrastructure token's privileges and did not expose it to HERMES. Account-wide Queue write scope is the provider limitation explicitly accepted by the owner; no unrelated permission was granted to the dedicated token.

Rotation: disable bounded dispatch; let owned attempts finish or expire; create a replacement with the same policy using an existing authorized account administrator; atomically replace the root-only credential source; restart HERMES to refresh LoadCredential; independently verify access and validity without printing the value; revoke the old token by ID; restore only the approved remaining budget. Emergency revocation disables dispatch and revokes this dedicated token. Preserve all attempt and failure lineage.

## Retrieval acceptance proof

| Object / transition | Value |
|---|---|
| ResearchNeed | `d0657d06-1e4c-4e95-b407-81fa6c97f25a` |
| ResearchWorkIdentity | `work:v1:bf6e28c6698cd07f364151668f18ead6a31afe8fe117bbb438e01a02cef369c1` |
| Job | `4e159022-80a3-4fc4-8357-2c2747365805` |
| Before routing | Need BLOCKED; job queued; attempt_count 0; no worker runs |
| Durable previous reason | `CAPABILITY_NOT_IMPLEMENTED: contract scope worker routing` |
| Routing eligibility | `OPEN`, `ROUTE_RESOLVED: authoritative retrieval stage`; original blocker superseded in durable routing decision |
| Capability / pool | `authoritative_evidence_retrieval` / `cloudflare-deterministic-http` |
| Physical worker | `civiclenz-collector`, Cloudflare |
| Lease authority | Existing `hermes_ops.lease_job`, no second lease or scheduler |
| Successful attempt | 3 of maximum 5; earlier failures retained |
| Lease acquired / expiry | `2026-09-14T04:43:50.457093Z` / `2026-09-14T04:48:50.431719Z` |
| Successful worker_run | `cdb111a6-4e11-55b9-8fd5-354c7e46c11f` |
| Worker start / completion | `2026-09-14T04:44:06.983763Z` / `2026-09-14T04:44:08.345Z` |
| Actual tool | `workers/cloudflare/shared/src/http.ts:fetchDocument` |
| Source | `cd3d11f6-c948-429f-8368-e85fdccce2dc`, `florida-governor-official` |
| Registered / retrieved URL | `https://www.flgov.com/` / `https://www.flgov.com/eog/` |
| Physical HTTP result | 200, `text/html; charset=UTF-8`, 34,484 bytes |
| raw_retrieval | `fda8ef65-ea36-520a-af5f-cbde68e82c70` |
| Job terminal state / timestamp | succeeded / `2026-09-14T04:44:21.570219Z` |
| Need after retrieval | AWAITING_RESULT; extraction and validation pending |

R2 object:

`r2://civiclenzevidence/raw/florida-governor-official/2026/09/14/45f8a971563f1d751d571c448b88b84cb9be59519d9deb99fa775fae038d925c.html`

Ledger SHA-256 and both independent physical read-back digests:

`45f8a971563f1d751d571c448b88b84cb9be59519d9deb99fa775fae038d925c`

Independent joined queries proved the worker-run, raw-retrieval, and job-checkpoint attempt tokens match, without returning token values. Completion was inside lease expiry; the terminal job cleared its active lease. The queue publisher used only the dedicated producer credential. Successful consumer lineage confirms delivery, not merely an HTTP enqueue status.

Attempts 1 and 2 failed before source retrieval because workerd rejects `redirect:error`. The official root independently returned a downgrade redirect, but that redirect was not the observed worker failure. PR 57 selected the explicit HTTPS endpoint; PR 58 corrected the runtime option to `manual`, leaving non-200/redirect responses rejected. These failed worker runs remain durable: `bd458f32-1048-55d4-8956-4dea2339fa2f` and `f1ddf0c4-d81a-5233-8c19-5f93845cd20b`. No synthetic retrieval or success was created for them.

## Continued extraction and handoff

| Object | Value |
|---|---|
| Extraction job | `5fbaebc0-a1f0-4307-b38e-9c6720a11343`, succeeded |
| Child work identity | `work:v1:d8d7f9f0d75df6de4a06f8fc1a2dee65b13aabb914e295fa885ed23d3cd4bb99` |
| Successful extraction run | `ba1db9d9-5121-544e-bd8f-0643787b8d25` |
| Attempt count | 2, maximum 2; failed attempt 1 retained |
| Actual parser invocation | Existing `dispatchSourceAdapter`, `official-profile-discovery`, `canonical-stored-v1` |
| Tool/runtime | Cloudflare worker module `contract-extraction.ts`, current verified collector version |
| Worker start / completion | `2026-09-14T04:58:57.941715Z` / `2026-09-14T04:58:58.281Z` |
| Job completion | `2026-09-14T04:59:11.758015Z` |
| Evidence | `0544818c-24d4-5075-b4b1-25e2f8ee7691`, state `pending` |
| Exact source locator | `utf8-byte-offset:749;length:212` |
| Validation handoff job | `62130c71-1656-4f93-bf19-a153401b86d1`, queued but blocked, attempt_count 0 |
| Validation work identity | `work:v1:327bf60c66e6319c8b9cabbd8d3199d246831902fec4410e7d92407174f39a82` |
| Validation blocker | `CAPABILITY_NOT_IMPLEMENTED: internal canonical validation receipt` |
| Final ResearchNeed | AWAITING_RESULT; `EVIDENCE_CONSTRUCTED: internal canonical validation receipt pending` |

The candidate is operational extraction output, not an accepted claim. The adapter reports `schema_certified=false`. Independent R2 retrieval proved that the evidence excerpt exactly equals its declared UTF-8 byte range. Evidence hash and byte length match the raw ledger. The evidence has zero claim links. Both child dependencies exist and reference succeeded parents.

Extraction attempt 1 failed on the live evidence-state CHECK constraint because `collected_unreviewed` belongs to claims, while evidence accepts `pending`. Run `b8ec7eae-c606-56d2-9291-dccd1f184302` remains failed. PR 60 corrected the state without migration or grants. A narrowly recorded activation repair restored only that child's eligibility after deployment verification, preserving its attempt count, failed run, identity, and retry schedule. Its checkpoint records the repair and GitHub SHA. The second attempt succeeded; lease fencing and expiry were independently checked again.

## Final bounded runtime state

- One canonical persistent scheduler and existing atomic Postgres lease authority.
- Configured total activation budget advanced one step at a time: 1 -> 2 -> 3 retrieval attempts, then 4 -> 5 to include extraction and its repair. It is now exhausted at five total attempts, with effective dispatch disabled and limit zero. Resource headroom independently permits one, not fan-out.
- `HERMES_ROUTE_CONTRACTS=true`, `HERMES_CONTRACT_DISPATCH=true`, `HERMES_EXTRACT_EVIDENCE=true`, budget 5. Exhausted durable attempt accounting prevents more dispatch.
- Telemetry reports `GAP_PLANNING_AND_BOUNDED_CONTRACT_ROUTING` and `BOUNDED_CANARY_BUDGET`; it does not falsely report NO_DISPATCH after execution. Health reads the persisted mode.
- All 24 unsupported original needs remain BLOCKED with explicit capability reasons.
- `HERMES_INGEST_INTAKE_PAUSED=true` in both actual runtime environments. No CivicsLenZz live producer canary, legacy job dispatch, retired schedule activation, or HERMES civic database privilege expansion.
- Tests: 8 Python tests; 120 Cloudflare unit/fixture tests; isolated TypeScript compilation. Rolled-back live-schema checks are not counted as production proof.

## Exact next transition

The next missing transition is the blocked internal canonical validation handoff -> canonical receipt/identity and contradiction checks -> validation decision. Implement that capability for `contract_evidence_validate` using the existing worker/service boundary and canonical lease. Preserve the candidate/evidence lineage and pending state until validation decides. Do not feed it into the legacy unclassified validator or unpause producer intake. The existing generic validator operates on canonical claims and does not consume this internal handoff envelope; no compatible internal receipt consumer is currently implemented.

No full autonomous acceptance is claimed. Producer intake and shared-pointer reconciliation remain separate later steps.
