# Data, Evidence and Verification

## Storage roles
- Supabase: canonical operational relational state.
- Cloudflare R2: immutable/raw retrieval artifacts and evidence payloads.
- GitHub: code/config/contracts/tests/docs, not live civic records.

## Retrieval record
Every material retrieval should preserve, when available:
- source_key
- source URL
- source authority/organization
- retrieved_at
- HTTP status
- content-type
- ETag
- Last-Modified
- byte length
- exact SHA-256 of raw bytes
- R2 object URI
- parser key/version
- job/worker provenance

## Evidence model
Material claims should be linkable to evidence objects and specific locators/excerpts where feasible.

## Verification states
Extraction and verification are distinct. Suggested lifecycle:
`discovered -> collected_unreviewed -> validation_pending -> verified | conflict | stale | rejected`.
Do not force all tables to use these exact literals if live schema differs; schema is authoritative until deliberately migrated.

## Verification rules
- HTTP success is retrieval only.
- A government domain increases source authority but does not automatically validate every parsed field.
- Cryptographic hashes prove exact bytes were preserved.
- Model summaries are derivative artifacts, never primary evidence.
- Contradictions are preserved and surfaced, not overwritten.
- Historical claims should support first_seen, last_seen, valid_from, valid_to, and supersession where applicable.

## Entity resolution
Never merge people solely on name. Use office/jurisdiction, official identifiers, campaign IDs, filing IDs, official URLs, biography, party and temporal context. Ambiguity should fail closed.

## Source hierarchy
Prefer primary government/election/legislative/court/disclosure sources. Secondary reputable sources may provide discovery/context. User-generated or low-authority sources require higher scrutiny.

## Raw evidence immutability
Content-addressed R2 keys must be derived from the current raw-byte hash. Different content hashes must never silently point to an object named for an older hash.

## Publication gate
Only claims satisfying the office/field publication policy may become public facts. Raw collected/unreviewed material can remain available to internal researchers but must not be presented as verified civic truth.