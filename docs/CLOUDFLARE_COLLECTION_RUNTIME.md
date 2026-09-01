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

`supabase/migrations/202609020001_civic_collection_runtime.sql` is conservative: `CREATE IF NOT EXISTS` only, RLS on, no public SELECT on `jobs`, `worker_runs`, `raw_retrievals`, `validation_runs`, `contradictions`, or `monitoring_state`.

A live column dump was **not** available (missing Supabase MCP / service-role from this environment). If production columns differ, reconcile before applying.

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
