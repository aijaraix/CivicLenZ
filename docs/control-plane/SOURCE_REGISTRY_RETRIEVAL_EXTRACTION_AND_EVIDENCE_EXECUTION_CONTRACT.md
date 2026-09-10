# CivicLenZ Source Registry, Retrieval, Extraction & Evidence Execution Contract

## 1. Purpose
This document defines the mandatory operating contract for source discovery, source registration, source authority, retrieval, artifact preservation, parsing/extraction, precise evidence location, claim/relationship creation, source health, schema drift, provenance, and evidence handoff across CivicLenZ and authorized producer systems.

It applies to canonical CivicLenZ/HERMES, OpenClaw, deterministic adapters, browser workers, model-assisted workers, GIS workers, document parsers, finance/disclosure collectors, media retrieval, monitoring, Academy/evolution, and producer systems including CivicsLenZz.

This contract complements and must be read with the Master Autonomous Research Operating Contract, Subject Research Enrichment and Completeness Contract, Agent Runtime Topology/Handoff/Tool Authority, Research Work Ledger/Scheduler/Backlog Execution Contract, Data/Evidence/Verification, Evidence Locator/Claim Provenance, Failure/Monitoring, Media, GIS, Seat/Election/Candidate and producer contracts.

## 2. Non-negotiable doctrine
1. Sources are first-class governed objects, not ad hoc URLs embedded in code.
2. Retrieval is a physical event and is not equivalent to extraction, validation or truth.
3. A generic homepage is not sufficient evidence for a deeper claim when a precise source location exists.
4. Models may assist extraction/discovery but are never primary evidence merely because they generated text.
5. Exact raw bytes must be preservable and hashable for material evidence where technically and legally permitted.
6. Every material extracted fact/relationship must be traceable to a retrieval and precise SourceLocator.
7. Historical authority and current-state authority are distinct concepts.
8. Source health must be measured at the actual endpoint/dataset/layer used, not merely at the domain root.
9. Schema drift is a first-class operational condition.
10. No source or parser may silently fabricate missing values.
11. UNKNOWN remains unknown.
12. Harvester evidence remains extracted_unreviewed until canonical validation.

## 3. End-to-end evidence execution chain
Mandatory semantic chain:

```text
ResearchNeed
  -> ResearchWorkIdentity
  -> Capability/Worker
  -> Source selection
  -> Retrieval
  -> Raw artifact
  -> SHA-256/content metadata
  -> Parser/Extractor
  -> Precise SourceLocator
  -> Atomic claim/relationship candidate
  -> EvidenceObject
  -> Handoff
  -> Canonical validation/reconciliation
  -> Structured canonical state
  -> Product projection/monitoring
```

Every link must be observable and attributable.

## 4. Source Registry
Every recurring source or source family MUST be represented in a Source Registry.

Required fields where applicable:
- source_id
- canonical_name
- owning_authority/organization
- jurisdiction
- source_family
- source_type
- base_domain
- endpoint/page family
- API/dataset/layer identifiers
- supported subject/entity types
- supported claim/research scopes
- authority level
- current-state suitability
- historical suitability
- access method
- parser/adapter key and version
- authentication requirement
- rate-limit characteristics
- robots/access policy notes
- expected schema/content fingerprint
- health state
- last_success
- last_failure
- consecutive_failures
- currentness expectations
- next_health_check
- dependent capabilities
- source discovery provenance

## 5. Source families
Examples include:
- election authority
- legislative roster
- legislative bill/vote/journal
- executive orders/actions
- county/municipal clerk
- candidate filing/docket
- campaign finance
- ethics/financial disclosure
- lobbying registry
- procurement/contracts/grants
- budget/public finance
- corporate/business registry
- court/public oversight
- GIS/feature service
- Census/demographics/economic datasets
- official/campaign websites
- official/campaign social channels
- official media/portrait source
- reputable secondary discovery/context sources

The registry may define additional source families, but each must have explicit authority and scope semantics.

## 6. Source authority by claim type
Authority is claim-specific.

Examples:
- current occupancy -> current chamber/government roster is preferred
- historical service -> historical biography/archive may be authoritative
- candidate qualification -> election authority filing/status record
- campaign finance -> official election/campaign finance database
- legislative vote -> official chamber journal/roll-call record
- district geometry -> controlling legal map/authoritative GIS service
- official portrait -> official government/campaign context page plus direct asset

No source is universally authoritative for every claim.

## 7. Temporal suitability
Every source used for dynamic claims should carry temporal semantics such as:
- retrieved_at
- published_at if available
- effective_from/effective_to if available
- current_as_of
- source_update_time
- last_modified/ETag
- historical/current role

A stale but historically valid source must not satisfy a current-state assertion without corroboration.

## 8. Source discovery
When no adequate source is registered, authorized workers may perform source discovery.

Discovery sequence:
1. inspect existing Source Registry
2. inspect official organization/site indexes
3. use approved browser/search discovery if necessary
4. evaluate authority, accessibility, stability and scope
5. register candidate source
6. perform bounded validation retrieval
7. assign parser/adapter or fallback method
8. establish health/currentness policy
9. promote to active source only after verification

Source discovery is not evidence until the underlying material is retrieved and preserved.

## 9. Source promotion
A discovered source becomes an active registry source only when:
- authority is identified
- supported scope is explicit
- access is lawful/allowed
- representative retrieval succeeds or failure state is understood
- parser/adapter strategy exists
- provenance is recorded
- health monitoring can be performed

## 10. Source deprecation
Deprecated sources remain historically traceable.

Deprecation reasons include:
- official replacement
- source removed
- persistent access failure
- schema/content replaced
- authority downgraded
- incorrect historical mapping
- legal/policy restriction

Do not delete historical provenance required by existing evidence.

## 11. Retrieval record
Every material retrieval MUST create a Retrieval record.

Fields where available:
- retrieval_id
- trace_id
- span_id
- ResearchWorkIdentity
- job_id/run_id
- capability_id/worker_id
- source_id
- requested_url/endpoint
- resolved_url
- method
- safe request metadata
- retrieved_at
- status code
- content type
- content encoding
- ETag
- Last-Modified
- byte length
- SHA-256 of exact raw bytes
- storage object URI
- parser/adapter key/version
- latency
- retry/attempt
- result state
- access/rate-limit metadata

Secrets/cookies/auth material MUST NOT be persisted into evidence/telemetry unless explicitly required and securely redacted/encrypted under security policy.

## 12. Raw artifact preservation
Material source bytes should be preserved when technically, legally and operationally appropriate.

Canonical raw evidence storage belongs in immutable/content-addressed object storage such as R2.

Content-addressed rule:
- raw bytes -> SHA-256
- object identity/path derives from current raw hash
- different hashes must never silently share an old hash-addressed object

Producer systems may use durable local staging before canonical ingestion.

## 13. Retrieval truth
The following distinctions are mandatory:

```text
REQUEST_ATTEMPTED
HTTP_SUCCESS
ARTIFACT_PRESERVED
PARSE_SUCCEEDED
EXTRACTION_PRODUCED
EVIDENCE_CREATED
CANONICAL_RECEIVED
CANONICAL_VALIDATED
PUBLISHED
```

These are not synonyms.

HTTP 200 proves only that a retrieval succeeded at the transport level.

## 14. Physical inspection accounting
Metrics must reflect actual work.

For HTML:
- pages discovered
- pages requested
- pages successfully retrieved
- pages actually inspected/parsed

For PDF/document:
- document retrieved
- document pages total
- pages actually inspected
- tables/sections actually parsed

For APIs:
- request/page/cursor count
- actual records inspected
- records parsed
- records persisted

For GIS:
- service/layer queries
- features returned
- features inspected
- geometries persisted/reconciled

For finance/disclosure:
- filings/reports discovered
- periods expected
- filings retrieved
- transactions/records processed

Do not infer inspected units from total file size or total pages alone.

## 15. Parser/Extractor registry
Every parser/extractor should have:
- parser_key
- version
- supported source_id/source_family
- expected schema/content fingerprint
- input content types
- output schema
- failure classifications
- regression tests
- current deployment state
- last successful production run
- schema drift status
- Academy lineage for promoted revisions

## 16. Deterministic extraction preference
Stable recurring sources should use deterministic adapters/parsers where practical.

Repeated browser/model work against a stable structured source should generate an Academy optimization candidate.

## 17. Model-assisted extraction
Models may assist in difficult semantic extraction only when:
- source material is preserved or referenced
- output is grounded to source units
- extracted claims retain evidence anchors
- uncertainty is preserved
- model name/version is traceable
- output remains unreviewed until validation

Model summaries must not substitute for source evidence.

## 18. Extraction output
Extraction should create atomic candidate objects rather than unsupported narrative.

Examples:
- ClaimCandidate
- RelationshipCandidate
- EntityCandidate
- ElectionStatusCandidate
- OccupancyCandidate
- FinanceRecordCandidate
- BoundaryCandidate
- MediaCandidate

Each candidate should reference retrieval and SourceLocator lineage.

## 19. Atomicity
Where possible, one evidence-backed claim represents one proposition with explicit subject, predicate, object/value and temporal/context qualifiers.

Avoid bundling multiple independent assertions into one opaque narrative field.

## 20. SourceLocator
Every material claim/relationship should have the most precise practical locator.

HTML locators may include:
- exact deep URL
- heading/section
- DOM selector
- table name/row/column
- element ID
- text anchor

PDF/document locators may include:
- document ID/title
- page number
- section
- table
- row
- paragraph
- exact text anchor

API locators may include:
- endpoint
- query/reference period
- request parameters
- record ID
- page/cursor
- JSON pointer/path

Finance locators may include:
- filing/report ID
- committee/account ID
- reporting period
- transaction/record ID
- row/field

GIS locators may include:
- service
- layer
- feature ID
- query
- boundary version
- geometry hash
- legal plan/reference

## 21. No homepage shortcuts
Generic root/homepage URLs are not sufficient for substantive facts when a deeper locator exists.

Homepage URLs may legitimately serve as:
- organization identity/context
- source discovery origin
- navigation root

They must not masquerade as evidence for a specific claim.

## 22. Locator validation
A SourceLocator is not valid merely because the string looks plausible.

Where feasible validate:
- locator resolves within preserved artifact/source
- text anchor actually exists
- table/row/record exists
- PDF page exists
- API JSON pointer exists
- GIS feature/layer exists
- artifact hash matches

Invalid locators create an evidence-chain failure and remediation job.

## 23. EvidenceObject
Each EvidenceObject should include where applicable:
- evidence_id
- evidence_type
- subject/entity references
- claim/relationship references
- source_id
- retrieval_id
- artifact URI/hash
- SourceLocator
- excerpt/structured fragment within policy limits
- parser/extractor/version
- produced_at
- valid/current temporal context
- extraction status
- validation status
- supersession/conflict state

## 24. Evidence immutability and supersession
Raw evidence is immutable once content-addressed.

Incorrect interpretations should be superseded/rejected through claim/extraction state, not by rewriting the raw evidence that originally produced them.

## 25. Claim provenance
Every material ClaimCandidate must support backward traversal:

```text
ClaimCandidate
 -> EvidenceObject
 -> SourceLocator
 -> Retrieval
 -> Raw Artifact
 -> Source Registry
 -> Worker/Job/Trace
```

Forward traversal should show where the claim was handed off, validated, reconciled, projected or superseded.

## 26. Relationship provenance
Every material RelationshipCandidate requires evidence and context.

Relationships do not automatically imply:
- motive
- wrongdoing
- influence
- endorsement
- ideological alignment
- causation

The relation type and evidence must be explicit.

## 27. Contradictory sources
When credible sources disagree:
1. preserve both retrievals/artifacts
2. preserve both candidate claims
3. create contradiction candidate
4. record temporal/source context
5. route to canonical reconciliation

Do not overwrite the first claim merely because a later source disagrees.

## 28. Finite dataset reconciliation
For enumerable authoritative universes, completeness must be reconciled.

Examples:
- candidate filings
- election results
- roll-call votes
- bills
- executive orders
- financial disclosures
- campaign finance filings
- committee assignments

Track:
- expected units
- discovered units
- retrieved units
- parsed units
- persisted units
- failed units
- missing units
- cutoff/reference period

A sample is not dataset completion.

## 29. Open-ended research domains
Biography, relationships, public statements and similar domains are not absolutely enumerable.

Use office-class ResearchContracts to define:
- required source families
- minimum source diversity
- high-priority questions
- currentness
- unresolved gaps
- ongoing monitoring

Do not claim absolute exhaustiveness.

## 30. Media retrieval
Media evidence must obey the Media Asset Identity and Provenance contract.

For person portraits, preserve:
- subject identity
- source context page
- direct asset URL/path
- actual bytes/hash
- dimensions/type where available
- retrieved_at
- identity confidence/status
- rights/usage state
- current/historical state

No stock, AI-generated or unrelated portraits may be used as identity media.

## 31. Public contact information
For official/campaign/business contact fields:
- retrieve from appropriate public sources
- preserve field-level provenance
- record source/currentness
- distinguish official, campaign and business contexts
- never fabricate missing phone/email/social values
- do not use unrelated private-person contact harvesting merely because a subject is politically relevant

## 32. GIS evidence
GIS retrievals must preserve:
- authoritative/legal source
- operational geometry source
- service/layer
- feature ID
- projection/coordinate reference
- geometry bytes/representation/hash where applicable
- version/effective date
- reconciliation state

Inferred geometry must remain explicitly distinct from authoritative geometry.

## 33. Finance evidence
Keep separate evidence domains for:
- campaign money
- public money
- personal/public disclosures
- lobbying

Derived values require reproducible calculation provenance, including underlying records and method/version.

## 34. Currentness and staleness
Each source/scope should define freshness expectations.

Evidence should support:
- retrieved_at
- current_as_of
- valid_from/valid_to where applicable
- stale_after
- last_checked
- next_check

A fact may remain historically true while no longer being current.

## 35. Source health
Health is endpoint/dataset/layer-specific.

Track:
- last success
- last failure
- consecutive failures
- latency
- HTTP/access state
- schema/content fingerprint
- rate-limit state
- parser compatibility
- next health check

Root homepage health does not imply child endpoint health.

## 36. Source health states
Recommended semantics:
- HEALTHY
- DEGRADED
- RATE_LIMITED
- SCHEMA_DRIFT
- AUTH_FAILURE
- UNAVAILABLE
- RETIRED
- UNKNOWN

Unchecked sources remain UNKNOWN, not HEALTHY.

## 37. Schema/content drift
Detect drift using appropriate fingerprints such as:
- JSON schema/field set
- HTML selector/DOM signature
- PDF layout/text markers
- GIS service/layer metadata
- CSV/header signatures

Drift may trigger:
- parser degradation
- fallback path
- Academy case
- regression test update
- remediation job

Do not silently parse incompatible schemas.

## 38. Failure classifications
Material retrieval/extraction failures should classify at least:
- SOURCE_UNAVAILABLE
- NETWORK_TIMEOUT
- DNS_FAILURE
- TLS_FAILURE
- RATE_LIMIT_429
- AUTH_FAILURE
- ACCESS_POLICY_BLOCK
- PARSER_FAILURE
- SCHEMA_DRIFT
- DOCUMENT_PARSE_FAILURE
- GIS_QUERY_FAILURE
- EXTRACTION_FAILURE
- LOCATOR_VALIDATION_FAILURE
- HASH_MISMATCH
- STORAGE_FAILURE
- HANDOFF_FAILURE
- IDENTITY_AMBIGUITY

## 39. Failure isolation
One source/parser failure must not stop unrelated scopes.

The failed work unit enters retry/degraded/dead-letter state while independent work continues.

## 40. Retry/backoff
Retries must respect source policy and rate limits.

Use bounded attempts, exponential backoff/jitter where appropriate, Retry-After, circuit breakers and source-specific concurrency controls.

Never hammer a source merely to clear backlog.

## 41. Caching
Caching may reduce redundant work but must not obscure currentness.

Cache records require:
- source/retrieval identity
- created_at
- expiry/currentness policy
- content hash
- invalidation/change mechanism

Current-state claims must not rely on stale cache beyond policy.

## 42. Duplicate suppression
Suppress duplicate retrievals/evidence where identity/content hash and currentness policy show no useful new work.

Do not discard legitimate new versions with different hashes/timestamps.

## 43. Monitoring integration
Monitoring creates retrievals through the same evidence chain.

For each monitoring check:
- identify monitored scope/source
- retrieve current material
- compare prior state/hash
- classify changed/no-change/failure
- persist check
- create downstream work if needed
- schedule next check

## 44. Gap Detector integration
Missing/partial/stale/conflicting ResearchContract scopes can create source-discovery or retrieval work.

If no adequate source exists, create a source discovery job rather than silently leaving blank data.

## 45. Academy integration
Academy may consume real telemetry for:
- parser yield
- selector drift
- repeated browser usage
- source latency/failure
- duplicate retrievals
- generic locators
- extraction errors
- source authority mistakes
- cache/currentness errors

Academy may propose improved adapters/parsers/routing but promotion requires tests and governed deployment.

## 46. Security
Required controls include:
- least-privilege source/tool permissions
- no secrets in Git
- no secrets in evidence payloads/logs unnecessarily
- protected service credentials
- authenticated internal/producer handoffs
- rate limiting
- source policy compliance
- no CAPTCHA/paywall/access-control bypass
- audit logging
- safe redaction

## 47. Producer behavior
CivicsLenZz and other producers:
- may discover/retrieve/extract independently
- must preserve provenance
- must emit extracted_unreviewed
- may stage evidence durably
- must not write canonical truth directly
- must not label schema-valid as canonical validated
- must use governed bridge contracts for canonical delivery

## 48. Canonical validation boundary
Canonical HERMES independently evaluates:
- schema/policy
- producer identity
- artifact/hash integrity
- entity identity
- source authority
- locator/evidence sufficiency
- currentness
- contradictions
- finite-dataset reconciliation
- publication eligibility

Producer extraction success is not canonical validation.

## 49. Evidence quality metrics
Operator-visible metrics should include:
- registered sources
- healthy/degraded/unknown sources
- retrieval attempts/success/failures
- bytes retrieved
- pages/documents/API/GIS units actually inspected
- claims/relationships extracted
- evidence objects created
- precise-locator coverage
- generic-locator failures
- hash mismatches
- schema drift
- contradiction candidates
- source-family gaps
- finite-dataset reconciliation gaps

## 50. Required proof of operation
A source/extraction capability is not considered live-proven unless representative real work demonstrates:

```text
real job
 -> real source
 -> real retrieval
 -> real bytes/records
 -> real parser/extractor
 -> precise locator
 -> persisted evidence
 -> receiver handoff/ack where applicable
```

Fixtures and constructed proof objects may prove tests but not live-source operation.

## 51. Acceptance criteria
Conformance requires:
- governed Source Registry exists
- claim-specific source authority exists
- temporal suitability is modeled
- real retrieval records exist
- raw artifact/hash preservation exists where required
- parser versions are traceable
- SourceLocators are precise and validated
- claim/evidence lineage is traversable
- contradictions are preserved
- source health is endpoint-specific
- schema drift is observable
- monitoring uses the same evidence pipeline
- Gap Detector can create source work
- Academy learns from real extraction telemetry
- security/producer boundaries are enforced
- extraction remains separate from canonical validation

## 52. Final operating directive
The required implementation is a physical evidence-producing pipeline, not a collection of source URLs or parser classes.

For every eligible research scope:

```text
DISCOVER SOURCE
-> REGISTER AUTHORITY
-> RETRIEVE REAL MATERIAL
-> PRESERVE ARTIFACT/HASH
-> PARSE/EXTRACT
-> LOCATE PRECISE EVIDENCE
-> CREATE ATOMIC CLAIM/RELATIONSHIP
-> PERSIST PROVENANCE
-> HAND OFF
-> VALIDATE/RECONCILE
-> MONITOR SOURCE/CURRENTNESS
-> DETECT NEXT GAP
-> REPEAT
```

Unknown values remain unknown. Historical truth remains distinguishable from current truth. Evidence remains traceable. Producers remain subordinate to canonical validation. The system continues automatically rather than waiting for an interactive agent to rediscover the same source or request the next record.
