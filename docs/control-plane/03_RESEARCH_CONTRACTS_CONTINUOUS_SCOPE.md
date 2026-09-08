# Step 3 — ResearchContracts, Recursive Dossiers, and Continuous Scope

## Purpose
ResearchContracts define what CivicLenZ is responsible for knowing, how deeply it should search, what sources and verification rules apply, and when a bounded scope is current enough to enter monitoring.

A profile is never globally complete. ResearchContracts produce evidence-backed currentness statements for bounded scopes.

## Three contract layers

### A. Core contract
Applies broadly to officials/candidates:
- jurisdiction / Seat / Election relationship
- Person identity
- Occupancy or CandidateCampaign status
- official/campaign website
- portrait
- contact/social where appropriate
- evidence/provenance
- monitoring

### B. Office-class contract
Adds role-specific research. Examples:
- executive: executive orders/actions, appointments, vetoes, bill signings, budget actions
- legislator: bills, sponsorship/co-sponsorship, votes, committees, attendance/actions
- candidate: filing/qualification, platform, campaign promises, finance, endorsements, debates, results

### C. Dynamic research scopes
New evidence may create new obligations. Examples:
- prior state/jurisdiction discovered → historical-jurisdiction research
- company discovered → business-interest/relationship work
- campaign committee discovered → finance reconciliation
- material promise discovered → promise monitoring
- prior office discovered → historical office/vote/election research

## Major research domains
- Identity & Biography
- Office & Election History
- Campaign Platform
- Promises / Commitments
- Government Activity
- Campaign Finance
- Financial / Business Disclosure
- Public Record / Ethics
- Relationship Graph
- Media / Speech / Social
- Mandate / Agenda relationship evidence
- Monitoring / Civic Events

The model should support hundreds of normalized field families plus unbounded related entities/events/datasets; do not create a thousand-column Person table.

## ResearchContract field/scope metadata
Where applicable each scope specifies:
- field/scope key
- category
- required_for_baseline
- office applicability
- preferred/allowed source tiers
- verification requirement
- enumerable vs open-ended
- defined search scope
- dataset reconciliation rule
- current_as_of / cutoff
- freshness interval
- monitoring interval
- capability
- priority
- cost/resource class
- publication policy

## Enumerable datasets
Having some records is not completion. For finance, elections, votes, executive orders, disclosures, and other finite universes:
1. identify authority/universe
2. enumerate expected units/periods
3. collect all available units
4. process amendments/replacements
5. reconcile counts/totals
6. record missing units and unresolved gaps
7. store cutoff/current_as_of
8. schedule next monitoring check

Use language like `RECONCILED_THROUGH <cutoff>` rather than `COMPLETE`.

## Open-ended domains
Biography, news, public statements, promises, relationships, and social streams are not exhaustible in the global sense. They may reach `COVERAGE_RECONCILED_FOR_DEFINED_SCOPE_AS_OF <cutoff>` and remain monitored.

## Campaign and promise capture
Campaign websites and campaign materials are primary research targets. Archive relevant pages, extract material commitments with context/qualifiers/date/source, and preserve later modifications or withdrawals.

Promise-status conclusions must be evidence-driven. Ambiguous rhetoric should not be converted into definitive 'broken promise' conclusions. Preserve the original commitment, subsequent statements/actions, and the evidence relationship.

## Mandate / agenda relationship model
CivicLenZ may neutrally link an official's documented statements/actions to defined agenda or mandate items. Do not create political scores or rankings. Store evidence relationships such as SUPPORTS, OPPOSES, PARTIALLY_SUPPORTS, MIXED, NO_PUBLIC_POSITION, or INSUFFICIENT_EVIDENCE, with the underlying sources visible.

## Historical / cross-jurisdiction research
When reliable evidence shows prior residence, career, officeholding, business activity, or candidacy in another jurisdiction and that history is civically relevant, HERMES may expand source discovery into that jurisdiction. Identity resolution must be strong before attributing records.

## Privacy/relevance boundary
Collect lawfully public information that is materially relevant to public office, campaign activity, public conduct, conflicts, governance, accountability, or voter evaluation. Do not treat public-office candidacy as authorization for indiscriminate private-life surveillance.

## Recursive work generation
New facts can generate new jobs. HERMES should recursively expand the research graph while enforcing dedupe, evidence, identity, relevance, source authority, and resource policies.
