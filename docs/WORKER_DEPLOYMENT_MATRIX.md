# CivicLenZ worker deployment matrix

This slice runs workers on **GitHub Actions only**. Cloudflare Workers and Railway are documented for later phases; missing credentials must not block this PR.

Hash/cron change detection belongs on Cloudflare later. PDF/OCR and long-running document pipelines belong on Railway later. The public site continues to publish only reviewed `data/officials` records.

| # | Worker | Repository entry | Runs now | Cloudflare later | Railway later |
| --- | --- | --- | --- | --- | --- |
| 1 | Seat Registry Agent | `workers/seats/build_florida_seat_registry.py` | GitHub Actions: generate/check expected seats, coverage gaps, recovered occupancy, control-plane ledger | Cron + content-hash compare of seat files vs last successful run | Not required |
| 2 | Quality Control Agent | `workers/quality/quality_control.py` | GitHub Actions: fail if control-plane counts ≠ persisted file counts; schema-validate seats | Cron after each hash-detected change | Not required |
| 3 | Identity & Portrait Agent | `workers/portraits/fetch_official_portraits.py` | GitHub Actions: official-source portrait job for canonical officials | Scheduled hash/ETag checks of official portrait URLs | Not required for HTML portraits |
| 4 | Miami-Dade county baseline | `workers/ingestion/collect_miami_dade.py` | GitHub Actions `workflow_dispatch` when source fetch is permitted; occupancy mapping is unit-tested without live PDF | Source-hash of the Supervisor of Elections PDF | PDF text/OCR fallback if the directory loses its text layer |
| 5 | Florida House baseline | `workers/ingestion/collect_florida_house.py` | Existing GitHub Actions collector | Hash/cron of the House directory | Not required |
| 6 | Florida Senate baseline | `workers/ingestion/collect_florida_senate.py` | Existing GitHub Actions collector | Hash/cron of the Senate directory | Not required |
| 7 | Florida statewide executive baseline | `workers/ingestion/collect_florida_statewide_executive.py` | Existing GitHub Actions collector | Hash/cron of cabinet pages | Not required |
| 8 | US House baseline | `workers/ingestion/collect_us_house.py` | Existing GitHub Actions collector | Hash/cron of clerk/house.gov | Not required |
| 9 | US Senate baseline | `workers/ingestion/collect_us_senate.py` | Existing GitHub Actions collector | Hash/cron of senate.gov | Not required |
| 10 | Evidence Archive, OCR & Transcript Agent | `data/sources/enrichment-agent-manifest.json` `evidence-archive-ocr-agent` | **Not enabled live.** Manifest remains `enabled: false`. | Store snapshot hashes and archive metadata | PDF download, OCR, transcripts, and large binary storage |

## Later platforms (do not block this slice)

### Cloudflare
- Bindings: KV or R2 for source snapshot hashes, cron triggers for occupancy-check classes, Workers for fetch+hash without committing binaries.
- Setup later: Cloudflare account, `wrangler` login, R2 bucket, Worker cron. Not required to merge this PR.

### Railway
- Use for CPU-heavy PDF/OCR and Playwright-backed collectors that exceed Actions minutes.
- Setup later: Railway project, volume or object-store credentials, worker start command. Not required to merge this PR.

### Supabase
- Product-foundation SQL already lives at `supabase/migrations/202607160001_product_foundation.sql`.
- Setup later: project URL, service role in GitHub secrets, migrate from JSON seat files into tables. JSON files in `data/seats` are the source of truth for this slice.

## Operating rules
- Automated workers never write `data/officials`.
- Recovered research-queue occupancy is `RECOVERED`, not `VERIFIED`.
- HTTP 200 is not verification.
- Google Images / CivicsLenZz is not in the write path.
- Do not start one process per official; portrait jobs iterate canonical officials in one worker.
