# CivicLenZ Scoring Methodology Framework

## 1. Purpose

CivicLenZ scores should help users understand measurable public performance without turning policy agreement into a judgment of civic quality. Scores must be evidence-based, reproducible, versioned, and accompanied by completeness and confidence information.

This document defines the scoring framework. Exact formulas and weights should be finalized only after testing across multiple office types and jurisdictions.

## 2. Score families

### Civic performance scores

These measure conduct or performance that can be applied consistently across political viewpoints:

- Transparency.
- Responsiveness.
- Promise Keeping.
- Attendance and participation.
- Legislative or executive effectiveness.
- Integrity.
- Overall Civic score.

### Position and alignment scores

These describe where an official stands relative to a clearly defined issue framework, such as MAHA, government efficiency, school choice, immigration, energy, or trade.

Position/alignment scores must remain separate from civic performance. Supporting or opposing an issue does not, by itself, make an official more or less transparent, responsive, effective, or ethical.

## 3. Mandatory score metadata

Every published score must include:

- `score_id`.
- Official/person and office-term context.
- Score type.
- Numeric value and scale.
- Status label.
- Measurement start and end dates.
- Methodology version.
- Input records and evidence IDs.
- Formula and weights.
- Missing-data rule.
- Completeness percentage.
- Confidence level.
- Automated model/rule versions used.
- Human review state.
- Calculated date.
- Prior score and change reason.
- Dispute/correction status.

## 4. General scoring rules

1. Do not score absent evidence as negative performance unless the methodology explicitly measures a disclosure obligation and the absence itself is verified.
2. Separate `unknown` from zero.
3. Use office-appropriate denominators.
4. Normalize measurement periods.
5. Preserve raw values before normalization.
6. Cap the effect of any single input unless the methodology explains why it should dominate.
7. Publish completeness and confidence beside the score.
8. Retain score history.
9. Recalculate when source records or methodology change.
10. Require review for material changes or sensitive integrity findings.

## 5. Transparency score

Possible input categories:

- Required disclosures filed on time.
- Public calendar or schedule availability.
- Public meeting and agenda availability.
- Vote and decision explanations.
- Budget, spending, contract, and financial reporting accessibility.
- Public-records request performance.
- Contact and staff information availability.
- Campaign finance reporting timeliness.
- Source/document accessibility.
- Correction and response practices.

The score should distinguish legal compliance from voluntary transparency.

### Example normalized structure

- Required disclosure compliance: 30%.
- Public decision-record accessibility: 20%.
- Calendar/meeting accessibility: 15%.
- Finance and spending transparency: 15%.
- Public-records performance: 10%.
- Contact and communication transparency: 10%.

These are provisional weights, not final production rules.

## 6. Responsiveness score

Possible inputs:

- Verified constituent response rate.
- Median response time.
- Casework resolution rate where public data exists.
- Accessibility of contact channels.
- Town halls and public engagement opportunities.
- Response to correction or right-of-response requests.
- Public-records response timeliness.

Do not fabricate responsiveness from social-media activity alone. When constituent response data is unavailable, publish low completeness rather than a confident score.

## 7. Promise Keeping score

Promise statuses:

- Kept.
- Partially kept.
- In progress.
- Compromised.
- Blocked.
- Broken.
- Reversed.
- Unclear.
- Not applicable.

Each promise should have a measurability rating and, where appropriate, a target date.

### Suggested base values

- Kept: 1.00.
- Partially kept: 0.60.
- In progress before target date: provisional/no final credit or limited interim credit.
- Compromised: 0.40–0.60 depending on documented delivery.
- Blocked: excluded from the main denominator or reported separately when the official took documented reasonable steps but lacked authority.
- Broken: 0.00.
- Reversed: 0.00, with a separate reversal flag.
- Unclear: excluded pending evidence.
- Not applicable: excluded.

The public score must disclose how in-progress and blocked promises are treated.

### Promise weighting

Avoid allowing the platform to subjectively declare one promise “more important” without a documented rule. Permissible weighting factors may include:

- Explicit prominence in the campaign platform.
- Frequency of repetition.
- Presence in formal policy documents.
- Stated deadline or first-day/first-100-days commitment.
- Office authority over delivery.
- Objective measurability.

## 8. Attendance and participation

Potential metrics:

- Roll-call participation.
- Committee attendance.
- Required meeting attendance.
- Abstentions and present votes.
- Excused absences.

The public value should show numerator, denominator, period, exclusions, and office-specific rules. Medical leave, military duty, bereavement, or other documented reasons should not be silently treated the same as unexplained absence.

## 9. Legislative effectiveness

For legislators, possible inputs include:

- Bills introduced.
- Bills advanced from committee.
- Bills passed in one chamber.
- Bills enacted.
- Substantive amendments adopted.
- Bipartisan cosponsorship.
- Leadership or committee responsibilities.

For executives and local officials, effectiveness requires a different model using implemented policies, budget delivery, executive actions, appointments, program outcomes, and authority constraints.

CivicLenZ should not compare unlike offices on a single raw effectiveness formula.

## 10. Integrity score

The integrity score is high impact and requires conservative rules.

Possible inputs:

- Final ethics findings.
- Final campaign-finance violations.
- Final court or regulatory determinations relevant to public duty.
- Disclosure failures.
- Verified conflicts of interest.
- Recusal compliance.
- Misuse of public resources findings.
- Corrections and cooperation.

Allegations, complaints, open investigations, charges, settlements without admission, dismissals, and final findings must have distinct treatments. Open allegations should not be converted into guilt or an automatic score penalty.

A public integrity score should show the underlying categories and permit review of the official response.

## 11. Overall Civic score

The overall Civic score may combine civic-performance dimensions only. It must not include ideological alignment.

A provisional framework could combine:

- Transparency.
- Responsiveness.
- Promise Keeping.
- Attendance/participation.
- Effectiveness.
- Integrity.

Before production, weights must be tested for:

- Office-type fairness.
- Missing-data bias.
- jurisdictional data availability.
- party/ideology neutrality.
- sensitivity to one-off events.
- ease of explanation and reproduction.

When major components lack sufficient evidence, the platform should withhold the overall score or publish it with an unmistakable low-completeness warning.

## 12. Issue-position trackers

Each issue tracker must define:

- The framework being measured.
- Pillars or subtopics.
- Inclusion and exclusion rules.
- Evidence period.
- Evidence types.
- Scoring direction.
- Contradiction treatment.
- Missing-data treatment.
- Status labels.

### Evidence weighting example

- Enacted law, signed/vetoed bill, final executive action, official vote, or implemented policy: highest weight.
- Sponsored legislation, formal budget proposal, regulatory action, or official platform: high weight.
- Direct public statement, testimony, debate response, or official written position: medium weight.
- Campaign surrogate statement, inferred association, or secondary description: low weight or context only.

Recent official actions may outweigh old campaign rhetoric, but the tracker must preserve and display the change.

## 13. Confidence and completeness

### Completeness

Completeness estimates how much of the expected evidence surface has been researched and validated.

Example inputs:

- Required sources checked.
- Applicable periods covered.
- Data fields populated.
- Conflicts resolved.
- Source freshness.

### Confidence

Confidence estimates how strongly the available evidence supports the result.

- High: multiple consistent primary records or a definitive authoritative record.
- Medium: good evidence with limited gaps or modest interpretation.
- Low: sparse, indirect, stale, or conflicting evidence.
- Insufficient: no responsible score should be published.

A high score with low completeness is not equivalent to a high score with high completeness.

## 14. Score labels

Labels should be neutral and defined by numeric ranges. Example civic-performance labels may include:

- Excellent.
- Strong.
- Fair.
- Needs improvement.
- Insufficient data.

Issue trackers should use descriptive labels such as:

- Strongly supports.
- Supports.
- Mixed or conditional.
- Neutral/unclear.
- Opposes.
- Strongly opposes.
- Unknown.

Avoid provocative labels such as “status quo,” “radical,” or “anti-” unless the term is part of the explicitly published framework and is applied consistently.

## 15. Recalculation and revision

Scores should recalculate when:

- New source evidence is published.
- A record is corrected or disputed.
- A promise deadline passes.
- A bill, policy, investigation, or case changes status.
- The measurement period closes.
- The methodology changes.

Methodology changes create a new version and should support historical backtesting where practical.

## 16. Public explanation requirements

The score detail page should provide:

- Plain-language explanation.
- Formula and weights.
- Input list.
- Missing-data handling.
- Evidence links.
- Score history.
- Comparison-period context.
- Confidence and completeness.
- Correction/dispute control.

## 17. Validation before launch

Before publishing production scores:

1. Test officials across parties and ideologies.
2. Test multiple office types and government levels.
3. Review outcomes for data-availability bias.
4. Have independent reviewers reproduce sample scores.
5. Conduct legal and editorial review of integrity-related labels.
6. Publish methodology and known limitations.
7. Create a correction and appeal workflow.
8. Freeze and version the launch formula.