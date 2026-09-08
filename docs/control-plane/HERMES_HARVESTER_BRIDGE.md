# HERMES Harvester Bridge

## Authority boundary

`civicslenzz-gemini-harvester` is a registered submit-only producer. It may
submit a versioned result package with `extraction_status=extracted_unreviewed`.
It has no canonical storage credentials, verification authority, publication
authority, or ability to alter CivicLenZ contracts.

HERMES authenticates, validates, deduplicates, verifies raw-evidence integrity,
persists the intake receipt, routes downstream work, resolves identity, and
decides every later validation or publication transition.

## Receiver contract

The receiver accepts only `CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1` at:

`POST /v1/harvester/results`

The caller supplies these headers:

- `x-civiclenz-producer-id`
- `x-civiclenz-timestamp` (Unix seconds or ISO-8601)
- `x-civiclenz-signature` (`sha256=` followed by HMAC-SHA-256 of
  `timestamp + "." + exact-request-bytes`)

The HMAC key is a separate bridge secret, stored only in
`/etc/civiclenz/harvester-bridge.env` on the canonical runtime and in the
Harvester’s own protected secret store. It is never a Cloudflare, Supabase, R2,
or operator credential.

The response is `CIVICLENZ_HARVESTER_ACK_V1`. Its state is meaningful; HTTP 200
alone does not signal canonical acceptance:

- `ACCEPTED_FOR_VALIDATION`
- `DUPLICATE`
- `NEEDS_IDENTITY_RESOLUTION`
- `NEEDS_MORE_EVIDENCE`
- `PARTIALLY_ACCEPTED`
- `REJECTED_SCHEMA`
- `REJECTED_POLICY`
- `RETRY_LATER`
- `CANONICAL_CONFLICT`

## Current implementation state

The receiver source provides a durable local canonical spool with atomic
receipts, restart recovery, `producer_id + job_id + result_content_hash`
idempotency, evidence SHA-256/byte-length verification, evidence quarantine,
and bounded backpressure. A receipt is durable before an acceptance response.

Each accepted receipt remains `PENDING_CANONICAL_DISPATCH`. It is not an R2
object, a Supabase canonical row, a validated claim, or a public projection.
The proposed private-Supabase schema is in
`supabase/proposals/202609080001_harvester_hermes_intake.sql` and requires a
governed production migration approval before use. The later canonical
dispatcher must write original evidence bytes to HERMES-selected R2 keys, write
structured state only as unreviewed, then enqueue identity/evidence/claim/
dataset/GIS/election reconciliation work.

The service unit binds only to `127.0.0.1` or `::1`. It must sit behind an
approved HTTPS gateway before a public machine URL is announced. Until that
gateway, DNS, and routing are physically deployed and tested, there is no
`CIVICLENZ_CANONICAL_INGEST_URL` to configure on the Harvester.

## Operations

`ops/systemd/civiclenz-hermes-ingest.service` loads only the bridge-secret
environment file, not Cloudflare credentials. Local-only endpoints provide:

- `GET /health`
- `GET /v1/harvester/health`
- `GET /v1/harvester/capabilities`
- `GET /v1/harvester/bridge/telemetry`

Only the minimal health response is safe for a future public gateway; capability
and telemetry routes remain loopback-only. Telemetry contains no secret and
tracks contacts, authentication outcomes, receipt outcomes, duplicates,
backpressure, pending dispatch, producer versions, and contract versions.
