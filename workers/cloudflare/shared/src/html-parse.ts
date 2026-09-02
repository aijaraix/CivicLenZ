/** Lightweight HTML helpers for Cloudflare collector parser families. No per-site DOM library. */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1] === "x" || entity[1] === "X";
      const code = Number.parseInt(hex ? entity.slice(2) : entity.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function stripTags(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function visibleText(html: string): string {
  return collapseWhitespace(decodeHtmlEntities(stripTags(html)));
}

export type HtmlAnchor = {
  href: string;
  text: string;
  start: number;
  end: number;
};

const ANCHOR_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const HREF_PATTERN = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

export function extractAnchors(html: string): HtmlAnchor[] {
  const anchors: HtmlAnchor[] = [];
  for (const match of html.matchAll(ANCHOR_PATTERN)) {
    const attrs = match[1] ?? "";
    const inner = match[2] ?? "";
    const hrefMatch = HREF_PATTERN.exec(attrs);
    const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "";
    if (!href) continue;
    const start = match.index ?? 0;
    anchors.push({
      href: decodeHtmlEntities(href.trim()),
      text: visibleText(inner),
      start,
      end: start + match[0].length,
    });
  }
  return anchors;
}

export function entryTextUntilNext(
  html: string,
  current: HtmlAnchor,
  next: HtmlAnchor | undefined,
  maxCharacters = 2000,
): string {
  const end = next ? next.start : Math.min(html.length, current.end + maxCharacters);
  return visibleText(html.slice(current.end, end)).slice(0, maxCharacters);
}

export function parseQueryParam(url: string, names: string[]): string | undefined {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) return undefined;
  const params = new URLSearchParams(url.slice(queryIndex + 1).replace(/&amp;/g, "&"));
  for (const name of names) {
    const value = params.get(name);
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

export function pathnameOf(url: string): string {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url).pathname;
    }
  } catch {
    return url.split("?")[0] ?? url;
  }
  const path = url.split("?")[0] ?? url;
  return path.startsWith("/") ? path : `/${path}`;
}

export function parseUsShortDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return undefined;
  const month = match[1]?.padStart(2, "0");
  const day = match[2]?.padStart(2, "0");
  const yearRaw = match[3] ?? "";
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  if (!month || !day) return undefined;
  return `${year}-${month}-${day}`;
}
