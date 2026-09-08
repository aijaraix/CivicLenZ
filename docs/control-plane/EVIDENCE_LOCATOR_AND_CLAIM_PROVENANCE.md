# Evidence Locator & Claim Provenance

## Purpose
Every substantive CivicLenZ civic assertion must be capable of resolving to the evidence that supports, contradicts, contextualizes, or supersedes it. A generic source name or homepage is not sufficient when the actual evidence exists at a more precise location.

This document defines the canonical evidence chain from original source through preserved retrieval, precise source locator, extraction, claim/relationship linkage, validation/currentness, and product presentation.

## Core invariant
For every material displayed or canonical claim, CivicLenZ should be able to answer:

- What exactly is the assertion?
- Which source supports it?
- Which exact document/page/section/table/row/API record contains the supporting material?
- When was it retrieved?
- What bytes/artifact were preserved?
- What is the artifact hash?
- Which extractor/parser produced the candidate?
- Which agent/run/trace produced it?
- What is its validation/currentness state?
- Can an operator inspect the preserved evidence?
- Can a public user reach an appropriate source/evidence view without seeing internal machinery?

If the system cannot answer these questions, the evidence chain is incomplete and that state must remain visible.

## Evidence chain
The preferred lineage is:

`Source -> Retrieval -> PreservedArtifact -> SourceLocator -> ExtractionRun -> EvidenceObject -> Claim/Relationship -> Validation/Reconciliation -> Currentness -> ProductProjection`

A single source/retrieval may support many evidence objects. A single claim may have many evidence objects. Never force one-document/one-claim assumptions.

## Source vs retrieval vs evidence
These concepts are distinct.

### Source
The recurring authority/publication system, such as a legislative chamber, election authority, ethics commission, government finance portal, campaign site, official filing system, or GIS service.

### Retrieval
A specific fetch/download/API/browser retrieval at a specific time, including URL/request metadata, status, MIME type, byte length, and content hash.

### PreservedArtifact
The immutable or content-addressed snapshot/file/raw payload retained for evidentiary continuity where policy/storage rules permit.

### SourceLocator
The precise location within the retrieval/artifact where the relevant information can be found.

### EvidenceObject
The structured relationship between a located piece of source material and a claim/relationship/dataset assertion.

Do not collapse these into one `source_url` field.

## SourceLocator model
Implement a flexible SourceLocator capable of representing different media/data formats. Suggested fields include:

```text
source_locator_id
source_id
retrieval_id
preserved_artifact_id
source_url
canonical_url
document_type
page_number
page_label
section_heading
subsection_heading
paragraph_index
line_start
line_end
table_id
table_caption
row_key
column_key
record_id
filing_id
transaction_id
feature_id
html_selector
html_element_id
json_pointer
xml_path
csv_row_key
pdf_bounding_box
anchor_text
excerpt_hash
context_hash
retrieved_at
artifact_sha256
locator_method
locator_version
```

Only applicable fields need be populated. Do not fabricate precision the source format does not support.

## Homepage rule
A homepage or generic domain may be stored as a Source Registry root, but it must not be used as the evidence locator for a specific claim when the claim was actually derived from a deeper page, document, filing, table, API record, or dataset unit.

Examples:

Bad evidence locator:
`https://www.flsenate.gov/`

Better evidence locator:
exact member/profile/bill/vote URL + section/table/record information + preserved retrieval.

Bad finance evidence locator:
`https://www.fec.gov/`

Better evidence locator:
exact filing/committee/transaction/API record and reporting period used to support or calculate the claim.

Search-result pages and search snippets are discovery aids, not claim evidence unless canonical policy explicitly treats a specific search artifact as evidence for a narrow claim.

## HTML evidence
For HTML sources preserve the exact retrieved page and, where feasible, locate evidence using stable combinations of:

- canonical/deep URL;
- element/section identifier;
- heading path;
- table/row/column identifiers;
- DOM selector as an operational aid;
- text/context hash;
- preserved artifact hash.

DOM selectors alone are fragile and should not be the sole locator where better semantic anchors are available.

## PDF/document evidence
For PDFs/documents preserve the original bytes where allowed and record:

- document title/identifier;
- source/deep URL;
- retrieved_at;
- document hash;
- page number/page label;
- section/heading;
- table/figure identifier where applicable;
- line/paragraph/text anchor where reliably derived;
- optional bounding box/coordinates for precise operator highlighting;
- extraction method/version.

Retrieving a PDF does not mean all pages were inspected. Evidence locators must point to pages/work units actually used.

Operator/development evidence views should support opening the preserved document at or near the relevant page and highlighting/identifying the located material when technically reliable.

## API / structured-record evidence
For APIs and structured datasets record enough to reproduce the record selection:

- endpoint;
- safe query parameters/period/cursor metadata;
- dataset/version;
- record identifier;
- JSON Pointer/XML path/row key/column key as applicable;
- raw response/artifact hash;
- retrieved_at.

A derived metric should link to the underlying records or a reproducible dataset/query manifest rather than merely to the API homepage.

## GIS evidence
Boundary/spatial assertions should preserve:

- source/service/layer;
- feature ID/district identifier;
- layer version/vintage;
- spatial reference;
- geometry hash;
- retrieved_at;
- legally controlling source where distinct from operational geometry;
- cross-source reconciliation state.

A point-in-polygon result should retain the boundary version(s) used so historical/current representation can be reproduced.

## Finance evidence and calculations
Financial claims often require aggregation rather than one source sentence. Derived values must preserve a CalculationProvenance record with:

```text
calculation_id
metric_definition
reporting_period
source_dataset_or_filings
committee/entity identifiers
included_record_manifest
excluded_record rules
adjustments/deduplication rules
calculation_version
computed_at
result
underlying evidence references
```

The product should be able to offer `Show calculation` in addition to `Show evidence` for derived totals.

Campaign money, public money, lobbying, and personal/public disclosure data must remain separate evidence domains.

## Claim model
Claims should be atomic enough to validate and source meaningfully. Suggested properties:

```text
claim_id
subject_entity_id
predicate
object/value
valid_time/reference_period
asserted_at/extracted_at
research_scope
trust_state
currentness_state
```

Do not treat an entire AI-written biography paragraph as one indivisible claim.

## Evidence-to-claim relationship
EvidenceObject should express its relationship to a claim/relationship/dataset assertion. Supported semantic relationships may include:

- SUPPORTS
- CONTRADICTS
- CONTEXTUALIZES
- SUPERSEDES
- SOURCE_OF_STATEMENT
- SOURCE_OF_CALCULATION

`SOURCE_OF_STATEMENT` is important for campaign/public statements: a campaign page can authoritatively establish that a candidate made/published a statement without independently proving every external factual assertion inside the statement.

## Multiple evidence objects
A claim may be supported by multiple sources/retrievals. Preserve them independently. Canonical validation policy determines when corroboration is required and which source authority classes are sufficient.

Never discard primary evidence merely because a secondary source summarizes it more conveniently.

## Contradictory evidence
If sources disagree, preserve both evidence chains. Do not overwrite one with the other or let a model guess which is correct. Create contradiction/reconciliation work containing both claims/evidence sets, dates, source authority, and the specific conflict.

## Supersession and history
When an official source changes, do not silently replace historical evidence. Preserve old retrieval/artifact/locator and link the new evidence as a later version/superseding state where appropriate.

This is required for changing officeholders, candidate statuses, campaign promises, district boundaries, financial filings, government records, and other time-varying civic facts.

## Campaign website preservation
Campaign websites are ephemeral and require proactive evidence preservation. For each CandidateCampaign, discover and archive relevant deep pages such as:

- issues/platform;
- promises/agenda;
- biography/about;
- endorsements;
- campaign news/statements;
- campaign contact;
- committee/donation references;
- relevant social links.

Preserve page-specific retrievals and locators. Do not use the campaign homepage as the sole evidence for claims extracted from deeper pages.

## Biography provenance
Biographies should be composed from atomic evidence-backed claims covering applicable areas such as education, career, prior offices, election history, public service, and other civically relevant public facts.

An AI-generated biography is a presentation layer, not primary truth. Where generated narrative is used, maintain sentence/segment-to-claim lineage so an operator can inspect which canonical claims support each part.

Unsupported embellishment, motive, character judgment, or invented connective narrative is prohibited.

## Relationship provenance
Relationships involving organizations, businesses, committees, donors, lobbying, contracts, appointments, boards, endorsements, or disclosures must link to the exact filing/record/source that establishes the relationship.

A documented relationship does not by itself establish influence, motive, wrongdoing, or causation.

## Promise/position provenance
Every promise/position should preserve the original statement or faithful structured extraction, exact source locator, date/context, qualifiers/conditions, applicable campaign/office, and evidence of subsequent relevant actions separately.

Later evidence alignment must never erase the original promise evidence.

## Media/portrait provenance linkage
Media assets use a companion MediaAsset contract, but their provenance must connect to this evidence system. A portrait displayed for a Person must be traceable to the exact source page/direct asset retrieval, hash, media classification, identity-association evidence, and rights/usage metadata required by policy.

Generic stock imagery must not satisfy an official/candidate identity portrait requirement.

## Evidence integrity
Where raw bytes are preserved, compute SHA-256 over the actual bytes. Store byte length and MIME type. At canonical bridge intake, recompute/verify hashes for transferred bytes before treating the artifact as intact.

A hash mismatch is an integrity failure and must quarantine/reject the affected artifact rather than being silently corrected.

## Storage separation
Canonical R2 is the intended raw evidence store. Supabase holds structured civic/evidence metadata and relationships. GitHub holds code/contracts/tests/configuration—not the live evidence corpus.

Producers must not invent canonical R2 object identities. Canonical intake assigns canonical storage identity.

## Evidence currentness
Evidence can remain historically valid while no longer describing current state. Track both evidentiary validity and currentness. A 2024 official roster may be authentic evidence of 2024 occupancy but stale evidence for 2026 occupancy.

Do not delete authentic historical evidence merely because it is stale for current-state projection.

## Development/operator evidence UX
During development and operator review, substantive facts should expose deep lineage controls where feasible:

- View Original Source
- View Preserved Evidence
- Open at Page/Section/Record
- View Claim
- View Evidence Relationship
- View Extraction
- View Agent/Trace
- View Validation
- View Monitoring/Currentness

The objective is to make bad locators, generic homepages, wrong pages, unsupported claims, and stale evidence obvious during testing.

## Public evidence UX
Public UX should remain clean. A fact may display a concise `Sources` or `Evidence` interaction rather than internal trace machinery. The interaction should still resolve to useful source information and, where appropriate, the precise original/preserved location.

Do not expose private operational metadata, secrets, internal-only paths, or sensitive diagnostics publicly.

## Evidence navigation acceptance tests
Create automated/integration tests for representative evidence types. Tests should verify that a displayed fact can resolve through claim/evidence metadata to the correct source and locator.

Representative cases should include:

- HTML member profile section;
- legislative bill/vote record;
- PDF page/table;
- election/candidate filing record;
- campaign website promise;
- finance transaction/filing and derived total;
- GIS boundary feature/version;
- media portrait provenance.

Tests should detect generic-homepage fallback when precise evidence exists.

## Broken-link resilience
Original URLs may disappear. Monitor source/link health, but do not make original-source availability the only way to inspect historical evidence. Preserved artifacts and hashes maintain continuity, subject to legal/storage policy.

When an original URL moves, update source-resolution metadata while preserving the historical retrieval identity.

## Evidence quality states
Evidence state describes the support/provenance situation, not political merit. Useful states may include:

- PRIMARY_SOURCE
- MULTIPLE_PRIMARY_SOURCES
- PRIMARY_PLUS_CORROBORATION
- SECONDARY_ONLY
- CONFLICTING
- UNRESOLVED
- STALE_FOR_CURRENT_STATE
- INTEGRITY_FAILURE

These states must be derived from source/evidence policy, not manually used as a political rating.

## No evidence laundering
AI summaries, cached snippets, search results, previous CivicLenZ prose, or another producer's unsupported assertion must not be converted into apparent primary evidence by saving the summary as a new source.

The chain must continue to the underlying source material or remain explicitly unsupported/unresolved.

## Product truth contract
No public component may display a substantive civic assertion as established canonical/current fact unless its projection can retrieve the canonical claim state and evidence/currentness required by that component's contract.

When required evidence is absent, the UI must show an honest state such as `Research in progress`, `Source unresolved`, `Conflicting records`, or omit the unsupported assertion rather than filling it synthetically.

## Continuous monitoring
Evidence provenance is permanent; currentness is dynamic. Monitoring workers should append new retrieval/evidence versions and trigger reconciliation rather than mutating historical evidence in place.

Successful evidence capture is a checkpoint, not a global completion state.