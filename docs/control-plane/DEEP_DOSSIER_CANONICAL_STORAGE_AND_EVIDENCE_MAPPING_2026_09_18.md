# CivicLenZ Deep-Dossier Canonical Storage & Evidence Mapping — 2026-09-18

## Purpose
Scale is useful only if collected information is durably organized for validation, dossiers, APIs and monitoring. This maps research output into the existing canonical truth/evidence architecture; it does not authorize a second civic database.

## Core invariant
Raw source material belongs in the approved immutable evidence/object path. Normalized entities, claims, relationships, dataset units, coverage/currentness and monitoring belong in canonical structured storage. Worker-local files/logs are not the finished product.

Every material normalized object retains resolvable provenance to source/retrieval/evidence/extraction lineage.

## Lifecycle
`source discovery -> source registration/candidate -> real retrieval -> immutable raw artifact/hash/locator -> extraction -> extracted_unreviewed/unresolved attribution -> entity/identity validation -> contradiction/currentness -> canonical normalized object/claim/dataset unit -> coverage -> publication eligibility where allowed -> monitoring`.

No worker/producer self-promotes civic truth.

## Pre-attribution quarantine
When identity is unresolved, preserve useful evidence with candidate/unresolved associations, never verified Person/Occupancy truth or public output. Preserve subject/Seat candidate, campaign/election/cycle, office/jurisdiction, source family, retrieval/evidence locator, extraction worker/version, attribution basis/state, validation state and timestamps where applicable.

## Domain mapping
### Identity/foundation
Normalize names/aliases/external identifiers only after reconciliation. Preserve candidate identity evidence separately. Person, Seat and Occupancy remain distinct.

### Websites/contact/social
Preserve platform/source, account ID/handle, URL, display name, government/campaign/personal-public/organization context, discovery/corroboration evidence, first/last observed, attribution state and monitoring eligibility. Same-name discovery is not identity proof.

### Biography/education/career/history
Represent atomic evidence-backed facts/events with temporal context, evidence, validation and contradiction state. Avoid opaque biography blobs as the only representation.

### Elections/campaigns
Keep Person, Seat, Election and CandidateCampaign distinct. CandidateCampaign retains office/Seat/cycle/filing context. Winning changes/creates Occupancy under canonical rules rather than duplicating Person.

### Campaign finance
Authoritative universes are dataset units, not summary-only facts. Preserve committee/campaign/cycle/filing/period/source partition/record identity, amendment/refund/transfer semantics where applicable, source totals and cutoff. Coverage tracks expected/accounted/missing. Top-N cannot satisfy reconciliation.

### Financial disclosures/business interests
Preserve filing/report identity, period, category, normalized public units, source locator, evidence and validation. Keep campaign finance distinct from personal/public disclosure.

### Government activity
Represent orders/actions, vetoes, signings, appointments, budgets and decisions as event/action objects with office/Seat context, date/effective semantics, authoritative source and evidence.

### Promises/public commitments
Preserve attributable wording where appropriate, normalized atomic commitment, date, campaign/cycle/office, qualifiers/conditions, promised/rejected action, target/timeframe, source/archive, transcript/timecode/page locator and validation. Later evidence may create reviewable POTENTIAL_CONFLICT, never a political score, voting recommendation or unsupported verdict.

### Statements/media/news
Preserve event/document identity, publisher/source, speaker/context, date/time, transcript/page/timecode locator, raw evidence and extracted atomic items. News is evidence/context, not automatic canonical truth for every reported claim.

### Relationships/public records
Preserve parties/entities, relationship type, temporal scope, source/evidence and procedural status. Relationship evidence alone does not establish motive/causation.

### GIS/boundaries
Preserve authoritative geometry/artifact, jurisdiction/Seat association, validity dates, version/redistricting history, source provenance and SeatBoundaryAssignment semantics. ZIP/city inference is not authoritative representation.

### Monitoring
Dynamic objects/scopes carry currentness and durable monitoring obligations/cursors/fingerprints/schedules. Monitoring creates evidence/reconciliation work rather than silently overwriting history.

## Dossier depth
A dossier is a projection over canonical structured objects, evidence and coverage state. Do not store "1,000 data points" as one giant untyped JSON object to hit a count.

Depth is dimensional: applicable scope; dataset kind; expected/accounted/missing; required/attempted/successful source families; discovery passes; unresolved leads; evidence/validation counts; contradictions; coverage-audit state; current-as-of/cutoff; next check/blocker.

## Idempotency
Every durable work unit and normalized dataset unit needs stable identity/deduplication appropriate to its domain. Verified immutable evidence may be reused under canonical lineage rules; refetching must not create duplicate civic facts to increase counts.

## Weekend data acceptance
Collection is useful before UI completion only if raw evidence is durable/hash-backed; normalized output is queryable/domain-typed; unresolved attribution explicit; evidence links survive restart; validation explicit; finite/open-ended coverage semantics preserved; publication is never inferred from collection alone.
