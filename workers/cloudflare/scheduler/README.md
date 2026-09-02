# civiclenz-scheduler

Cloudflare Worker that plans due CivicLenZ work and enqueues it. It does not fetch sources or run research itself.

## Config

- File: `workers/cloudflare/scheduler/wrangler.jsonc`
- Worker name: `civiclenz-scheduler`
- Crons (small set, not one per source):
  - `0 */6 * * *` — due ingest/monitor sweep
  - `15 7 * * *` — daily election/monitor sweep
- `DRY_RUN` var defaults to `"true"`. First deploy will record worker_runs and plan jobs but will not send queue messages until `DRY_RUN=false`.
- Operator enqueue (`POST /operator/enqueue-job`) is independent of cron `DRY_RUN`. `{ "jobId" }` sends one existing queued job. `{ "sourceKey": "florida-senate-members" | "florida-house-members" }` may create a queued ingest job for those two controlled sources only, then send it, while `DRY_RUN` stays `"true"`. It must not recreate Miami-Dade job `7d93a416-1483-4550-b203-e8c424c289b7`.

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
npx wrangler secret put CIVICLENZ_OPERATOR_TRIGGER_SECRET
```

Do not put these in `vars`, git, `.dev.vars` committed to the repo, or Next.js `NEXT_PUBLIC_*`. Do not generate or store `CIVICLENZ_OPERATOR_TRIGGER_SECRET` in this repository.

## Operator enqueue (do not run from this agent)

After the secret is set and `civiclenz-scheduler` is redeployed, enqueue the existing queued Miami-Dade job — do not create a second job row:

```bash
curl -sS -X POST "https://<scheduler-worker>/operator/enqueue-job" \
  -H "Authorization: Bearer ${CIVICLENZ_OPERATOR_TRIGGER_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"jobId":"7d93a416-1483-4550-b203-e8c424c289b7"}'
```

Expected JSON: `{ "jobId", "dedupeKey", "route": "ingest", "queue": "civiclenz-ingest", "enqueued": true }`. HTTP 200 is not VERIFIED.

## Manual commands (do not run from repo root)

```bash
cd workers/cloudflare/scheduler
npx wrangler login
npx wrangler deploy --dry-run
# production deploy is a later operator step; scheduler last
npx wrangler deploy
```

<!-- Cloudflare Git integration reconnect verification: 2026-09-02 -->
