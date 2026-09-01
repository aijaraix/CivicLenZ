import { ParserError } from "./errors.ts";
import { classifyDocument } from "./http.ts";
import { parseMiamiDadeDirectory } from "./miami-dade.ts";
import { extractPdfText } from "./pdf-text.ts";
import type { ExtractedOfficeholder } from "./types.ts";

export type ParsedDocument =
  | { kind: "json"; value: unknown; text: string }
  | { kind: "html"; text: string }
  | { kind: "csv"; rows: string[][]; text: string }
  | { kind: "xml"; text: string }
  | { kind: "small_pdf"; text: string };

export async function parseDocument(bytes: Uint8Array, contentType: string | undefined): Promise<ParsedDocument> {
  const kind = classifyDocument(bytes, contentType);
  if (kind === "unknown") {
    throw new ParserError("unsupported or unrecognized document type");
  }
  if (kind === "small_pdf") {
    return { kind, text: await extractPdfText(bytes) };
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (kind === "json") {
    try {
      return { kind, value: JSON.parse(text), text };
    } catch (error) {
      throw new ParserError(`JSON parse failed: ${error instanceof Error ? error.message : "invalid JSON"}`);
    }
  }
  if (kind === "csv") {
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => line.split(",").map((cell) => cell.trim()));
    if (rows.length === 0) throw new ParserError("CSV document contained no rows");
    return { kind, rows, text };
  }
  if (kind === "html") {
    return { kind, text: extractHtmlText(text) };
  }
  return { kind, text };
}

export function extractHtmlText(html: string): string {
  const withoutScripts = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  const withoutStyles = withoutScripts.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  return withoutStyles
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function extractOfficeholders(input: {
  sourceKey: string;
  bytes: Uint8Array;
  contentType?: string;
}): Promise<ExtractedOfficeholder[]> {
  const parsed = await parseDocument(input.bytes, input.contentType);
  if (input.sourceKey === "miami-dade-county-elected-officials") {
    const text = "text" in parsed ? parsed.text : "";
    return parseMiamiDadeDirectory(text);
  }
  throw new ParserError(`no Cloudflare lightweight parser registered for ${input.sourceKey}`);
}
