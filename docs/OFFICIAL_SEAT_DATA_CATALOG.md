# CivicLenZ Seat-Centered Data Catalog

## Operating principle

CivicLenZ monitors **the elected seat**, not merely the person. A seat has a permanent identity. Every person who occupies it receives a distinct office-term record. When an officeholder leaves, resigns, dies, is removed, loses reelection, changes districts, or moves to another office, the old term is closed and preserved; the seat continues with a vacancy, acting occupant, or new officeholder.

Every public profile uses the same research card. Empty sections remain visible and say what has not yet been collected. No missing section is silently treated as zero, clean, neutral, or complete.

## Core entities

1. `seat` — permanent office/seat identity.
2. `person` — stable identity for the human being.
3. `office_term` — the person occupying the seat during a defined period.
4. `claim` — a structured fact, quotation, promise, action, score input, or finding.
5. `evidence` — preserved source supporting or contradicting a claim.
6. `asset` — image, PDF, HTML snapshot, audio, video, OCR, transcript, map, or filing.
7. `methodology` — versioned rule used to calculate a tracker or score.
8. `monitoring_job` — scheduled or event-driven collection work.

## Complete data card

The following catalog defines the standard data card for every elected seat. It contains more than 200 distinct data elements.

### A. Seat identity and legal structure

1. Seat ID.
2. Seat key/slug.
3. Official seat name.
4. Short seat name.
5. Normalized office type.
6. Government level.
7. Branch.
8. Chamber.
9. Jurisdiction ID.
10. Jurisdiction name.
11. State code.
12. County.
13. Municipality.
14. School district.
15. Special district.
16. District number.
17. District name.
18. At-large status.
19. Seat number/place/group.
20. Partisan or nonpartisan status.
21. Authority summary.
22. Statutory or constitutional authority.
23. Responsibilities.
24. Eligibility requirements.
25. Residency requirements.
26. Age requirements.
27. Professional-license requirements.
28. Term length.
29. Term-limit rule.
30. Compensation/salary.
31. Benefits summary.
32. Election method.
33. Primary/runoff method.
34. Succession method.
35. Vacancy-filling method.
36. Recall/removal mechanism.
37. Oath requirement.
38. Seat creation date.
39. Seat abolition date.
40. Legal source URLs.

### B. Geography and representation

41. Current boundary version.
42. Boundary effective date.
43. District map.
44. GeoJSON/shape asset.
45. Counties represented.
46. Municipalities represented.
47. ZIP codes represented.
48. Census tracts represented.
49. Population represented.
50. Voting-age population.
51. Registered-voter count.
52. Party-registration distribution.
53. Demographic summary.
54. Redistricting history.
55. Predecessor district/seat.
56. Successor district/seat.
57. Overlapping federal district.
58. Overlapping state districts.
59. Overlapping school districts.
60. Overlapping special districts.

### C. Current occupancy and term

61. Occupancy status.
62. Current person ID.
63. Current term ID.
64. Start date.
65. Assumed-office date.
66. Sworn-in date.
67. Scheduled end date.
68. Actual end date.
69. Term number.
70. Elected, appointed, acting, or succeeded.
71. Appointment authority.
72. Appointment date.
73. Confirmation requirement.
74. Confirmation vote/result.
75. Vacancy start date.
76. Vacancy reason.
77. Acting officeholder.
78. Disputed-office status.
79. Term-limit status.
80. Next election date.
81. Filing deadline.
82. Qualifying period.
83. Primary date.
84. Runoff date.
85. General-election date.
86. Previous occupants.
87. Successor.
88. Seat-change event history.
89. Last occupancy verification.
90. Occupancy source evidence.

### D. Person identity and portrait

91. Canonical person ID.
92. Full legal name.
93. Display name.
94. First name.
95. Middle name.
96. Last name.
97. Suffix.
98. Preferred name.
99. Former names.
100. Aliases/nicknames.
101. Pronunciation.
102. Birth date.
103. Birthplace.
104. Hometown.
105. General residence.
106. Citizenship/public eligibility facts.
107. Languages spoken.
108. Public family summary.
109. External IDs: Bioguide.
110. External IDs: FEC.
111. External IDs: state candidate ID.
112. External IDs: ethics-filing ID.
113. External IDs: OpenStates or other crosswalks.
114. Official portrait URL.
115. Saved portrait asset ID.
116. Portrait source page.
117. Portrait source hash.
118. Portrait credit.
119. Portrait copyright/license status.
120. Portrait captured date.

**Portrait rule:** Google or another search engine may be used to locate a source, but CivicLenZ does not blindly copy search-result images. Priority is official government portrait, then official campaign portrait, then public-domain or clearly licensed media. Every saved image requires source URL, credit, rights status, hash, and retrieval date.

### E. Official contact and public access

121. Official website.
122. Campaign website.
123. Contact form.
124. Constituent-services page.
125. Public-records page.
126. Appointment-request page.
127. Newsletter signup.
128. Official email.
129. Campaign email.
130. Main phone.
131. District-office phone.
132. Capitol/headquarters phone.
133. Fax.
134. Public text number.
135. Main office address.
136. District-office addresses.
137. Mailing address.
138. Office hours.
139. Accessibility information.
140. Staff directory.
141. Chief of staff.
142. Legislative director/policy staff.
143. Press contact.
144. Scheduler contact.
145. Public-records custodian.

### F. Social and communications accounts

146. X/Twitter official account.
147. X/Twitter campaign account.
148. Facebook official account.
149. Facebook campaign account.
150. Instagram official account.
151. Instagram campaign account.
152. YouTube account.
153. TikTok account.
154. LinkedIn account.
155. Threads account.
156. Bluesky account.
157. Truth Social account.
158. Telegram channel.
159. Podcast feed.
160. Newsletter archive.
161. Account type.
162. Handle.
163. Verification status.
164. Active/inactive status.
165. First observed date.
166. Last checked date.
167. Archived-post availability.

### G. Biography, education, military, and career

168. Short biography.
169. Long biography.
170. Education institution.
171. Degree.
172. Field of study.
173. Attendance dates.
174. Graduation status.
175. Honors.
176. Licenses/certifications.
177. Military branch.
178. Component.
179. Rank.
180. Service dates.
181. Units.
182. Deployments.
183. Awards.
184. Employer/organization.
185. Job title.
186. Sector.
187. Employment dates.
188. Job description.
189. Business ownership.
190. Nonprofit roles.
191. Union/professional memberships.
192. Prior elected offices.
193. Prior appointed offices.
194. Party roles.
195. Campaign staff roles.
196. Lobbying history where publicly reportable.
197. Revolving-door flags.
198. Biography evidence.

### H. Elections and campaigns

199. Election ID.
200. Election date.
201. Election type.
202. Office contested.
203. District/seat.
204. Candidate status.
205. Filing date.
206. Qualification status.
207. Ballot status.
208. Party.
209. Running mate.
210. Incumbency status.
211. Opponents.
212. Votes received.
213. Vote percentage.
214. Margin.
215. Result.
216. Recount status.
217. Contest/litigation status.
218. Endorsements.
219. Debate participation.
220. Campaign platform URL.
221. Campaign issues.
222. Campaign advertisements.
223. Campaign mailers.
224. Election evidence.

### I. Promises and commitments

225. Promise ID.
226. Exact promise text.
227. Normalized title.
228. Plain-language summary.
229. Speaker.
230. Date.
231. Venue.
232. Campaign/office context.
233. Source URL.
234. Archived source.
235. Screenshot/video/audio asset.
236. Transcript timestamp.
237. Context before and after.
238. Issue tags.
239. Geographic scope.
240. Target population.
241. Promised action.
242. Promised outcome.
243. Quantitative target.
244. Deadline/target date.
245. Conditions/qualifiers.
246. Responsible authority.
247. Whether officeholder has power to deliver.
248. Measurability rating.
249. Baseline value.
250. Current value.
251. Status: not started.
252. Status: in progress.
253. Status: kept.
254. Status: partially kept.
255. Status: compromised.
256. Status: broken.
257. Status: blocked.
258. Status: reversed.
259. Status: unclear.
260. Progress percentage.
261. Status reason.
262. Blocking authority/event.
263. Official response.
264. Supporting evidence.
265. Contradicting evidence.
266. Last evaluation date.
267. Confidence.
268. Human-review status.
269. Promise revision history.

### J. Statements and positions

270. Statement ID.
271. Exact quote.
272. Date.
273. Venue.
274. Transcript timestamp.
275. Context.
276. Topic tags.
277. Position label.
278. Sentiment is not treated as fact.
279. Official clarification.
280. Retraction/correction.
281. Contradictory statements.
282. Position-change timeline.
283. Source and archive.
284. Human-review status.

### K. Legislative, executive, judicial, and administrative actions

285. Action ID.
286. Action type.
287. Title.
288. Identifier/bill/order/case/contract number.
289. Date.
290. Role: sponsor, cosponsor, voter, signer, vetoer, appointer, judge, board member, etc.
291. Status.
292. Summary.
293. Full text/document.
294. Vote cast.
295. Roll-call number.
296. Attendance/presence.
297. Sponsorship date.
298. Cosponsorship date.
299. Committee referral.
300. Committee vote.
301. Floor vote.
302. Final passage.
303. Signature/veto.
304. Veto override.
305. Executive order.
306. Proclamation.
307. Appointment.
308. Removal/termination.
309. Budget proposal.
310. Budget vote.
311. Appropriation amount.
312. Fiscal impact.
313. Procurement/contract action.
314. Rulemaking action.
315. Enforcement action.
316. Litigation position.
317. Judicial ruling where the seat is judicial.
318. Meeting attendance.
319. Public meeting vote.
320. Recusal.
321. Issue tags.
322. Beneficiaries/affected groups.
323. Evidence and archive.

### L. Committees, boards, leadership, and appointments

324. Committee/board name.
325. Role type.
326. Title.
327. Chair/vice-chair/ranking status.
328. Appointment authority.
329. Start date.
330. End date.
331. Current/former.
332. Committee jurisdiction.
333. Committee attendance.
334. Committee votes.
335. Caucus memberships.
336. Legislative leadership position.
337. Intergovernmental boards.
338. Public authorities/commissions.
339. Appointment evidence.

### M. Campaign and political finance

340. Election cycle.
341. Candidate committee.
342. Committee ID.
343. Treasurer.
344. Filing status.
345. Total raised.
346. Total spent.
347. Cash on hand.
348. Debt.
349. Loans.
350. Refunds.
351. Individual contributions.
352. PAC contributions.
353. Party contributions.
354. Self-funding.
355. Public financing.
356. In-kind contributions.
357. Top donors.
358. Donor occupations.
359. Donor employers.
360. Industry aggregation.
361. Geographic donor distribution.
362. Expenditure vendors.
363. Expenditure purposes.
364. Independent expenditures supporting.
365. Independent expenditures opposing.
366. Electioneering communications.
367. Late filings.
368. Amended filings.
369. Finance penalties/violations.
370. Last filing date.
371. Filing documents and evidence.

### N. Financial disclosures and personal financial interests

372. Disclosure ID.
373. Disclosure type.
374. Reporting period.
375. Filing date.
376. Amendment date.
377. Late status.
378. Income sources.
379. Asset categories.
380. Asset value ranges.
381. Liability categories.
382. Liability value ranges.
383. Real-property interests.
384. Business interests.
385. Board/director roles.
386. Gifts.
387. Travel.
388. Honoraria.
389. Spouse/dependent interests where lawfully public.
390. Blind trust status.
391. Estimated net-worth range only where methodologically supportable.
392. Disclosure document.
393. OCR text.
394. Human-reviewed extraction.
395. Conflict comparisons against actions and donors.

### O. Ethics, integrity, audits, and legal record

396. Matter ID.
397. Matter type.
398. Procedural status.
399. Title.
400. Authority.
401. Court/agency/case number.
402. Opened date.
403. Closed date.
404. Allegation summary.
405. Complaint.
406. Inquiry.
407. Investigation.
408. Charge.
409. Enforcement action.
410. Finding.
411. Settlement without admission.
412. Dismissal.
413. Acquittal.
414. Conviction.
415. Final adverse determination.
416. Appeal.
417. Reversal.
418. Official response.
419. Final disposition.
420. Fine/penalty.
421. Corrective action.
422. Audit finding.
423. Inspector-general finding.
424. Public-records compliance.
425. Campaign-finance compliance.
426. Disclosure compliance.
427. Recusal/conflict action.
428. Evidence.
429. Human review.
430. Confidence.

**Integrity rule:** allegations are never presented as findings. Every item prominently displays procedural status and official response.

### P. Relationships and influence network

431. Relationship type.
432. Related person/entity.
433. Organization ID.
434. Employer.
435. Business ownership.
436. Family business interest where lawfully public.
437. Donor relationship.
438. Endorser relationship.
439. Appointer relationship.
440. Staff relationship.
441. Lobbyist/client relationship.
442. Vendor/contractor relationship.
443. Board membership.
444. Dates.
445. Relevance note.
446. Conflict flag.
447. Evidence.

### Q. Performance and civic metrics

448. Attendance rate.
449. Voting participation.
450. Committee attendance.
451. Responsiveness.
452. Constituent-service responsiveness.
453. Public-record responsiveness.
454. Transparency.
455. Disclosure timeliness.
456. Campaign-filing timeliness.
457. Promise-keeping.
458. Legislative effectiveness.
459. Bill passage.
460. Bipartisan collaboration.
461. Budget performance where applicable.
462. Audit remediation.
463. Ethics/compliance metric.
464. Civic engagement.
465. Methodology version.
466. Measurement period.
467. Numerator.
468. Denominator.
469. Completeness.
470. Confidence.
471. Evidence IDs.
472. Human-review status.
473. Calculation history.

### R. Issue trackers

474. Tracker ID.
475. Tracker name.
476. Applicability to seat.
477. Framework version.
478. Measurement period.
479. Overall score.
480. Overall status.
481. Analysis.
482. Completeness.
483. Confidence.
484. Pillar name.
485. Pillar description.
486. Pillar score.
487. Pillar status.
488. Pillar analysis.
489. Supporting quotes.
490. Supporting votes.
491. Supporting bills.
492. Supporting actions.
493. Contradicting evidence.
494. Official response.
495. Last evaluation.

Initial standard tracker framework:

- MAHA Position Tracker.
- DOGE / Government Efficiency.
- Border & Immigration.
- Energy Independence.
- Trade & Tariffs.
- Education & School Choice.
- Fraud & Integrity Monitor.
- Additional seat-specific local/state/federal trackers.

### S. News, media, meetings, and real-time activity

496. News record ID.
497. Headline.
498. Publisher.
499. URL.
500. Publication date.
501. Article summary.
502. Topic tags.
503. Mention type.
504. Official response.
505. Correction/retraction.
506. Press release.
507. Newsletter.
508. Speech.
509. Interview.
510. Debate.
511. Hearing.
512. Town hall.
513. Public meeting.
514. Calendar event.
515. Vote alert.
516. Filing alert.
517. Seat vacancy/change alert.
518. Archived copy.
519. Duplicate-story cluster.
520. Review status.

### T. Evidence, provenance, and quality controls

521. Evidence ID.
522. Evidence type.
523. Source URL.
524. Canonical URL.
525. Archive URL.
526. Publisher.
527. Publisher type.
528. Source tier.
529. Title.
530. Publication time.
531. Capture time.
532. HTTP status.
533. ETag.
534. Last-Modified header.
535. MIME type.
536. Content SHA-256.
537. Saved asset ID.
538. Screenshot asset.
539. PDF asset.
540. OCR asset.
541. Transcript asset.
542. Exact excerpt.
543. Page number.
544. Transcript timestamp.
545. Speaker.
546. Context before.
547. Context after.
548. Language.
549. Extraction method.
550. Copyright/licensing status.
551. Credit.
552. Claim relationship: supports.
553. Claim relationship: contradicts.
554. Claim relationship: contextualizes.
555. Official response.
556. Machine validation.
557. Human-review status.
558. Reviewer.
559. Review time.
560. Superseded evidence.

### U. Monitoring and operational status

561. Collection agent.
562. Source manifest entry.
563. Job ID.
564. Job type.
565. Refresh class.
566. Last attempted run.
567. Last successful run.
568. Next run.
569. Expected record count.
570. Actual record count.
571. New records.
572. Changed records.
573. Removed records.
574. Rejected records.
575. Parser version.
576. Source-layout version.
577. Failure reason.
578. Retry count.
579. Dead-letter status.
580. Stale sections.
581. Section completeness.
582. Profile research stage.
583. Last human review.
584. Correction requests.
585. Publication status.
586. Data export status.

## Evidence and scoring gates

- A profile section can be visible while empty.
- Empty does not equal zero, neutral, clean, or not applicable.
- A promise requires attributable exact wording and preserved evidence.
- A promise status requires measurable comparison evidence and a stated reason.
- A score requires a published methodology version, time period, numerator/denominator where applicable, completeness, confidence, evidence IDs, and human-review state.
- An integrity matter requires procedural-status labeling and an official-response field.
- A portrait requires source, credit, rights status, hash, and retrieval date.
- Seat occupancy changes are never allowed to overwrite prior-term evidence.

## Collection priority

1. Seat and current officeholder identity.
2. Official portrait and contact channels.
3. Term, election, committee, and biography data.
4. Promises and attributable statements.
5. Bills, votes, actions, budgets, appointments, and decisions.
6. Campaign finance and disclosures.
7. Issue trackers and performance metrics.
8. Integrity, relationship, and conflict comparisons.
9. News and continuous monitoring.
