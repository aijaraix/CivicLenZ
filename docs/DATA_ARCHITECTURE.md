# CivicLenZ Data Architecture

## 1. Architecture goals

The CivicLenZ data layer must support:

- Canonical elected-official identities across multiple offices and terms.
- Address-to-jurisdiction and jurisdiction-to-office resolution.
- Historical, versioned records rather than destructive overwrites.
- Multiple sources for the same claim.
- Conflicting evidence and official responses.
- Reproducible scoring.
- Automated ingestion with human review.
- Florida-first launch and nationwide scaling.
- Public pages, authenticated dashboards, alerts, exports, and research tools.

## 2. Core design pattern

CivicLenZ should separate five layers:

1. **Raw source layer**: downloaded pages, documents, feeds, API responses, transcripts, and metadata.
2. **Extracted record layer**: machine-extracted entities, claims, quotations, dates, amounts, votes, and relationships.
3. **Canonical fact layer**: normalized, deduplicated, reviewed records linked to canonical people, offices, terms, jurisdictions, and topics.
4. **Analysis layer**: AI summaries, classifications, contradictions, promise evaluations, issue positions, and score calculations.
5. **Presentation layer**: public profile cards, dashboards, search indexes, alerts, and exports.

Never store an AI summary as though it were the underlying fact.

## 3. Canonical entities

### People and offices

- `people`
- `person_aliases`
- `official_profiles`
- `offices`
- `office_terms`
- `office_holders`
- `parties`
- `caucuses`
- `staff_members`
- `official_staff_roles`

### Geography and representation

- `jurisdictions`
- `districts`
- `district_boundaries`
- `district_zip_codes`
- `district_precincts`
- `addresses`
- `geocoding_results`
- `address_jurisdiction_matches`
- `representation_assignments`

### Contact and digital identity

- `contact_points`
- `office_locations`
- `websites`
- `social_accounts`
- `newsletters`
- `communication_channels`

### Biography and career

- `biographies`
- `education_records`
- `credentials`
- `military_service_records`
- `employment_records`
- `business_entities`
- `business_roles`
- `nonprofit_roles`
- `political_roles`
- `family_public_relationships`

### Elections and campaign finance

- `elections`
- `election_contests`
- `candidacies`
- `election_results`
- `campaign_committees`
- `finance_reports`
- `contributions`
- `donors`
- `donor_organizations`
- `expenditures`
- `vendors`
- `independent_expenditures`
- `finance_violations`

### Promises, statements, and positions

- `promises`
- `promise_status_events`
- `statements`
- `quotes`
- `topics`
- `topic_taxonomy`
- `position_records`
- `position_change_events`
- `contradiction_records`
- `issue_trackers`
- `issue_tracker_pillars`
- `issue_tracker_evaluations`

### Government actions and performance

- `bills`
- `bill_actions`
- `bill_sponsorships`
- `votes`
- `vote_casts`
- `executive_actions`
- `policies`
- `budgets`
- `appropriations`
- `appointments`
- `contracts`
- `meetings`
- `agendas`
- `minutes`
- `public_notices`
- `performance_metrics`

### Disclosures, ethics, and integrity

- `financial_disclosures`
- `disclosure_assets`
- `disclosure_liabilities`
- `property_interests`
- `business_interests`
- `gifts_and_travel`
- `recusals`
- `ethics_matters`
- `legal_matters`
- `investigations`
- `findings`
- `penalties`
- `official_responses`
- `integrity_reviews`

### News, media, and civic action

- `news_items`
- `media_appearances`
- `press_releases`
- `polls`
- `petitions`
- `petition_signatures`
- `constituent_actions`
- `alerts`
- `subscriptions`
- `activity_events`

### Evidence, review, and governance

- `sources`
- `source_snapshots`
- `documents`
- `document_pages`
- `claims`
- `claim_evidence`
- `extractions`
- `verification_events`
- `review_tasks`
- `review_decisions`
- `correction_requests`
- `disputes`
- `record_versions`
- `audit_events`
- `ingestion_jobs`
- `ingestion_job_runs`
- `parser_versions`
- `model_runs`
- `scoring_methodologies`
- `score_results`
- `score_input_records`

## 4. Canonical person, office, and term model

A person is not an office, and an office is not a term.

- `people` stores the human identity.
- `offices` stores the continuing public position, such as Governor of Pennsylvania.
- `office_terms` stores a specific term window and election/appointment context.
- `office_holders` joins a person to a term.
- `official_profiles` stores presentation and profile-level settings for the person/term context.

This prevents duplicate search results caused by title variants and allows one person to have multiple historical offices.

### Suggested uniqueness rules

- `people.canonical_key` unique after identity review.
- `offices(jurisdiction_id, normalized_title, district_id)` unique.
- `office_terms(office_id, term_start, term_end)` unique.
- `office_holders(person_id, office_term_id)` unique.
- External identifiers unique within their issuing system.

## 5. Evidence model

### Source

A source is the publication, agency, database, webpage, filing system, video, audio program, archive, or document collection.

### Source snapshot

A source snapshot preserves what CivicLenZ actually reviewed at a point in time:

- Retrieved content or file reference.
- Retrieval time.
- HTTP and archive metadata.
- Content hash.
- Parser version.
- Rights/usage note.

### Claim

A claim is a discrete assertion such as:

- The official voted yes on a bill.
- The official promised to veto a proposal.
- A campaign report listed a contribution.
- An agency found an ethics violation.

Claims contain subject, predicate, object/value, time range, jurisdiction, claim type, and status.

### Claim evidence

The join between claims and evidence records whether a source supports, contradicts, contextualizes, or provides an official response.

## 6. Versioning

All significant records must be append-versioned.

A version record should include:

- Entity type and entity ID.
- Prior version ID.
- Changed fields.
- Old and new values.
- Change reason.
- Source/evidence.
- Automated process or human actor.
- Review decision.
- Created timestamp.

Public pages show the current published version, while administrators can inspect full history.

## 7. Ingestion pipeline

### Step 1: discovery

- Seed known official and public-record sources.
- Discover linked documents, feeds, campaign pages, archives, and related identifiers.

### Step 2: retrieval

- Fetch source content.
- Respect rate limits, robots rules, legal terms, and source-specific constraints.
- Store immutable snapshot metadata and content hash.

### Step 3: extraction

- Parse structured APIs, HTML, PDFs, spreadsheets, feeds, transcripts, and filings.
- Extract candidate people, offices, dates, amounts, quotations, actions, relationships, and source locators.

### Step 4: normalization

- Normalize names, dates, currencies, addresses, districts, office titles, party names, topic tags, and external identifiers.

### Step 5: entity resolution

- Match candidate records to canonical people, offices, terms, committees, donors, bills, and jurisdictions.
- Route ambiguous or conflicting matches to review.

### Step 6: claim creation

- Convert extracted facts into discrete claims linked to evidence.

### Step 7: validation

- Apply schema, source-tier, date, range, duplicate, and contradiction checks.

### Step 8: analysis

- Classify topics, summarize records, identify potential promises, compare statements and actions, and calculate draft metrics.

### Step 9: human review

Required for sensitive allegations, integrity labels, uncertain identity matches, disputed facts, and public score changes.

### Step 10: publication

- Publish canonical records and derived views.
- Update search indexes, activity feeds, freshness metadata, and alerts.

## 8. Suggested application stack boundaries

The repository may contain multiple deployable units while preserving one shared domain model:

```text
apps/
  web/                 Public and authenticated web application
  api/                 Public/private API
  admin/               Reviewer and administration interface
workers/
  ingestion/           Retrieval and parsing
  research/            Discovery and source expansion
  monitoring/          Scheduled change detection
  scoring/             Reproducible metric calculations
packages/
  domain/              Shared types and validation
  db/                  Schema, migrations, queries
  evidence/            Evidence and claim utilities
  ui/                  Shared components
  config/              Linting, formatting, TypeScript, testing
schemas/                Public JSON schemas
docs/                   Product, data, research, and methodology specs
```

The first repository commits focus on specifications and schemas. Application framework selection can follow without changing the core model.

## 9. Address-based representative lookup

The lookup service should:

1. Normalize and validate the address.
2. Geocode to latitude/longitude.
3. Intersect the point with versioned jurisdiction/district boundaries.
4. Resolve current office terms and office holders.
5. Return confidence and boundary effective date.
6. Use ZIP fallback only when precise matching fails, with a visible warning that a ZIP may cross districts.

Never infer representation from city or ZIP alone when a precise boundary match is available.

## 10. Search architecture

Search documents should be generated from canonical data, not raw ingested duplicates.

Indexes should support:

- Names and aliases.
- Office titles and title synonyms.
- Jurisdictions and geography.
- Bills, votes, promises, statements, donors, organizations, topics, and news.
- Current/former status.
- Date ranges and score ranges.
- Source and verification filters.

## 11. Data quality controls

- Required canonical IDs.
- Enumerated statuses.
- Date and amount validation.
- Source required for consequential public fields.
- Duplicate detection.
- Conflict detection.
- Staleness policies by source type.
- Malformed placeholder detection.
- Cross-source validation.
- Review queues and escalation.

## 12. Privacy and public-interest limits

- Collect only lawful, relevant public-interest information.
- Do not infer sensitive personal characteristics.
- Avoid publishing precise private residential locations.
- Generalize property location where public-interest relevance does not require a full address.
- Protect constituent messages, user addresses, petition eligibility data, and subscription details.
- Restrict raw research notes and reviewer identities according to role.

## 13. Audit requirements

Every mutation to a public record, score, source link, correction, identity merge, or publication state must produce an audit event containing actor, action, entity, before/after references, reason, evidence, and timestamp.