# Bounded paused-intake authorization

The receiver source is restored from the physically deployed a32c1fb release;
current main had omitted it. Prime and other runtime components are unchanged.

Normal HMAC authentication remains first. The signed existing
`producer.execution_id` field carries the authorization correlation UUID; no
new package schema or unsigned control header is introduced. Global pause stays
true. The registry still limits this producer to advance_research_harvest and
extracted_unreviewed, without canonical storage, verification or publication.

The existing durable spool holds immutable authorization grants. The create-only,
fsynced receipt file named by authorization UUID is the single atomic acceptance
and consumption commit. Its embedded authorization has CONSUMED, use_count=1,
consumed_at and consumed_receipt_id. The operator inspect command overlays that
commit on the grant; an old ARMED grant is never independently authoritative.
A crash after receipt commit cannot reopen the authorization. Existing index
recovery rebuilds any missing job index. No TTL-based lock recovery can replace
the create-only receipt. Failed schema/integrity requests do not consume a grant.
Concurrent requests, including different jobs, can commit at most one receipt.
Normal unpaused intake retains existing duplicate acknowledgement behavior.

Operator only (run as existing receiver service identity, using its configured
spool directory; do not print or source secret values into logs):

```
HERMES_INGEST_INTAKE_PAUSED=true HERMES_INGEST_SPOOL_DIRECTORY=/var/lib/civiclenz/hermes-ingest node --experimental-strip-types --no-warnings services/hermes-ingest/src/canary-cli.ts arm CORRELATION_UUID 3600
HERMES_INGEST_INTAKE_PAUSED=true HERMES_INGEST_SPOOL_DIRECTORY=/var/lib/civiclenz/hermes-ingest node --experimental-strip-types --no-warnings services/hermes-ingest/src/canary-cli.ts inspect CORRELATION_UUID
```

TTL is 60–3600 seconds. Create exactly one grant only after deployment/health
checks. Producer submits exactly once to the existing /v1/harvester/results
endpoint, using its existing bridge and normal exact-byte HMAC. Set
producer.execution_id to the returned correlation ID BEFORE serialization and
signing. No retries, harvesting activation or verification/publication.
Acknowledgement correlation matches the grant; HTTP 202 means intake disposition,
not completed canonical validation. Existing PENDING_CANONICAL_DISPATCH remains
an explicit pending state until independently consumed by HERMES.

Deployment: use an immutable release from merged GitHub main, add receiver-only
systemd drop-in setting WorkingDirectory to that release, restart only
civiclenz-hermes-ingest. Do not move /opt/civiclenz/current or the Prime pointer.
Keep /etc/civiclenz/harvester-bridge.env and existing spool unchanged.
Rollback: restore previous receiver WorkingDirectory drop-in and restart the
receiver with intake still paused. Preserve all authorization/receipt files;
do not rearm automatically after rollback or expiry.

Tests use isolated filesystem fixtures; they are not production canary proof.
Required producer provenance remains real evidence or truthful gaps; never a
fabricated civic assertion. No canonical publication work is scheduled here.
