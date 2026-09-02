import { ParserError } from "./errors.ts";
import {
  collapseWhitespace,
  decodeHtmlEntities,
  entryTextUntilNext,
  extractAnchors,
  parseQueryParam,
  parseUsShortDate,
  pathnameOf,
  visibleText,
  type HtmlAnchor,
} from "./html-parse.ts";
import { extractHtmlText } from "./parsers.ts";
import type { SourceAdapterConfig } from "./source-config.ts";
import { BROWSER_DIRECTORY_USER_AGENT, type ExtractedOfficeholder } from "./types.ts";

export { BROWSER_DIRECTORY_USER_AGENT };

export const PARSER_FAMILIES = [
  "HTML_DIRECTORY",
  "HTML_DETAIL",
  "JSON_API",
  "XML_FEED",
  "CSV",
  "OFFICIAL_PROFILE",
  "ELECTION_PORTAL",
  "PDF_DIRECTORY",
  "PDF_DETAIL",
] as const;
export type ParserFamily = (typeof PARSER_FAMILIES)[number];

export type FamilyParseResult = {
  family: ParserFamily;
  holders: ExtractedOfficeholder[];
  discoveredUrls: string[];
  verificationState: "extracted" | "source_found";
};

const PARTY_PATTERN = /\b(No Party Affiliation|Republican|Democrat(?:ic)?|Independent)\b/i;
const SENATE_MEMBER_PATH = /^\/Senators\/(?:\d{4}-\d{4}\/)?S(\d{1,3})\/?$/i;
const SENATE_COUNTY_PATTERN =
  /\b(Consists of\s+.+?)(?=\s+(?:Track(?:er)?|Former Senators|Home\b)|$)/i;
const HOUSE_MEMBER_PATH = /\/(?:Sections\/)?Representatives\/(?:Details|details\.aspx)$/i;
const HOUSE_ENTRY_PATTERN = new RegExp(
  String.raw`^(?<name>.+?)\s+` +
    String.raw`(?<party>Republican|Democrat(?:ic)?|No Party Affiliation|Independent)\s+` +
    String.raw`[—-]\s*District:\s*(?<district>\d{1,3})\s*` +
    String.raw`(?<counties>.*?)\s+` +
    String.raw`(?<start>\d{2}/\d{2}/\d{2})\s*-\s*(?<end>\d{2}/\d{2}/\d{2})` +
    String.raw`(?:\s*\((?<status>[^)]+)\))?$`,
  "i",
);
const HOUSE_INACTIVE = new Set(["resigned", "deceased", "removed", "expelled"]);
const XML_MEMBER_PATTERN = /<member\b[^>]*>([\s\S]*?)<\/member>/gi;

export function parserFamilyFor(config: SourceAdapterConfig): ParserFamily {
  if (config.parserFamily) return config.parserFamily;
  switch (config.sourceType) {
    case "html_directory":
      return "HTML_DIRECTORY";
    case "html_detail_page":
      return "HTML_DETAIL";
    case "json_api":
    case "campaign_finance_api":
    case "legislative_api":
      return "JSON_API";
    case "xml_feed":
      return "XML_FEED";
    case "csv":
      return "CSV";
    case "official_profile_page":
      return "OFFICIAL_PROFILE";
    case "election_filing_page":
      return "ELECTION_PORTAL";
    case "large_pdf":
      return "PDF_DETAIL";
    default:
      return "PDF_DIRECTORY";
  }
}

export function parseWithParserFamily(input: {
  config: SourceAdapterConfig;
  html?: string;
  bytes: Uint8Array;
  contentType?: string;
  sourceUrl: string;
}): FamilyParseResult {
  const family = parserFamilyFor(input.config);
  const text = input.html ?? new TextDecoder().decode(input.bytes);
  if (family === "HTML_DIRECTORY") {
    return {
      family,
      holders: parseHtmlDirectory(text, input.config),
      discoveredUrls: [input.sourceUrl],
      verificationState: "extracted",
    };
  }
  if (family === "XML_FEED") {
    return {
      family,
      holders: parseXmlFeed(text, input.config),
      discoveredUrls: [input.sourceUrl],
      verificationState: "extracted",
    };
  }
  if (family === "CSV") {
    return {
      family,
      holders: parseCsvDirectory(text, input.config),
      discoveredUrls: [input.sourceUrl],
      verificationState: "extracted",
    };
  }
  if (family === "JSON_API") {
    return {
      family,
      holders: parseJsonApi(text, input.config),
      discoveredUrls: [input.sourceUrl],
      verificationState: "extracted",
    };
  }
  if (family === "HTML_DETAIL" || family === "OFFICIAL_PROFILE" || family === "ELECTION_PORTAL") {
    return {
      family,
      holders: [],
      discoveredUrls: discoverOfficialHrefs(extractHtmlText(text), input.sourceUrl),
      verificationState: "source_found",
    };
  }
  throw new ParserError(`parser family ${family} is not implemented for ${input.config.sourceKey}`);
}

export function parseHtmlDirectory(html: string, config: SourceAdapterConfig, minimumRecords?: number): ExtractedOfficeholder[] {
  if (config.sourceKey === "florida-senate-members" || config.officeScope === "state_senate") {
    return parseFloridaSenateDirectory(html, config, minimumRecords);
  }
  if (config.sourceKey === "florida-house-members" || config.officeScope === "state_house") {
    return parseFloridaHouseDirectory(html, config, minimumRecords);
  }
  if (config.sourceKey === "us-house-members" || config.officeScope === "us_house_florida") {
    return parseUsHouseFloridaDirectory(html, config, minimumRecords);
  }
  throw new ParserError(`no HTML_DIRECTORY spec registered for ${config.sourceKey}`);
}

export function parseFloridaSenateDirectory(
  html: string,
  config: SourceAdapterConfig,
  minimumRecords = 30,
): ExtractedOfficeholder[] {
  const termHeading = html.match(/\b(\d{4}-\d{4})\s+Senators\b/i);
  const termLabel = termHeading?.[0];
  const anchors = extractAnchors(html).filter((anchor) => SENATE_MEMBER_PATH.test(pathnameOf(anchor.href)));
  const holders: ExtractedOfficeholder[] = [];
  const seenDistricts = new Set<string>();
  const seenUrls = new Set<string>();
  let skippedWithoutFields = 0;

  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    if (!anchor) continue;
    const pathMatch = pathnameOf(anchor.href).match(SENATE_MEMBER_PATH);
    const district = String(Number.parseInt(pathMatch?.[1] ?? "", 10));
    if (!district || district === "NaN") continue;
    const memberUrl = resolveUrl("https://www.flsenate.gov/Senators", anchor.href);
    if (seenUrls.has(memberUrl)) continue;
    const following = entryTextUntilNext(html, anchor, anchors[index + 1]).replace(/\bFormer Senators[\s\S]*$/i, "").trim();
    const partyMatch = PARTY_PATTERN.exec(following);
    const countyMatch = SENATE_COUNTY_PATTERN.exec(following);
    const vacant = isVacantName(anchor.text);
    if (!vacant && (!anchor.text || !partyMatch || !countyMatch)) {
      skippedWithoutFields += 1;
      continue;
    }
    if (seenDistricts.has(district)) {
      throw new ParserError(`duplicate current Senate district ${district} found while parsing ${anchor.text}`);
    }
    seenDistricts.add(district);
    seenUrls.add(memberUrl);
    const party = vacant ? undefined : normalizeParty(partyMatch?.[1]);
    const counties = countyMatch ? collapseWhitespace(countyMatch[1] ?? "") : undefined;
    holders.push(
      legislativeHolder({
        displayName: vacant ? "Vacant" : anchor.text,
        vacant,
        districtNumber: district,
        partyName: party,
        countyDescription: counties,
        sourceMemberUrl: memberUrl,
        officeKind: "state_senator",
        seatFamily: "state_senate",
        officeTitle: `Florida State Senator, District ${district}`,
        chamber: "senate",
        seatKey: `us-fl-state-senate-district-${district}`,
        termLabel,
        rawRowText: vacant
          ? `Vacant | District ${district}${counties ? ` | ${counties}` : ""}`
          : `${anchor.text} | District ${district} | ${party ?? ""} | ${counties ?? ""}`,
        // Senate member URLs are district-stable, not person-stable. Do not use
        // S{district} as a person legislative_id or the directory URL as official_source_id.
        externalIdentifiers: undefined,
        jurisdictionKey: "us-fl",
        jurisdictionName: "Florida",
      }),
    );
  }

  holders.sort((left, right) => Number(left.districtNumber) - Number(right.districtNumber));
  const current = holders.filter((item) => !item.vacant);
  if (current.length < minimumRecords) {
    throw new ParserError(
      `extracted ${current.length} Florida Senate occupants from ${anchors.length} member links; expected at least ${minimumRecords}. skippedWithoutFields=${skippedWithoutFields}`,
    );
  }
  if (holders.length > 40) {
    throw new ParserError(`extracted ${holders.length} Florida Senate seats; expected at most 40`);
  }
  return holders;
}

export function parseFloridaHouseDirectory(
  html: string,
  config: SourceAdapterConfig,
  minimumRecords = 115,
): ExtractedOfficeholder[] {
  const anchors = extractAnchors(html).filter((anchor) => HOUSE_MEMBER_PATH.test(pathnameOf(anchor.href)));
  const byDistrict = new Map<string, ExtractedOfficeholder[]>();
  const unparsed: string[] = [];

  for (const anchor of anchors) {
    const parsed = parseHouseEntryText(anchor.text);
    if (!parsed) {
      if (anchor.text) unparsed.push(anchor.text.slice(0, 200));
      continue;
    }
    const memberUrl = resolveUrl("https://www.flhouse.gov/Representatives", anchor.href);
    const memberId = parseQueryParam(memberUrl, ["MemberId", "memberId", "memberid"]);
    const inactive = Boolean(parsed.status && [...HOUSE_INACTIVE].some((marker) => parsed.status?.includes(marker)));
    const vacant = inactive || isVacantName(parsed.name);
    const holder = legislativeHolder({
      displayName: parsed.name,
      vacant,
      districtNumber: parsed.district,
      partyName: parsed.party,
      countyDescription: parsed.counties,
      sourceMemberUrl: memberUrl,
      officeKind: "state_representative",
      seatFamily: "state_house",
      officeTitle: `Florida State Representative, District ${parsed.district}`,
      chamber: "house",
      seatKey: `us-fl-state-house-district-${parsed.district}`,
      serviceStartDateText: parsed.start,
      serviceEndDateText: parsed.end,
      startDate: parseUsShortDate(parsed.start),
      endDate: vacant ? parseUsShortDate(parsed.end) : undefined,
      occupancyStatus: vacant ? "former" : "current",
      rawRowText: anchor.text,
      externalIdentifiers: vacant
        ? undefined
        : {
            official_source_id: memberUrl,
            ...(memberId ? { legislative_id: memberId } : {}),
          },
      jurisdictionKey: "us-fl",
      jurisdictionName: "Florida",
    });
    const list = byDistrict.get(parsed.district) ?? [];
    list.push(holder);
    byDistrict.set(parsed.district, list);
  }

  const holders: ExtractedOfficeholder[] = [];
  for (const [district, rows] of byDistrict) {
    const currentRows = rows.filter((row) => !row.vacant);
    if (currentRows.length > 1) {
      throw new ParserError(`duplicate current Florida House district ${district} found while parsing ${currentRows[0]?.displayName}`);
    }
    if (currentRows[0]) {
      holders.push(currentRows[0]);
      for (const former of rows.filter((row) => row.vacant)) {
        holders.push({ ...former, vacant: true, occupancyStatus: "former" });
      }
      continue;
    }
    const [former] = rows;
    if (former) {
      holders.push({
        ...former,
        vacant: true,
        occupancyStatus: "former",
        electedOrAppointed: "elected",
      });
    }
  }

  holders.sort((left, right) => {
    const district = Number(left.districtNumber) - Number(right.districtNumber);
    if (district !== 0) return district;
    if (left.vacant === right.vacant) return 0;
    return left.vacant ? 1 : -1;
  });
  const current = holders.filter((item) => !item.vacant);
  if (current.length < minimumRecords || current.length > 120) {
    throw new ParserError(
      `extracted ${current.length} current Florida House occupants from ${anchors.length} member links; expected between ${minimumRecords} and 120. First unparsed: ${unparsed.slice(0, 2).join(" || ") || "none"}`,
    );
  }
  return holders;
}

function parseHouseEntryText(text: string): {
  name: string;
  party: string | undefined;
  district: string;
  counties: string | undefined;
  start: string;
  end: string;
  status: string | undefined;
} | undefined {
  const match = HOUSE_ENTRY_PATTERN.exec(collapseWhitespace(decodeHtmlEntities(text)));
  if (!match?.groups) return undefined;
  const counties = collapseWhitespace(match.groups.counties ?? "");
  return {
    name: collapseWhitespace(match.groups.name ?? ""),
    party: normalizeParty(match.groups.party),
    district: String(Number.parseInt(match.groups.district ?? "", 10)),
    counties: counties || undefined,
    start: match.groups.start ?? "",
    end: match.groups.end ?? "",
    status: collapseWhitespace(match.groups.status ?? "").toLowerCase() || undefined,
  };
}

export function parseXmlFeed(xml: string, config: SourceAdapterConfig, minimumRecords = 1): ExtractedOfficeholder[] {
  if (config.sourceKey !== "us-senate-members" && config.officeScope !== "us_senate") {
    throw new ParserError(`no XML_FEED spec registered for ${config.sourceKey}`);
  }
  const holders: ExtractedOfficeholder[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(XML_MEMBER_PATTERN)) {
    const block = match[1] ?? "";
    const stateCode = xmlField(block, "state")?.toUpperCase();
    if (stateCode !== "FL") continue;
    const firstName = xmlField(block, "first_name", "firstname");
    const lastName = xmlField(block, "last_name", "lastname");
    const fullName = xmlField(block, "member_full", "full_name");
    const displayName = fullName || [firstName, lastName].filter(Boolean).join(" ");
    const bioguide = xmlField(block, "bioguide_id", "bioguide");
    const website = xmlField(block, "website");
    const partyCode = xmlField(block, "party");
    const senateClass = xmlField(block, "class");
    if (!displayName) continue;
    const seatKey = senateClass ? `us-fl-us-senate-class-${senateClass}` : `us-fl-us-senate-${slugToken(displayName)}`;
    if (seen.has(seatKey)) throw new ParserError(`duplicate Florida U.S. Senate seat ${seatKey}`);
    seen.add(seatKey);
    holders.push({
      displayName,
      officeTitle: "United States Senator from Florida",
      officeKind: "us_senator",
      seatFamily: "us_senate",
      governmentLevel: "federal",
      branch: "legislative",
      chamber: "senate",
      districtNumber: senateClass,
      jurisdictionName: "Florida",
      jurisdictionKey: "us-fl",
      jurisdictionType: "state",
      stateCode: "FL",
      seatKey,
      partyName: normalizeParty(partyCode === "D" ? "Democrat" : partyCode === "R" ? "Republican" : partyCode === "I" ? "Independent" : partyCode),
      sourceMemberUrl: website,
      electedOrAppointed: "elected",
      occupancyStatus: "current",
      rawRowText: collapseWhitespace(visibleText(block)).slice(0, 500),
      externalIdentifiers: {
        ...(bioguide ? { bioguide } : {}),
        ...(website ? { official_source_id: website } : {}),
      },
    });
  }
  if (holders.length < minimumRecords) {
    throw new ParserError(`extracted ${holders.length} Florida U.S. Senators from XML; expected at least ${minimumRecords}`);
  }
  if (holders.length > 2) {
    throw new ParserError(`extracted ${holders.length} Florida U.S. Senators; expected at most 2`);
  }
  return holders;
}

export function parseCsvDirectory(text: string, config: SourceAdapterConfig): ExtractedOfficeholder[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new ParserError(`CSV for ${config.sourceKey} contained no data rows`);
  const headers = splitCsvLine(lines[0] ?? "").map((cell) => cell.trim().toLowerCase());
  const nameIndex = headers.findIndex((cell) => cell === "name" || cell === "display_name" || cell === "official");
  const districtIndex = headers.findIndex((cell) => cell === "district" || cell === "district_number");
  if (nameIndex < 0) throw new ParserError(`CSV for ${config.sourceKey} has no name column`);
  const holders: ExtractedOfficeholder[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const displayName = cells[nameIndex]?.trim();
    if (!displayName) continue;
    const districtNumber = districtIndex >= 0 ? cells[districtIndex]?.trim() : undefined;
    holders.push({
      displayName,
      officeTitle: config.sourceName,
      officeKind: config.officeScope,
      seatFamily: config.officeScope,
      governmentLevel: config.jurisdiction.startsWith("us-fl") ? "state" : "unknown",
      jurisdictionName: config.jurisdiction,
      jurisdictionKey: config.jurisdiction,
      stateCode: "FL",
      districtNumber,
      seatKey: districtNumber ? `${config.jurisdiction}-${config.officeScope}-district-${districtNumber}` : `${config.jurisdiction}-${config.officeScope}`,
      occupancyStatus: "current",
      rawRowText: line,
    });
  }
  if (holders.length === 0) throw new ParserError(`CSV for ${config.sourceKey} produced 0 rows`);
  return holders;
}

export function parseJsonApi(text: string, config: SourceAdapterConfig): ExtractedOfficeholder[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ParserError(`JSON parse failed for ${config.sourceKey}: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }
  const rows = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { results?: unknown }).results) ? (parsed as { results: unknown[] }).results : null;
  if (!rows) throw new ParserError(`JSON_API for ${config.sourceKey} did not contain an array`);
  const holders: ExtractedOfficeholder[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const displayName = stringField(record, "name", "displayName", "display_name", "full_name");
    if (!displayName) continue;
    const districtNumber = stringField(record, "district", "districtNumber", "district_number");
    holders.push({
      displayName,
      officeTitle: stringField(record, "office", "title", "officeTitle") ?? config.sourceName,
      officeKind: config.officeScope,
      seatFamily: config.officeScope,
      governmentLevel: "state",
      jurisdictionName: "Florida",
      jurisdictionKey: config.jurisdiction,
      stateCode: "FL",
      districtNumber,
      seatKey: districtNumber ? `${config.jurisdiction}-${config.officeScope}-district-${districtNumber}` : `${config.jurisdiction}-${config.officeScope}-${slugToken(displayName)}`,
      occupancyStatus: "current",
      rawRowText: JSON.stringify(record).slice(0, 500),
    });
  }
  if (holders.length === 0) throw new ParserError(`JSON_API for ${config.sourceKey} produced 0 officeholders`);
  return holders;
}

export function parseUsHouseFloridaDirectory(html: string, config: SourceAdapterConfig, minimumRecords = 28): ExtractedOfficeholder[] {
  const holders: ExtractedOfficeholder[] = [];
  const seen = new Set<string>();
  const tables = html.split(/<table\b/i).slice(1);
  for (const table of tables) {
    const caption = visibleText((table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i) ?? [])[1] ?? "");
    if (caption && caption.toLowerCase() !== "florida") continue;
    const headingFlorida = /<h[1-4][^>]*>\s*Florida\s*<\/h[1-4]>/i.test(table) || caption.toLowerCase() === "florida";
    if (!headingFlorida && !/<td[^>]*>\s*Florida\s*<\/td>/i.test(table)) {
      if (!table.toLowerCase().includes("florida")) continue;
    }
    const rows = table.split(/<tr\b/i).slice(1);
    let inFlorida = caption.toLowerCase() === "florida";
    for (const row of rows) {
      const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => visibleText(cell[1] ?? ""));
      if (cells.length === 1 && cells[0]?.toLowerCase() === "florida") {
        inFlorida = true;
        continue;
      }
      if (cells.length === 1 && cells[0] && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(cells[0]) && cells[0].toLowerCase() !== "florida") {
        inFlorida = false;
        continue;
      }
      if (!inFlorida || cells.length < 2) continue;
      const districtLabel = cells[0] ?? "";
      const name = cells[1] ?? "";
      if (!districtLabel || districtLabel.toLowerCase() === "district") continue;
      const vacant = /vacancy/i.test(name) || isVacantName(name);
      const districtNumber = /at[- ]large/i.test(districtLabel) ? "AL" : (districtLabel.match(/\d+/)?.[0] ?? districtLabel);
      const seatKey = `us-fl-us-house-district-${String(districtNumber).toLowerCase()}`;
      if (seen.has(seatKey)) throw new ParserError(`duplicate Florida U.S. House seat ${seatKey}`);
      seen.add(seatKey);
      const anchors = extractAnchors(row);
      holders.push({
        displayName: vacant ? "Vacant" : name,
        vacant,
        officeTitle: vacant ? `Vacant United States House seat, Florida ${districtLabel}` : `United States Representative, Florida ${districtLabel}`,
        officeKind: "us_representative",
        seatFamily: "us_house",
        governmentLevel: "federal",
        branch: "legislative",
        chamber: "house",
        districtNumber: String(districtNumber),
        jurisdictionName: "Florida",
        jurisdictionKey: "us-fl",
        jurisdictionType: "state",
        stateCode: "FL",
        seatKey,
        partyName: normalizeParty(cells[2]),
        sourceMemberUrl: anchors[0] ? resolveUrl("https://www.house.gov/representatives", anchors[0].href) : undefined,
        occupancyStatus: vacant ? undefined : "current",
        electedOrAppointed: "elected",
        rawRowText: cells.join(" | "),
      });
    }
  }
  if (holders.length < minimumRecords) {
    throw new ParserError(`extracted ${holders.length} Florida U.S. House seats; expected at least ${minimumRecords}`);
  }
  return holders;
}

export function discoverOfficialHrefs(text: string, baseUrl: string): string[] {
  const found = new Set<string>([baseUrl]);
  const hrefs = text.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  for (const href of hrefs) {
    try {
      const url = new URL(href);
      if (url.protocol !== "https:") continue;
      const host = url.hostname.toLowerCase();
      if (
        host.endsWith(".gov") ||
        host.endsWith(".us") ||
        host.includes("broward") ||
        host.includes("pbc") ||
        host.includes("flsenate") ||
        host.includes("flhouse") ||
        host.includes("flgov") ||
        host.includes("pbcelections") ||
        host.includes("browardsoe") ||
        host.includes("dos.fl")
      ) {
        found.add(`${url.origin}${url.pathname}`);
      }
    } catch {
      continue;
    }
  }
  return [...found].slice(0, 20);
}

function legislativeHolder(input: Omit<ExtractedOfficeholder, "governmentLevel" | "branch" | "stateCode" | "jurisdictionType"> & {
  occupancyStatus?: string;
}): ExtractedOfficeholder {
  const occupancyStatus = input.occupancyStatus ?? (input.vacant ? undefined : "current");
  return {
    governmentLevel: "state",
    branch: "legislative",
    stateCode: "FL",
    jurisdictionType: "state",
    electedOrAppointed: "elected",
    ...input,
    occupancyStatus,
  };
}

function normalizeParty(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const lowered = value.toLowerCase();
  if (lowered.startsWith("republican") || lowered === "r") return "Republican";
  if (lowered.startsWith("democrat") || lowered === "d") return "Democrat";
  if (lowered.startsWith("no party")) return "No Party Affiliation";
  if (lowered.startsWith("independent") || lowered === "i") return "Independent";
  return collapseWhitespace(value);
}

function isVacantName(value: string): boolean {
  return collapseWhitespace(value).toLowerCase() === "vacant";
}

function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function xmlField(block: string, ...names: string[]): string | undefined {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
    if (match?.[1]) {
      const value = visibleText(match[1]);
      if (value) return value;
    }
  }
  return undefined;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function stringField(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function slugToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "unknown";
}

export function sourceDiscoveryRemainsUnverified(): true {
  return true;
}

/** @deprecated Use parseHtmlDirectory. Kept as the Florida HTML_DIRECTORY entry point. */
export function parseFloridaDirectoryHtml(html: string, config: SourceAdapterConfig): ExtractedOfficeholder[] {
  return parseHtmlDirectory(html, config, 1);
}

export type { HtmlAnchor };
