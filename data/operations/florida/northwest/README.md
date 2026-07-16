# Northwest Florida Local Operations

This directory belongs exclusively to the `fl-northwest-local-complete` workstream declared in `data/operations/florida-work-allocation.json`.

## Claimed counties

Bay, Calhoun, Escambia, Franklin, Gadsden, Gulf, Holmes, Jackson, Jefferson, Leon, Liberty, Okaloosa, Santa Rosa, Wakulla, Walton, and Washington.

## Processing stages

1. `source-discovery` — locate and verify official directories and filing systems.
2. `seat-registry` — enumerate every elected seat and its legal/jurisdiction structure.
3. `baseline-officeholders` — attach current occupants, terms, vacancies, and succession events.
4. `identity-contact` — collect reviewed portrait, contact, office, website, newsletter, and social candidates.
5. `background-election` — biography, education, military, career, prior offices, candidates, opponents, and results.
6. `money-disclosure` — contributions, committees, expenditures, vendors, outside spending, disclosures, assets, liabilities, and business interests.
7. `promises-statements-actions` — exact promises, quotes, votes, bills, budgets, contracts, appointments, meetings, and decisions with preserved evidence.
8. `integrity-relationships` — complaints, investigations, findings, audits, court records, official responses, endorsements, donors, lobbyists, vendors, and potential conflicts.
9. `trackers-scores` — methodology-driven analysis only after evidence and review gates pass.
10. `monitoring` — daily or event-driven refresh and occupant-change detection.

## Output isolation

Do not write to state/federal staging directories or public canonical profiles from this workstream. All records remain namespaced under Northwest Florida until the shared promotion pipeline approves them.

## Immediate target

Complete official-source discovery for all 16 counties, then create reusable collector families grouped by site platform and office type rather than writing one scraper per person.
