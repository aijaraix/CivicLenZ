import { ParserError } from "./errors.ts";

function latin1(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

function findAll(haystack: string, needle: string): number[] {
  const hits: number[] = [];
  let from = 0;
  while (from < haystack.length) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    hits.push(at);
    from = at + needle.length;
  }
  return hits;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(Number.parseInt(oct, 8)));
}

export function extractTextOperators(content: string): string {
  const parts: string[] = [];
  const tj = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  const quote = /\((?:\\.|[^\\)])*\)\s*'/g;
  const array = /\[(.*?)\]\s*TJ/gs;
  let match: RegExpExecArray | null;
  while ((match = tj.exec(content))) {
    const inner = match[0].slice(1, match[0].lastIndexOf(")"));
    parts.push(decodePdfString(inner));
  }
  while ((match = quote.exec(content))) {
    const inner = match[0].slice(1, match[0].lastIndexOf(")"));
    parts.push(decodePdfString(inner));
  }
  while ((match = array.exec(content))) {
    const inner = match[1] ?? "";
    const strings = inner.match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    parts.push(strings.map((item) => decodePdfString(item.slice(1, -1))).join(""));
  }
  return parts.join("\n");
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (latin1(bytes.slice(0, 5)) !== "%PDF-") {
    throw new ParserError("payload is not a PDF");
  }
  const ascii = latin1(bytes);
  const streamStarts = findAll(ascii, "stream");
  const texts: string[] = [];
  for (const startToken of streamStarts) {
    let dataStart = startToken + "stream".length;
    if (ascii[dataStart] === "\r") dataStart += 1;
    if (ascii[dataStart] === "\n") dataStart += 1;
    const end = ascii.indexOf("endstream", dataStart);
    if (end === -1) continue;
    const dictStart = ascii.lastIndexOf("<<", startToken);
    const dict = dictStart >= 0 ? ascii.slice(dictStart, startToken) : "";
    const raw = bytes.slice(dataStart, end);
    let payload = raw;
    if (/\/Filter\s*\/FlateDecode/.test(dict) || /\/Filter\s*\[(?:[^\]]*\/FlateDecode[^\]]*)\]/.test(dict)) {
      try {
        payload = await inflate(raw);
      } catch {
        try {
          const zlib = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
          payload = new Uint8Array(await new Response(zlib).arrayBuffer());
        } catch {
          continue;
        }
      }
    }
    const extracted = extractTextOperators(latin1(payload));
    if (extracted.trim()) texts.push(extracted);
  }
  const combined = texts.join("\n").replace(/\u0000/g, "").trim();
  if (!combined) {
    throw new ParserError("PDF has no extractable text layer; route to heavy/OCR", true);
  }
  return combined;
}
