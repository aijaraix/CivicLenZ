# CivicLenZ — Codex Full Discovery Activation Pass — 2026-09-16

## Purpose

This is a continuation from a physically proven HERMES-controlled producer loop and an actively repaired three-job Florida cohort.

This pass exists to get CivicLenZ into **real autonomous Florida discovery tonight** without restarting architecture discovery and without spending time on another broad audit.

Codex is being added now as the final activation / verification engineer.

Do not redesign CivicLenZ. Do not create a second scheduler. Do not bypass HERMES. Do not hand-insert civic truth to make a test pass.

If the bounded proof passes, continue autonomously into broader discovery in the staged activation sequence below. Do not stop merely because a stage succeeds. Stop only for a real safety, correctness, credential, or production blocker.

## Repositories and live systems

Canonical repository:
`aijaraix/CivicLenZ`

Current canonical main checkpoint at preparation time:
`9542ad8a38564ff448bae4837631dc30377ebc7d`

Producer repository:
`aijaraix/CivicsLenZz`

Current producer main checkpoint at preparation time:
`e0f61a31af9d8387ec5f59cf63ba295e2b2dbd0b`

Canonical production host / SentinelX:
`civiclenz-prod-ai`

Producer runtime:
Google AI Studio / Cloud Run

FIRST ACTION: fetch CURRENT remote heads for both repositories and revalidate physical live state. Preserve newer legitimate work.

Read `CODEX_START_HERE.md` and the mandatory control-plane package it names. This is not permission to rediscover or redesign the system; reading canon is required to avoid violating existing contracts.

## Physically proven milestone

The first real end-to-end production path has already passed:

HERMES canonical ResearchNeed
→ HERMES outbound assignment
→ CivicsLenZz durable Cloud SQL job
→ real Florida Division of Elections retrieval
→ exact raw evidence stored durably
→ authenticated return to canonical receiver
→ durable canonical receipt
→ HERMES receipt handoff
→ `producer_receipt_validate`
→ independent validation acknowledgement
→ original contract ResearchNeed reconciled to validation outcome

Milestone:

`HERMES_CONTROLLED_PRODUCER_END_TO_END_PRODUCTION_LOOP = PASS`

Do not redo this proof from scratch.

## Current truth-safety baseline

Before the active three-job cohort was started:

- persons = 1
- occupancies = 1
- claims = 2
- verified claims = 0
- no Person created by the producer loop
- no Occupancy created by the producer loop
- no claim auto-verified by the producer loop
- no publication occurred

Producer results are `extracted_unreviewed`.

Producer has no verification authority and no publication authority.

Identity ambiguity fails closed.

## Completed cleanup work

### Producer ACK / idempotency serialization

Producer `mapJobRow` now returns `logical_work_key`.

Live historical production job was physically reverified after republish and now returns:

`canonical:work:v1:6e4760d03b3d03e3408787e414f2ef8683ac16639d9b8f1f0bc7a5517faffce5`

ACK serializer cleanup is physically closed.

### Candidate output

Real Florida DOS `CANDIDATE_FILING_RECORD` rows are converted into deterministic unresolved `candidate_campaign_candidates` and evidence-linked filing claims.

Invariants:

- no canonical Person inference by name
- no Occupancy creation
- no auto-verification
- candidates remain `extracted_unreviewed`
- `identity_resolution_required=true`
- each candidate and claim must reference real producer evidence

### Canonical Florida DOS source

`public.sources` now contains exactly one canonical row:

- source_key: `fl_dos_elections`
- source_type: `official_election_candidate_filing`
- authority_tier: `TIER_1_PRIMARY_OFFICIAL`
- jurisdiction: Florida / `us-fl`
- URL: `https://dos.elections.myflorida.com/candidates/CanList.asp`
- active: true
- health_state: ok

Registration is provenance metadata, not claim verification.

### Prime systemd consolidation

Temporary producer recovery/release drop-ins were consolidated.

The running Prime process was physically verified with:

- canonical release: `9542ad8a38564ff448bae4837631dc30377ebc7d`
- `HERMES_INGEST_INTAKE_PAUSED=true`
- producer HMAC mode
- exact producer endpoint
- recovery limit 1
- no publication authority

After the consolidation restart:

- zero new worker runs
- zero jobs started
- zero jobs completed
- no attempt-count increase

## Producer repair currently being deployed

The first job of the new cohort exposed a generalized multi-evidence defect.

Producer execution:
`job_1789597088116_1a711d`

Canonical cohort job:
`d2261640-8cdd-4f9a-bef3-ff12166e6d93`

The producer extracted multiple candidate rows. Candidates/claims referenced row-specific evidence UUIDs, but the canonical envelope serialized only the first evidence object.

The producer failed closed with a canonical V1 schema rejection rather than returning malformed civic research.

That failed producer run MUST remain preserved.

PR #9 in `aijaraix/CivicsLenZz` repaired the generalized failure class and is merged into producer main at:

`e0f61a31af9d8387ec5f59cf63ba295e2b2dbd0b`

The repair:

1. serializes every validated producer evidence object into the canonical envelope;
2. preserves row-specific evidence locators;
3. verifies every candidate/claim evidence reference resolves;
4. permits an exact same-work producer replacement only when the prior producer execution is terminal `FAILED_PERMANENT` / `DEAD_LETTER`;
5. preserves the failed execution instead of rewriting it;
6. keeps the canonical job at attempt 1;
7. keeps Person/Occupancy/publication/verification authority unchanged.

Focused test: PASS.
TypeScript lint: PASS.
Production build: PASS.

At handoff time the owner is republishing Google AI Studio / Cloud Run with this producer main.

## Current three-job cohort

Cohort ID:
`civiclenz-fl-dos-production-cohort-2026-09-16-v1`

Concurrency:
1

Ceiling:
3

All three are explicit production ResearchNeeds for the existing Florida Governor `election_history` gap and the official Florida DOS candidate-filings source.

### Ordinal 1

Canonical job:
`d2261640-8cdd-4f9a-bef3-ff12166e6d93`

ResearchNeed:
`8a51bdce-599b-46c3-aa38-560108af45f6`

ResearchWorkIdentity:
`work:v1:7f2800ab549dd36fa7c8b3b4f0ee92eee649eb54cb45d417c33218b872a78b60`

Canonical job state at repair handoff:
`leased`, `attempt_count=1`

The prior producer child failed terminally due to the multi-evidence envelope defect.

The canonical job MUST remain canonical attempt 1 during recovery.

### Ordinal 2

Canonical job:
`fd887d7e-a380-48b0-ba55-d7bc7f36d8a3`

ResearchNeed:
`a73b73d4-aef0-4ba0-abea-de0cfa925723`

ResearchWorkIdentity:
`work:v1:67360f436ba467606c1b9760012fada0f1869f0806dde1167537017c9f712795`

Expected current state:
queued, attempt 0

### Ordinal 3

Canonical job:
`7be346dd-966e-45f1-aca4-d76cf31e39a5`

ResearchNeed:
`c4f913b7-5ad5-4d7b-9b95-ef679a06d508`

ResearchWorkIdentity:
`work:v1:a8ee7da20ed386c19407ea6f7f5a731cf4a082816132165e5aca4712b8bb5645`

Expected current state:
queued, attempt 0

## Immediate Codex execution target

### Step 1 — verify republished producer

Do not assume the Google republish succeeded.

Physically verify the live revision changed and that the deployed behavior includes producer commit `e0f61a31...` or equivalent code content.

Verify:

- daemon active
- Cloud SQL connected
- R2 connected
- `canonical_assignments_only=true`
- active processing jobs count is 0 before reactivation
- HMAC raw-body runtime marker still present
- historical durable `logical_work_key` still serializes correctly
- multi-evidence envelope code is deployed

If the republish is not live, STOP producer activation and report the exact missing deployment step.

### Step 2 — recover cohort ordinal 1 on canonical attempt 1

Do not increment the canonical attempt merely because the producer child failed.

Use the existing bounded producer recovery semantics.

Preserve the terminal failed producer execution.

Create/accept a replacement producer child for the exact same canonical ResearchWorkIdentity only after proving the old producer child is terminal.

The replacement must retrieve real Florida DOS data again and build a complete multi-evidence canonical envelope.

Verify before return:

- all candidate evidence keys exist in `envelope.evidence`
- all claim evidence keys exist in `envelope.evidence`
- raw bytes hash and byte length match durable object storage
- no Person candidate is fabricated from name only
- no Occupancy candidate is fabricated
- classification remains `extracted_unreviewed`

### Step 3 — finish ordinal 1 end to end

Ordinal 1 must physically complete:

producer durable execution
→ authenticated canonical return
→ one-use bounded authorization consumed
→ durable receipt
→ receipt dispatch
→ `producer_receipt_validate`
→ validation evaluation
→ parent ResearchNeed reconciliation

Do not move to ordinal 2 until receipt lineage is physically proven.

### Step 4 — execute ordinals 2 and 3 sequentially

Keep producer concurrency at 1 for the three-job acceptance cohort.

For each ordinal:

- exact HERMES work identity
- exact one-use bounded return authorization
- producer ACK must include durable logical work key
- real retrieval
- durable raw evidence
- authenticated return
- one durable receipt
- one validation job
- one validation worker run/evaluation
- parent reconciliation

No duplicate canonical attempts.
No duplicate producer execution for non-terminal work.

## Three-job cohort acceptance gate

All of the following must hold before broad discovery expansion:

1. Three canonical cohort jobs have each reached a durable terminal handoff/validation outcome.
2. Each canonical job attempt count is exactly 1.
3. Exactly one accepted canonical receipt lineage exists per successful returned assignment.
4. Exactly one receipt-validation job exists per receipt.
5. Producer durable ACKs expose the correct canonical logical work identity.
6. No evidence hash or byte-length mismatch exists.
7. No orphan candidate/claim evidence reference exists.
8. No Person is created from name-only evidence.
9. No Occupancy is created from candidate filing names.
10. No claim is auto-verified by the producer.
11. No publication occurs.
12. No new dead letter is produced by the cohort.
13. No producer-autonomous backlog job executes while `canonical_assignments_only=true`.
14. Canonical source registration resolves `fl_dos_elections` to the Tier-1 Florida DOS source.
15. Truth-safety counts remain explainable by canonical validation only.

If any item fails, STOP cohort expansion, repair the generalized failure class, regression-test it, preserve failed history, then resume the same bounded cohort where possible.

## Broad discovery activation authority

When the three-job cohort passes, Codex is authorized to continue autonomously into **real Florida discovery** without another architecture review.

This is not authorization to publish unverified political/civic claims.

This is not authorization to synthesize missing civic truth.

This is not authorization to run unsupported research scopes through the Florida DOS candidate-filings adapter.

### Activation Stage A — 10-job Florida discovery cohort

After the 3-job gate passes:

- select 10 real canonical jobs whose scopes have a physically implemented compatible worker/source path;
- do not route biography, education, finance, contact, legal, social or other unrelated scopes through the Florida DOS filing adapter;
- concurrency starts at 1 and may increase to 2 only after at least 5 clean completed lineages;
- maximum outstanding jobs: 10;
- preserve source rate limits and host headroom;
- all producer inputs remain canonical assignments;
- all producer outputs remain `extracted_unreviewed`;
- no publication authority.

Stage A passes only if assignment/receipt/validation counts reconcile exactly and no truth-safety invariant regresses.

### Activation Stage B — 50-job supported-capability Florida cohort

If Stage A passes:

- expand to up to 50 outstanding supported-capability jobs;
- concurrency may increase conservatively based on measured latency, error rate, source throttling and DB load;
- do not increase concurrency simply to chase throughput;
- use existing HERMES work identities/reservations/dedupe semantics;
- keep unsupported scopes explicitly blocked with truthful reason states;
- do not replace `CAPABILITY_NOT_IMPLEMENTED` with a factual no-result state.

Monitor:

- queue depth
- lease expiry/recovery
- duplicate logical work
- source errors / throttling
- receipt counts
- validation counts
- dead letters
- R2 integrity
- database latency
- CPU/memory/headroom
- evidence orphan rate
- identity-resolution backlog

### Activation Stage C — continuous Florida discovery

If the 50-job cohort passes and no safety invariant regresses, activate continuous autonomous Florida discovery for **physically supported capabilities**.

Requirements:

- HERMES remains the sole canonical orchestrator.
- discovery creates/reconciles durable ResearchNeeds and ResearchWorkIdentities.
- Seat discovery triggers election and candidate discovery in parallel as required by canon.
- producer runtimes remain replaceable executors, not truth authorities.
- unsupported scopes remain blocked and visible rather than silently skipped.
- monitoring/currentness work continues after initial collection.
- event-first orchestration remains primary with heartbeat/backstop behavior.
- backlog ceilings, rate limits and system headroom remain enforced.

At this stage, do not require an operator to manually select each producer job.

If the current exact-job outbound mechanism is the only thing preventing safe continuous supported-capability discovery, Codex should implement the **smallest bounded canonical queue/outstanding-limit mechanism** needed to replace manual exact-job rotation while preserving:

- HERMES ownership
- ResearchWorkIdentity dedupe
- canonical lease authority
- maximum outstanding ceiling
- producer `canonical_assignments_only`
- receipt/validation lineage
- no publication/verification authority
- fail-closed behavior

Use PRs, tests and physical proof. Do not create a competing scheduler.

## Global canonical intake

Do not simply set global intake to unbounded because discovery is desired.

If `HERMES_INGEST_INTAKE_PAUSED=true` is still needed for safe bounded return authorizations, keep it paused while producer returns use exact bounded authorizations.

Codex may replace the manual bounded-return authorization workflow with a reviewed machine-enforced bounded-intake mechanism only if it preserves the same or stronger identity, single-use/idempotency, classification and publication restrictions.

Only unpause a broader intake surface when the effective mechanism is physically proven to reject:

- wrong producer
- wrong job ID
- wrong work identity
- replay
- expired authorization
- classification escalation
- publication authority
- malformed evidence lineage

## Existing producer autonomous backlog

Do not execute the legacy producer backlog during controlled canonical production.

`canonical_assignments_only=true` remains mandatory until a separately reviewed integration explicitly reconciles producer-autonomous work into canonical HERMES identities/reservations.

## Truth and political neutrality constraints

CivicLenZ is an information/research system, not a political persuasion system.

The runtime must not rank politicians, candidates, parties or ballot choices, recommend voting decisions, infer voter preference, or publish evaluative political scores.

Candidate and elected-official research may collect documented factual records and attributed positions, subject to evidence, identity and validation contracts.

## Do not redo

Do NOT redo:

- architecture discovery
- producer durability proof
- original bridge canary
- raw-body HMAC diagnosis
- shared-secret normalization diagnosis
- ACK serializer history
- canonical receiver design
- receipt dispatch design
- receipt validator design
- first end-to-end production loop
- source registration cleanup
- systemd drop-in cleanup
- PR #8 producer ACK/candidate cleanup
- PR #9 multi-evidence envelope repair

## Codex implementation doctrine for tonight

Use the existing architecture and fix only demonstrated blockers.

Do not spend the session writing another long assessment before taking action.

For each blocker:

1. identify the first incorrect transition;
2. fix the generalized failure class;
3. add a regression test;
4. preserve failed physical history;
5. deploy/reverify;
6. resume the bounded cohort;
7. continue activation when the exit gate passes.

Use SentinelX + Supabase + GitHub directly where available.

Do not wait for a human for operations that can safely be completed with existing credentials and tools.

If Google AI Studio / Cloud Run deployment still requires the owner, isolate that one manual step and continue all independent canonical work.

## Success condition for this pass

The pass is successful when:

1. the repaired 3-job Florida cohort is physically proven;
2. a 10-job supported-capability Florida cohort passes;
3. a larger 50-job supported-capability cohort passes or is demonstrably running cleanly under bounded control;
4. continuous Florida discovery is active for physically supported capabilities without manual per-job intervention;
5. unsupported scopes remain truthfully queued/blocked rather than fabricated;
6. evidence → extraction → receipt → validation → canonical reconciliation remains intact;
7. no producer can verify or publish civic truth;
8. no duplicate scheduler/control plane has been introduced;
9. the system can continue running after Codex disconnects.

The objective tonight is not another proof document. The objective is a safely running autonomous discovery system.