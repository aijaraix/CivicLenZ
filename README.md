# CivicLenZ

**CivicLenZ** is an AI-assisted, evidence-first civic accountability platform for researching elected officials, understanding their records, tracking promises and policy positions, and helping residents take informed civic action.

- Product: `CivicLenZ`
- Website: `civiclenz.ai`
- Initial launch scope: Florida-first, designed to scale nationwide
- Repository: private working repository for product specifications, schemas, research rules, ingestion architecture, and application code

## Product principles

1. **Source first.** Every consequential claim, score, quotation, vote, promise, policy position, financial figure, and AI summary must point to supporting evidence.
2. **Nonpartisan structure.** The same data fields and scoring rules apply to every official regardless of party, ideology, office, or jurisdiction.
3. **Separate fact from analysis.** Raw facts, source excerpts, normalized records, AI analysis, and editorial review are stored as distinct layers.
4. **Show uncertainty.** Missing, conflicting, stale, or weak evidence must be labeled rather than silently converted into certainty.
5. **Preserve history.** Positions, promises, biographies, offices, scores, sources, and corrections are versioned over time.
6. **Human review for high-impact outputs.** Automated research can collect and organize evidence, but sensitive allegations, integrity findings, and public-facing scores require review and an audit trail.
7. **Address-based discovery.** Citizens should be able to enter an address, with ZIP-code fallback, to identify the officials and jurisdictions that represent them.

## Initial product surface

- Home and address-based representative lookup
- Browse and search elected officials
- Elected-official profile
- Bills, votes, actions, and policy records
- Campaign promise tracker
- Campaign finance and donor intelligence
- Public money and spending
- Meetings, agendas, and public notices
- News and activity monitoring
- Petitions and civic action tools
- Citizen alerts and subscriptions
- Professional, organization, government, and administration dashboards

## Repository map

```text
docs/
  PRODUCT_REQUIREMENTS.md
  OFFICIAL_PROFILE_DATA_DICTIONARY.md
  OFFICIAL_PROFILE_UI_SPEC.md
  DATA_ARCHITECTURE.md
  RESEARCH_SOURCE_POLICY.md
  SCORING_METHODOLOGY.md
  IMPLEMENTATION_ROADMAP.md
schemas/
  elected-official-profile.schema.json
```

## Current status

The repository foundation is being established. The first implementation target is the elected-official profile and its supporting evidence model, using the existing CivicLenZ interface as the visual reference.

## Near-term build order

1. Lock the master official-profile data dictionary.
2. Implement the source/evidence and verification model.
3. Build the canonical official-profile schema and database tables.
4. Seed a Florida-first dataset.
5. Implement official search, address lookup, and profile pages.
6. Add promise, vote, finance, news, integrity, and policy-position pipelines.
7. Add transparent scoring, revision history, corrections, and human review.

## Naming

Use **CivicLenZ** for the product and repository name. Use **civiclenz.ai** for the public website.