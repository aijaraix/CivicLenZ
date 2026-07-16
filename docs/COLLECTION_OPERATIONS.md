# CivicLenZ collection operations

## What is running today

CivicLenZ separates collection from publication. The scheduled collectors preserve
official-source **staging** records, create a research queue, and save review-only
candidate data to a bot review branch. They do not automatically change a public
official profile.

| Worker | Cadence | Scope | Output |
| --- | --- | --- | --- |
| Federal baseline | Daily, 07:17 UTC | U.S. House, U.S. Senate, President and Vice President | Protected staging and a review PR |
| Florida baseline | Daily, 09:27 UTC | Florida House, Senate, statewide elected executive offices | Protected staging, seat research queue, identity/contact candidates, and a review PR |
| Collection heartbeat | Every 15 minutes at :07, :22, :37, and :52 after this change is merged | Checks the latest state/federal review snapshot plus the current Florida allocation and local source maps; does not contact source sites | GitHub Actions summary and a 30-day JSON artifact |

GitHub schedules only workflows that live on the default branch. The heartbeat in
this change therefore starts after its PR is reviewed and merged. It can always be
run manually from **Actions → CivicLenZ collection heartbeat**. The 15-minute job
is a read-only coordination check; it is not a statewide crawl.

## Verified Florida snapshot

The latest inspected queue was generated at `2026-07-16T05:19:56Z`.

- **192** seat/profile research tasks
- **23** required research sections per task
- **30** Florida federal delegation tasks: 28 U.S. House seats and 2 U.S. Senate seats
- **161** Florida state-government source listings: 118 occupied House seats, 40 Senate seats, and 3 statewide elected executive offices
- **1** canonical Governor profile task
- **192** review-only identity/contact candidate records were stored in the latest enrichment batch

The apparent total of 192 is therefore correct, but it must not be described as
192 complete profiles. At the snapshot time, 191 tasks were still
`baseline_collected`; only the canonical Governor task had all 23 canonical
sections. Portrait, social, contact, biography, vote, finance, claim, and score
candidates still need source evidence and the appropriate review gate before they
can be public.

Two Florida House seats were empty in the baseline snapshot (Districts 78 and
113). An open seat is a valid finding, not a missing person record.

## Florida split and collision prevention

The permanent coordination record is data/operations/florida-work-allocation.json.
Every collector and coding task must read it before collecting. The accompanying
guard, scripts/validate_florida_work_allocation.py, rejects two active
workstreams when their government level, region/county, office family, data
phase, or output root overlap.

The active reservations are deliberately separate:

| Workstream | Owns | Cannot write |
| --- | --- | --- |
| fl-state-federal-existing-parallel | Florida federal delegation, statewide executive offices, Florida House/Senate profiles and their state/federal enrichment | Local county, school-district, municipal, special-district, and judicial records |
| fl-northwest-local-complete | Local discovery and review-only research for Bay, Calhoun, Escambia, Franklin, Gadsden, Gulf, Holmes, Jackson, Jefferson, Leon, Liberty, Okaloosa, Santa Rosa, Wakulla, Walton, and Washington counties | State/federal research directories and canonical public profiles |

The Northwest task writes only to its namespaced Northwest source, staging,
research-staging, and operations directories. It does not share a write path
with the state/federal stream. Promotion into a public profile is a separate,
reviewed operation.

### Verified local coverage gap

The Northwest batch currently contains 16 review-only source-discovery files:
13 successful, 1 partial, and 2 failed. It resolved 66 of 208 source-category
slots and left 142 unresolved. It has produced **zero** local officeholder
staging records and **zero** local research candidates. Those source maps are
useful progress, but they are not evidence that every local official was found.

The county registry still says zero completed counties even though 16 discovery
records exist; the heartbeat reports that mismatch. The remaining 51 counties
are intentionally unassigned across Northeast, North Central, Central, Tampa
Bay/Nature Coast, Southwest, Treasure Coast/Palm Beach, Broward/Miami-Dade, and
the Keys. Do not start another local stream until it receives its own narrower
claim and isolated output root.

The general JSON validator now treats a source-discovery map as its own
non-public artifact rather than misclassifying it as an elected-official staging
record. This keeps the current Northwest work isolated while restoring valid
build checks.

## Heartbeat versus collection cadence

The 15-minute heartbeat is intentionally low-cost and read-only. It verifies
claims, freshness, and coverage; it does not request every Florida source every
15 minutes. Use source-specific schedules instead:

- Current-officeholder rosters: daily, or following an authoritative election,
  appointment, resignation, vacancy, or certification update.
- API/RSS/newsletter/event feeds: 15–60 minutes only when terms and rate limits
  permit it.
- Meetings, votes, finance, disclosures, and public-money sources: according to
  each authority's publication calendar.
- On-demand profile refresh: one bounded, cached, rate-limited source bundle,
  never a statewide crawl.

## Health and heartbeat contract

`workers/operations/collection_health.py` produces a JSON snapshot and a readable
Actions summary. It checks:

1. Expected count ranges for each enabled Florida baseline source.
2. Whether the research queue matches or exceeds the Florida baseline count.
3. Queue freshness, with attention at 36 hours and a critical error at 72 hours.
4. The number and status of review-only identity/contact candidate files.
5. The number of canonical profile tasks, without treating candidates as published data.
6. Active local Florida claims, assigned and unassigned counties, source-discovery coverage, and the presence of local officeholder staging records.
7. The allocation guard before the report is generated, so overlapping active work cannot pass quietly.

Use it locally from a checked-out repository:

```bash
python workers/operations/collection_health.py --markdown
python workers/operations/collection_health.py --output artifacts/collection-health.json
python workers/operations/collection_health.py --fail-on-error
```

A heartbeat that is merely in **attention** reports the condition but does not
fail the workflow. This is the expected current statewide state: state/federal
baseline work is present, while Florida local coverage remains partial. A true
data-quality error, such as a baseline count below its declared minimum, a missing
county registry, or a stale queue beyond 72 hours, fails the heartbeat.

## Bounded worker policy

The baseline runner now supports a bounded `--workers` option. The Florida and
federal workflows use **3 concurrent baseline workers** because those jobs read
different official sources and write to distinct directories. The Florida
identity/contact collector already uses **8 workers** for independent official
source pages.

This is intentionally not unlimited concurrency. Each source family needs:

- a per-domain concurrency cap and delay;
- retries with backoff and a circuit breaker;
- source snapshots, retrieval timestamps, and content hashes;
- idempotent job keys so a retry cannot duplicate an official;
- clear distinction between an open seat, a failed fetch, and an unreviewed fact;
- human review for portraits, social accounts, biographies, promises, integrity
  material, and any score or derived conclusion.

## Path to statewide and national scale

A target of roughly 500,000 public-office records is not a GitHub Actions-only
workload. Actions is a good scheduled orchestrator and verification layer, but a
high-volume worker system should use a persistent queue and durable database.

The recommended production architecture is:

```
Official source registry
        ↓
Scheduler / source freshness planner
        ↓
Durable job queue (one source, seat, or research bundle per job)
        ↓
Rate-limited cloud worker pool
        ↓
Evidence store + Postgres review database
        ↓
Human review / promotion gate
        ↓
Public CivicLenZ profiles and search index
```

### Florida coverage waves

1. Keep the current state and federal delegation roster fresh.
2. Finish the isolated Northwest Florida source-discovery stream before creating
   any local official records from it. Its 16 county source maps are not yet local
   officeholder records.
3. Assign the remaining 51 counties only through new, non-overlapping regional
   claims in the Florida work-allocation registry.
4. Add municipalities, school boards, special districts, and elected judicial
   offices only after each source has an ownership and update plan.
5. Add action, meeting, election, and finance sources by jurisdiction and
   calendar, not by uncontrolled web crawling.
6. Promote only evidence-backed fields to canonical profiles.

### Infrastructure before high-volume collection

Before enabling a queue of that size, provision:

- a managed Postgres database for jobs, source evidence, entity matching, review
  decisions, and audit logs;
- a managed queue and cloud workers (for example, a task queue plus Cloud Run or
  another durable worker service);
- object storage for source snapshots, downloaded documents, and permitted images;
- per-source rate limits, alerting, and a dead-letter queue;
- a reviewer console with provenance, confidence, correction handling, and
  publish/unpublish controls;
- separate secrets for each lawful API or source integration.

Vercel Pro is appropriate for the public site and lightweight scheduled endpoints.
It should not be the only engine for a large, long-running crawler fleet. The
collector must remain independently observable even when the site is deployed or
being redesigned.

## Publication rule

A row in staging, a discovered social URL, or a portrait candidate is not a
published fact. CivicLenZ publishes only attributable, source-backed material that
passes its stated review rules. This keeps the product useful without presenting
unverified information as a civic record.
