/** PostgreSQL parser regression for the exhausted ResearchWork generator. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');

function pythonValue(expression) {
  return execFileSync('python', ['-c', `import sys,json;sys.path.insert(0,'services/hermes-prime');import extraction_handoff as h;print(${expression})`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 128 * 1024,
  }).trim();
}

function parameterize(query) {
  let index = 0;
  return query.replaceAll('%s', () => `$${++index}`);
}

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE SCHEMA hermes_ops;
    CREATE TABLE public.jobs(
      job_id text PRIMARY KEY, job_type text, dedupe_key text, payload jsonb, research_need_id text,
      status text, attempt_count integer, max_attempts integer, target_type text,
      target_id text, seat_id text, priority integer, checkpoint jsonb, created_at timestamptz
    );
    CREATE TABLE hermes_ops.research_needs(
      need_id text PRIMARY KEY, execution_class text, state text
    );
    CREATE TABLE public.raw_retrievals(
      retrieval_id uuid PRIMARY KEY, source_id uuid NOT NULL, job_id uuid,
      retrieved_at timestamptz NOT NULL DEFAULT now(), source_url text NOT NULL,
      http_status integer, content_type text, etag text, last_modified text,
      content_hash text NOT NULL, raw_object_uri text, byte_length bigint,
      parser_key text, parser_version text, retrieval_status text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.worker_runs(
      worker_run_id text, job_id text, worker_key text, deployment_id text,
      error_class text, metadata jsonb, started_at timestamptz
    );
    INSERT INTO hermes_ops.research_needs VALUES ('need-1','PRODUCTION','BLOCKED');
    INSERT INTO public.jobs VALUES
      ('parent-1','contract_scope_research','work:parent', '{"orchestration_authority":"hermes","execution_class":"PRODUCTION"}', 'need-1', 'succeeded', 1, 2, 'seat', 'seat-1', 'seat-1', 16, '{"retrieval_id":"00000000-0000-0000-0000-000000000001","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}', now()),
      ('old-1','contract_evidence_extract','work:old', '{"orchestration_authority":"hermes","execution_class":"PRODUCTION","research_work_identity":"work:old","parent_job_id":"parent-1","capability_route":{"version":"hermes-evidence-v1","stage":"extraction","input_retrieval_id":"00000000-0000-0000-0000-000000000001","input_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","source_id":"00000000-0000-0000-0000-000000000002"}}', 'need-1', 'dead_letter', 2, 2, 'seat', 'seat-1', 'seat-1', 16, '{}', now());
    INSERT INTO public.raw_retrievals
      (retrieval_id, source_id, source_url, content_hash, http_status, byte_length, retrieval_status)
      VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
              'https://example.test/source.pdf','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              200,484648,'stored');
    INSERT INTO public.worker_runs VALUES ('run-1','old-1','hermes.cloudflare.extraction','old-deployment','parser_failure','{"retryable":false}',now());
  `);
  return db;
}

test('exhausted recovery SQL executes with the canonical raw_retrievals schema', async () => {
  const db = await setup();
  try {
    const sql = JSON.parse(pythonValue('json.dumps(h.EXHAUSTED_RECOVERY_QUERY)'));
    assert.doesNotMatch(sql, /ORDER BY\s+r2\.created_at\b/);
    assert.match(sql, /ORDER BY w2\.started_at DESC/);
    assert.doesNotMatch(sql, /ORDER BY\s+created_at\b/);
    const result = await db.query(parameterize(sql), ['hermes-evidence-v1', 'new-deployment', 3]);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].job_id, 'old-1');
  } finally {
    await db.close();
  }
});
