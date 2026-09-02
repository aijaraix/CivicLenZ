# Production collection deployment (operator only)

Do **not** run these commands from CI or this agent. Scheduler `DRY_RUN` must stay `"true"` until a human inspects planned jobs. Do **not** apply `202609020001`, `202609020003`, or `202609020004` to live. Additive `202609020002` is already on live — do not re-apply. Do **not** merge this PR as part of deploy. Do **not** `wrangler deploy` until a human authorizes it. Do **not** POST `/operator/enqueue-job` until the secret is set and the scheduler hotfix is redeployed.

Live project: CivicLenZ `uazqyzmzydtmbypjuqjw`.

## 1. Lease RPC

`lease_due_job` is already live (service_role execute, anon/authenticated cannot, `search_path`, positive lease, SKIP LOCKED). Do not re-apply `202609020002`.

## 2. Verify `lease_due_job`

```sql
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname = 'lease_due_job';

SELECT has_function_privilege('service_role', 'public.lease_due_job(text, integer, uuid)', 'EXECUTE');
```

Confirm `search_path` is `pg_catalog, public` and PUBLIC cannot execute.

## 3. Cloudflare secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already on collector, validator, and scheduler. For this hotfix, add the operator trigger secret on **scheduler only**:

```bash
cd workers/cloudflare/scheduler
npx wrangler secret put CIVICLENZ_OPERATOR_TRIGGER_SECRET
```

Create a strong value in the Cloudflare prompt. Do not generate or store it in git. Never put secrets in wrangler `vars` or `NEXT_PUBLIC_*`.

## 4–7. Collector and validator

Already deployed. Do **not** redeploy collector or validator for this hotfix unless their wrangler/config actually changed (they did not).

## 8–10. Redeploy scheduler only, leave DRY_RUN=true

After this hotfix is merged, from a reviewed machine:

```bash
cd workers/cloudflare/scheduler
npx wrangler deploy --dry-run
npx wrangler deploy
# GET /health — expect worker civiclenz-scheduler, dryRun true, supabaseConfigured true,
# queueBindingsConfigured true. Never secret values.
```

Confirm `workers/cloudflare/scheduler/wrangler.jsonc` still has `"DRY_RUN": "true"`. Do not set it false.

## 11–16. Existing Miami-Dade job (do not create a second row)

Controlled live job (already queued, attempt_count 0):

- `job_id` `7d93a416-1483-4550-b203-e8c424c289b7`
- `job_type` ingest / application route ingest
- `dedupe_key` `ingest:miami-dade-county-elected-officials:2026-09-02`
- `sourceUrl` `https://www.miamidade.gov/elections/library/reports/elected-officials.pdf`

Cloudflare Dashboard Queue Send is broken (403). Use the operator endpoint after scheduler redeploy:

```bash
curl -sS -X POST "https://<scheduler-worker>/operator/enqueue-job" \
  -H "Authorization: Bearer ${CIVICLENZ_OPERATOR_TRIGGER_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"jobId":"7d93a416-1483-4550-b203-e8c424c289b7"}'
```

Do **not** run this POST until a human authorizes it. Expected `{ "jobId", "dedupeKey", "route": "ingest", "queue": "civiclenz-ingest", "enqueued": true }`.

Then observe (not claimed by this PR):

1. Collector GET of the official PDF
2. R2 `civiclenzevidence` object `raw/miami-dade-county-elected-officials/{YYYY}/{MM}/{DD}/{sha}.pdf`
3. `raw_retrievals.raw_object_uri` like `r2://civiclenzevidence/raw/...`
4. Claims start `collected_unreviewed` / `extracted` — never `verified` from HTTP 200
5. Validator runs and does not auto-verify unless TIER_1 + schemaCertified + unique match + evidence + no conflict
6. Website publication path only reads verified claims via `lib/civic-data`. Do not switch Vercel off reviewed JSON.

## 17–18. Enable controlled scheduling

Only after the first real ingestion is reviewed, set scheduler `DRY_RUN=false` via Wrangler var (not a secret). Re-check source health, job statuses, and contradictions before expanding beyond Miami-Dade.

## Bindings (already exist — do not recreate)

- R2 `civiclenzevidence` → `EVIDENCE_BUCKET`
- Queues `civiclenz-ingest`, `civiclenz-validate`, `civiclenz-monitor`, `civiclenz-heavy`, `civiclenz-dead-letter`
- Workers: `civiclenz-collector`, `civiclenz-validator`, `civiclenz-scheduler`
- No root Wrangler. No Worker named `civiclenz`. Vercel stays the Next.js site.
