import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = readFileSync(
  path.join(
    path.resolve(import.meta.dirname, "../../.."),
    "supabase/migrations/20260923012000_source_discovery_gis_capability_sync.sql",
  ),
  "utf8",
);

test("source discovery and GIS registry sync is explicit and READY-only", () => {
  assert.match(migration, /'source_discovery', 'source_discovery'/);
  assert.match(migration, /'gis_boundaries', 'gis_elections'/);
  assert.match(migration, /implementation_state = EXCLUDED\.implementation_state/);
  assert.match(migration, /implementation_state = 'NOT_IMPLEMENTED'/);
  assert.match(migration, /'evidence_only', true/);
  assert.match(migration, /'verification_authority', false/);
  assert.match(migration, /'publication_authority', false/);
  assert.doesNotMatch(migration, /last_successful_worker_run_id/);
  assert.doesNotMatch(migration, /last_observed_at/);
});
