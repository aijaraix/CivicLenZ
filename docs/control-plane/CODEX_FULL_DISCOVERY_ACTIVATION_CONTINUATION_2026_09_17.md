# CivicLenZ — Full Discovery Activation Continuation — 2026-09-17

## Purpose
This is the authoritative continuation checkpoint after the two demonstrated blockers from the initial Florida production cohort were repaired.

Do not restart architecture discovery. Continue from current physical state.

Canonical repository: `aijaraix/CivicLenZ`
Producer repository: `aijaraix/CivicsLenZz`
Canonical host: `civiclenz-prod-ai`
Producer runtime: Google AI Studio / Cloud Run

FIRST ACTION: fetch CURRENT remote heads for both repositories and revalidate live state. Preserve newer legitimate work.

Read first:
- `CODEX_START_HERE.md`
- `docs/control-plane/CODEX_FULL_DISCOVERY_ACTIVATION_PASS_2026_09_16.md`
- this continuation file
- `docs/control-plane/MONITORING_CURRENTNESS_FAILURE_RECOVERY_AND_ACADEMY_EVOLUTION_CONTRACT.md`

## Current verified checkpoints
Canonical main before this handoff document commit: `d6aa9ff01eae1335d3dc63bce1b850e88d651f8e`
Producer main: `0f29105a481326430182ec92660401f4e9280205`

Prime is physically running canonical release `d6aa9ff01eae1335d3dc63bce1b850e88d651f8e`.

Producer republish was physically observed as Cloud Run revision `civiclenz-00023-l2s`.
The `/api/build-info` `git_sha` field remains stale and is not authoritative deployment proof. Use Cloud Run revision plus physical behavior/runtime verification.

Producer live state at handoff:
- daemon active
- Postgres connected
- R2 connected
- `canonical_assignments_only=true`
- active processing jobs = 0

Canonical effective gates at handoff:
- `HERMES_INGEST_INTAKE_PAUSED=true`
- `HERMES_PRODUCER_OUTBOUND=false`
- `HERMES_PRODUCER_OUTBOUND_BUDGET=0`
- `HERMES_PRODUCER_RECEIPT_VALIDATION=false`
- `HERMES_PRODUCER_RECEIPT_VALIDATION_BUDGET=0`
- receipt dispatch remains enabled with budget 1

## Blocker 1 is closed — identity-resolution receipt dispatch
Canonical PR #84 merged and deployed.

Repair: `NEEDS_IDENTITY_RESOLUTION` is now a dispatchable acknowledgement state for canonical validation without changing the acknowledgement, classification, truth authority, or publication authority.

Physical proof on receipt:
`6b627925-2f4c-4078-a5a9-3376099c98ec`

The receipt preserved:
- acknowledgement = `NEEDS_IDENTITY_RESOLUTION`
- classification = `extracted_unreviewed`
- publication_allowed = false
- original three failed dispatch attempts

One exact operator-scoped retry created:
- handoff: `6bd9bd69-5f55-5320-9a26-e0829898ff5b`
- validation job: `fd57f9b6-a1ea-53b5-8bc1-613693cb8b98`

Independent validation succeeded with:
- evidence integrity PASS
- exact registered Florida DOS source
- candidate count 2
- validation disposition `NEEDS_IDENTITY_RESOLUTION`
- verification_allowed=false
- publication_allowed=false
- person_creation_allowed=false
- occupancy_creation_allowed=false

Ordinal 1 parent is reconciled to:
`BLOCKED / PRODUCER_RECEIPT_VALIDATED_NEEDS_IDENTITY_RESOLUTION`

Ordinal 1 canonical attempt count remains exactly 1.

## Blocker 2 is closed — Florida DOS structural parser
Producer PR #10 merged at:
`0f29105a481326430182ec92660401f4e9280205`

The prior parser incorrectly treated the Florida DOS election-selection landing page as candidate data and emitted `General Election:` / `Special Election:` as candidate identities.

The repaired parser now:
1. retrieves the Florida DOS candidate landing page;
2. resolves the currently selected official general election ID;
3. retrieves the actual listing at `CanList.asp?elecid=...`;
4. accepts only rows containing structural `CanDetail.asp?account=...` candidate links;
5. derives candidate status from the adjacent status cell;
6. derives office from the official result-table heading;
7. handles district-bearing tables without fixed candidate-column indexes;
8. rejects selector/header rows;
9. keeps all outputs `EXTRACTED_UNREVIEWED` and identity-resolution-required;
10. preserves the canonical source URL while retrieval/evidence URLs retain the election-specific listing.

Physical live-source verification before merge:
- selected election ID: `20261103-GEN`
- 868 structural candidate rows
- 22 result tables
- zero `General Election:` / `Special Election:` false candidates
- zero accepted candidate rows without `CanDetail` structural locators
- parser regression PASS
- durable canonical production test PASS
- TypeScript lint PASS
- production build PASS

The repository's existing durable-persistence suite has six host-environment baseline failures on untouched producer main; the same baseline was reproduced independently, so they are not parser regressions.

## Current cohort state
Ordinal 1 — complete through validation/reconciliation
- canonical job: `d2261640-8cdd-4f9a-bef3-ff12166e6d93`
- parent ResearchNeed: `8a51bdce-599b-46c3-aa38-560108af45f6`
- final parent state: `BLOCKED`
- final reason: `PRODUCER_RECEIPT_VALIDATED_NEEDS_IDENTITY_RESOLUTION`
- canonical attempt count: 1

Ordinal 2 — NOT YET ACTIVATED
- canonical job: `fd887d7e-a380-48b0-ba55-d7bc7f36d8a3`
- ResearchNeed: `a73b73d4-aef0-4ba0-abea-de0cfa925723`
- ResearchWorkIdentity: `work:v1:67360f436ba467606c1b9760012fada0f1869f0806dde1167537017c9f712795`
- status: queued
- attempt_count: 0

Ordinal 3 — NOT YET ACTIVATED
- canonical job: `7be346dd-966e-45f1-aca4-d76cf31e39a5`
- ResearchNeed: `c4f913b7-5ad5-4d7b-9b95-ef679a06d508`
- ResearchWorkIdentity: `work:v1:a8ee7da20ed386c19407ea6f7f5a731cf4a082816132165e5aca4712b8bb5645`
- status: queued
- attempt_count: 0

Current truth-safety baseline:
- persons = 1
- occupancies = 1
- claims = 2
- verified claims = 0

## Immediate mission
1. Physically prove the republished producer is executing the parser repair by running ordinal 2 through the full loop.
2. Keep concurrency = 1.
3. Use a fresh exact one-use bounded return authorization for ordinal 2.
4. Activate only ordinal 2 producer outbound.
5. Verify producer output contains real structural candidate records and does NOT contain the false selector labels.
6. Complete receipt -> handoff -> `producer_receipt_validate` -> independent validation -> parent reconciliation.
7. Confirm truth counts remain unchanged except for deliberately validated canonical writes, if any; the current expected outcome is unresolved extracted candidate evidence, not automatic Person/Occupancy creation.
8. Repeat for ordinal 3.

Do not move to broad expansion until all three cohort ordinals have clean reconciled lineages.

## Three-job acceptance gate
Require exact reconciliation of:
- canonical assignments
- producer durable executions
- canonical receipts
- validation jobs
- worker runs/evaluations
- ResearchWorkIdentity lineage
- evidence hashes/lengths

Also require:
- canonical attempt count exactly 1 for all three
- no duplicate canonical execution
- no cohort-created dead-letter
- no malformed selector/header candidate identities
- no Person created by name-only matching
- no Occupancy auto-created from filing names
- no auto-verified claim
- no publication
- producer remains `canonical_assignments_only=true`

If the gate passes, continue without another architecture review.

## Expansion sequence
Stage A: 10-job supported-capability Florida cohort.
Stage B: 50-job supported-capability Florida cohort.
Stage C: continuous autonomous Florida discovery for physically supported capabilities.

Unsupported scopes remain explicitly blocked. Do not route unrelated biography, finance, education, contact, legal, social, or other scopes through the Florida DOS candidate adapter.

If exact-job manual rotation is the only obstacle to continuous discovery, implement the smallest bounded HERMES-owned queue/outstanding-limit mechanism. Do not create a second scheduler.

## Academy / evolution activation
Academy is authorized to begin in OBSERVATION / MEASUREMENT / PROPOSAL mode using real production telemetry from the repaired cohort and subsequent discovery.

Follow `MONITORING_CURRENTNESS_FAILURE_RECOVERY_AND_ACADEMY_EVOLUTION_CONTRACT.md`.

Academy may consume real observations including:
- parser failures and repairs
- schema drift
- source health
- handoff failures
- canonical rejection feedback
- duplicate work
- identity ambiguity
- validation outcomes
- rate limits
- queue starvation
- operator corrections

Important current fact: no canonical Academy table was found in Supabase at this handoff. Do not assume Academy production persistence is already implemented.

Codex should:
1. inspect existing observer/Academy code and current persistence;
2. establish or complete the minimum durable production observation/case store if genuinely missing;
3. record real production cases distinctly from fixtures/tests;
4. begin Academy observation and proposal generation in parallel with discovery;
5. keep Academy non-blocking for unrelated research;
6. do not grant Academy civic truth, verification, publication, permission-expansion, or self-promotion authority.

High-impact Academy changes must still pass targeted/regression tests and promotion gates. Academy must not silently weaken validation, change election/legal semantics, increase permissions, or auto-publish unsupported claims.

## Operating doctrine
Do not restart architecture discovery.
Do not redo proven HMAC/bridge/durability work.
Do not rebuild HERMES.
Do not create another scheduler.
Do not reset attempts.
Do not rewrite failed history.
Do not fabricate civic truth.
Do not globally unpause intake merely to increase throughput.

For any new blocker:
first incorrect transition -> generalized fix -> regression test -> deploy -> physical verification -> resume.

The objective is operational:
complete ordinals 2 and 3, pass the three-job gate, expand 3 -> 10 -> 50, activate continuous supported Florida discovery, and bring Academy observation/evolution online without granting it truth or publication authority.
