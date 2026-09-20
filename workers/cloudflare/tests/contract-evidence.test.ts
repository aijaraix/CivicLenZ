// FIXTURE / UNIT tests. No production retrieval or persistence is claimed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runContractEvidence } from '../shared/src/contract-evidence.ts';

function fixture() {
 const token='a'.repeat(64), jobId='00000000-0000-4000-8000-000000000001';
 const message={schemaVersion:'hermes.contract.v1',job_id:jobId,attempt_token:token,research_work_identity:'work:v1:test'};
 const job={job_id:jobId,research_need_id:'need',dedupe_key:'work:v1:test',job_type:'contract_scope_research',attempt_count:1,lease_expires_at:new Date(Date.now()+300000).toISOString(),payload:{orchestration_authority:'hermes',execution_class:'PRODUCTION',scope_key:'evidence',research_work_identity:'work:v1:test',capability_route:{version:'hermes-evidence-v1',worker:'civiclenz-collector',deployment_id:'release',source_key:'florida-governor-official',source_url:'https://www.flgov.com/',retrieval_url:'https://www.flgov.com/eog/',source_id:'source',max_bytes:1048576,timeout_seconds:15}}};
 const runs:any[]=[], results:any[]=[], existingRaw:any[]=[], objects=new Map<string,Uint8Array>();let calls=0,validLease=true;
 const database=async(path:string,method='GET',body?:any)=>{
  if(path.startsWith('jobs?'))return validLease?[job]:[];
  if(path.startsWith('worker_runs')){
   if(method==='GET')return runs;
   if(method==='POST'){if(runs.length)throw Error('conflict');runs.push(body);return [body];}
   if(method==='PATCH'){Object.assign(runs[0],body);return runs;}
  }
  if(path.startsWith('raw_retrievals?'))return existingRaw;
  if(path==='raw_retrievals'){results.push(body);return [body];}
  throw Error('unexpected_store_operation');
 };
 const bucket={put:async(k:string,v:Uint8Array)=>{objects.set(k,v);},get:async(k:string)=>objects.get(k)};
 const fetchImpl=async()=>{calls++;return new Response('unit fixture bytes',{status:200,headers:{'content-type':'text/html'}});};
 return {message,job,database,bucket,fetchImpl,runs,results,existingRaw,objects,calls:()=>calls,invalidate:()=>{validLease=false;}};
}
const invoke=(f:ReturnType<typeof fixture>)=>runContractEvidence({...f,deploymentId:'release'});
test('real helper path in fixture persists raw bytes and independent run lineage only',async()=>{
 const f=fixture();await invoke(f);assert.equal(f.calls(),1);assert.equal(f.runs[0].status,'succeeded');assert.equal(f.results.length,1);assert.equal(f.results[0].metadata.worker_run_id,f.runs[0].worker_run_id);
 await invoke(f);assert.equal(f.calls(),1);assert.equal(f.runs.length,1);
});
test('stale envelope performs no tool action',async()=>{const f=fixture();f.invalidate();await invoke(f);assert.equal(f.calls(),0);assert.equal(f.runs.length,0);});
test('TEST work is rejected before worker start',async()=>{const f=fixture();f.job.payload.execution_class='TEST';await assert.rejects(invoke(f));assert.equal(f.calls(),0);});
test('network failure cannot create a successful run or result',async()=>{const f=fixture();f.fetchImpl=async()=>{throw Error('network failure');};await assert.rejects(invoke(f));assert.equal(f.runs[0].status,'failed');assert.equal(f.runs[0].metadata.retryable,true);assert.equal(f.results.length,0);});
test('R2 mismatch cannot create a result',async()=>{const f=fixture();f.bucket.get=async()=>new TextEncoder().encode('corrupt');await assert.rejects(invoke(f));assert.equal(f.runs[0].status,'failed');assert.equal(f.results.length,0);});
test('lease loss after network execution prevents result persistence',async()=>{const f=fixture();f.fetchImpl=async()=>{f.invalidate();return new Response('bytes');};await assert.rejects(invoke(f));assert.equal(f.results.length,0);assert.equal(f.runs[0].status,'failed');});
test('wrong deployment never executes',async()=>{const f=fixture();await assert.rejects(runContractEvidence({...f,deploymentId:'old'}));assert.equal(f.calls(),0);});
test('quarantine route stores raw evidence without asserting attribution',async()=>{
 const f=fixture();Object.assign(f.job.payload,{scope_key:'social'});Object.assign(f.job.payload.capability_route,
  {stage:'quarantine',capability:'evidence_quarantine_source_discovery',identity_attribution:'unresolved',publication_eligible:false});
 await invoke(f);assert.equal(f.runs[0].metadata.quarantine,true);assert.equal(f.results.length,1);
 assert.equal(f.runs[0].metadata.route.publication_eligible,false);
});
test('quarantine reuses verified immutable raw bytes across distinct scope work',async()=>{
 const f=fixture();Object.assign(f.job.payload,{scope_key:'social'});Object.assign(f.job.payload.capability_route,
  {stage:'quarantine',capability:'evidence_quarantine_source_discovery',identity_attribution:'unresolved',publication_eligible:false});
 const bytes=new TextEncoder().encode('unit fixture bytes');f.objects.set('existing.html',bytes);
 f.existingRaw.push({retrieval_id:'verified-raw',http_status:200,byte_length:bytes.byteLength,raw_object_uri:'r2://civiclenzevidence/existing.html',retrieval_status:'stored'});
 await invoke(f);assert.equal(f.results.length,0);assert.equal(f.runs[0].status,'succeeded');
 assert.equal(f.runs[0].metadata.retrieval_id,'verified-raw');assert.equal(f.runs[0].metadata.raw_retrieval_reused,true);
});
test('quarantine route fails closed if attribution or publication flag changes',async()=>{
 for(const change of [(r:any)=>r.identity_attribution='verified',(r:any)=>r.publication_eligible=true]){
  const f=fixture();f.job.payload.scope_key='social';Object.assign(f.job.payload.capability_route,
   {stage:'quarantine',capability:'evidence_quarantine_source_discovery',identity_attribution:'unresolved',publication_eligible:false});change(f.job.payload.capability_route);
  await assert.rejects(invoke(f));assert.equal(f.calls(),0);assert.equal(f.runs.length,0);
 }
});

test('explicit official HTTPS endpoint executes without following redirects',async()=>{
 const f=fixture();const urls:string[]=[];f.fetchImpl=async(url?:any,init?:any)=>{urls.push(String(url));assert.equal(init.redirect,'manual');return new Response('bytes');};
 await invoke(f);assert.deepEqual(urls,['https://www.flgov.com/eog/']);assert.equal(f.results[0].source_url,urls[0]);
});
test('arbitrary or downgraded retrieval endpoints never execute',async()=>{
 for(const url of ['http://www.flgov.com/eog/','https://unapproved.example/','https://www.flgov.com/other']){
  const f=fixture();f.job.payload.capability_route.retrieval_url=url;await assert.rejects(invoke(f));assert.equal(f.calls(),0);assert.equal(f.runs.length,0);
 }
});

test('manual redirect response is rejected without fetching its target',async()=>{
 const f=fixture();let calls=0;f.fetchImpl=async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://www.flgov.com/eog/'}});};
 await assert.rejects(invoke(f));assert.equal(calls,1);assert.equal(f.results.length,0);assert.equal(f.runs[0].status,'failed');
});
