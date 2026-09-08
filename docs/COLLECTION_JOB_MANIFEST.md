# Bounded collection-job manifest

This contract is the required preflight record for every CivicLenZ collection
job. It prevents a scheduler or worker from turning a broad roster, county, or
statewide request into an uncontrolled duplicate collector.

It is deliberately separate from the Florida work-allocation registry. The
allocation registry reserves a workstream; this manifest authorizes one small,
source-specific unit of work inside that reservation. A valid manifest is not
permission to publish data.

## What one manifest represents

Each manifest represents exactly one of these targets:

- one `permanent_seat`, identified by a stable `seatKey`; or
- one `bounded_batch` containing an explicit list of 1–50 permanent seat keys.

Wildcards, free-text group selectors, and implicit “all officials” batches are
not supported. A batch must name every seat it can affect and set
`executionLimits.maxRecords` to that exact count. A permanent-seat job must set
`maxRecords` to `1`.

The full work identity is:

```text
jurisdictionId | permanent seat keys | phase | sourceId + canonical source URL | effectiveDate
```

The validator derives `dedupeKey` from that identity with a canonical JSON
encoding and SHA-256. A task cannot choose its own dedupe value.

## Required boundaries

A valid manifest must include all of the following:

| Contract field | Guardrail |
| --- | --- |
| `identity` | Jurisdiction, effective date, a granular phase, and an explicit permanent seat or bounded seat list. |
| `source` | Stable source ID, fragment-free normalized HTTPS URL, exact host match, source tier, and a per-host rate/robots policy. |
| `owner` | The named `workstreamId` and a bounded `workerId`; the queue must separately confirm that the workstream has an active non-overlapping allocation. |
| `executionLimits` | At most 50 records, 500 requests, and 60 minutes; mode is always `staging_only`. |
| `output` | Exactly one job-private namespace under `data/sources`, `data/staging`, `data/research-staging`, or `data/operations`. It must end in `jobId`, so workers cannot share an output path. |
| `review` | `publicationAllowed: false`, `reviewStatus: unreviewed`, `promotionRequired: true`, and `humanReviewRequired: true`. |
| `dedupeKey` | The validator recomputes it from the identity; retries use the same key instead of creating another task. |

The manifest schema lives at
[`schemas/collection-job.schema.json`](../schemas/collection-job.schema.json).

## Validation

Validate a single file, a job directory, or multiple proposed jobs before a
queue lease is issued:

```bash
python scripts/validate_collection_job_manifest.py path/to/manifest.json
python scripts/validate_collection_job_manifest.py path/to/proposed-jobs/
python -m unittest tests/test_collection_job_manifest.py
```

When several files are supplied, validation also rejects:

- repeated `jobId`, `dedupeKey`, or output namespace;
- a permanent-seat job that overlaps a bounded batch containing that seat;
- a repeated seat under the same jurisdiction, phase, source, and effective
  date.

Different authoritative sources may create separately attributable jobs for the
same seat and phase. They must still have distinct source identities and output
namespaces.

## Queue integration after the infrastructure branch is reviewed

The queue/control-plane implementation should consume this contract only after
this change and the infrastructure work are rebased onto the same `main` base.
At job creation and again before a worker lease, it should:

1. load the manifest and run this validator against the pending queue scope;
2. verify `owner.workstreamId` against the active allocation registry;
3. refuse an existing `dedupeKey` rather than enqueue a second run;
4. hand the worker only the one declared `output.namespace`;
5. apply the declared host-specific rate policy and record source snapshots;
6. write review-only staging records, never canonical profiles or public
   presentation paths; and
7. require the existing evidence and human-review promotion path before any
   public profile change.

The manifest validator itself does not import workers, access Cloudflare,
dispatch a job, fetch a URL, or create a public record. That isolation is
intentional: it lets every future scheduler use the same safety gate without
duplicating collection logic.

## Examples and tests

`tests/fixtures/collection-job-manifests/` includes:

- one valid Florida House permanent-seat source-discovery job;
- one individually valid explicit batch that overlaps that seat, proving the
  multi-manifest collision check;
- an invalid public-boundary job; and
- an invalid wildcard batch.

Fixtures are synthetic. They do not assert that a source was contacted or that a
profile was collected.
