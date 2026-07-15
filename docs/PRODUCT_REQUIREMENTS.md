# CivicLenZ Product Requirements

## 1. Product mission

CivicLenZ gives citizens a clear, sourced, continuously updated view of the public officials who represent them. It combines official records, public statements, campaign materials, financial disclosures, voting activity, legislation, media coverage, public meetings, and AI-assisted analysis into one auditable profile.

The initial rollout is Florida-first, but the data model and application architecture must support municipal, county, state, federal, judicial, school-board, special-district, and other elected offices nationwide.

## 2. Primary users

### Citizens

- Find representatives by residential address or ZIP-code fallback.
- Understand who an official is, what authority the office has, and how to contact the office.
- Review promises, votes, bills, policy positions, finances, controversies, and civic scores.
- Subscribe to alerts and take civic action.

### Researchers, journalists, nonprofits, and advocacy organizations

- Search across officials, offices, issues, actions, donors, bills, jurisdictions, and source evidence.
- Compare records using consistent fields and transparent methodology.
- Export sourced records and monitor changes.

### Campaigns, public offices, and government organizations

- Claim or verify profile data.
- Submit corrections and source evidence.
- Monitor constituent issues and public activity.

### CivicLenZ administrators and reviewers

- Manage ingestion jobs, sources, duplicate records, conflicts, corrections, reviews, publication, scoring, and audit history.

## 3. Core user journeys

### Representative lookup

1. User enters an address.
2. System geocodes the address and resolves all applicable jurisdiction boundaries.
3. System returns the elected offices and officials representing that location.
4. When precise address resolution is unavailable, the system offers ZIP-code-based results with a visible accuracy warning.

### Official discovery

- Search by name, office, jurisdiction, district, city, county, state, party, issue, committee, donor, bill, or keyword.
- Browse by state and office level.
- Filter by current/former status, party, office type, district, election year, issue, score, and data completeness.
- Detect and merge duplicate official records rather than displaying multiple profiles for the same person and office term.

### Official profile

The profile provides:

- Identity, current office, jurisdiction, party, term, contact, and social channels.
- Biography, education, military service, career, political history, family/public relationships, and affiliations.
- Civic scores with methodology and evidence.
- Campaign promises and promise-keeping history.
- Votes, bills, executive actions, policies, budgets, appointments, and official decisions.
- Campaign finance, donors, spending, committees, disclosures, property, businesses, and conflicts.
- Issue-position trackers with quotes, actions, bills, and sources.
- News, public statements, meetings, events, and real-time activity.
- Ethics, legal, integrity, controversy, correction, and response records.
- Petitions, messaging, alerts, and other civic action tools.

### Evidence review

Every public claim must expose:

- Source title and publisher.
- Source URL and archived URL where available.
- Publication/event date and retrieval date.
- Relevant excerpt or record locator.
- Source type, evidence strength, verification status, and reviewer.
- Whether the statement is a fact, quotation, derived value, AI interpretation, allegation, response, or editorial determination.

## 4. Required application pages

### Public experience

1. Landing page.
2. Address and ZIP representative lookup.
3. Browse/search officials.
4. Official profile.
5. Office and jurisdiction page.
6. Bill/law detail.
7. Vote detail.
8. Promise detail and promise tracker.
9. Campaign finance and donor detail.
10. Public spending and contract detail.
11. Meeting, agenda, and public-notice detail.
12. Issue/topic page.
13. News and activity feed.
14. Petition detail and signature flow.
15. Civic action center.
16. Alert and subscription center.
17. Methodology, corrections, and source policy pages.

### Authenticated dashboards

1. Citizen dashboard.
2. Professional researcher dashboard.
3. Organization dashboard.
4. Public-office/government dashboard.
5. Editorial/reviewer dashboard.
6. System administration dashboard.

## 5. Official-profile interface requirements

The existing CivicLenZ interface is the visual baseline. The profile must include:

- Dark hero area with portrait, name, office, party, office level, location, term dates, last-tracked date, profile completeness, and live promise meter.
- Civic-action bar with petition and AI-assisted message actions.
- Active petitions.
- Contact information and verified social channels.
- Civic score cards for transparency, responsiveness, promise keeping, and overall civic performance.
- Supporting metrics such as attendance and legislative effectiveness.
- Biography with structured birth, education, and career details.
- Expandable policy-position and issue-tracker cards.
- Campaign finance, promise tracking, news monitoring, and live activity sections.
- Footer metadata showing last update and data freshness.

Responsive mobile behavior must replace the desktop navigation with a usable menu and preserve readable cards, labels, evidence, controls, and source links.

## 6. Scoring and AI requirements

- Scores must be reproducible from documented inputs.
- AI may classify, summarize, compare, and identify contradictions, but it may not invent missing facts or silently resolve disputed evidence.
- Each AI analysis must link to the evidence used and state its confidence.
- Score changes must retain the prior value, reason, evidence, timestamp, model/version, and reviewer.
- High-impact integrity or misconduct labels require human review before public publication.
- Party or ideological alignment must not be presented as equivalent to civic performance.

## 7. Data freshness

Each major section must expose:

- Last checked.
- Last changed.
- Source freshness.
- Whether monitoring is active.
- Whether the result is complete, partial, stale, conflicting, or unknown.

## 8. Corrections and right of response

- Users, offices, and subjects may submit corrections with evidence.
- CivicLenZ must preserve the original record, correction request, review decision, response, and publication history.
- Disputed claims must display their status.
- Official responses should appear alongside the relevant claim or finding.

## 9. Accessibility and usability

- WCAG-aware color contrast, keyboard navigation, screen-reader labels, focus states, and text alternatives.
- Plain-language summaries paired with detailed evidence.
- Avoid relying on color alone for status.
- Mobile-first card layout for public profiles.

## 10. Security and governance

- Role-based access for administrators, researchers, reviewers, organizations, offices, and citizens.
- Immutable audit records for source changes, scoring changes, merges, corrections, and publication decisions.
- Secrets and private research notes must never be exposed to the client.
- Personally sensitive information must be limited to lawful, relevant, public-interest records.

## 11. Initial delivery phases

### Phase 1

Landing page, representative lookup, official search, canonical official profile, evidence model, source policy, and Florida seed data.

### Phase 2

Bills, votes, statements, promises, campaign finance, issue trackers, and transparent scoring.

### Phase 3

Public money, meetings, agendas, news monitoring, activity alerts, and civic action.

### Phase 4

Professional, organization, government, reviewer, and administration dashboards.

### Phase 5

Scaled nationwide ingestion, continuous monitoring, AI summaries, comparisons, and advanced research tools.