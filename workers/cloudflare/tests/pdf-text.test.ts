import assert from "node:assert/strict";
import test from "node:test";

import { extractPdfText, extractTextOperators } from "../shared/src/pdf-text.ts";
import { parseMiamiDadeDirectory } from "../shared/src/miami-dade.ts";

async function deflate(value: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(value).buffer])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function pdfWithFlateContent(payload: Uint8Array, delimiter: string): Uint8Array {
  const prefix = new TextEncoder().encode(
    `%PDF-1.7\n1 0 obj\n<< /Length ${payload.length} /Filter /FlateDecode >>\nstream\r\n`,
  );
  const suffix = new TextEncoder().encode(`${delimiter}endstream\nendobj\n%%EOF\n`);
  const bytes = new Uint8Array(prefix.length + payload.length + suffix.length);
  bytes.set(prefix, 0);
  bytes.set(payload, prefix.length);
  bytes.set(suffix, prefix.length + payload.length);
  return bytes;
}

async function inflateRaw(payload: Uint8Array): Promise<ArrayBuffer> {
  const stream = new Blob([payload.buffer]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Response(stream).arrayBuffer();
}

test("the preserved production-shaped delimiter reproduces the old inflate failure", async () => {
  const compressed = await deflate("BT\n[(Office)-2( Example Name)] TJ\nET");
  const framed = new Uint8Array(compressed.length + 2);
  framed.set(compressed, 0);
  framed.set([0x0d, 0x0a], compressed.length);
  await assert.rejects(() => inflateRaw(framed));
  await assert.doesNotReject(() => extractPdfText(pdfWithFlateContent(compressed, "\r\n")));
});

test("production-shaped TJ fragments are decoded and parsed after PDF stream framing", async () => {
  const content = [
    "BT",
    "[(MIAMI)-3(-DADE) 5( COUNTY)] TJ",
    "[(4)-2( years) 4(2028) 3(01/02/2029) 2(Contact)] TJ",
    "[(Mayor) 4( Example Official 4 years 2028 01/02/2029 Contact)] TJ",
    "[(Board of County Commissioners District )-3(01: Example Commissioner 4 years 2028 11/21/2028 Contact)] TJ",
    "ET",
  ].join("\n");
  const pdf = pdfWithFlateContent(await deflate(content), "\r\n");
  const text = await extractPdfText(pdf);
  const rows = parseMiamiDadeDirectory(text);

  assert.match(text, /MIAMI-DADE COUNTY/);
  assert.ok(rows.length >= 2);
  assert.ok(rows.some((row) => row.officeKind === "mayor"));
  assert.ok(rows.some((row) => row.officeKind === "commission"));
  assert.ok(rows.every((row) => row.governmentLevel === "county"));
  assert.ok(rows.every((row) => row.jurisdictionName === "Miami-Dade County"));
});

test("TJ extraction preserves source-defined fragments without a fixed roster count", () => {
  const text = extractTextOperators("[(Office)-2( Example Name) 3(4 years)] TJ");
  assert.equal(text, "Office Example Name4 years");
  assert.doesNotMatch(text, /expected roster count/i);
});

test("malformed or unrelated PDF content fails closed", async () => {
  const malformed = new TextEncoder().encode("%PDF-1.7\nnot a stream");
  await assert.rejects(() => extractPdfText(malformed), /no extractable text layer/);

  const unrelated = pdfWithFlateContent(await deflate("BT\n[(Not a civic roster)] TJ\nET"), "\n");
  const text = await extractPdfText(unrelated);
  assert.throws(() => parseMiamiDadeDirectory(text), /no supported Miami-Dade county roster units/);
});
