# Cloudflare + Supabase collection runtime

This is the first deployable collection runtime. It is code, config, tests, and a conservative civic migration only. It does not deploy itself, does not publish unverified claims to Vercel, and does not enable the 18 git enrichment agents as live Cloudflare Workers.

## Boundaries

| System | Role |
| --- | --- |
| GitHub | Code, JSON schemas, SQL migrations, tests |
| Live Supabase (`uazqyzmzydtmbypjuqjw`) | Canonical civic rows |
| R2 `civiclenzevidence` | Evidence bytes |
| Vercel | Public Next.js site (anon key only) |
| Cloudflare Workers | Scheduler, collector, validator |
| Railway | Not required yet. Later consumer of `civiclenz-heavy` |

## Worker layout

See `workers/cloudflare/*/wrangler.jsonc` and the per-Worker README files.

## Secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are Cloudflare **secrets** only. They must never appear in git, wrangler `vars`, Next.js `NEXT_PUBLIC_*`, logs, or fixtures. The website must not use the service role.

## Migration

`supabase/migrations/202609020001_civic_collection_runtime.sql` reconstructs the **live** CivicLenZ civic / collection schema for a fresh database. It is not an invented-column overlay.

- Live project `uazqyzmzydtmbypjuqjw` is authoritative. **Do not apply this file to production.**
- Entity-specific PKs only (`jurisdiction_id`, `seat_id`, `person_id`, `job_id`, …). Never generic `id`.
- Claims use lowercase `verification_state`. Jobs use `queued|leased|running|succeeded|failed|dead_letter|cancelled`.
- Raw bytes are stored as `content_hash` + `raw_object_uri` (`r2://civiclenzevidence/{key}`), not `content_sha256` / `r2_key`.
- Occupancies: live unique is the partial index `UNIQUE (seat_id) WHERE occupancy_status IN ('current','acting')`. Adapters query `seat_id + person_id + start_date` then UPDATE/INSERT. They do **not** use `on_conflict=seat_id,person_id,start_date` (that constraint is not live).
- Claims: live unique is `PRIMARY KEY (claim_id)` only. There is no confirmed `UNIQUE(subject_type, subject_id, field_key, value_hash)`. Adapters SELECT that 4-tuple, PATCH the one `claim_id` if exactly one row, INSERT if zero, and fail closed (typed `duplicate_claim_rows` + contradiction) if more than one. They do **not** use `on_conflict=subject_type,subject_id,field_key,value_hash` and do not add a claims unique.
- Retrievals: `retrieval_status=stored` is not a successful collection. A later hash/304 match may skip fetch/R2 only when bytes are already stored; parser + persist must resume unless `retrieval_status=parsed` and persist already wrote downstream rows.
- Persons: no `UNIQUE(canonical_name)`. Resolve by `person_id`, then external identifiers, then name plus seat/jurisdiction occupancy context. Same display name can be two people.
- `lease_due_job` additive file: `supabase/migrations/202609020002_atomic_job_leasing.sql`. **Already applied on live.** Do not re-apply. Do not apply `202609020001`, `202609020003`, or `202609020004` to production.

Public SELECT matches live: jurisdictions, seats, persons, occupancies, elections, candidate_campaigns, verified claims, verified evidence, research contracts/fields. Internal tables have RLS on and no policies.

Operator deployment steps (do not run from this agent) are in `docs/PRODUCTION_COLLECTION_DEPLOYMENT.md`. Do not apply `202609020001`, `202609020003`, or `202609020004` to live. `202609020002` is already on live.

## First safe deploy order

1. Confirm queues and R2 already exist (do not recreate).
2. Apply the civic migration only after a live-schema reconcile, or apply to a non-prod copy first.
3. `wrangler secret put` on each Worker directory.
4. Dry-run deploy collector, then validator.
5. Scheduler last, with `DRY_RUN=true` until the first plan looks right.
6. Do not auto-enable first-wave ingest against production until Miami-Dade re-fetch is reviewed.

## Out of scope

- Auto `wrangler deploy` from CI
- Railway worker implementation
- Enabling all 18 enrichment agents
- 50-state collection
- ZZ import
- Publishing unverified claims to Vercel
- A root Wrangler config that would bind the website
