# National Candidate and Election Source Registry — Bootstrap

Date: 2026-10-01
Status: research bootstrap; primary-authority discovery input for Waves C-E. This document does not publish candidate truth.

## National authoritative/bootstrap sources

| Scope | Source | Role | Machine-use value | Authority rule |
|---|---|---|---|---|
| Federal candidates | FEC Candidate Master / 2025-2026 bulk data | Candidate filing/discovery, FEC ID, office/state/district, party, incumbent/challenger/open-seat status, committee linkage | High; bulk deterministic | Filing/candidacy seed, NOT ballot qualification by itself |
| State election offices | FEC State Election Offices directory | National bootstrap to each state election authority for candidates on ballot/results | High; deterministic directory seed | Resolve through each state's current authority |
| State/local election offices | USAGov state/local election office directory | Cross-check/authority discovery | High discovery value | Directory, not candidate record authority |
| Election normalization | Voting Information Project Specification 6.0 | Reusable schema vocabulary for election administration, electoral districts, offices, candidates/contests/retention | High normalization value | Schema/reference, not canonical civic truth |
| 2026 election feed coverage | Voting Information Project | Planned all-50-states + DC general-election coverage | Useful cross-check/secondary feed | Preserve feed provenance; primary authority wins |

## Confirmed high-yield state patterns discovered

### North Carolina
Authority: North Carolina State Board of Elections.
2026 Candidate Lists page exposes a 2026 Candidate List Spreadsheet (CSV) plus candidate lists by contest and detailed lists. This is an ideal deterministic bulk-ingestion pattern. The authority warns that November lists may not yet be final for some local contests, so currentness/finality must be represented explicitly.

Source family: STATE_BULK_CANDIDATE_CSV_PLUS_CERTIFIED_LISTS.
Collector strategy: download -> hash/artifact -> parse -> Election/Seat matching -> CandidateCampaign observations -> qualification/finality state -> monitoring.

### Minnesota
Authority: Minnesota Secretary of State.
Candidate Filings supports federal, state, county, city/township, school district, hospital district and judicial offices and advertises downloadable text files.

Source family: STATE_SEARCH_PLUS_BULK_TEXT.
Collector strategy: prefer downloadable text/bulk path; use search UI for validation/exception only.

### Oklahoma
Authority: Oklahoma State Election Board.
2026 filing page exposes candidate list, candidate list book, withdrawals and contests of candidacy. State-level authority handles federal/state/legislative/judicial filings; county offices file with county election boards.

Source family: STATE_LIST_PLUS_WITHDRAWAL_AND_LOCAL_DELEGATION.
Collector strategy: ingest state candidate list + withdrawals/contests; generate county-election-board obligations for county scope.

### Indiana
Authority: Indiana Election Division.
Current election site exposes 2026 Primary Candidate List and 2026 General Election Candidate List.

Source family: STATE_PRIMARY_GENERAL_LIST.
Collector strategy: retrieve authoritative lists, preserve cycle/stage, monitor list revisions and final/certified state.

### Michigan
Authority: Michigan Department of State elections.
Current election site exposes 2026 August Primary Candidate Listing and 2026 November General Candidate Listing.

Source family: STATE_PRIMARY_GENERAL_DOCUMENT_LIST.
Collector strategy: document retrieval/hash/parser, stage-specific reconciliation.

## National Candidate Factory rules

1. FEC Candidate Master seeds federal CandidateCampaign discovery and stable FEC candidate identity. FEC says the master includes candidates filing Form 2, candidates with active committees, and some candidates referenced by supporting/opposing committees. Therefore presence does not prove ballot qualification.
2. State election authority establishes ballot/qualification/certification truth for applicable contests.
3. Local delegation must be modeled. A state may centralize many offices while county/city authorities own other filing/certification records.
4. Candidate status is temporal: filed -> qualified/certified/ballot-qualified -> withdrawn/disqualified -> won/lost, with source and as-of on each transition.
5. Prefer bulk CSV/text/API/downloads over person-by-person queries.
6. Search/browser tooling discovers source mechanics; repeatable acquisition should become deterministic.
7. Every candidate observation must resolve Election + Seat + Person before canonical disposition.
8. Retention contests are first-class and must not be forced into ordinary candidate-contest semantics.

## Source-family taxonomy to populate nationally
- STATE_BULK_CANDIDATE_CSV
- STATE_BULK_TEXT
- STATE_API_JSON
- STATE_PRIMARY_GENERAL_LIST
- STATE_CERTIFIED_BALLOT_PDF
- STATE_SEARCH_SERVER_RENDERED
- STATE_SEARCH_DYNAMIC
- STATE_VENDOR_PORTAL
- COUNTY_DELEGATED_FILING
- MUNICIPAL_DELEGATED_FILING
- JUDICIAL_RETENTION_LIST
- WITHDRAWAL_DISQUALIFICATION_FEED
- RESULTS_CERTIFICATION_FEED

## Registry fields required per state/territory
state
authority_name
authority_domain
candidate_filing_url
bulk_download_url
api_url
primary_candidate_source
general_candidate_source
withdrawal_disqualification_source
certified_ballot_source
results_source
local_delegation_model
judicial_retention_source
source_family
retrieval_mode
browser_required
parser_family
monitoring_signature
currentness/finality semantics
2026_active
last_verified_at
notes/blockers

## Next research pass
Populate all 50 states + DC using the FEC/USAGov authority seed, then cluster by source family and choose representative engineering fixtures. Do not build 51 bespoke parsers before clustering.


## Research pass 2 — additional authoritative source families

The following are source-family discoveries from official state/DC election systems. They are collector-design inputs; each endpoint/document must be freshly revalidated before canonical ingestion.

### Arizona
Arizona Secretary of State publishes a 2026 Candidate Nominations and Petitions Filed document.
Pattern: STATE_CANDIDATE_FILING_DOCUMENT.
Use: filing-stage observation; later reconcile against certified ballot/general-election source.

### California
California Secretary of State publishes certified candidate lists for both the June 2, 2026 primary and November 3, 2026 general election.
Pattern: STATE_CERTIFIED_BALLOT_PDF.
Important: general certified list also includes judicial retention candidates. Preserve ordinary candidate contests and retention contests as distinct semantics.

### Alaska
Alaska Public Offices Commission exposes an All Candidates system with year, candidate, office, election, status and initial filing.
Pattern: STATE_STRUCTURED_CANDIDATE_TABLE.
Caution: campaign-finance registration/status is not automatically ballot certification.

### Connecticut
Connecticut SEEC exposes a 2026 candidate-list CSV download endpoint.
Pattern: STATE_BULK_CANDIDATE_CSV.
Caution: distinguish campaign-finance candidate/committee state from ballot qualification.

### Mississippi
Mississippi Secretary of State publishes a 2026 Primary Election Candidate Qualifying List and explicitly states that the list reflects submitted qualifying papers while the relevant election bodies determine actual qualification.
Pattern: STATE_QUALIFYING_LIST_WITH_EXPLICIT_PENDING_GATE.
This is a strong fixture for temporal/status semantics: SUBMITTED != QUALIFIED.

### Missouri
Missouri Secretary of State exposes a candidate filing system with cumulative candidates and withdrawn/removed candidates and separately publishes certified general-election candidates, including nonpartisan judicial candidates.
Pattern: STATE_LIVE_FILING_PLUS_WITHDRAWAL_PLUS_CERTIFIED_PDF.
This is a strong fixture for lifecycle reconciliation and judicial retention/candidate semantics.

### Montana
Montana candidate filing system exposes 2026 candidate lists with export to Excel/PDF/CSV and structured fields including status, district, race, filing date, party preference and ballot order.
Pattern: STATE_EXPORTABLE_STRUCTURED_TABLE.
High-value deterministic candidate source.

### Nebraska
Nebraska Secretary of State provides a 2026 statewide candidate filing XLSX plus final statewide primary/general candidate lists. Candidate materials cover statewide, federal, legislative and multiple district/subdivision offices.
Pattern: STATE_BULK_XLSX_PLUS_FINAL_CERTIFIED_DOCUMENTS.
High-value fixture for broad nontraditional elected structures.

### Nevada
Nevada Secretary of State Candidate Filing List is a structured searchable table with Excel/CSV export and includes many state/county/city jurisdictions. It explicitly labels the live list unofficial and says a certified list follows after filing closes.
Pattern: STATE_REALTIME_EXPORTABLE_FILING_TABLE_TO_CERTIFIED_LIST.
Strong fixture for provisional -> certified lifecycle.

### New Hampshire
New Hampshire Secretary of State 2026 election details publishes cumulative filings, qualified declarations of intent, declarations of intent and withdrawals.
Pattern: STATE_CUMULATIVE_FILING_PLUS_QUALIFIED_PLUS_WITHDRAWAL.
Strong lifecycle source family.

### New Mexico
New Mexico Secretary of State has a 2026 candidate portal with contest/candidate lists and explicit Qualified status. Filing authority is split: statewide/congressional with Secretary of State, other offices through county clerks for applicable filing types.
Pattern: STATE_CANDIDATE_PORTAL_PLUS_COUNTY_DELEGATION.
Browser/access-control behavior must be respected; use deterministic endpoint only if permitted/stable.

### North Dakota
North Dakota Secretary of State/VIP portal exposes election-specific contest/candidate lists.
Pattern: STATE_ELECTION_CANDIDATE_PORTAL.
Requires endpoint/parser inspection and currentness semantics before productionization.

### South Carolina
South Carolina election authority exposes an election-specific Candidate Listing searchable across offices, with county voter-registration offices relevant for questions/local scope.
Pattern: STATE_ELECTION_CANDIDATE_SEARCH.
Investigate deterministic backing endpoint before browser dependence.

### District of Columbia
DC Board of Elections publishes primary candidate documents, general/write-in candidate documents, Advisory Neighborhood Commission candidate lists and special-election candidate lists.
Pattern: JURISDICTION_DOCUMENT_FAMILY_WITH_LOCAL_MICRODISTRICTS.
Important national lesson: Seat universe must include jurisdiction-specific elected structures such as ANC single-member districts where applicable.

## High-value representative engineering fixtures
Before creating state-specific collectors, use these fixtures to prove reusable families:
1. North Carolina — bulk CSV.
2. Connecticut — direct candidate CSV.
3. Montana — exportable structured table.
4. Nebraska — XLSX + final documents + broad subdivision offices.
5. Nevada — real-time filing table -> certified lifecycle.
6. Missouri — filing + withdrawals/removals + certification + judicial.
7. California — certified primary/general + retention.
8. New Hampshire — filing/qualified/withdrawal lifecycle.
9. Mississippi — submitted qualifying papers vs legal qualification gate.
10. DC — dense local microdistrict candidate document family.

These fixtures intentionally cover different source mechanics and legal/status semantics. Academy should generalize proven patterns before national fanout.
