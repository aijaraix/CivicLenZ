# CivicLenZ Implementation Roadmap

## Guiding approach

Build the evidence and canonical identity foundation before scaling automated research. A fast crawler without a strong source, versioning, and deduplication model will create duplicate officials, unsupported claims, stale profiles, and unreliable scores.

The launch is Florida-first, but all schemas, office types, and jurisdiction relationships should remain nationwide-ready.

## Milestone 0 — Repository foundation

### Deliverables

- Product requirements.
- Master official-profile data dictionary.
- Official-profile UI specification.
- Data architecture.
- Research/source policy.
- Scoring methodology framework.
- Canonical JSON schemas.
- Contribution, review, and environment documentation.

### Exit criteria

- The official-profile scope is documented.
- Fact, evidence, AI analysis, and score layers are clearly separated.
- Canonical person/office/term design is approved.

## Milestone 1 — Monorepo and local development

### Proposed structure

```text
apps/web
apps/api
apps/admin
workers/ingestion
workers/monitoring
workers/scoring
packages/domain
packages/db
packages/evidence
packages/ui
packages/config
schemas
docs
```

### Deliverables

- TypeScript workspace.
- Shared linting, formatting, testing, and type checking.
- Environment variable validation.
- Local database setup.
- Migration framework.
- Basic CI for install, lint, typecheck, test, and build.
- Seed scripts.

### Exit criteria

- A clean checkout can run locally from documented commands.
- Pull requests cannot merge with failed validation.

## Milestone 2 — Canonical civic domain model

### Deliverables

- People, aliases, parties, offices, office terms, office holders, jurisdictions, districts, and district boundaries.
- Contact points, locations, websites, and social accounts.
- Sources, snapshots, documents, claims, evidence links, record versions, and audit events.
- Duplicate-detection and merge workflow.
- Admin pages for canonical review.

### Exit criteria

- One person can hold multiple offices across time.
- One office can have multiple terms and office holders.
- Search no longer produces duplicate profiles from title variants.
- Every consequential field can link to evidence.

## Milestone 3 — Florida representative lookup

### Deliverables

- Florida state, county, municipal, school-board, special-district, and federal office seeds as available.
- Address normalization and geocoding.
- Versioned district-boundary ingestion.
- Point-in-polygon jurisdiction resolution.
- ZIP fallback with accuracy warning.
- Representative lookup API and UI.

### Exit criteria

- A Florida address returns the correct applicable offices and current office holders with confidence and boundary date.
- Ambiguous or failed matches are visible rather than guessed.

## Milestone 4 — Official search and core profile

### Deliverables

- Search by official, office, jurisdiction, district, party, and location.
- Browse by state and government level.
- Advanced filters and canonical result counts.
- Hero, contact, social, civic scores shell, biography, education, career, political history, and freshness metadata.
- Mobile navigation and responsive profile cards.
- Empty, stale, conflicting, and not-applicable states.

### Exit criteria

- A canonical Florida official profile renders from structured data.
- Public pages do not expose placeholder database keys or duplicate records.
- All displayed facts expose source information.

## Milestone 5 — Bills, votes, actions, and policy records

### Deliverables

- Bills, sponsorships, bill actions, roll calls, vote casts, executive actions, policies, budgets, appointments, contracts, and meetings.
- Legislative and executive record importers.
- Topic classification.
- Profile activity feed.
- Attendance and participation calculations.

### Exit criteria

- Users can trace an official profile statement to the underlying vote, bill, order, budget, or meeting record.
- Office-type-specific metrics are calculated reproducibly.

## Milestone 6 — Promise and statement intelligence

### Deliverables

- Campaign website and archive discovery.
- Platform/issues page and PDF ingestion.
- Debate, interview, speech, advertisement, questionnaire, voter-guide, newsletter, and social-post support.
- Candidate promise extraction queue.
- Promise review, measurable criteria, status events, and evidence.
- Statement and exact-quote records.
- Position change and contradiction detection.

### Exit criteria

- Promise labels are reviewed and sourced.
- Promise status changes retain a complete evidence and audit history.
- Empty promise sections distinguish no research from no promises found.

## Milestone 7 — Campaign finance and elections

### Deliverables

- Election contests, candidates, results, opponents, margins, recounts, and challenges.
- Campaign committees, reports, contributions, donors, expenditures, vendors, outside spending, and violations.
- Donor, employer, industry, geography, and spending-category rollups.
- Campaign and finance profile module.

### Exit criteria

- Summary amounts reconcile to source reports or show a visible reconciliation warning.
- Top donors and vendor relationships link to underlying transactions.

## Milestone 8 — Issue-position trackers

### Initial trackers

- MAHA / health policy pillars.
- Government efficiency.
- Education and school choice.
- Border and immigration.
- Energy and climate.
- Trade and tariffs.
- Fraud and integrity.

### Deliverables

- Configurable tracker definition.
- Pillars, evidence inclusion rules, scoring direction, status vocabulary, and missing-data treatment.
- Evidence-weighted evaluations.
- Expandable quotes, votes, bills, policies, budgets, actions, and official responses.
- Position history and contradictions.

### Exit criteria

- Alignment scores are distinct from civic-performance scores.
- Every tracker can explain its result from source evidence.

## Milestone 9 — Ethics, disclosures, property, and integrity

### Deliverables

- Financial disclosures, assets, liabilities, income, gifts, travel, businesses, property interests, recusals, and conflicts.
- Ethics complaints, investigations, findings, legal matters, audits, penalties, and official responses.
- Human-review gates and legal/editorial audit trail.
- Fraud and integrity monitor.

### Exit criteria

- Allegations, investigations, findings, dismissals, settlements, charges, and convictions are never conflated.
- Sensitive public labels cannot publish without required review.

## Milestone 10 — Transparent scoring

### Deliverables

- Versioned methodology definitions.
- Score input snapshots.
- Transparency, responsiveness, promise keeping, attendance, effectiveness, integrity, and overall civic score prototypes.
- Confidence, completeness, history, and dispute UI.
- Backtesting across parties, ideologies, office types, and jurisdictions.

### Exit criteria

- Independent reviewers can reproduce sample scores.
- Missing data does not silently become a negative score.
- Overall civic score excludes ideological alignment.

## Milestone 11 — News, meetings, monitoring, and alerts

### Deliverables

- News-source ingestion and duplicate-story grouping.
- Official press, social, meeting, agenda, minutes, public-notice, filing, vote, and action monitoring.
- Activity feed.
- Alert topics and delivery preferences.
- Source freshness and job-health dashboards.

### Exit criteria

- Users can see when a record was last checked and changed.
- Monitoring failures are visible to administrators.
- Alerts link to the changed record and supporting evidence.

## Milestone 12 — Civic action

### Deliverables

- Petitions.
- Constituent messaging.
- Public-comment opportunities.
- Meeting reminders.
- Office-aware contact routing.
- Eligibility, moderation, abuse prevention, consent, and privacy controls.

### Exit criteria

- Users understand who receives an action and what data is shared.
- High-impact actions require clear confirmation.

## Milestone 13 — Professional and administrative products

### Deliverables

- Citizen dashboard.
- Professional research workspace.
- Organization monitoring dashboard.
- Government/public-office profile and response tools.
- Reviewer queues.
- Corrections and disputes.
- Ingestion and system administration.
- Data export and API access controls.

## Cross-cutting workstreams

### Quality

- Unit, integration, schema, ingestion, and end-to-end tests.
- Golden source documents and expected extraction fixtures.
- Deduplication and entity-resolution benchmarks.
- Score reproduction tests.

### Security and privacy

- Role-based access.
- Audit logging.
- Secrets management.
- User-address and constituent-message protection.
- Rate limiting and abuse prevention.
- Dependency and code scanning.

### Accessibility

- Keyboard navigation.
- Screen-reader semantics.
- Contrast and non-color status indicators.
- Mobile tap targets.
- Plain-language and evidence-detail modes.

### Operations

- Scheduled jobs.
- Retry and dead-letter handling.
- Source health.
- Data freshness dashboards.
- Backups and restoration tests.
- Cost and resource monitoring.

## Immediate next engineering sprint

1. Create the monorepo workspace.
2. Add shared domain types and JSON-schema validation.
3. Add the database schema for people, offices, terms, jurisdictions, sources, claims, evidence, and audit events.
4. Implement canonical identity and duplicate-review workflows.
5. Seed a small set of Florida officials.
6. Render the search results and core profile from database-backed structured data.
7. Add CI and test fixtures before introducing autonomous ingestion.