# Promise Evidence and Portrait Collection Protocol

## Promise extraction

A promise is not a paraphrased policy preference. It is an attributable commitment by the candidate or officeholder to perform, support, oppose, prevent, fund, repeal, appoint, veto, sign, investigate, reduce, increase, deliver, or achieve something.

### Accepted source order

1. Official campaign platform or issues page.
2. Candidate or officeholder speech, debate, town hall, hearing, or press conference.
3. Official campaign advertisement, mailer, video, or newsletter.
4. Official office press release or newsletter.
5. Full attributable interview or podcast.
6. Attributable official/campaign social post.
7. Authoritative reporting that embeds or links to the original quotation.

### Required promise fields

- Exact words.
- Speaker.
- Date.
- Venue/context.
- Original source URL.
- Preserved HTML/PDF/image/audio/video or lawful archive URL.
- Content hash.
- Exact excerpt, page number, or transcript timestamp.
- Issue tags.
- Promised action and outcome.
- Geographic and population scope.
- Deadline or target date when stated.
- Conditions and qualifiers.
- Whether the monitored seat has authority to deliver it.
- Measurability.
- Initial status `unclear` until evaluation evidence exists.
- Supporting, contradicting, and contextual evidence.
- Official response.
- Last evaluated date.
- Confidence and human-review state.

### Status rules

- `not_started`: delivery window is open and no material implementation is found.
- `in_progress`: documented actions materially advance the promise.
- `kept`: the measurable commitment was achieved within its stated scope.
- `partially_kept`: a meaningful but incomplete portion was achieved.
- `compromised`: delivered in a materially altered form.
- `broken`: the commitment was not achieved despite the officeholder having opportunity and authority, or the officeholder acted contrary to it.
- `blocked`: another authority, court, legislature, funding constraint, or external event prevented delivery; the evidence must identify the blocker.
- `reversed`: the officeholder initially acted toward or achieved it and later reversed course.
- `unclear`: evidence or measurability is insufficient.
- `not_applicable`: the promise is outside the seat/term or was misattributed.

A model may propose a status, but publication requires evidence-backed reasons and human review.

## Portrait discovery and storage

A search engine can help locate a portrait source, but a search-result thumbnail is not itself a valid source or license.

### Source priority

1. Official government profile portrait.
2. Official government media/press kit.
3. Official campaign portrait.
4. Wikimedia Commons or another repository with explicit public-domain or reuse license.
5. Photographer/publisher image with explicit permission or license.

### Required portrait fields

- Person ID and related term/seat.
- Original image URL.
- Source page URL.
- Publisher.
- Credit.
- Copyright status/license.
- Retrieval date.
- MIME type.
- Width and height.
- File size.
- SHA-256.
- Local/object-storage asset ID.
- Crop/focal-point metadata.
- Active/superseded status.
- Human identity review.

### Storage rule

The production system should store permitted portrait files in R2/S3-compatible object storage, not hotlink third-party images indefinitely. GitHub stores code, manifests, and reviewed metadata; object storage holds media assets. When reuse rights are unclear, CivicLenZ can link to the official source page and display initials until the portrait is cleared.

## Evidence preservation

For promises and portraits, the evidence worker should:

1. Fetch the original source with a transparent CivicLenZ contact header.
2. Record HTTP status, ETag, Last-Modified, capture time, and content hash.
3. Save the source asset when lawful and permitted.
4. Create screenshots for visual evidence when needed.
5. Extract text or OCR while preserving the original.
6. Store the exact excerpt and surrounding context.
7. Attach the evidence to the seat, term, person, and specific claim.
8. Never overwrite prior evidence; create a superseding version.
