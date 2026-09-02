import { ParserError } from "./errors.ts";
import { extractHtmlText, extractOfficeholders } from "./parsers.ts";
import { sourceAdapter, type SourceAdapterConfig } from "./source-config.ts";
import type { ExtractedOfficeholder } from "./types.ts";

export type AdapterParseResult = {
  sourceKey: string;
  holders: ExtractedOfficeholder[];
  discoveredUrls: string[];
  verificationState: "extracted" | "source_found";
  schemaCertified: boolean;
};

export async function dispatchSourceAdapter(input: {
  sourceKey: string;
  bytes: Uint8Array;
  contentType?: string;
  sourceUrl: string;
}): Promise<AdapterParseResult> {
  const config = sourceAdapter(input.sourceKey);
  if (!config) {
    throw new ParserError(`no source adapter registered for ${input.sourceKey}`);
  }
  if (config.heavyRequired) {
    throw new ParserError(`${input.sourceKey} requires civiclenz-heavy`, true);
  }
  if (config.parserKey === "miami-dade-elected-officials") {
    const holders = await extractOfficeholders(input);
    return {
      sourceKey: input.sourceKey,
      holders,
      discoveredUrls: [input.sourceUrl],
      verificationState: "extracted",
      schemaCertified: config.schemaCertified,
    };
  }
  if (config.parserKey === "florida-html-directory") {
    return {
      sourceKey: input.sourceKey,
      holders: parseFloridaDirectoryHtml(new TextDecoder().decode(input.bytes), config),
      discoveredUrls: [input.sourceUrl],
      verificationState: "extracted",
      schemaCertified: false,
    };
  }
  if (config.parserKey === "county-source-discovery" || config.parserKey === "official-profile-discovery" || config.parserKey === "election-calendar-discovery") {
    const text = extractHtmlText(new TextDecoder().decode(input.bytes));
    return {
      sourceKey: input.sourceKey,
      holders: [],
      discoveredUrls: discoverOfficialHrefs(text, input.sourceUrl),
      verificationState: "source_found",
      schemaCertified: false,
    };
  }
  throw new ParserError(`adapter ${input.sourceKey} is DISCOVERED_UNVERIFIED without a lightweight parser`);
}

export function parseFloridaDirectoryHtml(html: string, config: SourceAdapterConfig): ExtractedOfficeholder[] {
  const text = extractHtmlText(html);
  const holders: ExtractedOfficeholder[] = [];
  const pattern = /(?:Senator|Rep(?:resentative)?|Sen\.)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})\s+(?:District|Dist\.)\s+(\d+)/g;
  for (const match of text.matchAll(pattern)) {
    const displayName = match[1]?.trim();
    const districtNumber = match[2];
    if (!displayName || !districtNumber) continue;
    holders.push({
      displayName,
      officeTitle: config.officeScope === "state_house" ? `Florida House District ${districtNumber}` : `Florida Senate District ${districtNumber}`,
      officeKind: config.officeScope === "state_house" ? "state_representative" : "state_senator",
      seatFamily: config.officeScope,
      governmentLevel: "state",
      branch: "legislative",
      districtNumber,
      jurisdictionName: "Florida",
      stateCode: "FL",
      rawRowText: match[0],
    });
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
      if (host.endsWith(".gov") || host.endsWith(".us") || host.includes("broward") || host.includes("pbc") || host.includes("flsenate") || host.includes("flhouse") || host.includes("flgov") || host.includes("pbcelections") || host.includes("browardsoe") || host.includes("dos.fl")) {
        found.add(`${url.origin}${url.pathname}`);
      }
    } catch {
      continue;
    }
  }
  return [...found].slice(0, 20);
}

export function sourceDiscoveryRemainsUnverified(): true {
  return true;
}
