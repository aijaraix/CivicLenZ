# CivicLenZ Cloudflare collection runtime

First real Cloudflare + Supabase collection runtime. GitHub holds code, schemas, migrations, and tests. Canonical civic rows live in live Supabase. Evidence bytes live in R2 bucket `civiclenzevidence`. Vercel remains the public Next.js site.

There is **no** root `wrangler.toml` / `wrangler.jsonc`. Do not deploy the Next.js app through Wrangler. Do not revive the deleted Worker named `civiclenz`.

## Workers

```text
workers/cloudflare/scheduler/   civiclenz-scheduler
workers/cloudflare/collector/   civiclenz-collector
workers/cloudflare/validator/   civiclenz-validator
workers/cloudflare/shared/      server-only library used by the three Workers
```

Railway is **not** required yet. `civiclenz-heavy` is a producer-only queue for a later Railway worker (large PDF / OCR / browser / GIS).

## Tests

From the repository root:

```bash
npm run test:collection-runtime
```

These tests do not call production Cloudflare or live Supabase and do not invent VERIFIED counters.
