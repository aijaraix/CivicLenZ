# civiclenz-validator

Consumes `civiclenz-validate`. Applies schema/entity/evidence/contradiction checks and walks the claim lifecycle. It does not publish to the Vercel site.

Claim states:

`COLLECTED_UNREVIEWED → EXTRACTED → ENTITY_MATCH_PENDING → EVIDENCE_PENDING → VERIFICATION_PENDING → VERIFIED | CONFLICT | REJECTED | STALE | CHECKED_NO_AUTHORITATIVE_RESULT`

A successful collect plus HTTP 200 is **not** VERIFIED. This worker does not auto-promote to VERIFIED.

## Config

- File: `workers/cloudflare/validator/wrangler.jsonc`
- Worker name: `civiclenz-validator`

## Bindings

| Binding | Resource |
| --- | --- |
| `HEAVY_QUEUE` | queue `civiclenz-heavy` |
| `DEAD_LETTER_QUEUE` | queue `civiclenz-dead-letter` |

Consumer: `civiclenz-validate`.

## Secrets

```bash
cd workers/cloudflare/validator
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```
