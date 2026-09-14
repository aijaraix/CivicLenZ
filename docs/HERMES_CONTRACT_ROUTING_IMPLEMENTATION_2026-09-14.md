# HERMES contract routing — implementation checkpoint, not production acceptance

## Source and physical baseline

- Canonical `main`: `34801818db87d0ba1be3b53ace19fa414a6e2806` (fetched September 14).
- Authorized control-plane: `e7f34dd4411a496ac8e4f67afed8483a49551cca`.
- Manifest: version 1.2.0. This is a bounded implementation checkpoint, not full package conformance certification.
- VPS: `host_1809bab1f11de7f7`, CivicLenZ.
- Active HERMES PID: `150833`.
- ExecStart: `/usr/bin/python3 /opt/civiclenz/releases/4726ba9a5e71a7eaea5513cac7b9c74a648defc1/services/hermes-prime/database_bootstrap.py`.
- Both existing broad and HERMES-specific pointers remain at the older `a32c1fb...` release. Neither pointer changed in this pass.
- Receiver PID: `63755`; its actual process environment retains `HERMES_INGEST_INTAKE_PAUSED=true`.
- Production HERMES still reports `canonical_dispatch=NOT_IMPLEMENTED`, dispatch disabled, allowance zero.

## Implemented code

1. A fail-closed router checks job/need/work/contract identities and contract requirements.
2. Its initial bounded supported stage is `evidence` -> authoritative HTTP retrieval -> R2/raw_retrievals, pending extraction and validation. It does not pretend that raw bytes reconcile an entire research scope.
3. The route selects a registered, active, primary official source allowed by the field's source policy. A bounded endpoint subset is checked again against the existing Cloudflare source catalog by the worker.
4. Selection uses the existing `hermes_ops.lease_job`, preserving its SKIP LOCKED, attempt fencing, dependency and dedupe behavior. Production scheduler predicates exclude tests, unknown authority, legacy jobs and blocked needs.
5. The Cloudflare collector receives a distinct canonical envelope and consumes that lease; it never calls the old worker lease RPC for that envelope.
6. Duplicate delivery is suppressed by a deterministic worker-run primary key. The worker uses the existing collector database identity and R2 binding; it writes raw retrievals and worker lineage, never claims, civic publication state or validation decisions.
7. HERMES independently queries the worker result and matching raw retrieval before fencing the job completion. ResearchNeed stays AWAITING_RESULT for extraction/validation. No downstream validation job is invented or dispatched by this change.
8. Resource headroom produces a maximum allowance of one. Activation/credential/deployment gates and a persistent total attempt budget further constrain dispatch. The budget defaults to one and cannot exceed two through configuration.
9. Failures and expired leases follow bounded backoff/dead-letter behavior. Uncertain queue delivery retains its lease until recovery rather than releasing early and risking duplicate execution.

## Concrete credential boundary

The existing Cloudflare collector has `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, and the `civiclenzevidence` R2 binding. Those remain worker-side. No new database grants are needed or proposed.

HERMES's OS identity cannot read `/etc/civiclenz/secrets.env`. That file holds an existing infrastructure Cloudflare API token. It was not copied, exposed to HERMES, or granted additional readability.

Before production dispatch, provision an explicitly scoped queue-producer credential for the existing `civiclenz-ingest` queue (`9302857ddec747a4919268ad2f8ffb39`) in the existing account. The owner has explicitly accepted account-level Queue write scope restricted to account `26b7bb3e78f1d2d6cd86b78468424c93`; Cloudflare does not offer individual-queue token resource scoping. Only Queues Write is authorized. Account-owned tokens support Workers Queues.

Deliver the approved credential through systemd `LoadCredential` as `cloudflare-queue-producer`. The code does not fall back to an owner/admin token or service-role database key.

Required nonsecret configuration after verified deployment:

- `HERMES_ROUTE_CONTRACTS=true`
- `HERMES_CONTRACT_DISPATCH=true`
- `HERMES_CONTRACT_DISPATCH_BUDGET=1`
- `HERMES_CF_ACCOUNT_ID=<existing approved account>`
- `HERMES_CF_INGEST_QUEUE_ID=9302857ddec747a4919268ad2f8ffb39`
- `HERMES_EVIDENCE_WORKER_DEPLOYMENT=<independently verified new collector deployment ID>`

Do not set the deployment ID to an old collector version. Deploy and verify the new lease-consuming handler first. Do not enable producer intake.

## Validation performed

- Seven Python UNIT tests (including persisted observation/health mode regression with simultaneous planning and bounded dispatch): eligibility identity checks, unsupported scopes, source restrictions, credential/deployment gates, resource allowance.
- 112 Cloudflare UNIT/FIXTURE tests passed, including seven new worker tests: raw persistence and duplicate suppression, stale lease, test-work rejection, real-helper network failure behavior, R2 mismatch, lease loss, wrong deployment.
- Isolated TypeScript compilation of the new worker and imports passed with TypeScript 5.9.3. An existing BufferSource typing issue was corrected by explicitly copying the exact bytes to an ArrayBuffer.
- Live-schema/RLS compatibility test under `current_user=hermes_runtime`, **rolled back**: router evaluated 25 actual jobs; 24 remained unsupported and one selected the evidence route but remained deployment-gated. Independently queried after rollback: all 25 still had their original BLOCKED routing reason. No test changes were retained and no worker was dispatched.

These are not production execution proof.

## Production canary candidate — not executed

- ResearchNeed: `d0657d06-1e4c-4e95-b407-81fa6c97f25a`.
- ResearchWorkIdentity: `work:v1:bf6e28c6698cd07f364151668f18ead6a31afe8fe117bbb438e01a02cef369c1`.
- Job: `4e159022-80a3-4fc4-8357-2c2747365805`.
- Scope: `evidence`.
- Source: `cd3d11f6-c948-429f-8368-e85fdccce2dc`, `florida-governor-official`, `https://www.flgov.com/`.
- Actual source row is active, `TIER_1_PRIMARY_OFFICIAL`.
- Current state: BLOCKED; original reason `CAPABILITY_NOT_IMPLEMENTED: contract scope worker routing`.
- No production atomic lease, worker_run, retrieval result, terminal job or downstream handoff was produced in this pass.

## Remaining acceptance

Production acceptance is NOT_YET_PROVEN. After the scoped credential boundary is resolved, deploy the reviewed handler/runtime, verify release/ExecStart/PID lineage, let persistent HERMES execute the one bounded canary, and independently read the job, attempt, worker_run, raw_retrieval and R2 bytes/hash. Keep the ResearchNeed pending canonical extraction/validation. Only consider a second execution when a separate legitimate eligible unit exists; do not replay a succeeded job to inflate proof.

The next downstream missing transition after successful raw retrieval is scoped extraction/evidence construction and canonical validation handoff. That transition is not implemented by this bounded retrieval route.

## Authorized credential provisioning follow-up

The current ingest queue ID was independently verified unchanged. The existing infrastructure credential can read queue and worker settings, but account-token listing and permission-group discovery both returned HTTP 403 / code 9109. Cloudflare documents `Account API Tokens Write` as required to create an account-owned token. No existing credential was broadened and no producer token was created. Only provisioning is blocked; implementation/review can proceed with dispatch disabled.

Two independent HTTPS services observed VPS public egress `47.251.111.63`. This verifies current egress, not a provider guarantee of a permanent assignment. Before adding a `/32` request-IP condition, verify that assignment remains stable.

Provision through an existing authorized account administrator without granting token administration to HERMES or broadening the infrastructure token. Use only Queues Write for the single account. Deliver directly to a root-owned mode-0600 credential source and systemd `LoadCredential=cloudflare-queue-producer:<root-only source>`. Never place the value in this repository, shared environment, telemetry, payload, or report. Verify service-directory readability as `civiclenz-hermes` and denial for unrelated identities; never print the value. Keep dispatch false until those checks succeed.

Rotation: pause bounded dispatch, allow owned attempts to finish/expire, create a replacement with the same minimal policy, atomically replace the root-only credential source, restart HERMES to refresh systemd credentials, verify access and provider validity without printing values, then revoke the previous token by its nonsecret token ID. Resume only the remaining approved attempt budget. Emergency revocation: disable dispatch and revoke that dedicated token using an existing account administrator; preserve job/attempt lineage. No short expiry is required for the persistent runtime.

Provider references: [account-owned token compatibility](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/), [account-token creation permission](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/create/), [Queue message permission](https://developers.cloudflare.com/api/resources/queues/subresources/messages/methods/push/).
