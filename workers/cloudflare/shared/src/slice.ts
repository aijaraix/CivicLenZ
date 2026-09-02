export type SliceSource = {
  sourceKey: string;
  name: string;
  url: string;
  sourceType: string;
  collectionMode: string;
  enabledInRegistry: boolean;
  firstWaveActive: boolean;
  reason: string;
};

export const CONTROLLED_SLICE_JURISDICTIONS = [
  "us",
  "us-fl",
  "us-fl-miami-dade",
  "us-fl-broward",
  "us-fl-palm-beach",
] as const;

export const CONTROLLED_SLICE_SOURCES: SliceSource[] = [
  {
    sourceKey: "miami-dade-county-elected-officials",
    name: "Miami-Dade County Supervisor of Elections — Current Elected Officials",
    url: "https://www.miamidade.gov/elections/library/reports/elected-officials.pdf",
    sourceType: "pdf_directory",
    collectionMode: "download_and_parse",
    enabledInRegistry: true,
    firstWaveActive: true,
    reason: "First live Cloudflare ingest. Official PDF only. Re-fetch; do not trust staged rows.",
  },
  {
    sourceKey: "florida-statewide-executive",
    name: "Florida Statewide Elected Cabinet Offices",
    url: "https://www.flgov.com/",
    sourceType: "multi_page_official_directory",
    collectionMode: "scrape_and_assert_officeholder",
    enabledInRegistry: true,
    firstWaveActive: false,
    reason: "In slice, but not auto-enqueued until the official pages are re-validated for CF fetch.",
  },
  {
    sourceKey: "florida-senate-members",
    name: "Florida Senate — Senators",
    url: "https://www.flsenate.gov/Senators",
    sourceType: "html_directory",
    collectionMode: "scrape",
    enabledInRegistry: true,
    firstWaveActive: false,
    reason: "Controlled HTML_DIRECTORY source. Operator-enqueueable; not cron first-wave.",
  },
  {
    sourceKey: "florida-house-members",
    name: "Florida House of Representatives — Members",
    url: "https://www.flhouse.gov/Representatives",
    sourceType: "html_directory",
    collectionMode: "scrape",
    enabledInRegistry: true,
    firstWaveActive: false,
    reason: "Controlled HTML_DIRECTORY source. Operator-enqueueable; not cron first-wave.",
  },
  {
    sourceKey: "us-senate-members",
    name: "U.S. Senate — Senator Contact Information XML",
    url: "https://www.senate.gov/general/contact_information/senators_cfm.xml",
    sourceType: "xml_directory",
    collectionMode: "download_and_parse",
    enabledInRegistry: true,
    firstWaveActive: false,
    reason: "Florida federal seats already represented. Full chamber ingest is out of scope.",
  },
  {
    sourceKey: "us-house-members",
    name: "U.S. House of Representatives — Directory of Representatives",
    url: "https://www.house.gov/representatives",
    sourceType: "html_directory",
    collectionMode: "scrape",
    enabledInRegistry: true,
    firstWaveActive: false,
    reason: "Florida federal seats already represented. Do not ingest all 435 districts.",
  },
  {
    sourceKey: "white-house-administration",
    name: "The White House — Administration",
    url: "https://www.whitehouse.gov/administration/",
    sourceType: "html_directory",
    collectionMode: "scrape",
    enabledInRegistry: true,
    firstWaveActive: false,
    reason: "National executive seats already represented. Re-validate before CF fetch.",
  },
];

export function firstWaveIngestSources(): SliceSource[] {
  return CONTROLLED_SLICE_SOURCES.filter((source) => source.firstWaveActive && source.enabledInRegistry);
}

export function isInControlledSlice(sourceKey: string): boolean {
  return CONTROLLED_SLICE_SOURCES.some((source) => source.sourceKey === sourceKey);
}

export const SOUTH_FLORIDA_COUNTIES = ["Miami-Dade", "Broward", "Palm Beach"] as const;

export const COUNTY_JURISDICTION_KEYS: Record<(typeof SOUTH_FLORIDA_COUNTIES)[number], string> = {
  "Miami-Dade": "us-fl-miami-dade",
  Broward: "us-fl-broward",
  "Palm Beach": "us-fl-palm-beach",
};
