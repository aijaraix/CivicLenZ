# Canonical Harvester authentication V1

This is the single protocol implemented by PR #54 and preserved by PR #55.

- Method: POST.
- URL: `https://ingest.civicslenz.com/v1/harvester/results`.
- Content-Type: `application/json`.
- `x-civiclenz-producer-id`: `civicslenzz-gemini-harvester`.
- `x-civiclenz-timestamp`: current Unix seconds as a 10-digit string.
- `x-civiclenz-signature`: `sha256=` followed by hexadecimal HMAC-SHA256.
- MAC input: UTF-8 timestamp, one literal dot, exact raw request body bytes.
- MAC key: UTF-8 shared-secret text. Do not decode the hex text into bytes.
- Clock skew: at most five minutes by default.
- Payload producer ID must equal the authenticated producer header and registry.
- Envelope contract: `CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1`.
- Acknowledgment contract: `CIVICLENZ_HARVESTER_ACK_V1`.

Bearer authentication is not accepted. Serialize the JSON once, sign those exact
bytes, and send those bytes unchanged. Do not log the key, signature, or headers.
The receiver compares fixed-length digests using timingSafeEqual.

The canonical loader supports the confirmed legacy copy case of one Markdown
backtick pair around exactly 64 hex characters. It removes only that formatting
pair in memory; the stored secret file remains unchanged. The effective key is
not case-normalized, hex-decoded, or tested against alternative candidates.

While `HERMES_INGEST_INTAKE_PAUSED=true`, an authenticated diagnostic receives
503 / RETRY_LATER, while unauthenticated requests remain 401. This permits sender
parity testing without accepting the known incorrect staged civic package.

Do not send that staged package. After its underlying Seat/Occupancy mapping is
corrected from authoritative sources, select the regenerated job ID and exact
result-content hash before lifting the hold for exactly one real canary.
Transport success never marks claims verified or published.
