-- Synchronize the production source registry with the already-reviewed,
-- adapter-backed official source families.  This is source metadata only: it
-- does not create subjects, seats, occupancies, claims, or research work.
-- Discovery remains unverified until a real routed worker run produces
-- evidence and the existing validation gates accept it.

WITH seed(source_key, name, source_url, source_type, authority_tier,
           jurisdiction_key, active, refresh_class, normal_poll_interval,
           election_poll_interval, rate_limit_policy, parser_key) AS (
  VALUES
    ('florida-senate-members',
     'Florida Senate — Senators',
     'https://www.flsenate.gov/Senators',
     'html_directory', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl', true, 'LOW', '24h', '6h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'html-directory'),
    ('florida-house-members',
     'Florida House of Representatives — Members',
     'https://www.flhouse.gov/Representatives',
     'html_directory', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl', true, 'LOW', '24h', '6h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'html-directory'),
    ('broward-county-soe',
     'Broward County Supervisor of Elections',
     'https://www.browardsoe.org/',
     'html_directory', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl-broward', true, 'MEDIUM', '24h', '2h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'county-source-discovery'),
    ('palm-beach-county-soe',
     'Palm Beach County Supervisor of Elections',
     'https://www.pbcelections.org/',
     'html_directory', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl-palm-beach', true, 'MEDIUM', '24h', '2h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'county-source-discovery'),
    ('florida-attorney-general',
     'Florida Attorney General — official agency site',
     'https://www.myfloridalegal.com/',
     'official_profile_page', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl', true, 'MEDIUM', '12h', '1h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'official-profile-discovery'),
    ('florida-cfo',
     'Florida Chief Financial Officer — official agency site',
     'https://www.myfloridacfo.com/',
     'official_profile_page', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl', true, 'MEDIUM', '12h', '1h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'official-profile-discovery'),
    ('florida-agriculture-commissioner',
     'Florida Commissioner of Agriculture — FDACS',
     'https://www.fdacs.gov/',
     'official_profile_page', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl', true, 'MEDIUM', '12h', '1h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'official-profile-discovery'),
    ('miami-dade-mayor-html',
     'Miami-Dade County Mayor — official page',
     'https://www.miamidade.gov/global/government/mayor/home.page',
     'official_profile_page', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl-miami-dade', true, 'MEDIUM', '24h', '2h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'official-profile-discovery'),
    ('miami-dade-county-commission-html',
     'Miami-Dade County Commission — official page',
     'https://www.miamidade.gov/global/government/commission/home.page',
     'html_directory', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl-miami-dade', true, 'MEDIUM', '24h', '2h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'county-source-discovery'),
    ('broward-county-commission',
     'Broward County Commission — official page',
     'https://www.broward.org/Commission/Pages/Default.aspx',
     'html_directory', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl-broward', true, 'MEDIUM', '24h', '2h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'county-source-discovery'),
    ('palm-beach-county-commission',
     'Palm Beach County Commission — official page',
     'https://discover.pbcgov.org/countycommission/Pages/default.aspx',
     'html_directory', 'TIER_1_PRIMARY_OFFICIAL', 'us-fl-palm-beach', true, 'MEDIUM', '24h', '2h',
     jsonb_build_object('minIntervalMs',15000,'maxConcurrent',1), 'county-source-discovery')
), resolved AS (
  SELECT s.*, j.jurisdiction_id, split_part(regexp_replace(s.source_url, '^https?://', ''), '/', 1) AS host
  FROM seed s
  LEFT JOIN public.jurisdictions j ON j.jurisdiction_key = s.jurisdiction_key
)
INSERT INTO public.sources (
  source_key, name, source_url, source_type, authority_tier, jurisdiction_id,
  host, active, refresh_class, normal_poll_interval, election_poll_interval,
  rate_limit_policy, parser_key, health_state
)
SELECT source_key, name, source_url, source_type, authority_tier, jurisdiction_id,
       host, active, refresh_class, normal_poll_interval::interval, election_poll_interval::interval,
       rate_limit_policy, parser_key, 'UNOBSERVED'
FROM resolved
WHERE jurisdiction_id IS NOT NULL
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  source_url = EXCLUDED.source_url,
  source_type = EXCLUDED.source_type,
  authority_tier = EXCLUDED.authority_tier,
  jurisdiction_id = EXCLUDED.jurisdiction_id,
  host = EXCLUDED.host,
  active = EXCLUDED.active,
  refresh_class = EXCLUDED.refresh_class,
  normal_poll_interval = EXCLUDED.normal_poll_interval,
  election_poll_interval = EXCLUDED.election_poll_interval,
  rate_limit_policy = EXCLUDED.rate_limit_policy,
  parser_key = EXCLUDED.parser_key,
  updated_at = clock_timestamp();

-- Do not silently claim discovery or source health.  New rows remain
-- UNOBSERVED until a real worker run records a result.
