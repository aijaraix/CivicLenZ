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
