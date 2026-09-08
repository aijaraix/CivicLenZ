# Media Asset Identity & Provenance

## Purpose
CivicLenZ must never display an unrelated, synthetic, stock, or identity-ambiguous person image as though it depicts a real elected official or candidate. Images, maps, documents, logos, and other media are evidence-bearing product assets and require the same provenance discipline as textual civic facts.

This document defines the canonical MediaAsset model, identity association, source hierarchy, retrieval/integrity, rights metadata, lifecycle/versioning, selection rules, monitoring, and public/operator presentation requirements.

## Core invariant
For any media asset displayed as depicting a Person, Seat, jurisdiction, campaign, organization, or civic object, CivicLenZ must be able to answer:

- What does this asset claim to depict?
- Where exactly did it come from?
- Which source page/direct asset supplied it?
- When was it retrieved?
- What bytes/hash were preserved?
- How was the subject identity associated with the asset?
- What source authority class applies?
- What usage/rights/attribution metadata is known?
- Is it current or historical?
- Is it eligible for public display in this context?

If identity or usage eligibility is unresolved, the asset must not be presented as a verified portrait.

## No-image-is-better rule
No image is better than the wrong image.

If CivicLenZ cannot obtain an identity-verified usable portrait, use a neutral non-person placeholder or omit the portrait according to product design. Never fill a missing portrait with:

- Unsplash/stock people;
- AI-generated faces;
- avatars implying likeness;
- another politician/candidate;
- an image selected only because search terms matched a name;
- an unlabeled historical image that may depict a different person.

Generic civic imagery may be used decoratively only when the UI clearly does not imply that it depicts the Person.

## MediaAsset model
Suggested fields:

```text
media_asset_id
subject_type
subject_id
media_type
media_classification
source_id
source_page_url
direct_asset_url
retrieval_id
preserved_artifact_id
retrieved_at
mime_type
byte_length
sha256
width
height
duration where applicable
caption_source_text
alt_text_source_text
source_authority
identity_association_method
identity_state
identity_evidence_ids
rights_state
license_or_usage_basis
attribution_text
attribution_url
currentness_state
effective_from/effective_to where known
historical_context
public_eligibility
operator_notes
supersedes_media_asset_id
```

Do not require irrelevant fields for every media type.

## Media classifications
Use explicit classifications such as:

- OFFICIAL_GOVERNMENT_PORTRAIT
- OFFICIAL_CAMPAIGN_PORTRAIT
- OFFICIAL_GOVERNMENT_EVENT
- OFFICIAL_CAMPAIGN_EVENT
- GOVERNMENT_BUILDING_OR_OFFICE
- DISTRICT_MAP
- GOVERNMENT_DOCUMENT_IMAGE
- ORGANIZATION_LOGO
- CAMPAIGN_LOGO
- HISTORICAL_PORTRAIT
- NEWS_OR_EDITORIAL_IMAGE
- GENERIC_CIVIC_DECORATIVE
- OTHER_VERIFIED_MEDIA
- IDENTITY_UNRESOLVED

Classification does not by itself grant usage rights.

## Portrait source preference
For a current official/candidate portrait, prefer sources approximately in this order when identity and usage requirements are satisfied:

1. official government profile/roster portrait;
2. official campaign portrait/site;
3. official election filing/ballot media where provided;
4. other authoritative/licensable identity-verified source;
5. no portrait.

Do not prefer a visually attractive stock result over a less polished but verified official portrait.

## Identity association
An image is not identity-verified merely because its filename, alt text, or search result contains the Person's name.

Identity association methods may include:

- embedded on the authoritative government profile for the Person;
- embedded on the official campaign profile for the CandidateCampaign;
- explicit government/campaign caption identifying the Person;
- authoritative structured record linking asset to Person ID;
- other reviewed evidence-backed association.

Automated face recognition must not be the sole basis for assigning a real-person identity. If used as an internal consistency aid, it requires separate policy/review and may not override authoritative provenance.

## Source page requirement
Preserve both the direct asset URL and the page/record that establishes context/identity whenever possible.

A raw CDN image URL alone may prove bytes but not who the image depicts. The source page/caption/structured record provides identity context.

## Retrieval and integrity
Media retrievals use the canonical Retrieval/Evidence infrastructure. Preserve where policy permits:

- original bytes;
- MIME type;
- byte length;
- SHA-256;
- dimensions/duration;
- retrieval timestamp;
- source URL/page;
- redirects/resolution metadata.

Hash mismatches or truncated downloads create integrity failures.

## Rights and usage metadata
CivicLenZ must track known rights/usage/attribution information separately from identity truth.

Suggested rights states:

- PUBLIC_DOMAIN_CONFIRMED
- GOVERNMENT_USE_BASIS_CONFIRMED
- LICENSE_CONFIRMED
- ATTRIBUTION_REQUIRED
- SOURCE_TERMS_REVIEWED
- RIGHTS_UNRESOLVED
- RESTRICTED_DO_NOT_PUBLISH

Do not infer public-domain status solely because an image appears on a government website. Applicable law/source terms and canonical policy govern publication eligibility.

An identity-verified asset with unresolved usage rights may remain available to authorized operators while being ineligible for public projection.

## Current vs historical portraits
People and offices change over time. Preserve historical media rather than overwriting it.

Track effective/currentness context so the UI can distinguish:

- current official portrait;
- current campaign portrait;
- former-office portrait;
- historical campaign portrait;
- historical event image.

A historical portrait may be authentic but inappropriate as the default current profile image if a newer eligible verified asset exists.

## Seat vs Person media
Do not attach all media directly to Person. Some media belongs to:

- Seat;
- jurisdiction;
- government building;
- district/boundary;
- Election;
- CandidateCampaign;
- organization;
- evidence/document.

A campaign logo belongs to CandidateCampaign/committee context, not permanently to the Person.

## Campaign media preservation
Campaign sites may disappear after elections. Archive eligible campaign portraits/logos and their context pages with retrieval date/hash and CandidateCampaign linkage.

Do not silently reuse an old campaign image for a later campaign without currentness/context metadata.

## Map media
District maps and GIS renderings must identify the underlying authoritative/operational boundary source, version/vintage, geometry hash, rendering method, and effective period.

A rendered map image is not a substitute for the underlying geometry/evidence chain.

## Document images and screenshots
Screenshots may be useful for operator evidence, but should not replace preserved source bytes/structured evidence when those are available.

If a screenshot is used, record the source retrieval, page/viewport context, capture time, and relationship to the underlying evidence.

Do not use screenshots containing tiny unreadable text as primary public evidence when a direct document/page view is available.

## Media selection policy
Default profile-media selection should be deterministic and explainable. Example selection factors:

1. identity_state is verified/eligible;
2. public rights/usage state permits display;
3. appropriate media classification for context;
4. currentness;
5. source authority;
6. technical quality/resolution;
7. stable preserved artifact available.

Do not allow aesthetic ranking to override identity or rights eligibility.

## Duplicate and variant handling
Use content hashes/perceptual similarity where appropriate to identify exact/near duplicates, but preserve provenance for distinct source occurrences when meaningful.

Track variants/crops/resizes derived from one original asset. The canonical original remains identifiable.

Do not count generated thumbnails/resizes as additional portrait coverage.

## Media transformations
Any crop, resize, compression, background treatment, or other transformation used for presentation must retain lineage to the original MediaAsset and transformation parameters/version.

Transformations may not alter the identity or materially misrepresent civic context.

AI-generated or materially synthetic transformations of real officials/candidates must not be used as documentary/identity evidence. Product policy may prohibit them entirely in identity surfaces.

## Media monitoring
Monitor current official/campaign profile sources for asset changes where appropriate. A new image creates a new MediaAsset/version; do not delete historical assets.

Monitoring should detect:

- source image changed;
- source page removed/moved;
- asset URL broken;
- rights/terms changed where monitored;
- current portrait became stale;
- identity context changed.

## Media failure states
Use explicit states such as:

- MEDIA_NOT_RESEARCHED
- MEDIA_RESEARCHING
- NO_AUTHORITATIVE_MEDIA_FOUND_AS_OF
- IDENTITY_UNRESOLVED
- RIGHTS_UNRESOLVED
- SOURCE_UNAVAILABLE
- ASSET_BROKEN
- INTEGRITY_FAILURE
- HISTORICAL_ONLY
- PUBLICATION_INELIGIBLE
- CURRENT_ELIGIBLE

`NO_AUTHORITATIVE_MEDIA_FOUND_AS_OF` requires a defined search scope/cutoff; it is not a permanent assertion that no image exists.

## Operator media audit
Operator/development UI should expose:

- selected/default asset;
- alternative candidate assets;
- classification;
- identity state/method/evidence;
- source page;
- direct asset;
- preserved artifact/hash;
- retrieval date;
- rights/usage state;
- currentness;
- transformations;
- monitoring state;
- failures/conflicts.

Operators should be able to understand exactly why an image was selected or rejected.

## Public media UX
Public profile surfaces should display only eligible assets. Source/attribution controls should be shown where required/useful without exposing internal trace machinery.

If no eligible portrait exists, present the no-image state intentionally and consistently rather than implying a system error.

## Media dashboard metrics
Physical metrics may include:

- Persons with current eligible verified portrait;
- CandidateCampaigns with eligible campaign portrait;
- identity unresolved;
- rights unresolved;
- historical-only;
- broken source/asset;
- media monitoring stale;
- duplicate assets;
- provenance incomplete.

Every metric must use the dashboard MetricDefinition contract. Generic decorative stock assets do not count as Person portrait coverage.

## Media source discovery
Search/image search may discover candidate media, but discovery results are not automatically eligible assets. The system must follow to the underlying source/context, retrieve/preserve it, establish identity association, and determine usage eligibility.

Never save a search thumbnail as canonical portrait evidence merely because it appears relevant.

## Evidence linkage
MediaAsset identity/context claims should link to EvidenceObjects/SourceLocators where applicable. Example:

`Person P depicted by MediaAsset M` should be supported by the authoritative profile/caption/structured association that establishes the identity.

This lets media participate in the same claim/evidence/trace model as textual facts.

## Acceptance tests
Create representative tests verifying:

1. Stock/random portrait cannot satisfy Person portrait requirement.
2. Search thumbnail alone cannot become canonical portrait.
3. Official profile page + linked image can retain both context and asset provenance.
4. Identity-unresolved media does not render as Person portrait.
5. Rights-unresolved asset is withheld from public projection when required.
6. Historical portrait does not silently replace a newer current eligible asset.
7. Direct asset and source-context page remain linked.
8. SHA-256/byte integrity is preserved.
9. Thumbnail/crop retains lineage to original.
10. Dashboard portrait coverage counts only eligible physical MediaAsset records.
11. Broken original URL retains preserved artifact/history where policy permits.
12. Public UI renders a neutral no-image state instead of an unrelated person.

## Continuous operation
Media research is part of ongoing civic monitoring. Missing or unresolved media creates bounded research work but does not stop unrelated profile/election research. Successful portrait acquisition is a checkpoint; source/currentness monitoring continues.