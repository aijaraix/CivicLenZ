# CivicLenZ data imports

This directory is the controlled landing zone for recovered or newly acquired bulk datasets.

## Legacy recovery

Place a recovered dataset beneath:

```text
data/imports/legacy/
```

Supported inventory formats:

- CSV and TSV
- JSON arrays or objects containing record arrays
- JSONL and NDJSON
- SQLite or DB files
- ZIP archives containing the formats above
- Parquet files are hashed and reported; row counts require an optional local Parquet reader

Run:

```bash
python scripts/inventory_legacy_official_datasets.py \
  --root data/imports/legacy \
  --output artifacts/legacy-dataset-inventory.json
```

The inventory step does not publish or normalize data. It records file hashes, probable row counts, table names or column names, and whether a file appears to contain elected-official records.

## Import safety

- Do not commit private credentials, voter files, personal contact lists, or restricted data.
- Preserve the original source, license, retrieval date, and file hash.
- Treat names as candidates until seats, jurisdictions, and terms are resolved.
- Do not overwrite canonical records from a bulk import.
- Review duplicates, former officials, candidates, vacancies, appointed offices, and non-elected roles separately.
- Large original files should ultimately live in R2 or another evidence store; Git should keep the manifest and hash.

The prior planning names `50_state_office_generator.js`, `bulk_seed_national.js`, `county_seed_loader.js`, `city_seed_loader.js`, and `school_district_loader.js` have not been found in the repositories currently exposed to the GitHub connection. If recovered elsewhere, place them and their generated datasets in this landing zone for inventory.
