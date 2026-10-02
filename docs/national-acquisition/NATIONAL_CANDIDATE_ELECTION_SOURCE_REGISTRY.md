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
