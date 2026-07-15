# Master Elected-Official Profile Data Dictionary

This document defines the canonical information CivicLenZ should collect for each elected official. It is intentionally broader than the first public page so the platform can support research, monitoring, scoring, comparison, alerts, and future dashboards without redesigning the underlying data model.

The dictionary contains **22 profile sections plus a shared evidence and audit layer**, representing well over 100 normalized data points. Not every field will apply to every office. Inapplicable fields should be marked `not_applicable`; unavailable fields should be marked `unknown`; unsupported values must never be guessed.

## Common field behavior

Each field should support, where appropriate:

- Current value.
- Historical values.
- Effective start and end dates.
- Source evidence.
- Verification status.
- Confidence.
- Last checked and last changed timestamps.
- Public/private visibility.
- Reviewer and audit history.
- Conflict/dispute status.

## 1. Canonical identity

- `official_id`: CivicLenZ stable UUID.
- `canonical_person_id`: cross-office person identifier.
- `slug`.
- `full_legal_name`.
- `display_name`.
- `first_name`.
- `middle_name`.
- `last_name`.
- `suffix`.
- `preferred_name`.
- `former_names`.
- `pronouns_publicly_stated`.
- `portrait_url`.
- `portrait_source_url`.
- `portrait_credit`.
- `portrait_license`.
- `identity_aliases`.
- `external_identifiers`: government, election, finance, legislative, Wikidata, Ballotpedia, FEC, state IDs, and other recognized IDs.
- `duplicate_of_official_id`.
- `record_status`: active, former, candidate, deceased, duplicate, archived, draft.

## 2. Current office and term

- `office_id`.
- `office_title`.
- `office_short_title`.
- `office_type`.
- `branch`.
- `government_level`: municipal, county, regional, special district, school district, state, territorial, federal, tribal, judicial, other.
- `elected_or_appointed`.
- `current_office_status`.
- `seat_name`.
- `district_name`.
- `district_number`.
- `chamber`.
- `leadership_title`.
- `party_id`.
- `party_name`.
- `party_at_election`.
- `caucus`.
- `term_start`.
- `term_end`.
- `assumed_office_date`.
- `sworn_in_date`.
- `term_number`.
- `term_limit_status`.
- `term_limit_date`.
- `predecessor_person_id`.
- `successor_person_id`.
- `vacancy_status`.
- `office_authority_summary`.
- `office_responsibilities`.

## 3. Jurisdiction and geographic representation

- `jurisdiction_id`.
- `jurisdiction_name`.
- `jurisdiction_type`.
- `state_code`.
- `county_names`.
- `municipality_names`.
- `represented_zip_codes`.
- `represented_precincts`.
- `represented_wards`.
- `represented_school_zones`.
- `district_geometry_id`.
- `district_boundary_version`.
- `district_boundary_effective_date`.
- `district_map_url`.
- `population_represented`.
- `registered_voters`.
- `constituency_summary`.
- `address_lookup_priority`.
- `geographic_data_source`.

## 4. Contact and public access

- `official_email`.
- `office_email`.
- `campaign_email`.
- `public_phone`.
- `office_phone`.
- `district_phone`.
- `capitol_phone`.
- `text_phone`.
- `fax`.
- `mailing_address`.
- `district_office_addresses`.
- `capitol_office_address`.
- `office_hours`.
- `public_website_url`.
- `official_profile_url`.
- `campaign_website_url`.
- `contact_form_url`.
- `appointment_request_url`.
- `public_records_request_url`.
- `constituent_services_url`.
- `newsletter_signup_url`.
- `accessibility_contact`.
- `languages_supported`.
- `contact_verified_at`.

## 5. Social, digital, and communications channels

For each channel, store handle, canonical URL, account type, verification status, owner, active status, follower/subscriber count where lawful and available, first seen, last checked, and archive references.

- `x_twitter_accounts`.
- `facebook_accounts`.
- `instagram_accounts`.
- `youtube_accounts`.
- `linkedin_accounts`.
- `tiktok_accounts`.
- `threads_accounts`.
- `bluesky_accounts`.
- `truth_social_accounts`.
- `mastodon_accounts`.
- `telegram_accounts`.
- `other_social_accounts`.
- `podcasts`.
- `email_newsletters`.
- `rss_feeds`.
- `communications_staff_contacts`.

## 6. Biography and personal background

Only collect information that is public, relevant, and lawful. Sensitive attributes should not be inferred.

- `biography_short`.
- `biography_long`.
- `birth_date`.
- `birthplace`.
- `age_derived`.
- `hometown`.
- `current_residence_general`.
- `citizenship_public_record`.
- `marital_status_publicly_disclosed`.
- `spouse_or_partner_public_name`.
- `children_count_publicly_disclosed`.
- `parents_publicly_relevant`.
- `family_background_summary`.
- `languages_spoken`.
- `religious_affiliation_self_disclosed`.
- `community_identity_self_disclosed`.
- `personal_interests_publicly_stated`.
- `notable_life_events`.
- `date_of_death`.
- `burial_or_memorial_information`.

## 7. Education, credentials, and training

- `secondary_schools`.
- `undergraduate_degrees`.
- `graduate_degrees`.
- `professional_degrees`.
- `honorary_degrees`.
- `certifications`.
- `licenses`.
- `fellowships`.
- `executive_education`.
- `apprenticeships`.
- `academic_honors`.
- `student_leadership`.
- `education_claim_verification`.
- `credential_status`.

Each education entry should include institution, program, degree, field, location, start/end dates, graduation status, honors, source, and verification.

## 8. Military and public service

- `military_service_status`.
- `military_branch`.
- `service_component`.
- `rank`.
- `service_start`.
- `service_end`.
- `units`.
- `deployments`.
- `occupational_specialty`.
- `awards_and_decorations`.
- `discharge_type_public_record`.
- `veteran_status`.
- `peace_corps_or_national_service`.
- `other_public_service`.
- `service_claim_verification`.

## 9. Professional, business, and nonprofit career

- `career_summary`.
- `employment_history`.
- `employer_names`.
- `job_titles`.
- `employment_start_end_dates`.
- `industry_sectors`.
- `professional_practice_areas`.
- `business_ownership_history`.
- `business_entity_roles`.
- `nonprofit_roles`.
- `board_memberships`.
- `academic_positions`.
- `media_positions`.
- `union_or_trade_roles_public_record`.
- `professional_associations`.
- `career_achievements`.
- `career_claim_verification`.
- `employment_conflict_flags`.

## 10. Political history and offices held

- `political_career_summary`.
- `prior_elected_offices`.
- `prior_appointed_offices`.
- `campaign_staff_roles`.
- `party_organization_roles`.
- `government_staff_roles`.
- `transition_team_roles`.
- `delegations`.
- `leadership_positions`.
- `caucus_memberships`.
- `committee_history`.
- `political_mentors_public_record`.
- `endorsement_history`.
- `party_switch_history`.
- `resignations`.
- `removals`.
- `recall_history`.
- `impeachment_history`.
- `succession_events`.
- `political_timeline`.

## 11. Committees, boards, appointments, and staff

- `current_committees`.
- `committee_roles`.
- `subcommittees`.
- `task_forces`.
- `boards_and_commissions`.
- `intergovernmental_bodies`.
- `appointment_authority`.
- `appointments_made`.
- `nominations_made`.
- `nominations_received`.
- `confirmed_or_rejected_status`.
- `cabinet_or_department_leads`.
- `chief_of_staff`.
- `senior_staff`.
- `district_staff`.
- `communications_staff`.
- `staff_turnover_events`.
- `staff_conflict_flags`.

## 12. Elections and campaign history

- `candidate_status`.
- `next_election_date`.
- `filing_deadline`.
- `primary_date`.
- `general_election_date`.
- `election_type`.
- `ballot_status`.
- `incumbency_status`.
- `campaign_committee_name`.
- `campaign_committee_id`.
- `campaign_manager`.
- `campaign_treasurer`.
- `campaign_headquarters`.
- `campaign_slogan`.
- `campaign_platform_url`.
- `campaign_issues_url`.
- `archived_campaign_sites`.
- `endorsements_received`.
- `endorsements_given`.
- `debate_participation`.
- `candidate_questionnaires`.
- `voter_guides`.
- `election_results_history`.
- `vote_totals`.
- `vote_percentages`.
- `turnout`.
- `margin`.
- `opponents`.
- `recounts`.
- `election_challenges`.

## 13. Campaign finance and political money

- `total_raised_current_cycle`.
- `total_spent_current_cycle`.
- `cash_on_hand`.
- `debts_and_obligations`.
- `candidate_self_funding`.
- `small_donor_total`.
- `large_donor_total`.
- `individual_contribution_total`.
- `committee_contribution_total`.
- `party_contribution_total`.
- `pac_contribution_total`.
- `super_pac_support`.
- `outside_spending_support`.
- `outside_spending_opposition`.
- `independent_expenditures`.
- `in_kind_contributions`.
- `transfers`.
- `refunds`.
- `top_donors`.
- `top_employer_sources`.
- `top_industry_sources`.
- `geographic_donor_distribution`.
- `fundraising_events`.
- `bundlers`.
- `lobbyist_contributions`.
- `contractor_contributions`.
- `donor_conflict_flags`.
- `late_or_amended_reports`.
- `finance_violations`.
- `finance_penalties`.
- `campaign_spending_categories`.
- `vendors`.
- `related_committees`.
- `finance_report_links`.
- `finance_data_freshness`.

## 14. Campaign promises and commitments

Promise discovery must include campaign websites, platform/issues pages, archived sites, PDFs, voter guides, debates, speeches, advertisements, interviews, social posts, questionnaires, and explicit “will do” or “will not do” statements.

- `promise_id`.
- `promise_title`.
- `promise_text_exact`.
- `promise_normalized_summary`.
- `promise_type`.
- `issue_tags`.
- `promise_date`.
- `promise_context`.
- `promise_source_id`.
- `promise_target_date`.
- `promise_scope`.
- `promise_measurability`.
- `promise_status`: not_started, in_progress, kept, partially_kept, compromised, broken, blocked, reversed, unclear, not_applicable.
- `status_reason`.
- `progress_percentage`.
- `evidence_for_status`.
- `blocking_authority`.
- `official_response`.
- `last_evaluated_at`.
- `reviewer`.
- `promise_score_effect`.
- `promise_revision_history`.

## 15. Legislation, votes, executive actions, and decisions

- `bills_sponsored`.
- `bills_cosponsored`.
- `bills_authored`.
- `bills_signed`.
- `bills_vetoed`.
- `line_item_vetoes`.
- `executive_orders`.
- `administrative_orders`.
- `resolutions`.
- `ordinances`.
- `budget_proposals`.
- `budget_votes`.
- `appropriations_actions`.
- `tax_actions`.
- `contract_awards`.
- `procurement_actions`.
- `land_use_actions`.
- `regulatory_actions`.
- `appointments_and_confirmations`.
- `pardons_or_clemency`.
- `lawsuits_authorized`.
- `official_votes`.
- `missed_votes`.
- `abstentions`.
- `paired_or_present_votes`.
- `vote_explanations`.
- `party_line_variance`.
- `bipartisan_actions`.
- `legislative_outcomes`.
- `implementation_status`.
- `affected_jurisdictions`.
- `fiscal_impact`.
- `beneficiary_or_harmed_groups`.
- `source_record_links`.

## 16. Public statements and issue positions

- `statement_id`.
- `statement_date`.
- `statement_type`.
- `statement_exact_quote`.
- `statement_summary`.
- `speaker_context`.
- `venue_or_program`.
- `issue_tags`.
- `position_label`.
- `position_strength`.
- `position_start_date`.
- `position_end_date`.
- `position_current_status`.
- `supporting_actions`.
- `contradicting_actions`.
- `position_changes`.
- `contradiction_flags`.
- `fact_check_links`.
- `official_clarification`.
- `source_id`.
- `archived_media`.
- `transcript_or_timestamp`.

Issue trackers may include, but are not limited to, health policy, pharmaceuticals, agriculture, food standards, child health, government efficiency, education and school choice, border and immigration, energy, climate, trade and tariffs, public safety, housing, taxation, civil rights, labor, transportation, technology, and local priorities.

## 17. Governance, constituent service, and performance

- `attendance_rate`.
- `vote_participation_rate`.
- `committee_attendance_rate`.
- `meeting_attendance_rate`.
- `legislative_effectiveness`.
- `bill_passage_rate`.
- `bipartisan_collaboration_rate`.
- `constituent_response_rate`.
- `median_response_time`.
- `casework_volume_public_record`.
- `casework_resolution_rate`.
- `public_records_response_performance`.
- `office_accessibility`.
- `town_hall_frequency`.
- `public_meeting_frequency`.
- `press_availability`.
- `calendar_transparency`.
- `schedule_publication_rate`.
- `financial_reporting_timeliness`.
- `disclosure_timeliness`.
- `data_completeness_score`.
- `data_freshness_score`.
- `transparency_score`.
- `responsiveness_score`.
- `promise_keeping_score`.
- `integrity_score`.
- `overall_civic_score`.
- `performance_metric_period`.

## 18. Financial disclosures, assets, property, and interests

- `disclosure_filing_ids`.
- `disclosure_periods`.
- `income_sources`.
- `income_ranges`.
- `salary_public_office`.
- `outside_income`.
- `honoraria`.
- `gifts`.
- `travel_reimbursements`.
- `assets`.
- `liabilities`.
- `investment_accounts`.
- `stock_holdings`.
- `business_interests`.
- `partnership_interests`.
- `trusts`.
- `real_property_interests`.
- `property_locations_generalized`.
- `property_assessed_values`.
- `mortgages_public_record`.
- `spouse_financial_interests_public_record`.
- `dependent_interests_public_record`.
- `blind_trust_status`.
- `divestitures`.
- `recusal_commitments`.
- `disclosure_amendments`.
- `late_filings`.
- `unexplained_variance_flags`.
- `estimated_net_worth_range`.
- `net_worth_methodology`.

## 19. Ethics, legal, regulatory, and integrity record

Allegations, investigations, findings, charges, and convictions must be stored separately and labeled precisely.

- `ethics_complaints`.
- `ethics_investigations`.
- `ethics_findings`.
- `ethics_advisory_opinions`.
- `conflicts_of_interest`.
- `recusals`.
- `gift_rule_issues`.
- `lobbying_rule_issues`.
- `campaign_finance_enforcement`.
- `election_law_cases`.
- `civil_cases`.
- `criminal_cases`.
- `administrative_cases`.
- `regulatory_actions`.
- `subpoenas`.
- `audits`.
- `inspector_general_reports`.
- `whistleblower_claims`.
- `settlements`.
- `judgments`.
- `fines_and_penalties`.
- `sanctions`.
- `censures`.
- `reprimands`.
- `expulsions_or_removals`.
- `impeachment_actions`.
- `recall_actions`.
- `fraud_or_integrity_flags`.
- `official_response_to_issue`.
- `case_status`.
- `appeal_status`.
- `final_disposition`.
- `integrity_review_status`.

## 20. Organizations, networks, associates, and relationships

- `organizational_memberships`.
- `advocacy_group_relationships`.
- `think_tank_relationships`.
- `religious_organization_roles_public_record`.
- `civic_organization_roles`.
- `fraternal_organization_roles`.
- `alumni_networks`.
- `donor_networks`.
- `consultant_networks`.
- `lobbyist_relationships`.
- `vendor_relationships`.
- `business_partner_relationships`.
- `political_allies`.
- `political opponents`.
- `family_members_in_public_roles`.
- `staff_family_relationships`.
- `nepotism_flags`.
- `revolving_door_events`.
- `relationship_evidence`.
- `relationship_relevance_note`.

## 21. Media, news, public perception, and controversies

- `news_mentions`.
- `press_releases`.
- `official_blog_posts`.
- `interviews`.
- `speeches`.
- `debates`.
- `podcast_appearances`.
- `television_appearances`.
- `op_eds`.
- `advertisements`.
- `fact_checks`.
- `editorial_board_positions`.
- `endorsement_editorials`.
- `approval_polling`.
- `favorability_polling`.
- `issue_polling`.
- `awards_and_recognition`.
- `controversy_records`.
- `misinformation_or_correction_records`.
- `public_apologies`.
- `retractions`.
- `media_sentiment_derived`.
- `public_attention_trends`.
- `news_monitor_active`.
- `last_news_scan_at`.

## 22. Civic action, meetings, alerts, and live activity

- `active_petitions`.
- `historical_petitions`.
- `petition_targets`.
- `petition_signature_counts`.
- `petition_status`.
- `constituent_message_topics`.
- `public_comment_opportunities`.
- `upcoming_meetings`.
- `past_meetings`.
- `meeting_agendas`.
- `meeting_minutes`.
- `public_notices`.
- `town_halls`.
- `office_events`.
- `campaign_events`.
- `live_activity_status`.
- `recent_votes`.
- `recent_social_activity`.
- `recent_news_activity`.
- `recent_official_actions`.
- `alert_topics_available`.
- `subscription_options`.
- `last_activity_sync_at`.
- `last_profile_updated_at`.
- `profile_completeness_percentage`.
- `monitoring_health`.

# Shared evidence, verification, and audit layer

Every consequential record should reference one or more evidence objects containing:

- `evidence_id`.
- `claim_id`.
- `source_id`.
- `source_type`.
- `source_title`.
- `publisher_or_agency`.
- `author`.
- `canonical_url`.
- `archived_url`.
- `document_identifier`.
- `page_number`.
- `section_name`.
- `video_or_audio_timestamp`.
- `publication_date`.
- `event_date`.
- `retrieved_at`.
- `relevant_excerpt`.
- `full_text_hash`.
- `document_hash`.
- `evidence_role`: supports, contradicts, contextualizes, official_response.
- `source_tier`.
- `evidence_strength`.
- `verification_status`.
- `verification_method`.
- `verified_by`.
- `verified_at`.
- `confidence`.
- `conflict_status`.
- `copyright_or_usage_note`.
- `ingestion_job_id`.
- `parser_version`.
- `model_name_and_version`.
- `prompt_or_rule_version`.
- `human_review_required`.
- `publication_status`.
- `created_at`.
- `updated_at`.
- `change_reason`.
- `supersedes_record_id`.
- `correction_request_id`.
- `audit_event_ids`.

# Status vocabulary

Use consistent status values across the platform:

- Data state: `verified`, `partially_verified`, `unverified`, `conflicting`, `stale`, `unknown`, `not_applicable`.
- Record lifecycle: `draft`, `review`, `published`, `disputed`, `corrected`, `superseded`, `archived`.
- Evidence confidence: `high`, `medium`, `low`, `insufficient`.
- Source tier: `primary_official`, `primary_record`, `reputable_secondary`, `specialist_database`, `self_published`, `user_submitted`, `unknown`.

# Initial public-profile priority

The first implementation should prioritize:

1. Identity, office, jurisdiction, term, party, portrait, and contact.
2. Social and official web channels.
3. Biography, education, career, and political history.
4. Civic scores and supporting performance metrics.
5. Campaign promises, statements, votes, bills, policies, budgets, and executive actions.
6. Campaign finance and election history.
7. Issue-position trackers with source evidence.
8. Ethics/integrity records and official responses.
9. Petitions, news, meetings, alerts, and live activity.
10. Source transparency, data freshness, corrections, and audit history.