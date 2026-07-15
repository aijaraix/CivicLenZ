# CivicLenZ Collection Pipeline

## Operating rule

Automated collectors never write directly to the public canonical profile directory. They write review-only staging records. A reviewed merge step resolves identity, office, term, source evidence, conflicts, and historical changes before publishing canonical JSON.

## Repository data locations

```text
data/
  sources/
    source-registry.json          Approved collection sources and schedules
  staging/
    florida/state-senate/         Unreviewed extraction output
    florida/state-house/          Future unreviewed extraction output
  officials/
    florida/statewide/            Canonical published statewide profiles
    florida/state-senate/         Canonical published Senate profiles
    florida/state-house/          Canonical published House profiles
  evidence/                       Source metadata, locators, hashes, excerpts
  indexes/                        Generated search and lookup indexes
```

## What belongs outside Git

Do not fill the repository with large or frequently changing raw files. Store the following in versioned object storage such as Cloudflare R2, Amazon S3, or an equivalent private bucket:

- Full PDF filings.
- Scanned financial disclosures.
- Meeting packets and agenda archives.
- Videos and audio.
- Full webpage snapshots.
- OCR derivatives and page images.
- Large GIS boundary files.

The repository stores the object key, canonical URL, archived URL, retrieval timestamp, content hash, page/timestamp locator, parser version, and lawful excerpt needed to reproduce the public claim.

## Collection stages

### 1. Source registration

Before writing a collector, add the source to `data/sources/source-registry.json` with:

- Source key and name.
- Jurisdiction.
- Official URL.
- Source tier and type.
- Collection mode.
- Expected entities.
- Schedule.
- Required secrets.
- Review requirement.
- Access and legal notes.

### 2. Retrieval

Collectors must:

- Use an identifying CivicLenZ user agent.
- Set connection and read timeouts.
- Respect access controls, rate limits, published terms, and robots directives where applicable.
- Fail closed when a source changes materially.
- Hash the retrieved content.
- Record the retrieval time and source URL.
- Avoid repeatedly downloading unchanged content when an ETag, Last-Modified value, or content hash is available.

### 3. Text and structured extraction

Preferred order:

1. Official API or downloadable structured data.
2. HTML table or semantic webpage extraction.
3. Native PDF text extraction.
4. Spreadsheet or CSV extraction.
5. OCR only when a document has no usable text layer.
6. Human transcription/review when OCR confidence is insufficient.

OCR output is never automatically treated as an exact quotation. It must retain page references and be reviewed before supporting a consequential public claim.

### 4. Staging records

A staging record contains:

- Deterministic staging ID.
- Source and member/detail URL.
- Source snapshot hash.
- Retrieval time.
- Extracted fields.
- Raw row or source fragment.
- Extraction status.
- Canonical match status.

Staging records use `extracted_unreviewed` until a reviewer promotes or rejects them.

### 5. Entity resolution

The merge process compares a staging record against canonical:

- Person names and aliases.
- External identifiers.
- Office and normalized office title.
- Jurisdiction and district.
- Term dates.
- Official profile URLs.
- Historical officeholder records.

Possible outcomes:

- Match existing person and office term.
- Match person but create a new office term.
- Create a new person, office, and term.
- Mark duplicate.
- Mark ambiguous and require human review.
- Mark former, resigned, deceased, vacant, or succeeded.

### 6. Evidence creation

Promoted values must link to evidence metadata. A material fact should not appear publicly merely because it existed in scraper output.

### 7. Canonical publication

Canonical profiles live in `data/officials`. Each public profile:

- Conforms to the JSON schema.
- Has a stable official/person/office/term identity.
- Preserves prior versions.
- Shows verification, completeness, freshness, and conflicts.
- Can be rendered by the static website build.

### 8. Monitoring and change review

Scheduled workers compare new source results with the prior staging/canonical state. Changes are proposed through pull requests for review. Examples:

- New officeholder.
- Resignation or death in office.
- District or party change.
- Contact/social changes.
- New filing, vote, bill, meeting, promise evidence, or ethics record.
- Source removal or parser failure.

## First collection sequence

1. Florida Senate directory.
2. Florida House directory.
3. Florida statewide executive offices.
4. Florida congressional delegation through official federal sources.
5. Florida election and campaign-finance records.
6. County constitutional officers and commissioners.
7. Municipal mayors and councils.
8. School boards and special districts.
9. Bills, votes, meetings, disclosures, promises, and issue evidence.

## Review checklist for a new official

- Identity is unique and not a duplicate.
- Office title is canonical.
- Jurisdiction and district are correct.
- Current/former status and term context are correct.
- Source URL and retrieval metadata exist.
- Contact and social accounts belong to the correct office/person.
- Empty fields are unknown, not guessed.
- Sensitive claims are absent until separately reviewed.
- JSON schema validation passes.
- Static website build passes.

## OCR review checklist

- Confirm the document lacks a reliable text layer.
- Preserve the original file and hash outside Git.
- Record OCR engine/version and language.
- Retain page images and page numbers.
- Flag low-confidence text.
- Manually verify names, dates, monetary values, legal findings, and quotations.
- Never convert OCR output alone into a misconduct finding or exact public quote.