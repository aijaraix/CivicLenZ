# Worker Catalog and ResearchContracts

## Principle
Do not create one agent per politician. Build reusable worker capabilities and office-class ResearchContracts.

## Capability states
- DECLARED
- NOT_IMPLEMENTED
- READY
- ACTIVE
- DEGRADED
- DISABLED
- FAILED

`ACTIVE` requires real recent successful worker runs.

## Worker families

### Foundation
seat_discovery, jurisdiction_discovery, current_officeholder, occupancy, identity_resolution, portrait, official_contact, official_social

### Elections and candidates
election_calendar, election_discovery, candidate_discovery, candidate_status, filing_status, ballot_qualification, election_results

### Background
biography, education, career, military_history, political_history, prior_offices, election_history

### Finance
campaign_committees, campaign_finance, contributions, expenditures, PAC_relationships, finance_reconciliation

### Disclosure
financial_disclosures, assets, liabilities, income_sources, business_interests, gifts, outside_income

### Government activity
legislation, sponsored_bills, votes, committee_assignments, executive_actions, executive_orders, bill_signings, vetoes, appointments, budget_actions

### Accountability
campaign_promises, public_commitments, public_statements, promise_status, ethics, investigations, court_public_records, conflicts_of_interest

### Relationships
political_relationships, donor_relationships, organization_relationships, staff_relationships, appointment_relationships, publicly_relevant_family_business_relationships

### Media and monitoring
official_press, news, interviews, debates, material_social_activity, change_detection, source_health, freshness_monitor

### System quality
evidence_validation, entity_resolution, contradiction_resolution, dataset_reconciliation, completeness_audit, publication_gate

## ResearchContracts
Each office class defines what complete means for that office. Examples:
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

Each contract should specify:
- required baseline fields
- full-profile fields
- source priority
- verification requirements
- freshness intervals
- finite-dataset reconciliation rules
- publication policy
- monitoring cadence
- escalation rules

## Completeness dimensions
Track separately:
- Field Coverage
- Source Coverage
- Temporal Coverage
- Evidence Coverage
- Verification Coverage
- Freshness
- Dataset Reconciliation
- Monitoring Coverage
- Unresolved Contradictions

Do not collapse these into a misleading single percentage.

## Missing-work behavior
For every field/dataset:
- missing -> create work
- complete and fresh -> skip
- stale -> refresh
- conflicting -> investigate
- evidence missing -> validate
- capability NOT_IMPLEMENTED -> remain explicitly incomplete

## Finite dataset reconciliation
For enumerable universes (campaign filings, votes, executive orders, election results, disclosures), completeness should be demonstrated by enumerating expected units, collecting them, reconciling totals/gaps, and recording the cutoff/completion state.