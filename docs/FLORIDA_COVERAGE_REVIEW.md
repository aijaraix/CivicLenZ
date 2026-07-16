# Florida coverage and review plan

## The public-directory rule

CivicLenZ distinguishes between two things:

- **Published profile:** a canonical office-term record that has passed the profile schema and review process.
- **Source listing:** basic office information extracted from an identified primary government directory. It is visibly labeled as a source listing until the full profile review is complete.

This lets the Florida directory grow without presenting incomplete research as a finished scorecard.

## Six research bundles for every official

1. **Identity and office term** — name, office, district, jurisdiction, party where applicable, term, source URL.
2. **Official contact and public accounts** — office phone/email/form, office locations, official/campaign/public personal accounts, each with a source and last check.
3. **Background and public service** — official biography, career, education, appointments, committees, prior public roles.
4. **Public actions** — bills, votes, executive actions, meetings, agendas, budgets, and official statements.
5. **Elections and finance** — election history, campaign committee links, filings, contributions/expenditures where lawfully public, disclosures.
6. **Claims, promises, and issue evidence** — exact statement, source context, date, measurable criteria, supporting and conflicting evidence, and review history.

A missing field remains missing. It is never filled with an AI guess.

## Florida-first collection order

1. Statewide executive offices.
2. Florida Senate directory and member pages.
3. Florida House directory and member pages.
4. Florida congressional delegation.
5. County constitutional offices and county commissions.
6. Municipal councils and mayors.
7. School boards and special districts.
8. Votes, bills, meetings, campaign finance, public spending, and issue-specific evidence.

## Promotion checklist

Before a source listing becomes a published profile:

- Confirm the person, office, district, and current office-term.
- Retain the source URL, retrieval time, and source hash.
- Deduplicate against existing people and office terms.
- Verify contact and social links using the social-account policy.
- Add source references for every material fact.
- Keep scores, promise status, and sensitive matters empty until their evidence and methodology are ready.
- Run JSON-schema validation and the static-site build.

## What visitors see

The directory shows what is available now and the research status of each record. The profile page makes clear whether a section is verified, in progress, unavailable from a source, conflicting, or not applicable.
