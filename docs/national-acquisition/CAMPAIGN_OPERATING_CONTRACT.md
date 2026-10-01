# National Acquisition Campaign Operating Contract

## Objective
Acquire and continuously reconcile the national civic graph:
GOVERNMENT -> JURISDICTION -> OFFICE -> SEAT -> ELECTION -> CANDIDACY -> PERSON -> OFFICE SERVICE/OCCUPANCY -> EVIDENCE -> DOSSIER -> MONITORING.

## Non-negotiables
- Seat is the permanent anchor.
- Seat discovery immediately branches into occupancy AND election/candidate discovery.
- Candidates do not wait for incumbent completion.
- One authoritative roster/feed should yield many relationships whenever possible.
- Monitor source objects and signatures, not millions of Person pages.
- No synthetic civic facts, synthetic candidates, fabricated success, or unverified currentness.
- Retrieval success is not identity success; identity success is not occupancy verification.
- Historical producer output remains extracted_unreviewed until canonical validation.
- HERMES owns canonical work identity, leases, priority, dedupe, retries, currentness, validation coordination, evidence lineage, monitoring obligations and coverage.
- Cloudflare and external research tools execute bounded work; they do not become canonical authority.
- Breadth/current-cycle coverage precedes optional deep dossier enrichment during the 2026 election push.
- Political priority is based on currentness/deadline/coverage, never party or ideology.

## Current national denominator
Use the 2026 Census Annual Government Organization Public Use File as the deterministic government seed. Do not infer elected Seat count by multiplying governments by a historic average. For every government derive:
- governing structure;
- elected versus appointed bodies;
- number and type of elected/retention Seats;
- districts/at-large structure;
- election authority;
- current election cycle;
- source and as-of evidence.

Persist live metrics:
known_elected_seats
estimated_unresolved_elected_seats
verified_current_occupancies
vacant_seats
candidate_bearing_seats
active_candidates
historical_services
authoritative_source_objects
monitored_source_objects

## Official Factory
Government inventory -> authoritative domain -> high-yield roster -> Office -> Seat -> name observation -> identity resolution -> currentness validation -> Person -> OfficeService.

Optimize verified Seats/source, officials/parser, relationships/request and reusable parser-family coverage.

## Candidate Factory
Federal: FEC filing/candidate data + authoritative ballot/election sources.
State: Secretary of State/election authority filings and certified lists.
Local: county/city election authority, SOE/BOE/Clerk and legally authoritative equivalents.

Track filed, qualified, ballot-qualified, primary, general, runoff, special, withdrawn, disqualified, won and lost. Every CandidateCampaign links Election + Seat + Person.

## Monitoring
Persist normalized source signatures and source-family metadata.
UNCHANGED -> cheap monitoring record; no expensive downstream reprocessing.
CHANGED -> precise delta obligations with lineage.

## Research accelerators
Exa, Tavily, Parallel Search, Firecrawl, TinyFish, Legal Data Hunter and Acumen/Talarion may accelerate source discovery, exception handling and collector repair. They are not mandatory production dependencies.

## Cost
Prefer existing VPS + Cloudflare + Supabase + R2. Do not create paid services, recurring infrastructure or accounts without Owner authorization.
