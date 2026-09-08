# HERMES Prime observation foundation

This Stage 2 slice observes runtime health and resources without dispatching civic
work. It is not the Stage 3 canonical planner, canonical Research Work Ledger,
Witness, or an implemented R2/Supabase dispatcher.

`services/hermes-prime/observer.py` requires only Python 3 and systemd on Linux.
Install the reviewed source under an immutable release directory below
`/opt/civiclenz/hermes/releases/`, point `/opt/civiclenz/hermes/current` at it, and
install `ops/systemd/civiclenz-hermes-prime.service` into `/etc/systemd/system/`.
Enable and start the unit after validating it with `systemd-analyze verify`.
Rollback stops the unit and restores the previous symlink/unit; no civic database
or receipt mutation is involved.

The process has no secret environment file and no public listener. It observes
local systemd states, localhost receiver health, receipt-file count, load, memory,
swap usage, and disk headroom. Linux receipt filesystem events wake it; a 30-second
heartbeat catches missed events. Samples are capped at 2,880 records. Operational
SQLite storage uses WAL and FULL synchronization; it is not canonical civic state.

The initial governor pauses new-work eligibility below 2 GiB available memory,
below 10 GiB free disk, or above 85% CPU-count-normalized one-minute load. These
are conservative initial safeguards, not benchmarked final concurrency policy.
Dispatch remains disabled even when headroom exists. The observer itself is
bounded to 192 MiB and 25% of one CPU by systemd.

Academy records observed receiver failures, pending downstream intake, and resource
pressure as deduplicated proposals requiring tests. It never promotes a proposal
or changes truth/publication policy. Broader worker learning is not implemented.

Health command (requires access to the private operational state):

```sh
sudo -u civiclenz python3 /opt/civiclenz/hermes/current/observer.py --health
```

Health means a sample exists within 90 seconds; it does not mean all dependencies
are healthy or civic validation is operational. The unit is enabled for reboot
recovery. Full host reboot acceptance remains a separate physical test.

## Bridge authentication diagnosis

The receiver requires POST `/v1/harvester/results`, JSON, and headers:
`x-civiclenz-producer-id`, `x-civiclenz-timestamp`, `x-civiclenz-signature`.
The signature is hexadecimal HMAC-SHA256 of timestamp + `.` + exact request bytes,
using the installed UTF-8 shared secret; `sha256=` is an accepted prefix.
Timestamp skew defaults to five minutes. Digest comparison is timing-safe.
This is not bearer-token authentication. JSON must not be reserialized after
signing. A signed invalid-schema probe proves authentication only and must never
be counted as the real Harvester interoperability canary.

No real Harvester canary had been submitted when this slice was prepared. An
existing producer package and access to its delivery/acknowledgment controls are
still required. The canonical intake URL is
`https://ingest.civicslenz.com/v1/harvester/results`.

### Copy-format compatibility and corrected-canary hold

The legacy hidden-entry helper could persist Markdown delimiters. The loader
removes exactly one pair of backticks around exactly 64 hexadecimal characters.
Other secret values are byte-preserved. Hex characters are used as UTF-8 key
text, never hex-decoded. This selects one effective key; it does not accept both
the wrapped and unwrapped key. The stored environment file is not rewritten.

`HERMES_INGEST_INTAKE_PAUSED=true` retains HTTP 401 for unauthenticated requests.
Authenticated requests receive HTTP 503 / RETRY_LATER without any receipt or
evidence write. It is used while the producer corrects the canary's Seat-to-
Occupancy mapping. Do not lift this hold merely because authentication works.
Select and review the corrected existing result first; run one real delivery,
then trace its persisted acknowledgment and canonical downstream state.

## Additional Stage 2 components

OpenClaw 2026.9.3 uses a separate non-login `civiclenz-openclaw` identity, with
traverse-only ACLs to public runtime executables. It cannot read the bridge or
Cloudflare secrets. Its own gateway credential is distinct and stays in
`/etc/civiclenz-openclaw/gateway.env`. No secret value belongs in Git. The local
config disables plugins, browser, public control UI, automatic model heartbeats,
and execution/filesystem/web/automation tools. HERMES tool integration is pending.
Systemd permits only localhost network access. Package installation uses a pinned
version and retains its npm lockfile on the VPS; package code becomes root-owned
after unprivileged installation.

Qwen3-4B Q4_K_M is obtained from the official Qwen model repository at revision
`bc640142c66e1fdd12af0bd68f40445458f3869b`, SHA-256
`7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5`.
llama.cpp is built from commit `5266f24da75dc449bd56cbed7addb9c8e4a6a73e`
(tag `v0.4.0`) using CMake Release, static libraries, two build threads, and only
the llama-server target. The service binds 127.0.0.1:8081, one inference slot,
16,384 context tokens, three compute threads, 6 GiB memory ceiling, and three CPU
equivalents. This is a reasoning utility, not a verification capability.

`ops/bootstrap/civiclenz-swap-headroom` adds 2 GiB dedicated safety swap and a
reboot entry, preserving existing swap and backing up fstab. It refuses to
overwrite an existing inactive swap file. Docker/Compose use Ubuntu packages;
no service identity receives membership in the root-equivalent Docker group.

These service definitions establish supervision, not full Stage 2 acceptance:
physical model inference, restart tests, and final host reboot recovery must be
recorded separately. Queue/R2/Supabase dispatch and canonical work scheduling
remain unimplemented in this slice.

References: [llama.cpp build instructions](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md),
[official Qwen model](https://huggingface.co/Qwen/Qwen3-4B-GGUF),
[OpenClaw security](https://docs.openclaw.ai/gateway/security).
