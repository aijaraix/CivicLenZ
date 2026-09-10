# Subject Research Enrichment & Completeness Contract

## 1. Purpose

This document defines the mandatory end-to-end enrichment behavior for every researchable CivicLenZ subject. It answers one operational question:

> When CivicLenZ discovers a Seat, Person, Occupancy, Election, CandidateCampaign, Jurisdiction, GovernmentEntity, Organization, Boundary, Program, Project, or other supported civic subject, what research must automatically happen next, how is that work decomposed, how is completeness measured, how is evidence preserved, how is currentness maintained, and what prevents the subject from becoming a partially populated orphan record?

This contract is subordinate to the canonical CivicLenZ control plane and must be implemented consistently by canonical HERMES and all authorized producers, including CivicsLenZz.

The system must not depend on an operator manually requesting research for every newly discovered subject.

Discovery creates research responsibility.

## 2. Core operating invariant

For every physical subject in scope, CivicLenZ MUST be able to answer:

- What kind of subject is this?
- Which ResearchContract(s) apply?
- Which research scopes are required?
- Which scopes are not applicable?
- Which scopes are current with evidence?
- Which scopes are partial?
- Which scopes are stale?
- Which scopes are conflicting?
- Which scopes are unresolved?
- Which scopes are not started?
- Which scopes are blocked?
- Which capability owns each scope?
- Which source families are expected?
- Which work already exists?
- Which work should be created now?
- Which work should recur later?
- Which facts are extracted but unreviewed?
- Which facts are canonically validated?
- Which facts are eligible for public projection?

A subject that merely exists in the database is not a researched subject.

## 3. Subject classes

At minimum, support enrichment orchestration for:

- Seat
- Person
- Occupancy
- Election
- CandidateCampaign
- Jurisdiction
- GovernmentEntity
- Organization
- Boundary
- Program
- Project

Additional subject classes may be added through canonical governance.

Each class may have multiple office-class or jurisdiction-specific ResearchContracts.

## 4. ResearchContract resolution

When a subject is discovered or materially changed, HERMES must determine the applicable ResearchContract set.

Examples include:

- STATE_GOVERNOR
- STATE_EXECUTIVE
- STATE_SENATOR
- STATE_REPRESENTATIVE
- US_SENATOR
- US_REPRESENTATIVE
- COUNTY_COMMISSIONER
- SHERIFF
- CLERK
- PROPERTY_APPRAISER
- TAX_COLLECTOR
- MAYOR
- CITY_COUNCIL
- SCHOOL_BOARD
- JUDGE
- SPECIAL_DISTRICT
- CANDIDATE_FOR_STATE_SENATE
- CANDIDATE_FOR_STATE_HOUSE
- CANDIDATE_FOR_LOCAL_OFFICE

The contract must define at least:

- required baseline fields
- deep-research fields/scopes
- authoritative source priorities
- evidence requirements
- finite-dataset reconciliation rules
- currentness/freshness intervals
- monitoring cadence
- publication policy
- escalation policy
- privacy/sensitivity constraints

If more than one contract applies, combine them without silently dropping obligations.

## 5. Automatic fan-out

Discovery of a subject must automatically create or reconcile research-scope coverage.

Example:

```text
Person discovered
  -> identity resolution
  -> determine official/candidate/former-official context
  -> determine Seat/Election/CandidateCampaign links
  -> load applicable ResearchContracts
  -> instantiate applicable research scopes
  -> compare required scopes with physical current evidence
  -> create missing/stale/conflict work
  -> route independent jobs
  -> persist results
  -> schedule monitoring
```

No manual prompt is required for normal enrichment.

## 6. Independent scope model

Research scopes are independent work units unless a real dependency requires ordering.

A Person/Candidate may have scopes for:

- identity
- name variants
- current Seat / Seat sought
- Occupancy
- Election linkage
- CandidateCampaign linkage
- biography
- education
- military/public service history where applicable
- professional career
- prior offices
- election history
- campaign history
- official public contact
- campaign public contact
- official/campaign public phone where published
- official/campaign public email where published
- official websites
- campaign websites
- official social profiles
- campaign social profiles
- portrait/media
- committees
- leadership roles
- legislation
- sponsored/co-sponsored measures
- roll-call votes
- executive/government actions
- appointments
- budget actions
- public statements
- interviews/debates where relevant
- campaign platform
- promises/commitments
- policy positions
- endorsements
- campaign committees
- campaign finance
- contributions/expenditures
- financial disclosures
- ethics disclosures
- disclosed business interests
- disclosed boards/organizations
- donor/PAC relationships where documented
- lobbying relationships where documented
- appointment relationships where documented
- public contracts/grants relationships where documented
- oversight/ethics/court public records where civically relevant
- district/boundary
- address readiness
- constituency context
- government/public-resource context
- monitoring sources

Not every scope applies to every subject.

## 7. No monolithic politician job

The system MUST NOT represent all research on a Person as one opaque `research_person` task.

A high-level dossier mission may exist, but it must decompose into observable scope-level work identities.

Example:

```text
Person P
  biography -> job A
  campaign finance -> job B
  votes -> job C
  relationships -> job D
  media -> job E
  GIS/Seat context -> job F
```

If job B fails, jobs A/C/D/E/F remain eligible.

## 8. Research-scope state machine

Each subject/scope pair must have an explicit physical state.

Recommended states:

- NOT_APPLICABLE
- NOT_STARTED
- SOURCE_DISCOVERY
- QUEUED
- RUNNING
- CURRENT_WITH_EVIDENCE
- PARTIAL_WITH_EVIDENCE
- UNRESOLVED
- CONFLICTING
- STALE
- RETRYING
- DEGRADED
- BLOCKED_BY_DEPENDENCY
- CAPABILITY_NOT_IMPLEMENTED
- MONITORING_ACTIVE

Do not use `DONE_FOREVER`.

A scope may be CURRENT_WITH_EVIDENCE and also MONITORING_ACTIVE.

## 9. ResearchScopeCoverage record

Persist a machine-readable record similar to:

```text
coverage_id
subject_type
subject_id
research_contract_id
scope_id
applicable
state
priority
assigned_capability_id
research_work_identity
source_families_expected
source_families_attempted
source_families_successful
source_count
evidence_count
claim_count
relationship_count
finite_units_expected
finite_units_processed
finite_units_failed
first_researched_at
last_researched_at
current_as_of
stale_after
next_action
next_check
dependency_state
failure_id
contradiction_ids
canonical_validation_state
publication_state
```

This record is the basis for the Gap Detector and enrichment metrics.

## 10. Missing-work generation

For every applicable scope:

```text
NOT_STARTED -> create work
PARTIAL -> create remaining work
STALE -> create refresh work
CONFLICTING -> create reconciliation work
UNRESOLVED -> create alternate-source/escalation work
EVIDENCE_MISSING -> create evidence remediation work
CAPABILITY_NOT_IMPLEMENTED -> expose explicit implementation gap
CURRENT_WITH_EVIDENCE -> skip until due/change-triggered unless deeper contract requirements remain
```

The system must not leave an applicable missing scope without an explicit state and next action.

## 11. Deep-research definition

Deep research is not established by one successful retrieval.

A scope is deep enough only according to its ResearchContract.

Examples:

### Biography
May require multiple applicable source families and evidence-backed atomic facts, not one paragraph copied from one profile.

### Legislation
Requires reconciliation of applicable legislative activity over the defined period, not one bill.

### Votes
Requires processing of the applicable roll-call universe/cutoff, not one vote.

### Campaign finance
Requires defined filing/reporting periods and reconciliation of expected reports/records, not one transaction.

### Disclosures
Requires the applicable disclosure universe and reporting periods.

### Relationships
Requires documented, source-backed relationships across applicable source families; open-ended research must use a bounded depth/currentness standard and may never claim metaphysical exhaustiveness.

## 12. Finite dataset completeness

For enumerable authoritative datasets, completeness must be demonstrated by reconciliation.

Examples:

- candidate filings
- ballot candidate lists
- election results
- roll-call votes
- sponsored bills
- committee assignments
- executive orders
- campaign finance reports
- financial disclosures
- registered lobbying filings

Track:

```text
expected units
retrieved units
processed units
failed units
missing units
cutoff/reference period
source version/current_as_of
```

A finite scope cannot be declared current merely because some units were successfully processed.

## 13. Open-ended research completeness

For domains such as biography, public statements, organizations, relationships, campaign platforms, and public records, use a canonical source-family/depth standard.

Track:

- required source families
- source families attempted
- source families with evidence
- known gaps
- recency
- unresolved leads
- contradiction state

Use terms such as `CURRENT_TO_CONTRACT_DEPTH`, not `EXHAUSTIVE_FOREVER`.

## 14. Person enrichment contract

For a Person in civic scope, progressively research applicable:

### Identity
- canonical name
- public name variants
- official identifiers
- biography corroborators
- current/historical office links
- CandidateCampaign links

### Biography/background
- date/place information where appropriately public and civically relevant
- education
- professional history
- military/public service history where applicable
- prior elected/appointed offices
- notable civic career chronology

### Contact
Only appropriately public civic/professional channels:

- official office phone
- official office email
- official office contact page
- campaign phone
- campaign email
- campaign contact form
- public committee mailing/contact information
- official social accounts
- campaign social accounts

Do not turn CivicLenZ into a private-person contact-harvesting system.

### Governance/accountability
- committees
- leadership
- legislation
- sponsored/co-sponsored measures
- votes
- executive/government actions
- appointments
- public statements
- promises/positions

### Money/disclosure
Keep separate:

- campaign money
- personal/public disclosures
- lobbying
- public money/resource relationships

### Relationships
- committees
- campaign organizations
- donor/PAC relationships
- appointments
- boards
- disclosed businesses
- lobbying relationships
- contractors/grantees where documented

Relationship does not prove motive, wrongdoing, ideology, or causation.

### Media
Only identity-backed and usage-eligible media under the Media Asset contract.

## 15. Seat enrichment contract

Seat is permanent and independent of a Person.

Research applicable:

- jurisdiction
- office class
- authority/responsibility
- branch/body
- district/position number
- geographic boundary
- legal authority for boundary
- operational geometry
- boundary version/vintage
- address readiness
- current Occupancy
- prior Occupancies
- term rules
- vacancy rules
- appointment/succession rules
- Election schedule
- current/upcoming Election
- CandidateCampaigns
- special-election conditions
- constituency context
- public-resource context
- monitoring sources

A Person leaving office does not delete or replace the Seat.

## 16. Occupancy enrichment contract

Occupancy must be temporally explicit.

Track applicable:

```text
seat_id
person_id
status
valid_from
valid_to
current_as_of
selection/election/appointment basis
sworn/inauguration date
term expiration
resignation/vacancy events
acting/interim context
source/evidence
```

Current Occupancy must use source-role/currentness precedence appropriate to current-state claims.

Historical profile evidence may support prior service but not automatically current occupancy.

## 17. Election enrichment contract

Research applicable:

- election authority
- election identifier
- Seat(s)
- election type
- cycle
- filing activity
- statutory qualifying period
- pre-qualifying/administrative windows
- qualification status
- ballot status
- primary
- runoff where applicable
- general election
- special election
- withdrawals
- replacements
- results
- certification
- recount/challenge status where authoritative
- monitoring sources

Legal and administrative concepts must remain distinct.

## 18. CandidateCampaign enrichment contract

CandidateCampaign is a cycle/office-specific entity.

Identity must include enough context to prevent cross-cycle/cross-office collisions, including as applicable:

- person
- office type
- Seat
- district/position
- Election/cycle
- filing authority
- filing/candidate identifier

Research applicable:

- filing status
- qualifying status
- ballot status
- committee/treasurer/depository
- campaign website
- public campaign contact
- platform/issues
- promises
- endorsements
- campaign finance
- campaign social accounts
- campaign media
- election results
- monitoring

Historical CandidateCampaigns remain historical and must not silently become current campaigns.

## 19. Jurisdiction / GovernmentEntity enrichment

Research applicable:

- legal name
- authority/type
- parent/child jurisdiction
- geography
- governing body
- elected Seats
- election authority
- budgets/revenues/expenditures
- contracts/grants
- projects/programs
- audits
- demographic/economic context
- public records portals
- GIS portals
- meeting/voting systems
- monitoring sources

## 20. Organization enrichment

For civically relevant organizations, research only documented public relationships and public organizational facts.

Applicable areas may include:

- organization identity
- type
- public filings
- officers/directors where public and relevant
- candidate/official relationship type
- campaign finance relationship
- lobbying relationship
- board/appointment relationship
- contractor/grantee relationship
- endorsement relationship
- source/evidence/currentness

Do not infer motives from association.

## 21. Boundary enrichment

Every boundary record must distinguish:

- legal authority
- operational geometry source
- version/vintage
- effective period
- geometry hash
- authoritative/direct/lookup/inferred/unresolved status
- supersession history
- monitoring source

Boundary changes trigger Seat/address reconciliation.

## 22. Program / Project enrichment

For public programs/projects where in scope, research applicable:

- government entity/jurisdiction
- program/project identity
- statutory/administrative authority
- funding source
- appropriations
- expenditures
- grants/contracts
- vendors/grantees
- dates
- geography
- audits/oversight
- related public officials/boards only where the relationship is documented
- evidence/currentness

## 23. Evidence requirements

Every material claim/relationship must follow the canonical evidence chain:

```text
Source
-> Retrieval
-> Raw/Preserved Artifact
-> SHA-256
-> Precise SourceLocator
-> ExtractionRun
-> EvidenceObject
-> Claim/Relationship
```

Models are not primary evidence.

Search results are discovery aids, not final evidence.

A generic homepage does not satisfy a fact supported by a deeper page/document/record.

## 24. Atomic claims before narrative

Narrative biographies/dossiers should be composed from atomic evidence-backed claims.

Maintain traceability from narrative segments to underlying claims where practical.

Do not allow an AI-generated biography paragraph to become the sole stored evidence for facts within it.

## 25. Source hierarchy

Prefer:

1. primary authoritative government/election/legislative/court/disclosure/GIS sources;
2. official campaign/organization sources for self-description/platform/contact;
3. reputable secondary sources for discovery/context/corroboration;
4. lower-authority sources only with explicit scrutiny and canonical policy.

Source authority is claim-type dependent.

An official campaign site can be authoritative for what a candidate says their platform is, but not necessarily for independent verification of a government action.

## 26. Source discovery

When an applicable scope lacks sufficient registered sources:

```text
gap
-> source discovery
-> candidate source
-> authority evaluation
-> Source Registry
-> retrieval
-> parser/adapter
-> evidence
```

Repeated useful sources should become deterministic adapters where practical.

## 27. Contact-data provenance

Public phone/email/social/contact records must retain:

- source
- source role (official/campaign/committee/etc.)
- retrieved_at
- current_as_of
- precise locator where applicable
- verification/currentness state

Never infer an email/phone pattern and publish it as fact.

## 28. Media provenance

Portrait/media enrichment follows `MEDIA_ASSET_IDENTITY_AND_PROVENANCE.md`.

No image is better than the wrong image.

Stock people, generated faces, unrelated portraits, and unverified search thumbnails may not satisfy identity-media coverage.

## 29. Parallel research behavior

Independent scopes should proceed concurrently within Resource Governor limits.

Example:

```text
Biography RUNNING
Campaign Finance RETRYING
Votes CURRENT
Relationships QUEUED
Media SOURCE_DISCOVERY
GIS CURRENT
```

A retry in Campaign Finance does not block Biography, Relationships, Media, or unrelated subjects.

## 30. Dependency behavior

Dependencies must be explicit and minimal.

Examples:

- campaign finance may require CandidateCampaign identity;
- current Occupancy requires resolved Seat and sufficiently resolved Person;
- address projection requires relevant boundary geometry;
- relationship creation requires sufficiently resolved endpoint entities.

Do not invent unnecessary dependencies that serialize independent research.

## 31. Gap Detector

The Gap Detector continuously compares:

```text
applicable ResearchContract requirements
-
physical current evidence/state
=
research backlog
```

For each gap create/maintain:

- subject
- scope
- reason
- priority
- dependency
- assigned capability
- ResearchWorkIdentity
- next action
- created_at
- age

## 32. Backlog categories

Track at least:

- structural discovery
- first-pass enrichment
- deep dossier
- election/candidate urgency
- monitoring refresh
- contradiction/reconciliation
- evidence remediation
- source-discovery
- failure retry
- Academy remediation

## 33. Work-conserving progression

When one scope finishes, HERMES should select the next eligible scope according to priority/resources.

When one scope fails, HERMES should continue other eligible work.

When no work exists for one subject, HERMES should continue other subjects/cohorts.

## 34. Enrichment priority

Priority may consider:

- active/upcoming election relevance
- current officeholder importance to user/address coverage
- currentness/staleness
- severe evidence gaps
- contradiction severity
- canonical request
- cohort/frontier priority
- queue age
- source availability
- research cost
- public-product dependency

Priority policy must remain politically neutral and based on operational/civic criteria, not partisan preference.

## 35. Monitoring after enrichment

A scope becoming current creates monitoring responsibility where the domain is dynamic.

Examples:

- current Occupancy
- election/candidate status
- campaign finance
- votes
- legislation
- committees
- campaign website
- public statements
- disclosures
- relationships where monitored
- boundaries
- source health

Store:

```text
last_checked
current_as_of
next_check
stale_after
previous_state_hash
current_state_hash
last_change
source_health
failure state
```

## 36. Event-triggered enrichment

Events reopen or create relevant research work.

Examples:

```text
new candidate filing -> CandidateCampaign + dossier scopes
new qualifying result -> election/candidate state refresh
new finance filing -> finance scope
new vote -> vote scope + relevant promise/action linkage work
new disclosure -> disclosure + relationship work
new boundary -> GIS + address reconciliation
new vacancy/resignation -> Occupancy + Election/special-election work
new campaign page -> platform/promise/media work
new committee assignment -> governance scope
```

## 37. Staleness

Dynamic facts require currentness policies.

A fact may remain historically true while becoming stale for current projection.

Do not present stale current-state facts as freshly verified.

## 38. Contradictions

When authoritative/current sources conflict:

- preserve all evidence;
- create `UNREVIEWED_CONTRADICTION_CANDIDATE` or canonical equivalent;
- route reconciliation work;
- do not silently choose a source solely because it is newer/easier;
- do not publish unsupported certainty.

## 39. Entity resolution

Never merge people solely on name.

Use appropriate context such as:

- Seat
- jurisdiction
- office type
- Election/cycle
- CandidateCampaign
- official IDs
- filing IDs
- committee IDs
- official URLs
- temporal context
- biographical corroboration

Ambiguity fails closed.

## 40. Validation separation

Maintain explicit stages:

```text
STRUCTURAL_RECORD_EXISTS
EXTRACTED_UNREVIEWED
INGEST_CONTRACT_VALID
BRIDGE_READY
CANONICAL_RECEIVED
ACCEPTED_FOR_VALIDATION
CANONICAL_VALIDATED
PUBLISHED
```

These are not interchangeable.

Producer completeness does not equal canonical verification.

## 41. Harvester behavior

CivicsLenZz may:

- discover
- retrieve
- hash
- parse
- extract
- create unreviewed claims/relationships
- preserve evidence
- detect gaps/conflicts
- package results
- monitor source changes

CivicsLenZz may not:

- declare canonical verification
- publish canonical civic truth
- override canonical identity
- bypass canonical validation
- directly write canonical operational truth stores unless explicitly authorized through a governed interface

All producer civic outputs default to `extracted_unreviewed`.

## 42. Canonical HERMES behavior

Canonical HERMES receives producer results and performs governed:

- producer authentication
- schema validation
- idempotency
- artifact/hash verification
- identity resolution
- evidence validation
- source/currentness evaluation
- contradiction/reconciliation
- finite-dataset reconciliation where required
- canonical state decision
- publication eligibility
- monitoring continuation

## 43. Persistence

Research-scope coverage, gaps, jobs, failures, evidence metadata, monitoring state, handoffs, and bridge-ready results must be durable.

They must not exist only in an interactive AI session's memory.

## 44. Session independence

Google/Gemini, Codex, ChatGPT, browser windows, and operator sessions are not required for normal ongoing enrichment.

The persistent runtime/scheduler must continue:

```text
find gaps
-> create work
-> dispatch
-> research
-> persist
-> update coverage
-> monitor
-> next work
```

## 45. Research liveness per subject

A subject with applicable backlog should exhibit physical activity or a documented reason why not.

Track:

- open scope count
- queued scope count
- running scope count
- current scope count
- stale scope count
- unresolved/conflict count
- last research activity
- next eligible work

If applicable backlog exists but no work is being scheduled within policy, create a starvation/coverage exception.

## 46. Research liveness per capability

For every capability track:

- applicable backlog
- queue depth
- last real job
- last real retrieval
- last real evidence
- last successful handoff
- last failure
- next eligible work

A capability with backlog but no recent work is not healthy merely because the process is alive.

## 47. Enrichment velocity

Operator metrics should measure real progress, including:

- subjects discovered
- scope cells created
- scope cells advanced
- scope cells made current
- stale scopes refreshed
- gaps created
- gaps closed
- evidence created
- contradictions created/resolved
- monitored changes detected
- average/oldest backlog age

Do not optimize for superficial job volume.

## 48. Coverage reporting

Never report one global completeness percentage as sufficient.

Separate at least:

- structural discovery coverage
- first-pass research coverage
- deep-dossier coverage
- source coverage
- evidence coverage
- temporal/currentness coverage
- finite-dataset reconciliation
- monitoring coverage
- canonical validation coverage
- unresolved contradiction count

## 49. Person enrichment dashboard metrics

Where applicable and privacy/policy compliant, expose counts such as:

- Persons known
- Persons identity-resolved
- Persons with biography evidence
- Persons with education evidence
- Persons with career evidence
- Persons with prior-office evidence
- Persons with official contact source
- Persons with public official phone
- Persons with public official email
- candidates with campaign contact source
- Persons/candidates with official social source
- candidates with campaign social source
- Persons with verified eligible portrait
- Persons/candidates with finance coverage
- Persons with disclosure coverage
- officials with legislative/vote coverage
- Persons/candidates with relationship evidence
- subjects with current deep dossier

Every metric must be physically derived and drillable.

## 50. Unknown/no-result semantics

Distinguish:

- NOT_RESEARCHED
- RESEARCHING
- NO_RESULT_FOUND_WITHIN_SCOPE_AS_OF
- SOURCE_UNAVAILABLE
- UNRESOLVED
- CONFLICTING
- NOT_APPLICABLE

Do not turn an unsuccessful search into a false negative fact.

## 51. Research quality

Quality assurance should sample physical claims against preserved evidence and precise locators.

Failed quality checks create remediation work and may trigger blast-radius audits for the implicated parser/source/rule.

## 52. Root-cause feedback

When an enrichment error is found:

```text
discrepancy
-> incident
-> trace to first incorrect transition
-> identify failure class
-> blast-radius audit
-> generalized repair
-> supersede affected outputs
-> regenerate normally
-> regression test
-> monitor
```

Do not patch one named subject to make a dashboard look correct.

## 53. Academy integration

Academy consumes real enrichment outcomes such as:

- parser failures
- schema drift
- source-yield differences
- duplicate work
- identity errors
- evidence locator failures
- source precedence errors
- rate limiting
- model/browser fallback
- human/canonical corrections

Academy may improve HOW research occurs but not independently change truth/publication standards.

## 54. Resource allocation

Balance:

- discovery of new subjects
- first-pass enrichment
- deep dossier work
- election/currentness urgency
- monitoring
- remediation
- Academy improvements

Do not endlessly deepen a few prominent subjects while leaving most discovered subjects untouched.

Do not endlessly enumerate new Seats without enriching them.

## 55. Security/privacy

Research must respect canonical security/privacy policies.

At minimum:

- least-privilege tools/credentials
- no secrets in Git/evidence/telemetry
- no producer direct canonical truth writes without governed authorization
- no unnecessary sensitive/private personal data collection
- public-contact enrichment limited to appropriately public civic/professional channels
- auditable source provenance

## 56. Acceptance criteria for a subject

A subject is not considered fully current merely because its row exists.

A subject may be classified using stages such as:

- DISCOVERED
- STRUCTURED
- FIRST_PASS
- PARTIALLY_ENRICHED
- DEEP_RESEARCH_ACTIVE
- CURRENT_TO_APPLICABLE_CONTRACT_DEPTH
- MONITORED
- STALE
- CONFLICTING

`CURRENT_TO_APPLICABLE_CONTRACT_DEPTH` requires all currently applicable required scopes to satisfy their contract or have explicit allowed unresolved/not-applicable states.

## 57. Acceptance criteria for the enrichment system

The enrichment system is operational only if physical evidence demonstrates:

- new subjects automatically create applicable scope coverage;
- missing scopes automatically create work;
- independent scopes execute without unnecessary serialization;
- workers retrieve real sources;
- evidence/locators are preserved;
- results persist durably;
- currentness is tracked;
- monitoring reopens work when necessary;
- gaps are measurable;
- backlog is being consumed;
- failures do not freeze unrelated research;
- canonical validation remains separate;
- operator metrics reflect physical state.

## 58. Required conformance audit

Google/CivicsLenZz and canonical Codex/HERMES must be able to produce a conformance matrix:

```text
SUBJECT CLASS
RESEARCH SCOPE
CANONICAL CONTRACT
RESPONSIBLE CAPABILITY
IMPLEMENTATION
WAKEUP PATH
SOURCE FAMILIES
PHYSICAL STORAGE
MONITORING POLICY
CURRENT COVERAGE
GAPS
```

This prevents implementation drift.

## 59. Mandatory continuous loop

The required behavior is:

```text
DISCOVER SUBJECT
-> RESOLVE CONTEXT
-> LOAD RESEARCH CONTRACT
-> ENUMERATE APPLICABLE SCOPES
-> COMPARE WITH PHYSICAL STATE
-> CREATE MISSING WORK
-> PRIORITIZE
-> RESERVE
-> ROUTE
-> RESEARCH
-> RETRIEVE
-> PRESERVE
-> EXTRACT
-> LOCATE EVIDENCE
-> PERSIST
-> HAND OFF
-> VALIDATE
-> UPDATE COVERAGE
-> PROJECT WHEN ELIGIBLE
-> MONITOR
-> DETECT CHANGE/STALE/GAP
-> CREATE NEXT WORK
-> REPEAT
```

This loop does not globally terminate.

## 60. Final doctrine

CivicLenZ must behave as a continuously operating enrichment system, not a collection of static profiles and not an interactive research assistant waiting for a user to request each person.

Every new civic subject creates structured research responsibility.

Every applicable missing scope becomes visible work.

Every material result remains traceable to evidence.

Every dynamic fact has currentness.

Every blocked scope is isolated from unrelated work.

Every recurring change creates new work.

Every quality failure can be traced and generalized.

Every producer remains subordinate to canonical validation.

Research continues until the applicable contract is current, and monitoring ensures that current state is never treated as permanently complete.