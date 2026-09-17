# CivicLenZ Research Exhaustion, Completeness & Multi-Pass Validation Contract

## 1. Purpose

This contract defines how CivicLenZ decides whether a bounded research scope has actually been researched deeply enough to be considered reconciled as of a cutoff.

It exists to prevent false completeness such as:
- collecting a handful of donors and calling campaign finance complete;
- finding one article and calling biography complete;
- finding one promise and calling campaign commitments complete;
- collecting some votes, bills, filings, social posts, disclosures, relationships or news records and treating the scope as exhausted;
- allowing one worker to self-certify that its own research was sufficient.

The governing principle is:

> Useful findings are not completeness. Completeness requires an explicit exhaustion protocol appropriate to the data universe.

This contract supplements `SUBJECT_RESEARCH_ENRICHMENT_AND_COMPLETENESS_CONTRACT.md`, `DATA_ACQUISITION_MACHINE_AND_DEEP_DOSSIER_SWARM_OPERATING_CONTRACT.md`, `03_RESEARCH_CONTRACTS_CONTINUOUS_SCOPE.md`, `DATA_EVIDENCE_VERIFICATION.md`, and all applicable source/domain contracts.

It does not create a global `COMPLETE_FOREVER` state. Dynamic subjects remain monitored.

## 2. Required distinction: finite versus open-ended scopes

Every ResearchContract scope MUST declare one of:

- `FINITE_ENUMERABLE`
- `FINITE_BY_PERIOD_OR_AUTHORITY`
- `OPEN_ENDED_BOUNDED_DEPTH`
- `STREAMING_MONITORED`
- `HYBRID`

The exhaustion rule depends on this class.

A worker may not invent its own stopping rule.

## 3. Finite authoritative universes

For a finite enumerable source, completeness means reconciling the entire defined authoritative public universe for the applicable subject, period and source version.

Examples include, where applicable:
- campaign finance filings and transaction records;
- election filings and results;
- roll-call votes;
- sponsored/co-sponsored legislation;
- committee assignments;
- executive orders/actions;
- appointments;
- financial disclosure reports;
- registered lobbying records;
- official meeting/voting records;
- public contracts, grants or expenditures when the authoritative dataset is enumerable;
- GIS/boundary versions.

A finite scope cannot become reconciled because the worker found `N` records.

There is no arbitrary `top 5`, `top 10`, `top 100` stopping rule unless the ResearchContract explicitly defines a derived summary view in addition to the preserved full dataset.

## 4. Finite reconciliation proof

A `FINITE_ENUMERABLE` or `FINITE_BY_PERIOD_OR_AUTHORITY` scope must persist, where applicable:

```text
universe_authority
universe_locator
subject_identity
cycle_or_period
source_version
current_as_of
expected_unit_definition
expected_unit_count
retrieved_unit_count
processed_unit_count
validated_unit_count
failed_unit_count
missing_unit_count
excluded_unit_count
amendment_or_supersession_count
reconciled_totals
reconciliation_delta
unresolved_units
cutoff
next_monitoring_check
```

The scope may reach `RECONCILED_THROUGH <cutoff>` only when:

1. the authoritative universe has been identified;
2. every expected unit in the defined scope is accounted for;
3. all retrieved units have been processed or have an explicit unresolved/failure state;
4. amendments/replacements are reconciled rather than double counted;
5. any source-provided totals/counts are reconciled where technically possible;
6. evidence lineage exists for each material record;
7. unresolved gaps are explicitly persisted;
8. an independent reconciliation pass confirms the counts/state;
9. monitoring is scheduled for future changes.

## 5. Campaign finance exhaustion

Campaign finance is a first-class finite/hybrid scope and MUST NOT stop at prominent donors.

For each applicable candidate/committee/cycle/period, the system should identify the complete public filing/reporting universe available from the relevant authority and process all in-scope public records, including where applicable:

- committees;
- reporting periods;
- contribution records;
- contributor identity fields as publicly reported;
- contribution dates/amounts/types;
- transfers;
- refunds;
- expenditures;
- vendors/payees;
- debts/obligations;
- loans;
- amendments;
- corrected/superseded reports;
- independent-expenditure or outside-spending datasets where they are a distinct public source and applicable;
- source totals and aggregate reconciliation.

The product may later show summaries such as major contributors, categories or totals, but the underlying acquisition target is the full defined public dataset, not a curated top-N sample.

If the source imposes pagination, rate limits, archival segmentation or period partitions, the worker must enumerate and reconcile all pages/segments/periods within the contract scope.

A finance scope with 5 retrieved donations out of 20,000 expected public records is `PARTIAL_WITH_EVIDENCE`, not current.

## 6. Open-ended research scopes

Some domains are not globally enumerable, including:

- biography;
- career chronology;
- public statements;
- speeches;
- interviews;
- debates;
- campaign promises;
- policy positions;
- news/media chronology;
- organization/relationship discovery;
- materially relevant public records;
- historical campaign materials;
- social-media history where platform/source APIs do not provide a provably complete universe.

These scopes cannot honestly claim metaphysical exhaustiveness.

They require a defined source-family/depth protocol and may reach only states such as:

- `CURRENT_TO_CONTRACT_DEPTH`
- `SEARCH_SATURATED_AS_OF <cutoff>`
- `COVERAGE_RECONCILED_FOR_DEFINED_SCOPE_AS_OF <cutoff>`

They then remain monitored.

## 7. Open-web multi-pass discovery protocol

Every high-value open-ended scope MUST use multiple independent discovery strategies before saturation can be claimed.

At minimum, where technically available and relevant, perform distinct passes such as:

### Pass A — canonical/authoritative source families
Search known official sources first:
- government sites;
- legislative/executive portals;
- election authorities;
- disclosure/ethics/court portals;
- official office sites;
- official campaign sites;
- official social accounts;
- official press releases/RSS/APIs.

### Pass B — web/search discovery
Use web search engines and browser research with multiple query formulations, including:
- canonical name;
- aliases/name variants;
- office/title combinations;
- organization/campaign names;
- date/cycle constraints;
- issue/topic terms;
- site-specific queries where useful;
- filetype/document queries where useful.

Search results are discovery aids. Follow and preserve the underlying source.

### Pass C — secondary-reference discovery
Use reputable reference sources, institutional biographies, archival indexes, and sources such as Wikipedia where useful to discover:
- aliases;
- prior offices;
- education/employment leads;
- campaign/history leads;
- citations pointing to primary material.

Wikipedia or other tertiary/reference material is not automatically authoritative evidence for every claim. Follow its citations and corroborate material facts against stronger sources where available.

### Pass D — media/archive discovery
Search relevant:
- news archives;
- video platforms;
- podcast/interview indexes;
- speech/debate archives;
- archived campaign pages;
- web archives where permitted;
- official document repositories.

### Pass E — relationship-led recursion
Use already validated facts to generate additional discovery queries:
- prior office -> prior jurisdiction sources;
- employer/company -> disclosure/organization records;
- committee -> finance records;
- donor/PAC -> relationship records;
- promise -> later statements/actions;
- interview host/show -> episode/archive search;
- social handle -> historical/current platform search.

## 8. Search saturation rule

An open-ended scope may not become `SEARCH_SATURATED_AS_OF` merely because one search pass found no new facts.

For high-value deep-dossier scopes, the default saturation standard is:

1. required source families attempted;
2. at least three materially different discovery passes where technically possible;
3. final two independent discovery passes produce no new material in-scope entity, claim, relationship, source family or unresolved lead above the materiality threshold;
4. all previously discovered material leads are either researched, explicitly unresolved, excluded as non-material/out-of-scope, or blocked with reason;
5. contradictions are resolved or persisted as unresolved;
6. identity ambiguity is closed or fail-closed;
7. a separate coverage-audit worker reviews the search ledger;
8. monitoring obligations are created for dynamic sources.

The number of search passes may be increased by the ResearchContract or by the Gap Detector when new material keeps appearing.

The system must not perform infinite searches merely to avoid closure. It must use explicit bounded depth plus continuing monitoring.

## 9. Search ledger

Every deep open-ended scope should persist a search ledger containing, where applicable:

```text
scope_id
subject_id
pass_id
worker_run_id
search_strategy
query_or_locator
source_family
search_provider_or_tool
started_at
completed_at
result_count
material_lead_count
new_claim_count
new_entity_count
new_relationship_count
new_source_count
unresolved_lead_count
duplicate_lead_count
excluded_lead_count
last_new_material_at
```

This allows HERMES to measure whether the research is still producing material information or has reached saturation.

## 10. Three-boundary assurance model

No high-value scope may self-certify completeness from one worker run.

Use three distinct logical assurance boundaries:

### 1. Collection/research boundary
Workers retrieve, preserve and extract evidence.

### 2. Coverage-audit boundary
An independent completeness auditor asks:
- what was the expected universe?
- what source families were required?
- what pages/periods/segments were attempted?
- what leads remain unresolved?
- were there unexplained zero-result paths?
- did the worker stop after a sample?
- does the source expose counts/totals not reconciled by the collected data?
- did the last independent passes still produce new material?

The coverage auditor creates new work when the answer is incomplete.

### 3. Canonical validation/reconciliation boundary
Canonical validators verify identity, evidence integrity, temporal semantics, contradictions, dataset reconciliation and publication eligibility.

These may be separate processes or capabilities, but the same producer/worker output must not be accepted as proof of its own exhaustive coverage.

## 11. Completeness audit object

Persist a durable audit for each high-value subject/scope reconciliation, similar to:

```text
completeness_audit_id
subject_id
research_contract_id
scope_id
scope_class
cutoff
expected_universe_defined
expected_units
accounted_units
missing_units
required_source_families
attempted_source_families
successful_source_families
search_passes
last_two_passes_new_material_count
unresolved_leads
contradictions
identity_gaps
evidence_gaps
validation_gaps
coverage_auditor_run_id
reconciliation_state
monitoring_obligation_id
created_at
```

## 12. Scope exit states

Use explicit exit states rather than `COMPLETE`:

### Finite scopes
- `RECONCILED_THROUGH_CUTOFF`
- `PARTIAL_WITH_KNOWN_GAPS`
- `BLOCKED_SOURCE_UNAVAILABLE`
- `BLOCKED_CAPABILITY_NOT_IMPLEMENTED`
- `UNRESOLVED_RECONCILIATION`

### Open-ended scopes
- `CURRENT_TO_CONTRACT_DEPTH`
- `SEARCH_SATURATED_AS_OF_CUTOFF`
- `PARTIAL_WITH_OPEN_LEADS`
- `UNRESOLVED_CONTRADICTIONS`
- `BLOCKED_SOURCE_OR_CAPABILITY`

A subject dossier may report an initial deep-research snapshot only by aggregating these scope states. It must not replace them with one misleading global percentage or `DONE` flag.

## 13. Deep-dossier acceptance matrix

For every official/candidate deep dossier, HERMES must maintain a matrix of all applicable scopes with at least:

```text
scope
scope_class
applicable
state
source_families_required
source_families_attempted
finite_expected
finite_accounted
search_passes
open_leads
evidence_count
claim_count
relationship_count
validation_state
current_as_of
monitoring_state
next_action
```

The owner/operator should be able to drill down from the dossier to this matrix and see exactly why a scope is considered reconciled, partial, blocked, stale or unresolved.

## 14. Gap Detector role

The Gap Detector MUST compare physical research state against the ResearchContract and the exhaustion rules in this contract.

It creates work for:
- missing source families;
- unprocessed finite units;
- unresolved pagination/periods;
- unexplained count mismatches;
- open material leads;
- missing corroboration;
- evidence/locator gaps;
- contradictions;
- missing historical periods;
- missing campaign cycles;
- missing social/media source families;
- stale monitoring state;
- capability implementation gaps.

A scope cannot transition to a reconciled state while the Gap Detector still has unresolved required obligations unless the obligations are explicitly blocked/excluded under contract.

## 15. Independent rediscovery audit

For the first reference dossier for each office class, and periodically afterward, run a separate rediscovery auditor that starts from the canonical subject identity but does NOT simply consume the first research worker's lead list.

Its mission is to independently search for material facts/sources that the primary swarm missed.

If it finds new material:
- create normal research work;
- reopen the affected scope;
- record the miss as Academy telemetry;
- evaluate whether the ResearchContract/source-family/search strategy should be improved.

This is the system's double-check/triple-check mechanism.

## 16. Web/browser/search authority

Authorized workers may use web search and browser research where the capability/tool policy permits it.

Permitted uses include:
- discovering primary sources;
- discovering archives/documents;
- discovering social accounts;
- finding interviews/podcasts/video;
- locating historical campaign materials;
- finding secondary corroboration;
- finding leads missed by deterministic adapters.

Requirements:
- preserve the underlying source, not only the search result;
- record query/search lineage for deep-research audits where practical;
- do not treat search snippets as evidence;
- do not treat AI-generated summaries as evidence;
- evaluate source authority per claim type;
- escalate material conflicts to canonical validation.

## 17. Wikipedia/reference-source role

Wikipedia and similar reference sources may be used as discovery and corroboration aids when technically available.

They are especially useful for generating leads such as:
- aliases;
- career chronology;
- prior offices;
- elections;
- education;
- organizations;
- citations to primary/secondary sources.

For material claims, prefer the strongest appropriate underlying source and preserve it in the evidence chain.

If a reference source conflicts with an authoritative/current source, do not silently choose the reference source.

## 18. Campaign promise/public commitment exhaustion

Promise research must not stop after finding a few memorable statements.

For the defined campaign/cycle/period, search all required applicable source families, including where available:
- campaign website/platform pages;
- archived campaign pages;
- debates;
- speeches/rallies;
- candidate interviews;
- podcasts;
- press releases;
- campaign advertising transcripts/material;
- official/campaign social posts;
- questionnaires/endorsement interviews;
- reputable media quoting attributable direct commitments.

Each material commitment should preserve:
- speaker identity;
- exact or bounded supporting excerpt;
- date/time;
- source;
- context;
- qualifiers/conditions;
- office/campaign context;
- issue taxonomy;
- expected observable action/non-action where definable;
- current evidence relationship state;
- monitoring obligation.

Repeated statements may reconcile to one commitment proposition while preserving every supporting source occurrence.

Promise-status analysis classifies evidence relationships to the documented commitment. It must not create political rankings, voting recommendations or unsupported motive claims.

## 19. Social/media exhaustion and monitoring

For historical social/media research, define a period/platform/source scope and attempt the complete accessible public history when the source/API provides enumerable access.

Where the platform cannot provide a provably complete history:
- document the accessible period/depth;
- use platform search plus web/search-engine discovery;
- archive material attributable posts where permitted;
- run independent discovery queries;
- mark the result `CURRENT_TO_CONTRACT_DEPTH` rather than globally complete;
- leave persistent monitoring in place for future content.

## 20. Biography/history chronology exhaustion

Biography/history research should build an atomic chronology rather than one prose biography.

The coverage auditor should check for unexplained periods and transitions across applicable:
- education;
- employment;
- professional practice;
- military/public service;
- elected/appointed offices;
- candidacies;
- organizations/boards;
- campaign activity;
- jurisdiction changes materially relevant to civic history.

Material gaps in the chronology create follow-up work.

## 21. Legislative/government activity exhaustion

Where an authoritative source exposes an enumerable universe, reconcile the entire applicable period rather than a sample.

Examples:
- every roll-call vote for the defined tenure/session;
- every sponsored/co-sponsored measure for the defined tenure/session;
- all committee memberships/leadership periods;
- all executive orders/actions in the defined period where the source universe is enumerable;
- all publicly recorded appointments/budget actions within the defined applicable universe.

Summary statistics may be derived later. Acquisition targets the full defined universe.

## 22. Relationship research exhaustion

Relationship research remains evidence-based and cannot infer motive from association.

The swarm may discover relationships from:
- campaign finance;
- appointments;
- committees;
- boards;
- disclosures;
- lobbying filings;
- contracts/grants;
- organizations;
- staff roles;
- endorsements;
- other public records.

Each discovered endpoint/relationship may recursively create additional bounded research work subject to identity, relevance, privacy and resource policies.

Open-ended relationship discovery uses the multi-pass saturation protocol.

## 23. Source-family coverage rules

Each ResearchContract should define required/optional source families by scope.

A worker may not substitute one easy source for all required families.

Example: a biography scope may require official biography + authoritative office/election history + independent corroborating source-family coverage. A campaign promise scope may require campaign-controlled sources plus independent archive/media discovery. A finance scope requires the relevant finance authority rather than a news summary of fundraising.

## 24. Corroboration rules

High-impact material claims should be corroborated according to claim type.

A primary authoritative record may be sufficient where it is the canonical record for that fact.

For open-ended/historical/contested claims, seek independent corroboration where reasonably available.

Do not mechanically require two sources when the second source merely copies the first. Independence matters more than raw count.

Contradictory evidence must remain visible and create reconciliation work.

## 25. Search cost and resource governance

Depth is the product, but research must still be resource-governed.

The Resource Governor may throttle concurrency, source access or expensive tools. It may NOT silently lower the completeness standard.

If a scope cannot currently reach contract depth because of cost, source access or missing capability, preserve it as partial/blocked with a next action rather than pretending it is complete.

## 26. Academy feedback

Academy should measure where rediscovery audits repeatedly find missed information.

Track by worker/source/scope:
- miss rate;
- source-family omissions;
- search-strategy yield;
- pagination/period misses;
- duplicate rate;
- false-positive lead rate;
- unresolved-lead rate;
- validation rejection rate;
- time/cost per reconciled scope.

Use this telemetry to improve research methods and deterministic adapters without weakening truth standards.

## 27. Operator depth metrics

Operator reporting must emphasize depth, not raw job counts.

Useful metrics include:
- applicable scopes vs reconciled/partial/blocked;
- finite units expected/accounted;
- source families required/attempted;
- open leads remaining;
- search saturation state;
- independent rediscovery misses;
- evidence coverage;
- validation coverage;
- stale/due monitoring scopes;
- contradiction backlog;
- capability gaps.

Do not present `number of jobs run` as a proxy for dossier quality.

## 28. Reference-dossier proof

The first deep reference dossier for each office class must physically demonstrate:

1. full applicable ResearchContract matrix;
2. finite-universe reconciliation for applicable finite scopes;
3. multi-pass search saturation for applicable open-ended scopes;
4. independent coverage audit;
5. independent rediscovery audit;
6. canonical evidence/validation lineage;
7. explicit unresolved/blocked gaps;
8. monitoring obligations for dynamic scopes;
9. Gap Detector reopening work when the auditor finds missing coverage;
10. no arbitrary top-N truncation masquerading as complete research.

## 29. Non-negotiable stopping rule

A worker's statement `I found enough` has no canonical meaning.

A research scope stops active first-pass acquisition only when the contract-defined exhaustion gate is satisfied or when it reaches an explicit truthful blocked/unresolved state.

After reconciliation, dynamic scopes transition into monitoring rather than disappearing.

## 30. Political neutrality and user agency

CivicLenZ may deeply research public officials, candidates, documented positions, campaign commitments, public actions and public records.

The system must present evidence and attributable relationships neutrally.

It must not rank political actors, recommend voting choices, infer a user's political preference, or turn promise/accountability evidence into an opaque politician score.

Users should be able to inspect the underlying sources and form their own judgments.
