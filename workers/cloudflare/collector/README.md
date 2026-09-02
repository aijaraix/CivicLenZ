# civiclenz-collector

Consumes `civiclenz-ingest` and `civiclenz-monitor`. Lightweight HTTP only (JSON / HTML / CSV / small PDF). Fail closed. HTTP 200 is not VERIFIED.

Does **not** consume `civiclenz-heavy`. Large PDF / OCR / browser / GIS jobs are enqueued to Railway later.

## Config

- File: `workers/cloudflare/collector/wrangler.jsonc`
- Worker name: `civiclenz-collector`

## Bindings

| Binding | Resource |
| --- | --- |
| `EVIDENCE_BUCKET` | R2 bucket `civiclenzevidence` (exact name, no hyphens) |
| `VALIDATE_QUEUE` | queue `civiclenz-validate` |
| `HEAVY_QUEUE` | queue `civiclenz-heavy` |
| `DEAD_LETTER_QUEUE` | queue `civiclenz-dead-letter` |

Consumers: `civiclenz-ingest`, `civiclenz-monitor`.

## Secrets

```bash
cd workers/cloudflare/collector
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## First-wave source

Miami-Dade official PDF:

`https://www.miamidade.gov/elections/library/reports/elected-officials.pdf`

Re-fetch on each job. Do not trust prior staged JSON. Successful fetch writes:

`raw/{source_key}/{YYYY}/{MM}/{DD}/{sha256}.pdf`

then `raw_retrievals` and `COLLECTED_UNREVIEWED` claims.
