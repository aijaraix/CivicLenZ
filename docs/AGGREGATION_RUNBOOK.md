# CivicLenZ Aggregation Runbook

## Current objective

The current phase is broad roster aggregation: identify every elected office and current officeholder with a stable source-backed baseline record before performing deep enrichment or high-frequency monitoring.

## Baseline record

Each baseline staging record should contain enough information to identify and place the official correctly:

- Stable staging ID.
- Source key and official source URL.
- Source snapshot SHA-256.
- Retrieval timestamp.
- Name or vacancy label.
- Office title.
- Government level and branch/chamber.
- Jurisdiction, state, district, or seat.
- Party when the official source publishes it.
- Official profile URL.
- Canonical match status.
- Refresh class for later monitoring design.

Baseline records remain `extracted_unreviewed` until entity resolution and promotion are implemented.

## Autonomous federal baseline

The `Collect federal baseline officials` GitHub Actions workflow runs daily and after changes to the federal collectors. It runs the enabled federal collectors in `data/sources/collector-manifest.json`:

1. U.S. House directory.
2. U.S. Senate official XML directory.
3. White House President and Vice President directory.

The workflow validates count ranges, validates JSON, uploads a temporary artifact, and pushes the results to `bot/federal-baseline-refresh`. If repository settings block workflow-created pull requests, the branch is still preserved and a pull request needs to be created only once. Later runs refresh the same branch and open pull request.

## Adding the next collector

1. Register the official source in `data/sources/source-registry.json`.
2. Add the collector under `workers/ingestion/`.
3. Add parser regression tests under `tests/`.
4. Add the collector to `data/sources/collector-manifest.json` with expected count bounds.
5. Enable it only after its tests and live-source smoke test pass.
6. Add its output path to the appropriate aggregation workflow.

## Aggregation order

1. Federal House, Senate, President, and Vice President.
2. Florida House and statewide elected officials.
3. Florida federal delegation cross-links.
4. All 67 Florida counties.
5. Florida municipalities.
6. Florida school boards.
7. Florida special districts and elected judicial/retention offices where applicable.
8. Other states using the same manifest/controller pattern.

## Scale transition

Git-backed JSON is suitable for early federal and Florida baselines. Before scaling toward hundreds of thousands of records, staging and canonical entities should move to PostgreSQL, with large source files and documents stored in R2/S3-compatible object storage. GitHub remains the home for code, schemas, source manifests, tests, and reviewed exports.
