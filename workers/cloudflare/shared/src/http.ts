import { HttpFetchError, ParserError } from "./errors.ts";
import { SMALL_PAYLOAD_MAX_BYTES, USER_AGENT } from "./types.ts";

export type FetchedDocument = {
  url: string;
  status: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  retrievedAt: string;
  bytes: Uint8Array;
};

export type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>;

export async function fetchDocument(
  url: string,
  options: {
    fetchImpl?: FetchImpl;
    maxBytes?: number;
    retrievedAt?: string;
    headers?: Record<string, string>;
    ifNoneMatch?: string;
    ifModifiedSince?: string;
  } = {},
): Promise<FetchedDocument> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? SMALL_PAYLOAD_MAX_BYTES;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        From: "research@civiclenz.ai",
        Accept: "application/pdf,application/json,text/csv,text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        ...(options.ifNoneMatch ? { "If-None-Match": options.ifNoneMatch } : {}),
        ...(options.ifModifiedSince ? { "If-Modified-Since": options.ifModifiedSince } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    throw new HttpFetchError(`source fetch failed: ${message}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) {
    throw new ParserError(`payload ${contentLength} bytes exceeds Cloudflare collector limit ${maxBytes}`, true);
  }
  if (response.status === 304) {
    return {
      url: response.url || url,
      status: 304,
      contentType: response.headers.get("content-type") ?? undefined,
      etag: response.headers.get("etag") ?? options.ifNoneMatch,
      lastModified: response.headers.get("last-modified") ?? options.ifModifiedSince,
      retrievedAt: options.retrievedAt ?? new Date().toISOString(),
      bytes: new Uint8Array(),
    };
  }
  if (!response.ok) {
    throw new HttpFetchError(`source returned HTTP ${response.status} for ${url}`, response.status);
  }
  if (response.status !== 200) {
    throw new HttpFetchError(`source returned non-200 HTTP ${response.status} for ${url}`, response.status);
  }

  const bytes = await readBoundedBytes(response, maxBytes);
  return {
    url: response.url || url,
    status: response.status,
    contentType: response.headers.get("content-type") ?? undefined,
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
    retrievedAt: options.retrievedAt ?? new Date().toISOString(),
    bytes,
  };
}

async function readBoundedBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new ParserError(`payload ${buffer.byteLength} bytes exceeds Cloudflare collector limit ${maxBytes}`, true);
    }
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel("payload too large for Cloudflare collector");
      throw new ParserError(`payload exceeded Cloudflare collector limit ${maxBytes}`, true);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export function classifyDocument(bytes: Uint8Array, contentType: string | undefined): "json" | "html" | "csv" | "xml" | "small_pdf" | "unknown" {
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 16));
  if (header.startsWith("%PDF-")) return "small_pdf";
  const type = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "application/json") return "json";
  if (type === "text/csv") return "csv";
  if (type === "text/html" || type === "application/xhtml+xml") return "html";
  if (type === "application/xml" || type === "text/xml") return "xml";
  const textStart = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 200)).trimStart();
  if (textStart.startsWith("{") || textStart.startsWith("[")) return "json";
  if (textStart.startsWith("<!DOCTYPE html") || textStart.startsWith("<html") || textStart.startsWith("<HTML")) return "html";
  if (textStart.startsWith("<?xml")) return "xml";
  if (type === "text/plain" && textStart.includes(",")) return "csv";
  return "unknown";
}
