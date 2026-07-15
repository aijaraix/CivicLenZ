# Official Profile UI Specification

This specification translates the current CivicLenZ elected-official profile into reusable application components. The current Josh Shapiro profile screenshots are the visual baseline, but all components must be driven by structured data and work consistently for every official.

## 1. Page shell

### Desktop header

- CivicLenZ logo.
- Home.
- Find Officials.
- Petitions.
- Map.
- Blog.
- Take Action.
- About.
- Login/account control.

### Mobile header

- CivicLenZ logo.
- Login/account control.
- Menu button.
- Full navigation moves into an accessible drawer.
- Sticky navigation must not cover profile content.

### Global page behavior

- Maximum readable content width on desktop.
- Single-column card stack on mobile.
- Consistent card spacing, border radius, elevation, headings, icons, and evidence controls.
- Skeleton loading, empty states, error states, stale-data notices, and offline/retry behavior.
- Every expandable panel must be keyboard accessible and expose its open/closed state to assistive technology.

## 2. Official hero

The dark hero section contains:

- Back to officials.
- Last tracked timestamp.
- Official portrait.
- Full display name.
- Current title.
- Party badge.
- office-level badge.
- Location/jurisdiction badge.
- Term start and end dates.
- Profile data completeness.
- Live promise meter.
- Monitoring/live indicator.

### Required behavior

- Portrait has source credit and fallback initials.
- Party is data, not styling logic; unaffiliated and nonpartisan offices must be supported.
- Term dates show unknown/open-ended states correctly.
- Data completeness links to a breakdown of missing and verified sections.
- Promise meter links to the promise tracker and methodology.
- Former officials receive a visible historical status.

## 3. Civic action bar

- Section heading: Take Civic Action.
- Plain-language purpose statement.
- Primary actions such as petition creation/signing and AI-assisted constituent messaging.
- Actions must be jurisdiction-aware and office-aware.
- High-risk or legally sensitive actions require clear user confirmation and applicable eligibility notices.

## 4. Active petitions

Card requirements:

- Petition title.
- Target official/office.
- Petition purpose.
- Creator or sponsoring organization.
- Signature total and target.
- Start/end dates.
- Geographic eligibility where applicable.
- Verification/moderation status.
- Evidence and supporting documents.
- View, sign, share, and report actions.
- Empty state when no active petitions exist.

## 5. Contact information

- Public phone numbers by type.
- Public emails by type.
- Mailing and office addresses.
- Official website.
- Contact form.
- Constituent-services and appointment links.
- Public-records request link.
- Last verified date.

Do not display placeholder database keys such as `twitterUrl` or `facebookUrl`. Missing values should be omitted or labeled unavailable.

## 6. Social media

Display verified, active channels in a responsive grid:

- Platform icon.
- Platform name.
- Handle.
- Official, campaign, personal, or office account classification.
- External link.
- Verification and last-checked state.

Unknown or malformed channels should remain in the admin review queue rather than appearing publicly.

## 7. Civic scores

Primary cards:

- Transparency.
- Responsiveness.
- Promise Keeping.
- Overall Civic score.

Supporting metrics may include:

- Attendance rate.
- Vote participation.
- Legislative effectiveness.
- Bill passage.
- Bipartisan collaboration.
- Constituent response time.
- Public meeting frequency.
- Disclosure timeliness.

### Score interaction

The “How are these scores calculated?” disclosure must show:

- Methodology version.
- Measurement period.
- Inputs and weights.
- Missing-data treatment.
- Evidence links.
- Confidence and completeness.
- Last recalculation.
- Score history.
- Correction/dispute pathway.

Color must never be the only status indicator.

## 8. Biography and background

### Narrative biography

- Short summary by default.
- Optional full biography.
- Source and last-reviewed information.
- Distinguish sourced fact from AI-generated narrative.

### Structured details

- Birthdate, birthplace, and derived age.
- Education history.
- Military/public service.
- Career history.
- Political career timeline.
- Publicly relevant family/background details.
- Affiliations and boards.

Use timeline or grouped-list components rather than a single unstructured paragraph when structured records are available.

## 9. Position trackers

Position trackers are configurable issue modules. The existing examples include:

- MAHA Position Tracker.
- DOGE / Government Efficiency.
- Education & School Choice.
- Border & Immigration.
- Energy Independence.
- Trade & Tariffs.
- Fraud & Integrity Monitor.

Each tracker contains:

- Issue title and description.
- Alignment or position score.
- Position/status badge.
- Measurement period.
- AI analysis summary.
- Confidence and evidence completeness.
- Expandable quotes and statements.
- Expandable votes, bills, policies, budgets, actions, or decisions.
- Contradictions and position changes.
- Source links.
- Official response.
- Last evaluated date.

### MAHA tracker

The MAHA module may group evidence into pillars such as:

- Pharmaceuticals.
- Agriculture.
- Food additives and food quality.
- Child health.

Pill status values should include supports, partially supports, neutral/mixed, opposes, unclear, and unknown. The overall score may not be computed from absent evidence without clearly documenting the missing-data rule.

## 10. Campaign and finance

Summary metrics:

- Total raised.
- Total spent.
- Cash on hand.
- Debt.
- Outside support/opposition.

Tabs or sections:

- Upcoming election.
- Election history.
- Top donors.
- Industries/employers.
- Spending categories.
- Committees and related entities.
- Reports, amendments, violations, and penalties.

Empty states must distinguish “no data ingested,” “not applicable,” and “no activity.”

## 11. Campaign promise tracker

Summary cards:

- Kept.
- In progress.
- Broken.
- Additional statuses available in details: partially kept, compromised, blocked, reversed, unclear, and not applicable.

Each promise detail includes:

- Exact promise text.
- Normalized summary.
- Date and original context.
- Source and archived source.
- Target date.
- Measurable criteria.
- Current status and progress.
- Supporting and contradicting evidence.
- Blocking authority or circumstances.
- Official response.
- Evaluation history.

The empty state should say whether research has not yet been completed rather than implying that the official made no promises.

## 12. News and live activity

### Real-time news monitoring

- Current monitoring status.
- Number/type of sources monitored.
- Recent verified mentions.
- Topic and sentiment labels where used.
- Duplicate-story grouping.
- Corrections and retractions.
- Last scan time.

### Real-time activity monitor

- Votes.
- Bills and official actions.
- Social posts.
- News mentions.
- Meetings and appearances.
- Finance filings.
- Score or promise changes.

The activity visualization should be secondary to a readable chronological feed.

## 13. Alerts and subscriptions

- User selects official, office, jurisdiction, or issue.
- User selects alert types and delivery frequency.
- Paid plans, where used, must clearly state price, billing period, renewal, included alert types, and cancellation terms.
- Users must be able to manage and unsubscribe from alerts.

## 14. Footer metadata

- Last updated.
- Last full research pass.
- Last automated sync.
- Methodology version.
- Correction link.
- Source policy.
- Terms, privacy, and accessibility.

## 15. Official search and browse

The current interface supports state browse, text search, advanced filters, and official cards.

### Required fixes and behavior

- A single person/office term must not appear twice because records use different title strings such as “Governor” and “Governor of Pennsylvania.”
- Canonical identity and office-term IDs drive deduplication.
- Search ranking favors exact official name, current office, jurisdiction, and verified records.
- Cards display portrait, name, canonical title, party, office level, jurisdiction, and contact/profile actions.
- Advanced filters show active filter count and allow one-click clearing.
- The results count reflects canonical results after deduplication.

## 16. Status and empty-state vocabulary

Avoid ambiguous empty states. Use one of:

- Not yet researched.
- Research in progress.
- No matching public record found.
- No activity during selected period.
- Not applicable to this office.
- Data unavailable from source.
- Conflicting evidence under review.
- Data is stale and scheduled for refresh.

## 17. Responsive acceptance criteria

- No horizontal page overflow at common mobile widths.
- Navigation, labels, scores, and evidence remain legible without browser zoom.
- Two-column desktop groups collapse in a logical reading order.
- Tap targets meet minimum accessible size.
- Sticky elements do not obscure content or controls.
- Tables become cards or horizontally contained regions with clear affordance.
- External source links remain distinguishable and usable.