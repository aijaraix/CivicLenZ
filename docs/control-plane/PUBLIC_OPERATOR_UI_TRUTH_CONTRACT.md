# Public & Operator UI Truth Contract

## Purpose
CivicLenZ product surfaces must present complex civic information clearly without hiding uncertainty, inventing missing content, or severing the evidence chain. The public experience should be simple and navigable; the operator/development experience should expose the machinery required to test and trust it.

This contract defines how canonical Seat-, Election-, Candidate-, Person-, geography-, evidence-, monitoring-, and research state may be projected into customer-facing and operator-facing UI.

## Core product invariant
The UI is a projection of canonical/eligible state, not a separate civic database.

No component may invent a value, image, count, biography detail, financial number, relationship, election status, boundary, source, or progress state because a field is missing.

If required information is unavailable, display an honest state such as `Research in progress`, `Source unresolved`, `Conflicting records`, `Data stale`, or omit the unsupported field according to the component contract.

## Seat-centric navigation
The permanent civic anchor remains the Seat. Public navigation should make it natural to move among:

`Address -> Governing Seats -> Current Occupants -> Elections -> CandidateCampaigns -> People -> Evidence/Timeline`

Person profiles remain important, but Seat context must explain what office is held/sought, what authority it has, which geography it governs, and which election controls occupancy.

## Profile UX: avoid endless scrolling
Official and candidate profiles will contain large datasets. Do not implement a single endlessly scrolling page containing every vote, filing, relationship, source, and historical record.

Use:

`Profile Summary -> Sticky Section Navigator -> Compact Section Summaries -> Dedicated Deep-Dive Views`

The initial page should provide useful context within a modest scroll depth. Large datasets belong in searchable/filterable/paginated deep views or drawers rather than thousands of inline rows.

## Sticky profile section navigator
After the user scrolls beyond the main profile hero/header, display a persistent compact section navigation bar beneath the primary site header.

Desktop/tablet conceptual sections:

- Overview
- Record / Activity
- Promises & Positions
- Votes & Legislation
- Campaign Money
- Public Money / Jurisdiction
- Relationships
- Biography
- Timeline
- Sources & Evidence

Exact labels may adapt by office/candidate type and available data. Do not show meaningless empty navigation items.

On mobile, use a horizontally scrollable compact tab bar and/or a `More` control rather than forcing all labels into one row. Example:

`Overview | Promises | Votes | Money | More`

The navigator should indicate the active section and support accessible keyboard/touch navigation.

## Navigation state preservation
When a user opens a deep view/evidence item and returns, restore the prior profile section, filters, and reasonable scroll context rather than returning to the top of the profile.

Deep links should support directly opening important sections and, where feasible, individual records/evidence items.

## Profile hero / identity block
The top identity block should be concise and source-backed. Depending on context it may include:

- verified portrait/media asset;
- Person name;
- current Seat or Seat sought;
- party where applicable and sourced;
- jurisdiction/district;
- occupancy/candidate status;
- term/current-as-of state;
- next relevant Election summary;
- actions such as Follow/Monitor, View Map, View Election, Sources.

Do not display a synthetic portrait or generic stock person when a verified identity image is unavailable.

## Overview section
The Overview should answer quickly:

- Who is this person?
- What Seat do they occupy/seek?
- What does the Seat do?
- Which geography does it govern?
- Is this Seat relevant to the user's address?
- When is the next relevant election?
- What are the major evidence-backed current facts?

Use compact cards and short summaries. Avoid duplicating every detail available in deeper sections.

## Biography
Biography narrative must be composed from eligible evidence-backed atomic claims. AI may assist presentation, but unsupported narrative embellishment is prohibited.

The biography should be structured into useful subsections where data exists, such as education, career, prior public service, election history, and other civically relevant public background.

Operator/development mode should allow sentence/segment -> claim -> evidence inspection.

Public mode may expose concise source indicators and a Sources interaction.

## Record / Activity
Present current governmental activity appropriate to the Seat, such as committee roles, sponsored legislation, executive actions, appointments, public meetings/actions, or other office-specific records.

Show summaries and recent/high-relevance entries first, with `View all` deep views for large datasets.

Do not manufacture a universal activity schema when office authority differs.

## Votes & Legislation
Large legislative histories require dedicated deep views with search/filter/sort. Useful filters may include date/session, bill, issue taxonomy, vote position, sponsorship/co-sponsorship, committee, and chamber status where supported.

Counts shown on profile tabs/cards must use canonical MetricDefinitions and physical records.

## Promises & Positions
Display documented commitments/positions with original source/date/context/qualifiers and applicable office authority. Show subsequent evidence relationships neutrally under the canonical promise-evidence model.

Do not create political grades, ideological rankings, loyalty scores, candidate scores, or voting recommendations.

Where evidence is conflicting or insufficient, say so.

## Campaign Money
Campaign finance UI should preserve reporting period and committee/entity context. Derived totals require calculation provenance.

Provide appropriate interactions such as:

- View filings
- View transactions
- View committees
- Show calculation
- Sources/Evidence

Do not mix campaign money with government/public money or personal disclosures.

## Public Money / Jurisdiction
Present public-resource context tied to government entities/programs/geography, not as personal money controlled by an officeholder unless the evidence and legal authority establish that relationship.

Distinguish:

- government financial context;
- Seat legal authority;
- documented official action.

Provide deep views for budgets, grants, contracts, procurement, projects, transfers, audits, and other applicable datasets.

## Relationships
Show evidence-backed neutral relationships such as committees, appointments, campaign committees, donors/PACs, organizations, businesses, lobbying, contractors/grantees, boards, endorsements, or disclosures as distinct relationship types.

A relationship UI must not imply causation, corruption, motive, or influence merely from association/correlation.

Allow users to inspect the source establishing the relationship.

## Timeline
Provide a chronological civic/accountability timeline capable of combining appropriately labeled events such as:

- elections;
- occupancies;
- candidate filings/status changes;
- promises/statements;
- votes/legislation/actions;
- finance/disclosure filings;
- boundary/Seat changes;
- oversight/public-record events;
- monitoring-detected changes.

Each event should link to evidence/currentness where applicable. Historical facts must remain historically correct rather than being rewritten to current state.

## Sources & Evidence
Public profiles should have a clean evidence surface. Users should be able to inspect useful sources without being overwhelmed by internal trace metadata.

Possible public interactions:

- Sources
- Evidence
- View original
- View preserved record where appropriate
- Open at page/section/record where supported

Operator/development mode additionally exposes:

- Claim record
- Evidence relationship
- SourceLocator
- preserved artifact/hash
- extraction run
- agent/tool/trace
- validation/reconciliation
- monitoring/currentness

## Development evidence mode
During development/acceptance, favor transparency. Facts/cards should be capable of showing trust state, source, retrieval date, extractor/parser, validation state, currentness, and trace/evidence controls.

This verbose mode exists to expose wrong pages, generic homepages, incorrect identities, stale evidence, unsupported summaries, and broken locators before public simplification.

## Public simplification
Public mode may hide operational machinery by default, but may not weaken the underlying truth contract. A small `Sources` button can replace a full trace panel; it cannot replace the evidence chain itself.

## Component data contracts
Every substantive UI component must declare required and optional data fields and truth/currentness requirements before it may render an assertion.

Examples:

### Education card
Requires institution + eligible claim state + evidence. Degree/period render only when separately supported.

### Campaign Money summary
Requires metric definition + reporting period + source/calculation provenance + currentness.

### Promise card
Requires documented commitment + source/date/context/qualifiers + applicable office/authority context + evidence relationship state.

### Election card
Requires Seat/Election linkage + authoritative dates/status + current-as-of state. Candidate `QUALIFIED` may render only when canonical election semantics support it.

### Relationship card
Requires subject/object/type + period where applicable + evidence. No inferred motive.

If required fields are absent, the component must not fill them with synthetic defaults.

## Counts and badges
Section counts such as `Votes 4,281`, `Sources 812`, or `Relationships 46` must come from versioned MetricDefinitions and eligible physical records. Do not display decorative counts.

Counts should update with current filters/deep-view semantics where appropriate.

## Deep-dive views
Large domains should open dedicated views rather than expand indefinitely inline. Deep views should support domain-appropriate combinations of:

- search;
- filters;
- sort;
- date/reference period;
- pagination or virtualized lists;
- export where authorized;
- source/evidence inspection;
- stable URLs/deep links.

Examples include all votes, all finance filings/transactions, all relationships, all evidence, full timeline, and all monitoring events.

## Map integration
The Map is another projection of the Seat graph, not a separate data silo.

Profile -> `View District/Map` should navigate to the applicable versioned Seat boundary and, when the user has provided an address, show the relationship between that point and the governing geography.

Map -> Seat marker/polygon -> compact Seat card -> occupant/election/candidates -> full profile.

Map layers may include federal, state, county, municipal, school, special district, election, and approved civic context layers.

Never use a politician's private residence as a civic map marker. Use verified public civic/office locations.

## Address relevance
Where a user has resolved an address, profiles should be able to state whether the Seat governs/represents that exact point based on the applicable boundary version and resolution method.

Do not infer exact representation from ZIP code.

If local GIS remains unresolved, communicate the limitation rather than claiming exhaustive representation.

## Election UX
Election views should be Seat-centric and show:

- Election identity/type/date;
- Seat;
- filing/qualifying state;
- CandidateCampaigns;
- candidate status with correct legal semantics;
- evidence/currentness;
- results/certification when applicable.

Do not collapse campaign filing, pre-qualifying document acceptance, statutory qualification, ballot status, and election result into one generic status.

## Candidate vs officeholder adaptation
The same Person may appear as current officeholder, candidate for another Seat, former officeholder, or multiple historical CandidateCampaigns. UI must derive context from SeatOccupancy/CandidateCampaign relationships rather than assigning one permanent political role to the Person.

## Monitoring UX
Users/operators should be able to understand whether information is being monitored and when it was last checked without implying global completeness.

Public language may include concise states such as `Current as of ...` or `Monitoring active`.

Operator mode exposes last check, next check, stale-after, source health, changes detected, failures, and monitoring worker.

## Failure / unresolved UX
Never silently render a missing field when the reason is operationally known. Operator mode should distinguish examples such as:

- not researched;
- research running;
- source unavailable;
- parser failure;
- identity unresolved;
- conflicting evidence;
- GIS unresolved;
- stale;
- canonical validation pending.

Public mode may simplify these to user-friendly neutral states without exposing internal implementation details.

## Media/portrait behavior
If no identity-verified usable portrait exists, use a neutral non-person placeholder or omit the portrait according to design. Never substitute an unrelated person or stock portrait.

MediaAsset provenance and rights/usage rules are defined in the companion media contract.

## Accessibility
Sticky navigation, tabs, drawers, evidence modals, map controls, tables, filters, and deep views must be keyboard-accessible and screen-reader meaningful. Sticky UI must not obscure anchored section headings. Respect reduced-motion preferences.

## Responsive behavior
Desktop may show the full sticky section bar. Mobile should prioritize the most-used sections and place additional sections under an accessible `More` control or horizontally scrollable tab treatment.

Do not solve mobile density by shrinking text/controls below usable sizes.

## Performance
Do not load every historical vote, transaction, evidence object, image, and relationship into the initial profile payload. Load compact summaries first and fetch deep datasets on demand with caching/pagination as appropriate.

Performance optimization must not change counts or truth semantics.

## URL/deep-link architecture
Important product states should have stable/deep-linkable routes or query state where practical, including profile section, Election, Seat/map view, evidence item, and filtered deep views. Preserve navigation state on back/forward actions.

## Operator dashboard relationship
Operator dashboard metrics, funnels, exceptions, and Trace Explorer should link directly into the same entities/claims/evidence that public projections use. Operators must not troubleshoot a parallel mock dataset.

## Public publication gate
`extracted_unreviewed` Harvester output must not appear as established public canonical truth merely because it exists in staging/intake. Public projections obey canonical validation/publication policy.

Development/operator surfaces may inspect unreviewed records when clearly labeled and access-controlled.

## UI acceptance tests
Representative automated/integration tests should verify:

1. Unsupported data does not render synthetic fallback facts.
2. Public counts match eligible MetricDefinitions.
3. Profile section navigation jumps correctly and becomes sticky after the hero/header.
4. Mobile navigation remains usable without endless horizontal overflow.
5. Deep views preserve filters/navigation state.
6. Evidence buttons resolve to the correct claim/evidence/source locator.
7. `UNKNOWN` is not rendered as zero.
8. extracted_unreviewed is not rendered as verified/canonical public truth.
9. Wrong/unverified portrait assets do not render as the Person.
10. Map/profile Seat identity and boundary version agree.
11. Election status preserves filing/qualification semantics.
12. Returning from a deep view restores the prior profile section/context.

## Continuous evolution
The public/operator UX will evolve, but changes must preserve the truth/evidence contracts. Usability improvements may hide complexity; they may not sever provenance, collapse legal semantics, fabricate missing information, or create detached UI truth.