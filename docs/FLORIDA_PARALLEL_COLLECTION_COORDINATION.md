# Florida Parallel Collection Coordination

## Objective

Complete every Florida elected seat without two agents collecting or rewriting the same scope at the same time.

The permanent coordination record is `data/operations/florida-work-allocation.json`. Every collector, coding agent, or research agent must read that file before starting work.

## Scope boundaries

### Existing parallel state/federal stream

Reserved for the task already working on:

- Florida's federal delegation.
- Statewide executive offices.
- Florida House and Senate profiles.
- Existing state/federal portrait, contact, social, biography, committee, and public-profile work.

### Northwest Florida local stream

Claimed by this workstream for these counties:

Bay, Calhoun, Escambia, Franklin, Gadsden, Gulf, Holmes, Jackson, Jefferson, Leon, Liberty, Okaloosa, Santa Rosa, Wakulla, Walton, and Washington.

This stream owns local elected-seat discovery and enrichment for:

- County commissioners.
- Sheriffs.
- Clerks of circuit court and comptrollers.
- Supervisors of elections.
- Tax collectors.
- Property appraisers.
- School boards and elected school superintendents.
- Municipal mayors, councils, and commissions.
- Elected special-district boards.
- Locally elected or retention-election judicial seats where applicable.

## Write isolation

The Northwest Florida stream writes only beneath:

- `data/sources/florida-regions/northwest/`
- `data/staging/florida/local/northwest/`
- `data/research-staging/florida/local/northwest/`
- `data/operations/florida/northwest/`

It must not directly edit state/federal research-staging directories or canonical public profiles. Reviewed promotion is a separate shared step.

## Claim rules

1. Read the allocation registry before starting.
2. Refuse to start when another active claim intersects the same government level, region, office family, and data phase.
3. Narrow the scope geographically or by office family when a conflict exists.
4. Use the branch prefix declared by the claim.
5. Store research output in the claim's namespaced output roots.
6. Update `lastProgressAt` whenever a material batch finishes.
7. A claim becomes stale after its configured heartbeat window, but it is not automatically reassigned without checking active branches, pull requests, and workflow runs.

## Data order for each seat

1. Official source and permanent seat identity.
2. Current officeholder and term.
3. Official or licensed portrait with provenance.
4. Official contacts, offices, websites, newsletters, and social accounts.
5. Biography, education, military service, career, and prior offices.
6. Election history, opponents, results, and campaign organizations.
7. Campaign finance, donors, expenditures, vendors, loans, and outside spending.
8. Financial disclosures, assets, liabilities, business interests, and public conflicts.
9. Exact campaign promises and attributable statements with preserved evidence.
10. Votes, bills, budgets, appointments, contracts, rules, meetings, and government actions.
11. Ethics, audit, court, enforcement, and official-response records with procedural-status safeguards.
12. Issue trackers and civic scores only after evidence, methodology, completeness, confidence, and review gates pass.

## Campaign-money terminology

CivicLenZ should not describe campaign contributors as an official's "investors" unless a source uses that term in a legally accurate context. Store the underlying categories separately:

- Individual contributors.
- Political committees and parties.
- PACs and independent-expenditure groups.
- Candidate loans.
- Vendors and payees.
- In-kind contributions.
- Bundlers where legally disclosed.
- Outside support and opposition.
- Employers and occupations where reported by the filing authority.

The public interface can explain who financially supported a campaign without implying ownership or a financial return.

## Review and publication gates

- A search result is not evidence; retain the original attributable source.
- Portraits require identity review, source page, rights status, credit, retrieval date, and hash.
- Social profiles require an official, campaign, or clearly attributable link.
- Promises require exact language, date, context, source preservation, and authority analysis.
- Allegations, complaints, investigations, findings, dismissals, and convictions remain distinct statuses.
- Missing data is shown as pending or unavailable, never as zero or clean.
- No tracker or score is published from incomplete or unreviewed inputs.

## Merge strategy

Each geographic stream produces review-only records. A shared promotion worker later:

1. Resolves person, seat, and term identities.
2. Deduplicates evidence and accounts.
3. Validates schemas and source provenance.
4. Routes sensitive claims to human review.
5. Promotes approved facts into canonical records.
6. Leaves rejected or uncertain candidates in the review history.

This allows multiple agents to move quickly without corrupting one another's work.
