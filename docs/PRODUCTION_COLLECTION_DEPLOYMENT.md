# Production collection deployment (operator only)

Do **not** run these commands from CI or this agent. Scheduler `DRY_RUN` must stay `"true"` until a human inspects planned jobs. Do **not** apply `202609020001` to live. Do **not** merge this PR as part of deploy.

Live project: CivicLenZ `uazqyzmzydtmbypjuqjw`.

## 1. Apply the lease RPC only

From a reviewed machine with service-role access:

```bash
# Apply ONLY the additive lease function. Do not apply 202609020001.
# Use the Supabase SQL editor or CLI against a reviewed session.
# File: supabase/migrations/202609020002_atomic_job_leasing.sql
```

## 2. Verify `lease_due_job`

```sql
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'lease_due_job';

SELECT has_function_privilege('service_role', 'public.lease_due_job(text, integer, uuid)', 'EXECUTE');
```

Confirm `search_path` is `pg_catalog, public` and PUBLIC cannot execute.

## 3. Cloudflare secrets (each Worker directory)

```bash
cd workers/cloudflare/collector && npx wrangler secret put SUPABASE_URL
cd workers/cloudflare/collector && npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
cd workers/cloudflare/validator && npx wrangler secret put SUPABASE_URL
cd workers/cloudflare/validator && npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
cd workers/cloudflare/scheduler && npx wrangler secret put SUPABASE_URL
cd workers/cloudflare/scheduler && npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Never put secrets in git, wrangler `vars`, or `NEXT_PUBLIC_*`.

## 4–5. Deploy collector, then verify idle

```bash
cd workers/cloudflare/collector && npx wrangler deploy --dry-run
cd workers/cloudflare/collector && npx wrangler deploy
# GET the Worker /health. Confirm it is idle until ingest/monitor messages exist.
```

## 6–7. Deploy validator, then verify idle

```bash
cd workers/cloudflare/validator && npx wrangler deploy --dry-run
cd workers/cloudflare/validator && npx wrangler deploy
```

## 8–10. Deploy scheduler last, leave DRY_RUN=true

```bash
cd workers/cloudflare/scheduler && npx wrangler deploy --dry-run
cd workers/cloudflare/scheduler && npx wrangler deploy
# POST /dry-run and inspect dueSources, dueJobs, dueElections, dueMonitoringTargets,
# wouldEnqueue, queueRoutes, and dedupeKeys. These must be persisted/query counts, not estimates.
```

Confirm `workers/cloudflare/scheduler/wrangler.jsonc` still has `"DRY_RUN": "true"`.

## 11–16. One Miami-Dade source job

1. Seed exactly one ingest job for `miami-dade-county-elected-officials` at  
   `https://www.miamidade.gov/elections/library/reports/elected-officials.pdf`
2. Observe R2 `civiclenzevidence` object `raw/miami-dade-county-elected-officials/{YYYY}/{MM}/{DD}/{sha}.pdf`
3. Confirm `raw_retrievals.raw_object_uri` looks like `r2://civiclenzevidence/raw/...`
4. Confirm claims start `collected_unreviewed` / `extracted` — never `verified` from HTTP 200
5. Confirm validator runs and does not auto-verify unless TIER_1 + schemaCertified + unique match + evidence + no conflict
6. Confirm the website publication path only reads verified claims via the public civic adapter / RLS

## 17–18. Enable controlled scheduling

Only after the dry-run plan looks right, set scheduler `DRY_RUN=false` via Wrangler var (not a secret). Re-check source health, job statuses, and contradictions before expanding beyond Miami-Dade.

## Bindings (already exist — do not recreate)

- R2 `civiclenzevidence` → `EVIDENCE_BUCKET`
- Queues `civiclenz-ingest`, `civiclenz-validate`, `civiclenz-monitor`, `civiclenz-heavy`, `civiclenz-dead-letter`
- Workers: `civiclenz-collector`, `civiclenz-validator`, `civiclenz-scheduler`
- No root Wrangler. No Worker named `civiclenz`. Vercel stays the Next.js site.
