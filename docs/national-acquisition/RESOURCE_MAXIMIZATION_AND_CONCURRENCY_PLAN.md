# Resource Maximization and Concurrency Plan

## Goal
Maximize useful evidence-producing throughput on existing infrastructure without starving canonical HERMES, validation, storage or monitoring.

## Baseline from existing canon
Re-measure before activation. Historical host assumption is approximately 4 vCPU / 16 GB RAM class, with HERMES and other services sharing the host.

Initial local budgets from existing canonical resource policy:
- HERMES executive: 1 authority.
- deterministic HTTP/API: 2 local tasks; horizontally distribute eligible work to Cloudflare.
- parser/extraction: 2-4 lightweight CPU tasks.
- evidence/sealing: 2.
- canonical validation: 2.
- GIS: 1 heavy or 2 light.
- browser: 1; maximum default 2 only after measured proof.
- local model: 1 inference.
- monitoring: 1-2 local plus distributed checks.
- Gap Detector: 1 logical batch worker.
- Retry/DLQ: 1 logical recovery pool.
- Academy: 1 low-priority logical worker.
- producer intake: 1-2.

These are starting budgets, not targets to keep busy.

## Adaptive ramp
R0 canary -> R1 low concurrency -> R2 deterministic expansion -> R3 distributed Cloudflare expansion -> R4 measured maximum safe level.

Increase one lane at a time only when:
- sustained eligible backlog exists;
- source policy permits it;
- downstream validation/storage is healthy;
- failure/retry rate remains acceptable;
- CPU/memory/disk/DB latency retain safety headroom.

Scale down automatically for CPU/memory pressure, validation backlog, storage errors, source throttling, retry storms, browser/model pressure or DB latency.

## Work placement
Cloudflare: lightweight HTTP acquisition, source-health checks, scheduled monitoring, queue fanout, normalized signatures, lightweight deterministic transforms.
VPS: HERMES authority, integration-sensitive collectors, parsing/validation/evidence, bounded GIS/browser/model work.
Supabase/Postgres: canonical structured state.
R2: approved evidence/object storage.
Research plugins: discovery/repair/exception layer.
GitHub Actions: engineering CI/parser regression only; not canonical civic scheduling.

## Priority during 2026 cycle
P0 integrity/security.
P1 statutory/currentness changes and election deadlines.
P2 active-cycle current officials/candidates/elections.
P3 completeness/deep enrichment.
P4 frontier/historical enrichment.
Use aging/fairness so lower classes do not starve indefinitely.

## Mandatory telemetry
CPU/load; available memory/RSS; disk; DB latency/errors; R2 errors; queue depth; oldest eligible job; success/failure/latency by family; leases; retries/DLQ; source throttling; browser slots; model latency; acquisition rate; validation rate; canonical materialization rate.

## Throughput ladder
Benchmark verified canonical output at 1k, 10k, 25k, 50k, 75k and 100k relationships/day. A target is not achieved until physical telemetry demonstrates it. Acquisition must throttle when validation debt grows beyond safe bounds.
