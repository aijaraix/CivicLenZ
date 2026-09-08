import assert from "node:assert/strict";
import test from "node:test";
import { loadBridgeSecret, signHarvesterPayload, verifyHarvesterAuthentication } from "../src/auth.ts";

test("Markdown copy delimiters normalize once without accepting the wrapped key", () => {
  const key = "a1".repeat(32); // synthetic test-only key
  const wrapped = "`" + key + "`";
  const body = Buffer.from("{}");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = { "x-civiclenz-producer-id": "civicslenzz-gemini-harvester",
    "x-civiclenz-timestamp": timestamp, "x-civiclenz-signature": signHarvesterPayload(key, timestamp, body) };
  assert.equal(loadBridgeSecret(wrapped), key);
  assert.equal(verifyHarvesterAuthentication(headers, body, loadBridgeSecret(wrapped), 60000).ok, true);
  headers["x-civiclenz-signature"] = signHarvesterPayload(wrapped, timestamp, body);
  assert.equal(verifyHarvesterAuthentication(headers, body, loadBridgeSecret(wrapped), 60000).ok, false);
  assert.equal(loadBridgeSecret(" " + key), " " + key);
  assert.equal(loadBridgeSecret("`ordinary-secret`"), "`ordinary-secret`");
  assert.equal(loadBridgeSecret(key), key);
});
