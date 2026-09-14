/** Real PostgreSQL (PGlite) tests; no production connection or lease proof.
 * Install @electric-sql/pglite@0.3.14 in a temporary directory; set PGLITE_MODULE
 * to its dist/index.js, then node --test this file. No application dependency.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../..',import.meta.url));
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const migration=readFileSync(root+'/supabase/migrations/202609020001_civic_collection_runtime.sql','utf8');
const python=(code)=>execFileSync('python',['-c',code],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
const install=python("import sys;sys.path.insert(0,'services/hermes-prime');import contract_library as c;print(c.render_sql(c.load_catalog()))");
const contract='00000000-0000-4000-8000-000000000001';
const seat='00000000-0000-4000-8000-000000000002';
async function setup(){
  const db=new PGlite();
  for(const table of ['research_contracts','research_contract_fields']){
    const start=migration.indexOf('CREATE TABLE IF NOT EXISTS public.'+table+' (');
    await db.exec(migration.slice(start,migration.indexOf('\n);',start)+4));
  }
  await db.exec('CREATE SCHEMA hermes_ops; CREATE ROLE hermes_runtime;');
  await db.exec(readFileSync(root+'/supabase/migrations/20260914025434_hermes_operational_incident_durability.sql','utf8'));
  await db.exec(`INSERT INTO public.research_contracts(research_contract_id,contract_key,name,version,active)
     VALUES('${contract}','STATE_GOVERNOR','Historical governor','1',true);`);
  return db;
}

test('inactive catalog installs atomically, retains policies, preserves v1, repeats without duplication',async()=>{
 const db=await setup();
 try{
  await db.exec(install);await db.exec(install);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.research_contracts')).rows[0].n,17);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.research_contract_fields')).rows[0].n,493);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM hermes_ops.incidents')).rows[0].n,493);
  assert.equal((await db.query('SELECT contract_key FROM public.research_contracts WHERE active')).rows[0].contract_key,'STATE_GOVERNOR');
  const fields=(await db.query("SELECT * FROM public.research_contract_fields WHERE field_key='votes'")).rows;
  assert.ok(fields.length>0);
  for(const f of fields){
    assert.equal(f.source_priority.contract_scope.datasetReconciliation.samplingAllowed,false);
    assert.equal(f.source_priority.contract_scope.publicationPolicy.state,'SEPARATE_GATE');
    assert.equal(f.category,'government_activity');
  }
  await db.exec("UPDATE public.research_contract_fields SET category='drift' WHERE field_key='votes'");
  await assert.rejects(db.exec(install),/Immutable contract installation mismatch/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.research_contracts')).rows[0].n,17);
 }finally{await db.close();}
});

test('planner scopes linked evidence to exact field and preserves existing needs',async()=>{
 const db=await setup();
 try{
  await db.exec(`CREATE TABLE public.seats(seat_id uuid PRIMARY KEY,research_contract_key text);
   CREATE TABLE public.claims(claim_id uuid PRIMARY KEY,seat_id uuid,subject_type text,subject_id uuid,field_key text);
   CREATE TABLE public.claim_evidence(claim_id uuid,evidence_id uuid);
   CREATE TABLE public.evidence_objects(evidence_id uuid PRIMARY KEY);
   CREATE TABLE hermes_ops.research_needs(target_type text,target_id uuid,contract_id uuid,contract_version text,scope_key text,origin text);
   INSERT INTO public.seats VALUES('${seat}','STATE_GOVERNOR');
   INSERT INTO public.research_contract_fields(research_contract_id,field_key,sort_order)
    VALUES('${contract}','identity',1),('${contract}','current_occupant',2),('${contract}','person',3);
   INSERT INTO public.claims VALUES('${contract}','${seat}','seat','${seat}','current_occupant');
   INSERT INTO public.evidence_objects VALUES('${seat}');
   INSERT INTO public.claim_evidence VALUES('${contract}','${seat}');
   INSERT INTO hermes_ops.research_needs VALUES('seat','${seat}','${contract}','1','identity','CONTRACT_GAP');`);
  const query=python("import ast;tree=ast.parse(open('services/hermes-prime/gap_planner.py').read());print(next(n.value for n in ast.walk(tree) if isinstance(n,ast.Constant) and isinstance(n.value,str) and 'SELECT s.seat_id' in n.value))");
  assert.deepEqual((await db.query(query)).rows.map(r=>r.field_key),['person']);
  // Evidence under the same field on another Seat cannot satisfy this Seat.
  await db.exec(`UPDATE public.claims SET seat_id='00000000-0000-4000-8000-000000000003',subject_id='00000000-0000-4000-8000-000000000003'`);
  assert.deepEqual((await db.query(query)).rows.map(r=>r.field_key),['current_occupant','person']);
 }finally{await db.close();}
});

test('inventory SQL runs under existing runtime incident grants and preserves resolved history',async()=>{
 const db=await setup();
 try{
  await db.exec(`CREATE TABLE public.jobs(job_id uuid PRIMARY KEY,job_type text,payload jsonb,attempt_count int,status text);
   CREATE TABLE public.worker_runs(job_id uuid);
   CREATE TABLE hermes_ops.research_needs(need_id uuid,contract_id uuid,contract_version text,scope_key text,reason text,state text,execution_class text);
   INSERT INTO public.jobs VALUES('${seat}','ingest','{}',3,'queued');
   INSERT INTO hermes_ops.research_needs VALUES('${seat}','${contract}','1','identity','CAPABILITY_NOT_IMPLEMENTED: identity','BLOCKED','PRODUCTION');
   GRANT USAGE ON SCHEMA hermes_ops TO hermes_runtime;
   GRANT SELECT ON public.jobs,public.worker_runs,hermes_ops.research_needs TO hermes_runtime;`);
  const calls=JSON.parse(python(`import sys,json
sys.path.insert(0,'services/hermes-prime/tests')
from test_backlog_inventory import Cursor,Connection,inventory,patch
c=Cursor([(True,),[('${seat}','ingest',{},3,0)],[('${seat}','${contract}','1','identity','CAPABILITY_NOT_IMPLEMENTED: identity')]])
with patch.object(inventory,'connect_database',return_value=Connection(c)):inventory.reconcile()
print(json.dumps(c.calls))`));
  await db.exec('BEGIN; SET LOCAL ROLE hermes_runtime');
  for(const [sql,args] of calls){
   let i=0;
   const query=sql.replaceAll('%%','%').replace(/%s/g,()=>'$'+(++i));
   await db.query(query,args);
  }
  await db.exec('COMMIT');
  assert.equal((await db.query('SELECT count(*)::int n FROM hermes_ops.incidents')).rows[0].n,2);
  await db.exec("UPDATE hermes_ops.incidents SET status='RESOLVED',resolution_evidence='{}'");
  await db.exec('BEGIN; SET LOCAL ROLE hermes_runtime');
  for(const [sql,args] of calls.filter(([sql])=>sql.includes('INSERT INTO hermes_ops.incidents'))){
   let i=0;await db.query(sql.replace(/%s/g,()=>'$'+(++i)),args);
  }
  await db.exec('COMMIT');
  assert.equal((await db.query("SELECT count(*)::int n FROM hermes_ops.incidents WHERE status='RESOLVED'")).rows[0].n,2);
  assert.deepEqual((await db.query('SELECT attempt_count,status,payload FROM public.jobs')).rows,[{attempt_count:3,status:'queued',payload:{}}]);
 }finally{await db.close();}
});
