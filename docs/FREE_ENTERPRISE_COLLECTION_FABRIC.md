# CivicLenZ free autonomous collection fabric

## Goal

Compress the Florida collection timeline from many months of mostly manual work into an automated, horizontally scalable first pass measured in weeks.

"Free" means no new recurring cloud bill. Compute runs on machines CivicLenZ already controls, while free service allowances provide scheduling, job state, and evidence storage. Electricity, an existing computer or VPS, and source-specific legal or access constraints still exist.

## Architecture

```text
Official source registry
        |
        v
Cloudflare Worker cron (free control plane)
        |
        v
Cloudflare D1 job/lease database
        |
        +-----------------------------+
        |                             |
        v                             v
Self-hosted static workers      Self-hosted browser/PDF/LLM workers
(GitHub runner, desktop, VPS)   (Playwright, PyMuPDF, Ollama/Hermes)
        |                             |
        +--------------+--------------+
                       |
                       v
Cloudflare R2 evidence objects + hashes
                       |
                       v
Fact candidates -> review gates -> canonical records
                       |
                       v
Vercel public site and search exports
```

GitHub remains the code, schema, review, and deployment control system. It is not the main high-volume database and not the only execution engine.

## Why this stays within free allowances

- GitHub does not charge Actions minutes for self-hosted runners. Existing machines provide the compute.
- Cloudflare Workers Free can schedule and serve the small control API.
- Cloudflare D1 Free stores job state and normalized metadata; evidence bodies do not belong in D1.
- Cloudflare R2 Free stores the first 10 GB-month of compressed source snapshots and approved images with free egress.
- The existing Vercel deployment continues serving the public site.
- Cloudflare Queues is deliberately optional. Its free allowance is too small for the primary Florida task stream, so the D1 job table acts as the durable queue.

## Work-unit model

Every autonomous task is small, repeatable, and uniquely keyed:

```text
jurisdiction | permanent seat | data phase | source | effective date
```

Examples:

- `escambia-county|commission-district-1|current-officeholder|county-directory|2026-07-16`
- `fl-house-001|portrait|official-profile|2026-07-16`
- `miami-beach-mayor|campaign-finance|city-clerk-filings|2025-cycle`
- `fl-senate-027|promise-extraction|campaign-site|2024-cycle`

A unique `dedupe_key` prevents duplicate work. Jobs are leased, not permanently assigned. Expired leases return to the queue automatically.

## Worker pools

### 1. Bulk seed workers

Purpose: establish the statewide denominator quickly.

- Import CSV, JSON, NDJSON, SQLite, and other existing datasets.
- Collect official state directories, election results, candidate lists, municipality inventories, school districts, special districts, and court structures.
- Create permanent seat records even when the seat is vacant.

### 2. Static HTTP workers

Purpose: handle the majority of official government pages cheaply.

- Requests + BeautifulSoup/lxml.
- Per-domain rate limits.
- ETag, Last-Modified, and content-hash change detection.
- HTML and JSON source snapshots.

### 3. Browser workers

Purpose: handle JavaScript-heavy or protected sites.

- Playwright in an isolated container.
- One browser worker per constrained domain group.
- Screenshots only when necessary for evidence or review.

### 4. Document workers

Purpose: process filings, agendas, minutes, disclosures, budgets, audits, and reports.

- PDF text extraction before OCR.
- OCR only when text extraction fails.
- Page locators, content hashes, and preserved source files.

### 5. Local extraction agents

Purpose: convert unstructured evidence into typed fact candidates.

- Ollama/Hermes or another local model.
- Schema-constrained JSON output.
- Exact quotation and page/timestamp locators for promises and statements.
- Models recommend; they do not publish sensitive conclusions.

### 6. Entity-resolution workers

Purpose: keep people, seats, terms, campaigns, committees, and sources distinct.

- Deterministic IDs first.
- Fuzzy matching only when deterministic matching fails.
- Ambiguous matches enter human review.

### 7. Promotion workers

Purpose: publish low-risk verified facts quickly while protecting sensitive claims.

- Tier A: deterministic official facts can auto-promote after validation.
- Tier B: portrait, biography, staff, and social candidates require stronger identity checks and sampled review.
- Tier C: promises, finance interpretation, conflicts, ethics, legal matters, trackers, and scores require human review.

## Florida sharding plan

Run eight non-overlapping regional streams plus the existing state/federal stream:

1. Northwest Florida / Panhandle — already claimed.
2. Northeast Florida.
3. North Central Florida.
4. Central Florida / Orlando.
5. Tampa Bay / Nature Coast.
6. Southwest Florida.
7. Treasure Coast / Palm Beach.
8. Broward / Miami-Dade / Keys.

Within each region, split by office family:

- County constitutional offices.
- County commissions.
- School boards and elected superintendents.
- Municipal executives and councils.
- Special districts.
- Judicial seats.
- Election and campaign-finance systems.
- Disclosures, actions, promises, and integrity evidence.

No worker writes directly to another stream's staging area or to canonical public records.

## Coverage targets

The system should report separate percentages instead of one misleading completeness score:

- Seat denominator established.
- Current occupant verified.
- Portrait verified and stored.
- Contact channels verified.
- Social accounts verified.
- Biography/background covered.
- Election history covered.
- Campaign-finance covered.
- Financial-disclosure covered.
- Promise sources searched and extracted.
- Government actions covered.
- Ethics/legal sources searched.
- Reviewed versus candidate facts.
- Source freshness and evidence preservation.

A field is always one of: `verified`, `candidate`, `pending`, `unavailable`, `not_applicable`, `disputed`, or `review_required`.

## Accelerated Florida timeline

With one coordinator and at least four always-on self-hosted worker slots:

- Statewide seat denominator and source inventory: about 1–3 weeks.
- Baseline current occupant, portrait, contact, and social pass: about 3–6 weeks.
- First finance, disclosure, promise, action, and ethics pass: about 8–16 weeks.

These are operational targets, not guarantees. Some jurisdictions block automation, publish only scanned records, or do not publish a requested field. The objective is 100% field accounting, not fabricated values.

## Free infrastructure limits and safeguards

- Keep evidence compressed and deduplicated by SHA-256 to remain inside the R2 free storage allowance.
- Store metadata and job state in D1; store documents and images in R2.
- Batch D1 writes and index all queue filters to stay under daily row limits.
- Use a self-hosted runner label such as `civiclenz-worker` so high-volume jobs do not consume private-repository hosted minutes.
- Keep GitHub-hosted Actions for short validation and deployment only.
- Enforce per-domain concurrency, retry backoff, circuit breakers, and a dead-letter state.
- Never execute a command supplied by a remote job. Jobs reference a collector key that maps to a local allowlist.

## Legacy dataset recovery

Past planning referenced these possible files, but they are not currently present in the GitHub repositories available to the connected GitHub app:

- `50_state_office_generator.js`
- `bulk_seed_national.js`
- `county_seed_loader.js`
- `city_seed_loader.js`
- `school_district_loader.js`

Any recovered CSV, JSON, NDJSON, SQLite, ZIP, or related dataset should be placed under `data/imports/legacy/`. The repository inventory tool will count probable records, detect official-like columns, compute hashes, and produce a review report before import.

## Deployment sequence

1. Merge the free-fabric code and inventory tooling.
2. Create a free Cloudflare account or use an existing one.
3. Create one D1 database and one R2 bucket.
4. Deploy the control Worker with a shared secret.
5. Register one existing computer or VPS as a self-hosted GitHub runner.
6. Start four worker processes or containers with different capabilities.
7. Import the existing Florida queue and any recovered legacy dataset.
8. Expand the work-allocation registry to the remaining seven Florida regions.
9. Turn on coverage dashboards and promotion queues.
