import { ParserError } from "./errors.ts";
import type { ExtractedOfficeholder } from "./types.ts";

const AS_OF_PATTERN = /As of\s+(.+?)\s*$/i;
const PAGE_PATTERN = /^Page\s+\d+\s+of\s+\d+$/i;
const DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const YEAR_PATTERN = /^\d{4}$/;
const TERM_LENGTH_PATTERN = /^(?:\d+\s+years?|Appointed|N\/?A)$/i;
const PLACEHOLDER_PATTERN = /^[-_.\u00ad]+$/;
const SKIP_NAMES = new Set(["vacant", "contact", "tbd"]);
const COMMISSION_PATTERN = /^Board of County Commissioners District\s+(\d+)\s*:?\s*$/i;

const COUNTY_OFFICES: Array<{ pattern: RegExp; officeKind: string; title: string; seatFamily: string }> = [
  { pattern: /^Mayor$/i, officeKind: "mayor", title: "Mayor of Miami-Dade County", seatFamily: "mayor" },
  {
    pattern: /^Clerk of the Circuit Court and Comptroller$/i,
    officeKind: "clerk",
    title: "Miami-Dade County Clerk of the Circuit Court and Comptroller",
    seatFamily: "clerk_of_circuit_court_and_comptroller",
  },
  { pattern: /^Sheriff$/i, officeKind: "sheriff", title: "Miami-Dade County Sheriff", seatFamily: "sheriff" },
  {
    pattern: /^Property Appraiser$/i,
    officeKind: "property_appraiser",
    title: "Miami-Dade County Property Appraiser",
    seatFamily: "property_appraiser",
  },
  { pattern: /^Tax Collector$/i, officeKind: "tax_collector", title: "Miami-Dade County Tax Collector", seatFamily: "tax_collector" },
  {
    pattern: /^Supervisor of Elections$/i,
    officeKind: "supervisor_of_elections",
    title: "Miami-Dade County Supervisor of Elections",
    seatFamily: "supervisor_of_elections",
  },
];

const HEADER_LINES = new Set([
  "federal",
  "state",
  "miami-dade county legislative delegation",
  "miami-dade county",
  "office",
  "elected official",
  "term of",
  "year on",
  "current",
  "contact",
  "ballot",
  "term ends",
  "information",
  "elected officials information",
]);

export function normalizeLine(value: string): string {
  return value.replace(/\u00ad/g, "").replace(/\s+/g, " ").trim();
}

function isHeader(line: string): boolean {
  const lowered = line.toLowerCase();
  if (PAGE_PATTERN.test(line) || lowered.startsWith("miami-dade county office of the supervisor")) return true;
  if (AS_OF_PATTERN.test(line)) return true;
  return HEADER_LINES.has(lowered);
}

export function matchCountyOffice(line: string): { officeKind: string; officeTitle: string; districtNumber: string; seatFamily: string } | undefined {
  const commission = line.match(COMMISSION_PATTERN);
  if (commission) {
    const district = String(Number.parseInt(commission[1] ?? "", 10));
    return {
      officeKind: "commission",
      officeTitle: `Miami-Dade County Commissioner, District ${district}`,
      districtNumber: district,
      seatFamily: "county_commission",
    };
  }
  for (const office of COUNTY_OFFICES) {
    if (office.pattern.test(line)) {
      return {
        officeKind: office.officeKind,
        officeTitle: office.title,
        districtNumber: "",
        seatFamily: office.seatFamily,
      };
    }
  }
  return undefined;
}

function isPersonName(line: string): boolean {
  if (!line || SKIP_NAMES.has(line.toLowerCase()) || PLACEHOLDER_PATTERN.test(line)) return false;
  if (isHeader(line) || matchCountyOffice(line)) return false;
  if (TERM_LENGTH_PATTERN.test(line) || YEAR_PATTERN.test(line) || DATE_PATTERN.test(line)) return false;
  if (!/[A-Za-z]/.test(line)) return false;
  const lowered = line.toLowerCase();
  if (lowered.startsWith("state ") || lowered.startsWith("u.s. ")) return false;
  if (lowered.startsWith("school board") || lowered.startsWith("community council")) return false;
  return true;
}

function looksLikeTermEnd(line: string): boolean {
  return DATE_PATTERN.test(line) || line.toLowerCase() === "tbd" || PLACEHOLDER_PATTERN.test(line);
}

export function parseMiamiDadeDirectory(text: string, minimumRecords = 14): ExtractedOfficeholder[] {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  let termLabel: string | undefined;
  for (const line of lines) {
    if (AS_OF_PATTERN.test(line)) {
      termLabel = line;
      break;
    }
  }

  const records: ExtractedOfficeholder[] = [];
  const seen = new Set<string>();
  let index = 0;
  while (index < lines.length) {
    const office = matchCountyOffice(lines[index] ?? "");
    if (!office) {
      index += 1;
      continue;
    }
    let nameIndex = index + 1;
    let displayName: string | undefined;
    while (nameIndex < lines.length) {
      const candidate = lines[nameIndex] ?? "";
      if (matchCountyOffice(candidate) || isHeader(candidate)) break;
      if (isPersonName(candidate)) {
        displayName = candidate;
        break;
      }
      if (SKIP_NAMES.has(candidate.toLowerCase())) {
        displayName = undefined;
        break;
      }
      nameIndex += 1;
    }
    if (!displayName) {
      index = nameIndex > index ? nameIndex : index + 1;
      continue;
    }
    let cursor = nameIndex + 1;
    let termLength: string | undefined;
    let yearOnBallot: string | undefined;
    let termEnds: string | undefined;
    while (cursor < lines.length) {
      const value = lines[cursor] ?? "";
      if (matchCountyOffice(value) || isHeader(value) || isPersonName(value)) break;
      if (!termLength && TERM_LENGTH_PATTERN.test(value)) termLength = value;
      else if (!yearOnBallot && YEAR_PATTERN.test(value)) yearOnBallot = value;
      else if (!termEnds && looksLikeTermEnd(value) && DATE_PATTERN.test(value)) termEnds = value;
      else if (value.toLowerCase() === "contact") {
        cursor += 1;
        break;
      }
      cursor += 1;
    }
    const stableKey = [office.officeKind, office.districtNumber || "at-large", displayName.toLowerCase()].join("|");
    if (seen.has(stableKey)) {
      throw new ParserError(`duplicate Miami-Dade office extracted for ${displayName} / ${office.officeTitle}`);
    }
    seen.add(stableKey);
    const electedOrAppointed = termLength?.toLowerCase() === "appointed" ? "appointed" : termLength ? "elected" : undefined;
    const rawParts = [displayName, office.officeTitle];
    if (office.districtNumber) rawParts.push(`District ${office.districtNumber}`);
    if (termLength) rawParts.push(termLength);
    if (termEnds) rawParts.push(termEnds);
    records.push({
      displayName,
      officeTitle: office.officeTitle,
      officeKind: office.officeKind,
      seatFamily: office.seatFamily,
      governmentLevel: "county",
      branch: office.officeKind === "commission" ? "legislative" : "executive",
      districtNumber: office.districtNumber || undefined,
      jurisdictionName: "Miami-Dade County",
      stateCode: "FL",
      termLabel,
      termLengthText: termLength,
      yearOnBallotText: yearOnBallot,
      serviceEndDateText: termEnds,
      electedOrAppointed,
      rawRowText: rawParts.join(" | "),
    });
    index = cursor > index ? cursor : index + 1;
  }

  const mayorCount = records.filter((item) => item.officeTitle === "Mayor of Miami-Dade County").length;
  const commissionCount = records.filter((item) => item.officeTitle.startsWith("Miami-Dade County Commissioner, District")).length;
  records.sort((a, b) => {
    const rank = (item: ExtractedOfficeholder) =>
      item.officeTitle === "Mayor of Miami-Dade County" ? 0 : item.officeTitle.startsWith("Miami-Dade County Commissioner") ? 1 : 2;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return Number(a.districtNumber ?? 0) - Number(b.districtNumber ?? 0);
  });

  if (records.length < minimumRecords) {
    throw new ParserError(
      `extracted ${records.length} Miami-Dade county officers; expected mayor plus commission (minimum ${minimumRecords})`,
    );
  }
  if (minimumRecords >= 14 && (mayorCount !== 1 || commissionCount < 12)) {
    throw new ParserError(
      `extracted ${records.length} Miami-Dade county officers (${mayorCount} mayor, ${commissionCount} commissioners); expected mayor plus 13-member commission`,
    );
  }
  return records;
}

export function miamiDadeSeatKey(record: ExtractedOfficeholder): string {
  if (record.officeKind === "commission" && record.districtNumber) {
    return `us-fl-miami-dade-county-commissioner-district-${record.districtNumber}`;
  }
  return `us-fl-miami-dade-${record.seatFamily.replace(/_/g, "-")}`;
}
