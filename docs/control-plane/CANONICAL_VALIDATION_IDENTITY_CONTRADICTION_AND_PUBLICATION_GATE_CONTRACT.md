# CivicLenZ Canonical Validation, Identity, Contradiction & Publication Gate Contract

## 1. Purpose
This document defines the mandatory canonical processing path between collected/extracted research and any CivicLenZ state that may be treated as canonical, verified, current, or publicly projected.

It governs producer intake, schema/policy gates, identity resolution, evidence validation, temporal/currentness reasoning, contradiction detection, finite-dataset reconciliation, supersession, canonical acceptance, publication eligibility, revalidation, rollback and auditability.

No producer, worker, model, parser, developer session or product projection may bypass this contract.

## 2. Core truth invariant
The following states are distinct and MUST NOT be conflated:

```text
DISCOVERED
!= RETRIEVED
!= EXTRACTED
!= SCHEMA_VALID
!= EVIDENCE_BACKED
!= BRIDGE_READY
!= CANONICAL_RECEIVED
!= ACCEPTED_FOR_VALIDATION
!= IDENTITY_RESOLVED
!= CANONICAL_VALIDATED
!= PUBLICATION_ELIGIBLE
!= PUBLISHED
```

A record may satisfy several earlier states while still failing a later gate.

## 3. Canonical authority
Canonical truth authority belongs only to the canonical CivicLenZ/HERMES validation plane operating under current repository contracts and schema.

CivicsLenZz and other producers are untrusted research producers. Their civic outputs remain `extracted_unreviewed` unless and until canonical processing explicitly advances them.

Models may assist validation workflows but may not self-declare civic facts verified.

## 4. Required canonical pipeline
Every material producer result follows, as applicable:

```text
Producer Result
    -> Transport Authentication
    -> Contract/Schema Gate
    -> Policy/Authority Gate
    -> Integrity/Artifact Gate
    -> Identity Resolution
    -> Evidence Sufficiency
    -> Source Authority/Suitability
    -> Temporal/Currentness Validation
    -> Contradiction Detection
    -> Dataset Reconciliation
    -> Canonical Decision
    -> Publication Eligibility
    -> Projection
    -> Monitoring/Revalidation
```

Skipping a required gate is a canonical validation defect.

## 5. Intake receipt versus truth
A successful HTTP request, queue receipt, bridge acknowledgement or durable persistence means only that transport/intake occurred.

`ACCEPTED_FOR_VALIDATION` means queued/accepted for canonical validation, not verified.

The canonical system MUST expose separate physical counts for received, accepted-for-validation, validated, publication-eligible and published records.

## 6. Producer authentication gate
Canonical intake MUST authenticate producer identity before accepting a package for processing.

Validate where applicable:
- producer_id
- signature/HMAC
- timestamp/replay window
- schema/contract version
- authorization for producer/capability
- idempotency key/ResearchWorkIdentity

Authentication success does not validate payload truth.

## 7. Schema and contract gate
Validate:
- required envelope fields
- supported contract version
- allowed entity/claim/relationship types
- extraction status
- field types/formats
- evidence manifests
- provenance references
- temporal fields
- producer restrictions

Schema failure produces an explicit rejection/quarantine state. Do not partially write malformed data into canonical truth tables.

## 8. Policy/authority gate
Verify the producer did not attempt to:
- self-verify
- self-publish
- override canonical identity
- override truth standards
- write prohibited private/sensitive data
- exceed source/tool authority
- bypass evidence requirements

Policy violations remain auditable and do not silently disappear.

## 9. Integrity and artifact gate
For evidence-bearing results validate, where applicable:
- retrieval record exists
- artifact reference exists
- raw artifact is retrievable
- declared SHA-256 matches raw bytes
- byte length/content type are coherent
- SourceLocator resolves within the preserved artifact
- parser/extraction lineage exists
- evidence-to-claim linkage is intact

A hash proves byte integrity, not factual correctness.

## 10. Identity resolution doctrine
Never merge civic entities solely by display name.

Identity resolution MUST use the strongest applicable context and identifiers, including:
- official IDs
- filing/candidate IDs
- committee IDs
- Seat
- office type
- jurisdiction
- district
- Election/cycle
- CandidateCampaign
- official URLs
- campaign URLs
- temporal context
- biography/context corroboration

Ambiguity fails closed.

## 11. Permanent Seat identity
Seat identity is independent of occupant identity.

A permanent Seat may have:
- past Occupancies
- current Occupancy or vacancy
- future Elections
- CandidateCampaigns
- boundary versions
- accountability history

Never merge Seat and Person lifecycles.

## 12. Occupancy identity and temporal semantics
Occupancy represents a Person occupying a Seat for a time interval.

Required concepts include, where known:
- person_id
- seat_id
- valid_from
- valid_to
- current_as_of
- status
- appointment/election basis
- vacancy/succession event
- evidence

Historical member pages may prove historical Occupancy but MUST NOT alone establish current Occupancy when a more current authoritative roster/status source exists.

## 13. CandidateCampaign identity
CandidateCampaign is distinct from Person.

Identity MUST include sufficient context to prevent cross-office/cross-cycle collision, including:
- person_id
- office_type
- Seat/district where applicable
- Election/cycle
- filing authority identity
- authoritative candidate/filing identifier where available

A historical campaign MUST NOT be automatically projected as a current campaign.

## 14. Organization identity
Organization resolution should use applicable:
- official registration identifiers
- legal name
- jurisdiction
- committee/registration number
- address where appropriate/public
- source authority
- temporal context

Similar names do not justify merging.

## 15. Boundary identity
Boundary identity MUST include:
- jurisdiction/Seat relationship
- boundary type
- authority
- effective/version period
- geometry hash/version

Do not overwrite historical geometry with newer geometry without preserving evolution.

## 16. Evidence sufficiency
Evidence sufficiency is claim-type-specific.

A claim may require:
- one authoritative primary source
- multiple independent sources
- a finite-dataset reconciliation
- direct filing/document evidence
- identity corroboration
- temporal corroboration

The applicable ResearchContract/publication policy defines the threshold.

No universal `one source = verified` rule exists.

## 17. Source authority is claim-specific
Authority depends on what is being asserted.

Examples:
- chamber roster: strong for current membership/occupancy
- historical biography: strong for historical service/biography
- election authority: strong for filing/qualification/result status
- legislative journal: strong for official vote/action
- disclosure filing: strong for what was disclosed in that filing
- GIS authority: strong for the applicable geometry/version

A generally authoritative domain is not automatically authoritative for every claim type.

## 18. Source priority and currentness
For current-state assertions, validation MUST consider source freshness and role.

Store/consider:
- retrieved_at
- valid_from
- valid_to
- current_as_of
- first_seen
- last_seen
- superseded_at/by
- source_role

Newer retrieval does not automatically mean newer valid-time information; both transaction time and valid time matter.

## 19. Temporal truth model
CivicLenZ must preserve history rather than overwrite it.

Examples:
- official -> resigned -> vacant -> successor
- candidate filed -> qualified -> withdrawn/advanced/defeated/elected
- boundary version A -> superseded by B
- committee membership -> ended/reassigned

Current projection selects the applicable valid-time state while history remains queryable.

## 20. Election lifecycle validation
Legally distinct states MUST remain distinct, including as applicable:
- continuous filing activity
- pre-qualifying document acceptance
- statutory qualifying period
- FILED/DECLARED
- QUALIFIED
- WITHDRAWN
- PRIMARY_BALLOT
- PRIMARY_RESULT
- GENERAL_ELECTION_NOMINEE/BALLOT
- ELECTION_RESULT
- CERTIFICATION

Do not infer legal status from campaign existence alone.

## 21. Claim validation object
Every material canonical validation decision should be auditable with fields equivalent to:
- validation_id
- claim/entity/relationship ID
- validator capability/version
- evidence considered
- source authority assessment
- identity assessment
- temporal assessment
- contradiction assessment
- dataset reconciliation state
- decision
- reasons
- decided_at
- trace_id

## 22. Canonical decision states
Canonical semantics must distinguish at least:
- VALIDATION_PENDING
- NEEDS_IDENTITY_RESOLUTION
- NEEDS_MORE_EVIDENCE
- CONTRADICTION_PENDING
- DATASET_RECONCILIATION_PENDING
- VALIDATED_CURRENT
- VALIDATED_HISTORICAL
- STALE_REVALIDATION_REQUIRED
- REJECTED_SCHEMA
- REJECTED_POLICY
- REJECTED_EVIDENCE
- SUPERSEDED

Live schema literals may differ, but distinctions must remain representable.

## 23. Contradiction candidate creation
When evidence materially conflicts, preserve both chains and create a contradiction candidate.

Do not silently choose the convenient value.

Record:
- conflicting claims
- evidence chains
- source roles
- temporal context
- identities
- severity/impact
- affected projections
- next reconciliation action

## 24. Contradiction classes
Classify where useful:
- CURRENT_VS_HISTORICAL
- SOURCE_DISAGREEMENT
- IDENTITY_COLLISION
- TEMPORAL_OVERLAP
- ELECTION_STATUS_CONFLICT
- BOUNDARY_VERSION_CONFLICT
- FINANCIAL_TOTAL_CONFLICT
- RELATIONSHIP_CONFLICT
- PARSER/EXTRACTION_CONFLICT
- PRODUCER_CONFLICT

Classification assists routing; it does not decide truth automatically.

## 25. Contradiction reconciliation
Reconciliation should evaluate:
1. entity identity
2. claim type
3. source authority for that claim
4. valid time
5. retrieval time
6. evidence integrity
7. corroborating sources
8. statutory/official definitions
9. parser/extraction quality
10. finite-dataset reconciliation where relevant

Result may be validated, historical, superseded, unresolved or require more evidence.

## 26. No unsupported inference
Canonical validation MUST distinguish direct evidence from inference/derived values.

Derived facts require reproducible methodology and input evidence.

Do not infer motive, intent, wrongdoing, political alignment or causal relationships merely from documented associations or financial relationships.

## 27. Relationship validation
A relationship edge requires evidence supporting the relationship type and time/context.

Examples:
- committee membership
- campaign contribution
- appointment
- board membership
- lobbying registration
- contract/grant relationship
- endorsement

The existence of an edge does not establish motive or influence.

## 28. Finance validation
Keep distinct:
- campaign finance
- public/government money
- personal/public financial disclosures
- lobbying

Validate reporting period, filer/entity identity, source record and calculation provenance.

Derived totals MUST retain the underlying record set and reproducible calculation version.

## 29. Promise/position validation
Promises and positions must retain original evidence/context.

Later votes/actions may be linked as evidence candidates, but automated systems MUST NOT convert them into unsupported fulfillment/broken-promise judgments.

Any public accountability characterization must follow the applicable canonical methodology and preserve evidence/context.

## 30. Biography/narrative validation
Narrative biography is derivative.

Canonical biographies should be composed from eligible atomic claims with claim-to-evidence lineage.

Narrative text MUST NOT introduce unsupported facts.

## 31. Media validation
Identity media must satisfy the Media Asset Identity and Provenance contract.

No stock, generated, unrelated or identity-ambiguous portrait may represent a Person as their verified portrait.

Media validation considers identity, source context, direct asset, hash, current/historical role, rights/usage state and public eligibility.

## 32. GIS/boundary validation
Validate:
- authority
- layer/service
- feature identity
- effective/version period
- geometry integrity/hash
- Seat/jurisdiction linkage
- legal versus operational geometry distinction

Inferred/approximate geometry MUST NOT be projected as authoritative.

## 33. Address-resolution validation
Address results are derived from geocoding plus boundary intersection/lookup.

Validation should preserve:
- normalized input
- geocode source/result
- coordinates/confidence
- boundary versions
- intersected Seat/jurisdiction IDs
- unresolved/inferred components

Do not return an uncertain Seat as exact without communicating the underlying state.

## 34. Finite-dataset reconciliation
For enumerable datasets, validation of completeness requires reconciliation.

Examples:
- candidate filings
- election results
- roll-call votes
- executive orders
- disclosures
- campaign-finance reporting periods

Track:
- expected units
- discovered units
- retrieved
- parsed
- validated
- failed/missing
- cutoff/reference period

Sampling does not prove completeness.

## 35. Dataset reconciliation states
Use semantics such as:
- NOT_ENUMERATED
- ENUMERATING
- PARTIAL
- RECONCILED
- RECONCILED_WITH_GAPS
- STALE
- SOURCE_UNAVAILABLE

A dataset may contain individually valid records while remaining incomplete as a universe.

## 36. Canonical persistence
Only data that has passed the applicable canonical gates may populate fields/tables used as canonical truth.

Unreviewed material may remain in staging/research/evidence stores but must remain distinguishable from canonical state.

Never overwrite canonical history merely to simplify current projection.

## 37. Supersession
When a canonical value changes:
- preserve prior state
- mark valid_to/supersession
- link replacement
- preserve original evidence
- record reason/trigger
- update current projection

Supersession is not deletion.

## 38. Retraction/correction
If canonical validation later discovers an error:
1. create integrity incident
2. trace first incorrect transition
3. determine blast radius
4. repair generalized process
5. invalidate/supersede affected canonical state
6. regenerate/revalidate
7. update projections
8. preserve audit history
9. add regression test
10. monitor recurrence

Do not silently patch a display value while leaving corrupted lineage.

## 39. Publication gate
Canonical validation alone may not be sufficient for public projection if the field/claim has additional publication policy.

Publication gate checks:
- canonical validation state
- currentness
- evidence eligibility
- privacy/sensitivity policy
- field-specific publication policy
- unresolved contradictions
- rights/media policy
- legal/compliance restrictions where applicable

## 40. Publication states
Distinguish:
- INTERNAL_RESEARCH_ONLY
- VALIDATED_NOT_PUBLIC
- PUBLICATION_PENDING
- PUBLICATION_ELIGIBLE
- PUBLISHED
- WITHHELD_POLICY
- WITHHELD_CONTRADICTION
- STALE_UNPUBLISHED
- RETRACTED/SUPERSEDED

## 41. Public projection truth
The UI/API MUST NOT infer stronger truth than canonical state.

Examples:
- `extracted_unreviewed` cannot render as Verified
- schema-valid cannot render as Validated
- historical occupancy cannot render as current
- unresolved boundary cannot render as exact
- relationship cannot render as proof of motive
- missing data cannot render as negative fact

## 42. Public evidence access
Where policy permits, public/product projections should expose understandable provenance controls so users can inspect supporting evidence/source context.

Internal development/operator views may expose deeper lineage, including trace/job/retrieval/locator/validation information, subject to security controls.

## 43. Staleness and revalidation
Validated truth can become stale.

Dynamic canonical scopes must carry currentness and monitoring policy.

When stale or changed:
- retain historical validation
- mark current projection appropriately
- generate revalidation work
- do not pretend prior validation proves present state

## 44. Monitoring-triggered canonical changes
Monitoring detects change candidates; it does not automatically rewrite canonical truth unless the applicable canonical policy explicitly permits deterministic safe promotion.

Default path:
change detected -> evidence capture -> validation/reconciliation -> supersession/current projection.

## 45. Safe deterministic promotion
If canonical architecture permits deterministic auto-validation for narrowly defined fields, the rule must be explicit, versioned, tested, source-specific, auditable and reversible.

No model may invent new auto-validation rules at runtime.

## 46. Human review
Human review may be required for high-ambiguity/high-impact cases.

Human action must preserve:
- reviewer identity/role
- evidence considered
- decision/reason
- timestamp
- prior state
- resulting state

Human review is not permission to delete inconvenient contradictory evidence.

## 47. Validation worker authority
Validation capabilities require scoped access.

They may read staged evidence and canonical identity context needed for their mission.

They may not broaden privileges, expose secrets, bypass publication policy or rewrite unrelated canonical state.

## 48. Security boundaries
Canonical validation infrastructure MUST enforce:
- least privilege
- authenticated internal/service traffic
- producer isolation
- no producer direct canonical DB writes
- secret redaction
- audit logs
- rate limiting where applicable
- replay/idempotency protection
- immutable evidence integrity
- controlled schema migrations

## 49. Idempotency
Repeated submission of the same ResearchWorkIdentity/content MUST NOT create duplicate canonical entities/evidence relationships.

Return/persist duplicate acknowledgement with existing canonical correlation where appropriate.

## 50. Quarantine
Malformed, suspicious, unsupported or policy-violating packages may be quarantined.

Quarantine must preserve enough metadata for diagnosis without allowing the payload to contaminate canonical truth.

## 51. Blast-radius analysis
When a validator/parser/identity rule is found defective, audit all