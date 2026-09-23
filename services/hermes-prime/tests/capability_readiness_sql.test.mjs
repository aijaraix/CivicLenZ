/** PostgreSQL-compatible migration regression; no production connection. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");

const canonicalSchema = readFileSync(
  `${root}/supabase/migrations/20260917230000_physical_capability_and_projection.sql`,
  "utf8",
);
const migration1 = readFileSync(
  `${root}/supabase/migrations/20260923010000_capability_family_readiness.sql`,
  "utf8",
);
const migration2 = readFileSync(
  `${root}/supabase/migrations/20260923011000_elections_quality_capability_readiness.sql`,
  "utf8",
);
const migration3 = readFileSync(
  `${root}/supabase/migrations/20260923012000_source_discovery_gis_capability_sync.sql`,
  "utf8",
);

async function setup() {
  const db = new PGlite();
  const workerRunSchema = `
    CREATE TABLE public.worker_runs (
      worker_run_id uuid PRIMARY KEY,
      status text,
      completed_at timestamptz,
      deployment_id text,
      worker_key text,
      records_read bigint,
      records_written bigint,
      metadata jsonb
    );
    CREATE TABLE public.jobs (
      status text,
      payload jsonb
    );
  `;
  await db.exec(workerRunSchema);

  const start = canonicalSchema.indexOf(
    "CREATE TABLE IF NOT EXISTS public.physical_capabilities (",
  );
  const end = canonicalSchema.indexOf(
    "\n\nCOMMENT ON TABLE public.physical_capabilities",
    start,
  );
  assert.ok(start >= 0 && end > start);
  await db.exec(canonicalSchema.slice(start, end));
  return db;
}

test("readiness migrations execute with valid PostgreSQL JSONB and preserve guards", async () => {
  const db = await setup();
  try {
    // Migration #1 is already applied in production and remains unchanged.
    await db.exec(migration1);

    await db.exec(`
      INSERT INTO public.physical_capabilities
        (capability_key, capability_family, implementation_state)
      VALUES
        ('election_calendar', 'elections_candidates', 'NOT_IMPLEMENTED'),
        ('election_discovery', 'elections_candidates', 'NOT_IMPLEMENTED'),
        ('filing_status', 'elections_candidates', 'NOT_IMPLEMENTED'),
        ('ballot_qualification', 'elections_candidates', 'NOT_IMPLEMENTED'),
        ('election_results', 'elections_candidates', 'NOT_IMPLEMENTED'),
        ('election_history', 'background', 'NOT_IMPLEMENTED'),
        ('donor_relationships', 'relationships', 'NOT_IMPLEMENTED'),
        ('freshness_monitor', 'system_quality', 'NOT_IMPLEMENTED'),
        ('contradiction_resolution', 'system_quality', 'NOT_IMPLEMENTED')
    `);

    await db.exec(migration2);
    const readiness = (await db.query(`
      SELECT capability_key, implementation_state, current_blockers
      FROM public.physical_capabilities
      WHERE capability_key IN (
        'election_calendar', 'election_discovery', 'filing_status',
        'ballot_qualification', 'election_results', 'election_history',
        'donor_relationships', 'freshness_monitor',
        'contradiction_resolution'
      )
      ORDER BY capability_key
    `)).rows;
    assert.equal(readiness.length, 9);
    for (const row of readiness) {
      assert.equal(row.implementation_state, "READY");
      assert.deepEqual(row.current_blockers, ["NO_RECENT_SUCCESSFUL_CAPABILITY_RUN"]);
    }

    await db.exec(migration3);
    const synced = (await db.query(`
      SELECT capability_key, implementation_state, current_blockers
      FROM public.physical_capabilities
      WHERE capability_key IN ('source_discovery', 'gis_boundaries')
      ORDER BY capability_key
    `)).rows;
    assert.deepEqual(synced.map((row) => row.capability_key), ["gis_boundaries", "source_discovery"]);
    for (const row of synced) {
      assert.equal(row.implementation_state, "READY");
      assert.deepEqual(row.current_blockers, ["NO_RECENT_SUCCESSFUL_CAPABILITY_RUN"]);
    }

    // Reapplication cannot create duplicates or promote anything to ACTIVE.
    await db.exec(migration2);
    await db.exec(migration3);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM public.physical_capabilities WHERE implementation_state = 'ACTIVE'")).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM public.physical_capabilities WHERE capability_key IN ('source_discovery', 'gis_boundaries')")).rows[0].n,
      2,
    );
  } finally {
    await db.close();
  }
});
