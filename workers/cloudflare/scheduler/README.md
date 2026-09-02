# civiclenz-scheduler

Cloudflare Worker that plans due CivicLenZ work and enqueues it. It does not fetch sources or run research itself.

## Config

- File: `workers/cloudflare/scheduler/wrangler.jsonc`
- Worker name: `civiclenz-scheduler`
- Crons (small set, not one per source):
  - `0 */6 * * *` — due ingest/monitor sweep
  - `15 7 * * *` — daily election/monitor sweep
- `DRY_RUN` var defaults to `"true"`. First deploy will record worker_runs and plan jobs but will not send queue messages until `DRY_RUN=false`.

## Bindings

| Binding | Resource |
| --- | --- |
| `INGEST_QUEUE` | queue `civiclenz-ingest` |
| `VALIDATE_QUEUE` | queue `civiclenz-validate` |
| `MONITOR_QUEUE` | queue `civiclenz-monitor` |
| `HEAVY_QUEUE` | queue `civiclenz-heavy` |
| `DEAD_LETTER_QUEUE` | queue `civiclenz-dead-letter` |

## Secrets (Cloudflare secrets only)

```bash
cd workers/cloudflare/scheduler
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Do not put these in `vars`, git, `.dev.vars` committed to the repo, or Next.js `NEXT_PUBLIC_*`.

## Manual commands (do not run from repo root)

```bash
cd workers/cloudflare/scheduler
npx wrangler login
npx wrangler deploy --dry-run
# production deploy is a later operator step; scheduler last
npx wrangler deploy
```
