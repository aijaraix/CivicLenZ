import { ParserError } from "./errors.ts";
import type { ExtractedOfficeholder } from "./types.ts";

const AS_OF_PATTERN = /As of\s+(.+?)\s*$/i;
const PAGE_PATTERN = /^Page\s+\d+\s+of\s+\d+$/i;
const DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const YEAR_PATTERN = /^\d{4}$/;
const TERM_PATTERN = /\b(?:\d+\s+years?|Appointed|N\/?A)\b/i;
const TERM_LENGTH_PATTERN = /^(?:\d+\s+years?|Appointed|N\/?A)$/i;
const PLACEHOLDER_PATTERN = /^[-_.\u00ad]+$/;
const SKIP_NAMES = new Set(["vacant", "contact", "tbd"]);

type CountyOffice = {
  label: string;
  pattern: RegExp;
  officeKind: string;
  title: string;
  seatFamily: string;
};

type ParsedRow = {
  office: ReturnType<typeof matchCountyOffice>;
  displayName: string;
  termLength?: string;
  yearOnBallot?: string;
  termEnds?: string;
  rawRowText: string;
};

const COMMISSION_PATTERN = /^Board of County Commissioners District\s+(\d+)\s*:?\s*$/i;
const COMMISSION_ROW_PATTERN = /^Board of County Commissioners District\s+(\d+)\s*:\s*(.+)$/i;

const COUNTY_OFFICES: CountyOffice[] = [
  { label: "Mayor", pattern: /^Mayor$/i, officeKind: "mayor", title: "Mayor of Miami-Dade County", seatFamily: "mayor" },
  {
    label: "Clerk of the Circuit Court and Comptroller",
    pattern: /^Clerk of the Circuit Court and Comptroller$/i,
    officeKind: "clerk",
    title: "Miami-Dade County Clerk of the Circuit Court and Comptroller",
    seatFamily: "clerk_of_circuit_court_and_comptroller",
  },
  { label: "Sheriff", pattern: /^Sheriff$/i, officeKind: "sheriff", title: "Miami-Dade County Sheriff", seatFamily: "sheriff" },
  {
    label: "Property Appraiser",
    pattern: /^Property Appraiser$/i,
    officeKind: "property_appraiser",
    title: "Miami-Dade County Property Appraiser",
    seatFamily: "property_appraiser",
  },
  { label: "Tax Collector", pattern: /^Tax Collector$/i, officeKind: "tax_collector", title: "Miami-Dade County Tax Collector", seatFamily: "tax_collector" },
  {
    label: "Supervisor of Elections",
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

function normalizedLines(text: string): string[] {
  return text
    .replace(/(Page\s+\d+\s+of\s+\d+)/gi, "$1\n")
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
}

function isHeader(line: string): boolean {
  const lowered = line.toLowerCase();
  if (PAGE_PATTERN.test(line) || lowered.startsWith("miami-dade county office of the supervisor")) return true;
  if (AS_OF_PATTERN.test(line)) return true;
  return HEADER_LINES.has(lowered);
}

function isCountySectionMarker(line: string): boolean {
  return line.toLowerCase() === "miami-dade county";
}

function isOutsideCountySection(line: string): boolean {
  const lowered = line.toLowerCase();
  return lowered === "federal" || lowered === "state" || lowered === "miami-dade county legislative delegation";
}

export function matchCountyOffice(line: string): { officeKind: string; officeTitle: string; districtNumber: string; seatFamily: string } | undefined {
  const commission = line.match(COMMISSION_PATTERN);
  if (commission) {
    const district = String(Number.parseInt(commission[1] ?? "", 10));
    return {
      officeKind: "commission",
      officeTitle: "Miami-Dade County Commissioner, District " + district,
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

function splitCountyOfficeAndName(prefix: string): { office: ReturnType<typeof matchCountyOffice>; displayName?: string } | undefined {
  const commission = prefix.match(COMMISSION_ROW_PATTERN);
  if (commission) {
    const district = String(Number.parseInt(commission[1] ?? "", 10));
    return {
      office: {
        officeKind: "commission",
        officeTitle: "Miami-Dade County Commissioner, District " + district,
        districtNumber: district,
        seatFamily: "county_commission",
      },
      displayName: commission[2]?.trim(),
    };
  }
  for (const office of COUNTY_OFFICES) {
    const escapedLabel = office.label.replace(/[.*+?^()|[\]\\]/g, "\\$&");
    const match = prefix.match(new RegExp("^" + escapedLabel + "(?:\\s+(.+))?$", "i"));
    if (match) {
      return {
        office: {
          officeKind: office.officeKind,
          officeTitle: office.title,
          districtNumber: "",
          seatFamily: office.seatFamily,
        },
        displayName: match[1]?.trim(),
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

function parseMetadata(termLength: string, suffix: string): { termLength: string; yearOnBallot?: string; termEnds?: string } {
  const tokens = suffix.replace(/(?:\s+Contact|\s+_+)$/i, "").trim().split(/\s+/).filter(Boolean);
  return {
    termLength: normalizeLine(termLength),
    yearOnBallot: tokens[0] && !PLACEHOLDER_PATTERN.test(tokens[0]) ? tokens[0] : undefined,
    termEnds: tokens[1] && !PLACEHOLDER_PATTERN.test(tokens[1]) && DATE_PATTERN.test(tokens[1]) ? tokens[1] : undefined,
  };
}

function parseCombinedRow(line: string): ParsedRow | undefined {
  const body = line.replace(/(?:\s+Contact|\s+_+)$/i, "").trim();
  const term = TERM_PATTERN.exec(body);
  if (!term || term.index <= 0) return undefined;
  const prefix = body.slice(0, term.index).trim();
  const split = splitCountyOfficeAndName(prefix);
  if (!split?.office || !split.displayName || SKIP_NAMES.has(split.displayName.toLowerCase())) return undefined;
  const metadata = parseMetadata(term[0], body.slice(term.index + term[0].length));
  return {
    office: split.office,
    displayName: split.displayName,
    termLength: metadata.termLength,
    yearOnBallot: metadata.yearOnBallot,
    termEnds: metadata.termEnds,
    rawRowText: line,
  };
}

function makeRecord(row: ParsedRow, termLabel?: string): ExtractedOfficeholder {
  const office = row.office;
  if (!office) throw new ParserError("Miami-Dade row missing a supported county office");
  return {
    displayName: row.displayName,
    officeTitle: office.officeTitle,
    officeKind: office.officeKind,
    seatFamily: office.seatFamily,
    governmentLevel: "county",
    branch: office.officeKind === "commission" ? "legislative" : "executive",
    districtNumber: office.districtNumber || undefined,
    jurisdictionName: "Miami-Dade County",
    stateCode: "FL",
    termLabel,
    termLengthText: row.termLength,
    yearOnBallotText: row.yearOnBallot,
    serviceEndDateText: row.termEnds,
    electedOrAppointed: row.termLength?.toLowerCase() === "appointed" ? "appointed" : row.termLength ? "elected" : undefined,
    rawRowText: row.rawRowText,
  };
}

export function parseMiamiDadeDirectory(text: string): ExtractedOfficeholder[] {
  const lines = normalizedLines(text);
  let termLabel: string | undefined;
  for (const line of lines) {
    if (AS_OF_PATTERN.test(line)) {
      termLabel = line;
      break;
    }
  }

  const records: ExtractedOfficeholder[] = [];
  const seen = new Set<string>();
  let inCountySection = false;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (isCountySectionMarker(line)) {
      inCountySection = true;
      index += 1;
      continue;
    }
    if (isOutsideCountySection(line)) {
      inCountySection = false;
      index += 1;
      continue;
    }
    if (!inCountySection || isHeader(line)) {
      index += 1;
      continue;
    }

    const combined = parseCombinedRow(line);
    if (combined) {
      const stableKey = [combined.office?.officeKind, combined.office?.districtNumber || "at-large"].join("|");
      if (seen.has(stableKey)) throw new ParserError("duplicate Miami-Dade county office extracted for " + combined.displayName);
      seen.add(stableKey);
      records.push(makeRecord(combined, termLabel));
      index += 1;
      continue;
    }

    const office = matchCountyOffice(line);
    if (!office) {
      index += 1;
      continue;
    }
    let nameIndex = index + 1;
    let displayName: string | undefined;
    while (nameIndex < lines.length) {
      const candidate = lines[nameIndex] ?? "";
      if (isOutsideCountySection(candidate) || isCountySectionMarker(candidate) || isHeader(candidate) || matchCountyOffice(candidate)) break;
      const candidateRow = parseCombinedRow(candidate);
      if (candidateRow) break;
      if (isPersonName(candidate)) {
        displayName = candidate;
        break;
      }
      if (SKIP_NAMES.has(candidate.toLowerCase())) break;
      nameIndex += 1;
    }
    if (!displayName) {
      index = nameIndex > index ? nameIndex : index + 1;
      continue;
    }

    const tail: string[] = [];
    let cursor = nameIndex + 1;
    while (cursor < lines.length) {
      const value = lines[cursor] ?? "";
      if (isOutsideCountySection(value) || isCountySectionMarker(value) || isHeader(value) || matchCountyOffice(value) || parseCombinedRow(value)) break;
      tail.push(value);
      cursor += 1;
      if (/^(?:Contact|_+)$/i.test(value)) break;
    }
    const termIndex = tail.findIndex((value) => TERM_LENGTH_PATTERN.test(value));
    const termLength = termIndex >= 0 ? tail[termIndex] : undefined;
    const metadata = termLength ? parseMetadata(termLength, tail.slice(termIndex + 1).join(" ")) : undefined;
    const row: ParsedRow = {
      office,
      displayName,
      termLength,
      yearOnBallot: metadata?.yearOnBallot,
      termEnds: metadata?.termEnds,
      rawRowText: [line, displayName, ...tail].join(" | "),
    };
    const stableKey = [office.officeKind, office.districtNumber || "at-large"].join("|");
    if (seen.has(stableKey)) throw new ParserError("duplicate Miami-Dade county office extracted for " + displayName);
    seen.add(stableKey);
    records.push(makeRecord(row, termLabel));
    index = cursor > index ? cursor : index + 1;
  }

  records.sort((a, b) => {
    const rank = (item: ExtractedOfficeholder) =>
      item.officeTitle === "Mayor of Miami-Dade County" ? 0 : item.officeTitle.startsWith("Miami-Dade County Commissioner") ? 1 : 2;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return Number(a.districtNumber ?? 0) - Number(b.districtNumber ?? 0);
  });

  if (!records.length) {
    throw new ParserError("no supported Miami-Dade county roster units extracted");
  }
  return records;
}

export function miamiDadeSeatKey(record: ExtractedOfficeholder): string {
  if (record.officeKind === "commission" && record.districtNumber) {
    return "us-fl-miami-dade-county-commissioner-district-" + record.districtNumber;
  }
  return "us-fl-miami-dade-" + record.seatFamily.replace(/_/g, "-");
}
