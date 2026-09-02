import { ParserError } from "./errors.ts";
import { parseMiamiDadeDirectory } from "./miami-dade.ts";
import {
  discoverOfficialHrefs,
  parseWithParserFamily,
  parserFamilyFor,
  sourceDiscoveryRemainsUnverified,
  parseFloridaDirectoryHtml,
} from "./parser-families.ts";
import { extractHtmlText, extractOfficeholders } from "./parsers.ts";
import { sourceAdapter, type SourceAdapterConfig } from "./source-config.ts";
import type { ExtractedOfficeholder } from "./types.ts";

export type AdapterParseResult = {
  sourceKey: string;
  holders: ExtractedOfficeholder[];
  discoveredUrls: string[];
  verificationState: "extracted" | "source_found";
  schemaCertified: boolean;
  parserFamily?: string;
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
      parserFamily: "PDF_DIRECTORY",
    };
  }
  const family = parserFamilyFor(config);
  if (family === "PDF_DIRECTORY" || family === "PDF_DETAIL") {
    throw new ParserError(`adapter ${input.sourceKey} is DISCOVERED_UNVERIFIED without a lightweight parser`);
  }
  const parsed = parseWithParserFamily({
    config,
    bytes: input.bytes,
    contentType: input.contentType,
    sourceUrl: input.sourceUrl,
  });
  return {
    sourceKey: input.sourceKey,
    holders: parsed.holders,
    discoveredUrls: parsed.discoveredUrls,
    verificationState: parsed.verificationState,
    schemaCertified: config.schemaCertified,
    parserFamily: parsed.family,
  };
}

export {
  discoverOfficialHrefs,
  parseFloridaDirectoryHtml,
  parseMiamiDadeDirectory,
  sourceDiscoveryRemainsUnverified,
};

export function extractHtmlTextForDiscovery(html: string): string {
  return extractHtmlText(html);
}
