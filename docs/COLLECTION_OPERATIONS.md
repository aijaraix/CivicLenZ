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
| Collection heartbeat | Hourly, at :15, after this change is merged | Reads the latest Florida review snapshot; does not contact source sites | GitHub Actions summary and a 30-day JSON artifact |

GitHub schedules only workflows that live on the default branch. The heartbeat in
this change therefore starts after its PR is reviewed and merged. It can always be
run manually from **Actions → CivicLenZ collection heartbeat**.

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

## Health and heartbeat contract

`workers/operations/collection_health.py` produces a JSON snapshot and a readable
Actions summary. It checks:

1. Expected count ranges for each enabled Florida baseline source.
2. Whether the research queue matches or exceeds the Florida baseline count.
3. Queue freshness, with attention at 36 hours and a critical error at 72 hours.
4. The number and status of review-only identity/contact candidate files.
5. The number of canonical profile tasks, without treating candidates as published data.

Use it locally from a checked-out repository:

```bash
python workers/operations/collection_health.py --markdown
python workers/operations/collection_health.py --output artifacts/collection-health.json
python workers/operations/collection_health.py --fail-on-error
```

A heartbeat that is merely in **attention** reports the condition but does not
fail the workflow. A true data-quality error, such as a baseline count below its
declared minimum or a stale queue beyond 72 hours, fails the heartbeat.

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
2. Add all 67 counties using source-specific registries for county commission,
   constitutional officers, and election authority.
3. Add municipalities, school boards, special districts, and elected judicial
   offices only after each source has an ownership and update plan.
4. Add action, meeting, election, and finance sources by jurisdiction and
   calendar, not by uncontrolled web crawling.
5. Promote only evidence-backed fields to canonical profiles.

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
