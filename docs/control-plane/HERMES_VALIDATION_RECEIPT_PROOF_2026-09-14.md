# Internal canonical validation receipt — physical proof, 2026-09-14

## Outcome and limits

The existing production validation handoff physically completed on its first attempt: HERMES selection -> existing atomic lease -> existing validation queue -> new canonical validator envelope -> independent lineage checks -> unreviewed Claim and supports link -> durable ACCEPTED_FOR_VALIDATION receipt -> successful worker run -> independent HERMES acknowledgement -> succeeded job.

This accepts input into validation; it does not establish civic truth. The Claim remains `collected_unreviewed`, Evidence remains `pending`, and ResearchNeed remains `AWAITING_RESULT`. No Occupancy changed and no claim became verified or publication eligible. Producer intake remains paused. This is not full autonomous acceptance.

The validator also physically performed read-only follow-through queries for identity candidates, evidence/source facts, existing contradictions and competing claims. Its durable outcome is `NEEDS_FURTHER_VALIDATION`, with `schema_certified=false` and `auto_verification_allowed=false`. It did not substitute name equality for identity proof or retrieval time for effective tenure.

## Source and deployment lineage

Current heads and live VPS state were inspected before implementation. Main was still `819402d5cc74ed4bc6aa325b7a0f004cd2b249ff`; the original dirty checkout was preserved using separate worktrees. [PR #61](https://github.com/aijaraix/CivicLenZ/pull/61) merged normally, with the expected head checked and no forced history changes.

| Item | Verified value |
|---|---|
| Main / merged implementation | `c2d301bc15f8314e622dc290ca96e1590bddf4fa` |
| PR head | `e8c6704facdf6810a5f652af4f5cfedf423c6182` |
| Control-plane parent for this report | `82058d20a139b9346ddfaba43e76091942fb194a` |
| HERMES release directory | `/opt/civiclenz/releases/c2d301bc15f8314e622dc290ca96e1590bddf4fa` |
| systemd unit | `civiclenz-hermes-prime` |
| ExecStart and actual PID command line | `/usr/bin/python3 /opt/civiclenz/releases/c2d301bc15f8314e622dc290ca96e1590bddf4fa/services/hermes-prime/database_bootstrap.py` |
| Running HERMES PID | `155831` |
| HERMES-specific pointer | `/opt/civiclenz/hermes/current` -> release above `/services/hermes-prime` |
| Shared pointer, unchanged | `/opt/civiclenz/current` -> `/opt/civiclenz/releases/a32c1fb04bee564210cfcded48ef2853a568b120` |
| Previous validator version | `c921ae84-3eb8-44a6-a21c-4ef30fe63977` |
| New validator version / execution deployment ID | `33307ef2-d1c6-4061-86c8-0be9fc651eef` |
| Cloudflare deployment record | `89aaf57a-899d-4721-b7b4-9f0b8356c79b`, 100% traffic |
| Validator deployed at | `2026-09-14T05:53:10.366488Z` |
| Validation queue | `civiclenz-validate`, `9c2ee6c1e5574a009253f28cb9aa7625` |
| Existing consumer ID | `302d353b4ec64683a130017dab3e0b20` |

The reviewed validator was deployed first from the merged release using Wrangler 4.37.0. The Cloudflare deployment API, live worker health response and downloaded production script independently agreed on the new version and `hermes.validation.v1` / `ACCEPTED_FOR_VALIDATION` behavior before HERMES dispatch was enabled. Existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, version metadata, heavy/dead-letter queue bindings and validation consumer were preserved. The validator needs no new R2 binding for receipt work; it checks the preserved retrieval/extraction lineage rather than repeating retrieval.

SHA-256 comparisons between GitHub main and the staged release matched for all five changed implementation/test files. HERMES pointer and explicit ExecStart agree. The shared pointer remains a separately documented intake-service lineage issue and was not changed. Prior unit configuration is retained at `/opt/civiclenz/backups/hermes-before-validation-receipt-20260914.conf`.

## Physical acceptance objects

| Object / transition | Durable value |
|---|---|
| ResearchNeed | `d0657d06-1e4c-4e95-b407-81fa6c97f25a` |
| Validation Job | `62130c71-1656-4f93-bf19-a153401b86d1` |
| Validation ResearchWorkIdentity / dedupe key | `work:v1:327bf60c66e6319c8b9cabbd8d3199d246831902fec4410e7d92407174f39a82` |
| Before routing | queued, attempt 0; `CAPABILITY_NOT_IMPLEMENTED: internal canonical validation receipt` |
| Resolved route | `internal_canonical_validation_receipt`, pool `cloudflare-validation`, worker `civiclenz-validator` |
| Routing decision | OPEN; prior blocker retained in `routing_decision.previous_blocker` |
| Envelope | `hermes.validation.v1` |
| Atomic lease authority | existing `hermes_ops.lease_job`; same canonical tick and advisory lock |
| Attempt count | 1; dedicated validation-receipt allowance exhausted |
| Lease recorded / expiry | `2026-09-14T05:54:14.256952Z` / `2026-09-14T05:59:14.156506Z` |
| Queue publication | HERMES telemetry `DELIVERED_AWAITING_WORKER`; subsequently corroborated by the actual consumer execution |
| worker_run | `bb8ae247-03e3-5e50-b2c7-bb1eaae072c1` |
| Worker start / terminal success | `2026-09-14T05:54:31.155771Z` / `2026-09-14T05:54:31.985Z` |
| Receipt / validation_run | `78963717-dcaa-588f-b201-99c3ea65e066` |
| Receipt state / key | `ACCEPTED_FOR_VALIDATION` / `hermes.internal.receipt.v1` |
| Claim | `986e7902-17c5-5fd3-832f-eebf35c69f4f` |
| Claim subject and Seat | seat / `eedb56df-76e9-4a58-b52d-db68ad6b79a8` |
| Field / display value | `current_occupant` / `Ron DeSantis` |
| Claim state | `collected_unreviewed`, confidence `insufficient`, `last_verified_at=NULL` |
| Claim evidence link | Claim above -> `0544818c-24d4-5075-b4b1-25e2f8ee7691`, role `supports` |
| Evidence state | `pending` |
| Retrieval | `fda8ef65-ea36-520a-af5f-cbde68e82c70`, 34,484 bytes |
| Evidence and retrieval SHA-256 | `45f8a971563f1d751d571c448b88b84cb9be59519d9deb99fa775fae038d925c` |
| Parent extraction job / successful run | `5fbaebc0-a1f0-4307-b38e-9c6720a11343` / `ba1db9d9-5121-544e-bd8f-0643787b8d25` |
| Parent extraction work | `work:v1:d8d7f9f0d75df6de4a06f8fc1a2dee65b13aabb914e295fa885ed23d3cd4bb99` |
| Root retrieval job | `4e159022-80a3-4fc4-8357-2c2747365805` |
| Root work | `work:v1:bf6e28c6698cd07f364151668f18ead6a31afe8fe117bbb438e01a02cef369c1` |
| Job independently completed by HERMES | succeeded at `2026-09-14T05:54:45.742880Z` |
| ResearchNeed before | AWAITING_RESULT; EVIDENCE_CONSTRUCTED: internal canonical validation receipt pending |
| ResearchNeed after | AWAITING_RESULT; VALIDATION_RECEIPT_ACCEPTED: identity/currentness/contradiction validation pending |
| Additional downstream job | None; unresolved gate assessment is retained in the receipt |

The new handler branches before legacy queue parsing and `runQueueJobWithWorker`. It verifies the existing HERMES lease and never calls `leaseJob`/`leaseDueJob`, completes a canonical job, or writes a ResearchNeed. The claim, link and receipt use deterministic IDs/keys; duplicate delivery does not produce duplicate successful receipts. Production redelivery was not manufactured to obtain a second PASS.

## Independent checks and preserved history

An independent read-only database connection joined the job, expected worker run, receipt, Claim, supports link, exact Evidence/retrieval and ResearchNeed. It proved:

- Attempt fencing matches across dispatch history, job checkpoint, worker metadata and receipt input; no token value was returned.
- The expected validator version executed; worker and HERMES completion were both inside lease expiry; the terminal job cleared its active lease.
- Receipt job/Need/work/parent lineage matches the handoff, and the evidence hash matches the original raw ledger.
- Exactly one receipt exists for this job. The only Claim for this Seat is the unreviewed candidate; its effective dates and last-verified timestamp remain null.
- HERMES persisted `UNCHANGED_OCCUPANCY_AND_VERIFIED_CLAIMS` after comparing the before/after snapshots. Independent recomputation matched both snapshots: Occupancy digest `5be652f67f479150e63bddb641c3d0ae`, verified-claim digest `d751713988987e9331980363e24189ce`. The Occupancy snapshot includes complete existing row values, so this checks changes as well as inserts.
- Receipt publication eligibility is false. The existing publication predicate requires a verified claim; this claim is unreviewed. No publication or Occupancy operation exists in the canonical handler.

Retrieval remains succeeded with attempt_count 3 and three worker runs, including preserved failures `bd458f32-1048-55d4-8956-4dea2339fa2f` and `f1ddf0c4-d81a-5233-8c19-5f93845cd20b`. Extraction remains succeeded with attempt_count 2 and two worker runs, including preserved failure `b8ec7eae-c606-56d2-9291-dccd1f184302`. Neither successful action was repeated. The earlier [retrieval/extraction proof](HERMES_CANONICAL_EXECUTION_PROOF_2026-09-14.md), including physical R2 read-back, remains intact.

## Bounded authority and credentials

`HERMES_VALIDATION_RECEIPT=true`, `HERMES_VALIDATION_RECEIPT_BUDGET=1`, verified `HERMES_CF_VALIDATE_QUEUE_ID` and `HERMES_VALIDATOR_DEPLOYMENT` were added only after worker verification. The new budget is capped at one and counts only canonical production `contract_evidence_validate` attempts with the receipt route. Dependencies, resource governor, attempt limits and the existing atomic lease still apply. Original `HERMES_CONTRACT_DISPATCH_BUDGET=5` remains exhausted and unchanged.

Initial telemetry independently showed resource headroom and dispatch limit 1. After completion it shows `GAP_PLANNING_AND_BOUNDED_CONTRACT_ROUTING`, `BOUNDED_CANARY_BUDGET`, effective dispatch false/0, while measured headroom allowance remains 1. The other 24 needs remain BLOCKED. No second receipt attempt or unrelated work was dispatched.

The existing account-scoped Queue-write token was reused through systemd `LoadCredential=cloudflare-queue-producer`; no new token was provisioned. Actual runtime credential reads succeed as `civiclenz-hermes` and fail as `civiclenz` and `nobody`. HERMES cannot read `/etc/civiclenz/secrets.env`, and the dedicated token is absent from that file. Existing unrelated-service access to its own old environment file was not changed. Worker service credentials remain worker-side.

The live database identity is still `hermes_runtime`. Direct claim INSERT/UPDATE, evidence UPDATE and Occupancy INSERT permissions were independently false. No grants or migrations were made. Both actual running service environments retain `HERMES_INGEST_INTAKE_PAUSED=true` (HERMES PID 155831; intake PID 63755). Legacy schedules and queue lifecycle were not activated or changed.

## Continued validation assessment and exact next transition

At `2026-09-14T05:54:31.830Z`, the actual validator queries recorded:

- One name-match candidate: Person `d612250c-3711-4f04-a756-dd2c58aa6fa8`. Identity remains unresolved; name equality is not a canonical relationship assertion.
- Active source `cd3d11f6-c948-429f-8368-e85fdccce2dc`, authority `TIER_1_PRIMARY_OFFICIAL`; exact excerpt contains the extracted name and retains locator `utf8-byte-offset:749;length:212`.
- No existing contradiction or competing-value claim returned by the bounded queries. This is not proof of exhaustive contradiction clearance; the receipt records query limits.
- No established effective tenure period or dataset reference period. Retrieval time alone does not establish current occupancy.
- `schema_certified=false`; outcome `NEEDS_FURTHER_VALIDATION`; all truth/publication decisions remain pending.

The next missing canonical transition is a lease-owned validation stage that establishes authoritative identity/Seat relationship and effective tenure, assesses evidence sufficiency, and records contradiction/dataset reconciliation and a justified decision. Existing generic validation must not be used unchanged to infer identity from the display name or bypass canonical leasing. The current receipt contains the actionable missing-gate assessment, but no executable follow-up job or further execution allowance was created. This is the correct pending production outcome for the one-receipt canary, not a completed validation pipeline. Source authority alone cannot override the uncertified extraction gate. Intake, publication and RECONCILED_AS_OF remain unavailable for this canary.

## Verification scope

125 worker tests and 8 HERMES tests passed, including stale lease, wrong deployment, production/work mismatches, broken lineage, duplicate delivery and lease-loss cases. Targeted TypeScript compilation and diff checks passed. A rolled-back live route/budget preflight and a read-only receipt-query schema check passed before spending the production attempt. Those checks are not production proof; the durable objects and independent joins above are.
