import { mapRegistryTier, type AuthorityTier } from "./authority.ts";
import { BROWSER_DIRECTORY_USER_AGENT } from "./types.ts";

export const SOURCE_TYPES = [
  "html_directory",
  "html_detail_page",
  "json_api",
  "xml_feed",
  "csv",
  "small_pdf",
  "large_pdf",
  "gis",
  "document_listing",
  "election_filing_page",
  "campaign_finance_api",
  "legislative_api",
  "official_profile_page",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const REFRESH_CLASSES = ["IMMUTABLE", "LOW", "MEDIUM", "HIGH", "ELECTION_REALTIME"] as const;
export type RefreshClass = (typeof REFRESH_CLASSES)[number];

export type SourceAdapterConfig = {
  sourceKey: string;
  sourceName: string;
  authorityTier: AuthorityTier;
  sourceType: SourceType;
  jurisdiction: string;
  officeScope: string;
  baseUrl: string;
  discoveryUrl?: string;
  parserKey: string;
  parserFamily?:
    | "HTML_DIRECTORY"
    | "HTML_DETAIL"
    | "JSON_API"
    | "XML_FEED"
    | "CSV"
    | "OFFICIAL_PROFILE"
    | "ELECTION_PORTAL"
    | "PDF_DIRECTORY"
    | "PDF_DETAIL";
  refreshClass: RefreshClass;
  normalPollInterval: string;
  electionPollInterval: string;
  rateLimitPolicy: { minIntervalMs: number; maxConcurrent: number };
  expectedContentType?: string;
  supportsEtag: boolean;
  supportsLastModified: boolean;
  active: boolean;
  firstWaveActive: boolean;
  operatorControlled: boolean;
  fetchUserAgent?: string;
  heavyRequired: boolean;
  schemaCertified: boolean;
  coverage: "parser" | "discovered";
  notes: string;
};

function official(partial: Omit<SourceAdapterConfig, "authorityTier" | "supportsEtag" | "supportsLastModified" | "rateLimitPolicy" | "operatorControlled"> & Partial<SourceAdapterConfig>): SourceAdapterConfig {
  return {
    authorityTier: "TIER_1_PRIMARY_OFFICIAL",
    supportsEtag: true,
    supportsLastModified: true,
    rateLimitPolicy: { minIntervalMs: 15_000, maxConcurrent: 1 },
    operatorControlled: false,
    ...partial,
  };
}

export const SOURCE_ADAPTERS: SourceAdapterConfig[] = [
  official({
    sourceKey: "miami-dade-county-elected-officials",
    sourceName: "Miami-Dade County Supervisor of Elections — Current Elected Officials",
    sourceType: "small_pdf",
    parserFamily: "PDF_DIRECTORY",
    jurisdiction: "us-fl-miami-dade",
    officeScope: "county_mayor_commission_constitutional",
    baseUrl: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    parserKey: "miami-dade-elected-officials",
    refreshClass: "MEDIUM",
    normalPollInterval: "6h",
    electionPollInterval: "1h",
    expectedContentType: "application/pdf",
    active: true,
    firstWaveActive: true,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "parser",
    notes: "First-wave official PDF. Best-effort extraction; not schema-certified for auto-verify. Do not re-enqueue job 7d93a416.",
  }),
  official({
    sourceKey: "florida-senate-members",
    sourceName: "Florida Senate — Senators",
    sourceType: "html_directory",
    parserFamily: "HTML_DIRECTORY",
    jurisdiction: "us-fl",
    officeScope: "state_senate",
    baseUrl: "https://www.flsenate.gov/Senators",
    parserKey: "html-directory",
    refreshClass: "LOW",
    normalPollInterval: "24h",
    electionPollInterval: "6h",
    expectedContentType: "text/html",
    fetchUserAgent: BROWSER_DIRECTORY_USER_AGENT,
    active: true,
    firstWaveActive: false,
    operatorControlled: true,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "parser",
    notes: "Controlled HTML_DIRECTORY source. Operator-enqueueable; not cron first-wave. 40 permanent seats.",
  }),
  official({
    sourceKey: "florida-house-members",
    sourceName: "Florida House of Representatives — Members",
    sourceType: "html_directory",
    parserFamily: "HTML_DIRECTORY",
    jurisdiction: "us-fl",
    officeScope: "state_house",
    baseUrl: "https://www.flhouse.gov/Representatives",
    parserKey: "html-directory",
    refreshClass: "LOW",
    normalPollInterval: "24h",
    electionPollInterval: "6h",
    expectedContentType: "text/html",
    fetchUserAgent: BROWSER_DIRECTORY_USER_AGENT,
    active: true,
    firstWaveActive: false,
    operatorControlled: true,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "parser",
    notes: "Controlled HTML_DIRECTORY source. Operator-enqueueable; not cron first-wave. 120 permanent seats.",
  }),
  official({
    sourceKey: "florida-governor-official",
    sourceName: "Florida Governor — official executive site",
    sourceType: "official_profile_page",
    jurisdiction: "us-fl",
    officeScope: "governor",
    baseUrl: "https://www.flgov.com/",
    parserKey: "official-profile-discovery",
    parserFamily: "OFFICIAL_PROFILE",
    refreshClass: "MEDIUM",
    normalPollInterval: "12h",
    electionPollInterval: "1h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Official homepage. Portrait host flgov.com is not .gov so portraits stay unverified.",
  }),
  official({
    sourceKey: "florida-election-calendar",
    sourceName: "Florida Division of Elections",
    sourceType: "election_filing_page",
    jurisdiction: "us-fl",
    officeScope: "statewide_elections",
    baseUrl: "https://dos.fl.gov/elections/",
    parserKey: "election-calendar-discovery",
    parserFamily: "ELECTION_PORTAL",
    refreshClass: "HIGH",
    normalPollInterval: "24h",
    electionPollInterval: "15m",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Official election calendar / candidate filing entry. Monitor only in first wave.",
  }),
  official({
    sourceKey: "broward-county-soe",
    sourceName: "Broward County Supervisor of Elections",
    sourceType: "html_directory",
    jurisdiction: "us-fl-broward",
    officeScope: "county_elected_officials",
    baseUrl: "https://www.browardsoe.org/",
    discoveryUrl: "https://www.broward.org/Commission/Pages/Default.aspx",
    parserKey: "county-source-discovery",
    parserFamily: "HTML_DETAIL",
    refreshClass: "MEDIUM",
    normalPollInterval: "24h",
    electionPollInterval: "2h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Official county / SOE discovery. No hardcoded officeholders.",
  }),
  official({
    sourceKey: "palm-beach-county-soe",
    sourceName: "Palm Beach County Supervisor of Elections",
    sourceType: "html_directory",
    jurisdiction: "us-fl-palm-beach",
    officeScope: "county_elected_officials",
    baseUrl: "https://www.pbcelections.org/",
    discoveryUrl: "https://discover.pbcgov.org/countycommission/Pages/default.aspx",
    parserKey: "county-source-discovery",
    parserFamily: "HTML_DETAIL",
    refreshClass: "MEDIUM",
    normalPollInterval: "24h",
    electionPollInterval: "2h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Official county / SOE discovery. No hardcoded officeholders.",
  }),
  official({
    sourceKey: "florida-attorney-general",
    sourceName: "Florida Attorney General — official agency site",
    sourceType: "official_profile_page",
    jurisdiction: "us-fl",
    officeScope: "attorney_general",
    baseUrl: "https://www.myfloridalegal.com/",
    parserKey: "official-profile-discovery",
    parserFamily: "OFFICIAL_PROFILE",
    refreshClass: "MEDIUM",
    normalPollInterval: "12h",
    electionPollInterval: "1h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Cabinet official page from source-registry.json. Discovery only; no hardcoded occupant.",
  }),
  official({
    sourceKey: "florida-cfo",
    sourceName: "Florida Chief Financial Officer — official agency site",
    sourceType: "official_profile_page",
    jurisdiction: "us-fl",
    officeScope: "chief_financial_officer",
    baseUrl: "https://www.myfloridacfo.com/",
    parserKey: "official-profile-discovery",
    parserFamily: "OFFICIAL_PROFILE",
    refreshClass: "MEDIUM",
    normalPollInterval: "12h",
    electionPollInterval: "1h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Cabinet official page from source-registry.json. Discovery only; no hardcoded occupant.",
  }),
  official({
    sourceKey: "florida-agriculture-commissioner",
    sourceName: "Florida Commissioner of Agriculture — FDACS",
    sourceType: "official_profile_page",
    jurisdiction: "us-fl",
    officeScope: "agriculture_commissioner",
    baseUrl: "https://www.fdacs.gov/",
    parserKey: "official-profile-discovery",
    parserFamily: "OFFICIAL_PROFILE",
    refreshClass: "MEDIUM",
    normalPollInterval: "12h",
    electionPollInterval: "1h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Cabinet official page from source-registry.json. Discovery only; no hardcoded occupant.",
  }),
  official({
    sourceKey: "us-house-members",
    sourceName: "U.S. House — Directory of Representatives",
    sourceType: "html_directory",
    jurisdiction: "us",
    officeScope: "us_house_florida",
    baseUrl: "https://www.house.gov/representatives",
    parserKey: "html-directory",
    parserFamily: "HTML_DIRECTORY",
    refreshClass: "LOW",
    normalPollInterval: "24h",
    electionPollInterval: "6h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Florida federal seats only when filtered. Do not ingest all 435.",
  }),
  official({
    sourceKey: "us-senate-members",
    sourceName: "U.S. Senate contact XML",
    sourceType: "xml_feed",
    jurisdiction: "us",
    officeScope: "us_senate",
    baseUrl: "https://www.senate.gov/general/contact_information/senators_cfm.xml",
    parserKey: "xml-feed",
    parserFamily: "XML_FEED",
    refreshClass: "LOW",
    normalPollInterval: "24h",
    electionPollInterval: "6h",
    expectedContentType: "application/xml",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Official XML. Florida filter only; full chamber ingest out of first wave.",
  }),
  official({
    sourceKey: "miami-dade-mayor-html",
    sourceName: "Miami-Dade County Mayor — official page",
    sourceType: "official_profile_page",
    parserFamily: "OFFICIAL_PROFILE",
    jurisdiction: "us-fl-miami-dade",
    officeScope: "mayor",
    baseUrl: "https://www.miamidade.gov/global/government/mayor/home.page",
    parserKey: "official-profile-discovery",
    refreshClass: "MEDIUM",
    normalPollInterval: "24h",
    electionPollInterval: "2h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Wave 2 HTML alternative to the county PDF. Discovery only until directory parser is certified.",
  }),
  official({
    sourceKey: "miami-dade-county-commission-html",
    sourceName: "Miami-Dade County Commission — official page",
    sourceType: "html_directory",
    parserFamily: "HTML_DETAIL",
    jurisdiction: "us-fl-miami-dade",
    officeScope: "county_commission",
    baseUrl: "https://www.miamidade.gov/global/government/commission/home.page",
    parserKey: "county-source-discovery",
    refreshClass: "MEDIUM",
    normalPollInterval: "24h",
    electionPollInterval: "2h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Wave 2 HTML commission directory. Prefer over PDF when a certified HTML_DIRECTORY spec exists.",
  }),
  official({
    sourceKey: "broward-county-commission",
    sourceName: "Broward County Commission — official page",
    sourceType: "html_directory",
    parserFamily: "HTML_DETAIL",
    jurisdiction: "us-fl-broward",
    officeScope: "county_commission",
    baseUrl: "https://www.broward.org/Commission/Pages/Default.aspx",
    parserKey: "county-source-discovery",
    refreshClass: "MEDIUM",
    normalPollInterval: "24h",
    electionPollInterval: "2h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Wave 2 Broward commission HTML. Not operator-controlled.",
  }),
  official({
    sourceKey: "palm-beach-county-commission",
    sourceName: "Palm Beach County Commission — official page",
    sourceType: "html_directory",
    parserFamily: "HTML_DETAIL",
    jurisdiction: "us-fl-palm-beach",
    officeScope: "county_commission",
    baseUrl: "https://discover.pbcgov.org/countycommission/Pages/default.aspx",
    parserKey: "county-source-discovery",
    refreshClass: "MEDIUM",
    normalPollInterval: "24h",
    electionPollInterval: "2h",
    expectedContentType: "text/html",
    active: true,
    firstWaveActive: false,
    heavyRequired: false,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Wave 2 Palm Beach commission HTML. Not operator-controlled.",
  }),
  {
    sourceKey: "fec-api",
    sourceName: "Federal Election Commission API",
    authorityTier: mapRegistryTier("primary_official"),
    sourceType: "campaign_finance_api",
    jurisdiction: "us",
    officeScope: "federal_campaign_finance",
    baseUrl: "https://api.open.fec.gov/v1/",
    parserKey: "fec-api",
    parserFamily: "JSON_API",
    refreshClass: "HIGH",
    normalPollInterval: "24h",
    electionPollInterval: "1h",
    rateLimitPolicy: { minIntervalMs: 60_000, maxConcurrent: 1 },
    expectedContentType: "application/json",
    supportsEtag: false,
    supportsLastModified: false,
    active: false,
    firstWaveActive: false,
    operatorControlled: false,
    heavyRequired: true,
    schemaCertified: false,
    coverage: "discovered",
    notes: "Public API exists; requires FEC_API_KEY. NOT_IMPLEMENTED until keyed and reviewed.",
  },
];

export function sourceAdapter(sourceKey: string): SourceAdapterConfig | undefined {
  return SOURCE_ADAPTERS.find((item) => item.sourceKey === sourceKey);
}

export function firstWaveSourceAdapters(): SourceAdapterConfig[] {
  return SOURCE_ADAPTERS.filter((item) => item.active && item.firstWaveActive);
}

export function discoveredOnlySources(): SourceAdapterConfig[] {
  return SOURCE_ADAPTERS.filter((item) => item.coverage === "discovered");
}

export function parserCoveredSources(): SourceAdapterConfig[] {
  return SOURCE_ADAPTERS.filter((item) => item.coverage === "parser");
}

export function operatorControlledSources(): SourceAdapterConfig[] {
  return SOURCE_ADAPTERS.filter((item) => item.operatorControlled && item.active);
}
