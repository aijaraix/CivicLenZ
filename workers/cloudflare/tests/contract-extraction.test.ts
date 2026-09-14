import test from 'node:test';
import assert from 'node:assert/strict';
import {runContractExtraction} from '../shared/src/contract-extraction.ts';
import {sha256Hex} from '../shared/src/hash.ts';
async function fixture(){
 const token='b'.repeat(64),jobId='00000000-0000-4000-8000-000000000011',parentId='00000000-0000-4000-8000-000000000012',rawId='00000000-0000-4000-8000-000000000013';
 const bytes=new TextEncoder().encode('<html><head><title>Governor Ron DeSantis</title></head><body>Governor Ron DeSantis</body></html>'),hash=await sha256Hex(bytes);
 const message={schemaVersion:'hermes.extraction.v1',job_id:jobId,attempt_token:token,research_work_identity:'work:v1:child'};
 const job:any={job_id:jobId,job_type:'contract_evidence_extract',research_need_id:'need',target_id:'seat',attempt_count:1,dedupe_key:'work:v1:child',lease_expires_at:new Date(Date.now()+300000).toISOString(),payload:{orchestration_authority:'hermes',execution_class:'PRODUCTION',scope_key:'evidence',research_work_identity:'work:v1:child',parent_research_work_identity:'work:v1:parent',parent_job_id:parentId,capability_route:{version:'hermes-evidence-v1',stage:'extraction',capability:'official_profile_evidence_extraction',deployment_id:'release',source_key:'florida-governor-official',source_id:'source',input_retrieval_id:rawId,input_sha256:hash}}};
 const raw={retrieval_id:rawId,job_id:parentId,content_hash:hash,byte_length:bytes.length,http_status:200,source_id:'source',source_url:'https://www.flgov.com/eog/',raw_object_uri:'r2://civiclenzevidence/raw/fixture.html',content_type:'text/html',metadata:{attempt_token:'a'.repeat(64),worker_run_id:'parent-run'}};
 const runs:any[]=[],evidence:any[]=[];let valid=true,reads=0;
 const database=async(path:string,method='GET',body?:any)=>{
  if(path.startsWith(`jobs?job_id=eq.${jobId}`))return valid?[job]:[];
  if(path.startsWith(`jobs?job_id=eq.${parentId}`))return [{research_need_id:'need',target_id:'seat',dedupe_key:'work:v1:parent',payload:{execution_class:'PRODUCTION',orchestration_authority:'hermes'},checkpoint:{retrieval_id:rawId,sha256:hash}}];
  if(path.startsWith('raw_retrievals?'))return [raw];
  if(path.startsWith('seats?'))return [{seat_key:'us-fl-governor'}];
  if(path.startsWith('worker_runs')){if(method==='GET')return runs;if(method==='POST'){runs.push(body);return [body];}Object.assign(runs[0],body);return runs;}
  if(path.startsWith('evidence_objects')){if(method==='GET')return evidence;evidence.push(body);return [body];}
  throw Error('unexpected_civic_write');
 };
 const bucket={put:async()=>{throw Error('must_not_write_raw');},get:async()=>{reads++;return bytes;}};
 return {message,job,raw,database,bucket,runs,evidence,bytes,reads:()=>reads,invalidate:()=>{valid=false;}};
}
const invoke=(f:any)=>runContractExtraction({...f,deploymentId:'release'});
test('stored-byte extraction creates exact unverified evidence and suppresses duplicates',async()=>{const f=await fixture();await invoke(f);assert.equal(f.runs[0].status,'succeeded');assert.equal(f.evidence.length,1);assert.equal(f.evidence[0].verification_state,'collected_unreviewed');assert.ok(new TextDecoder().decode(f.bytes).includes(f.evidence[0].excerpt));assert.equal(f.runs[0].metadata.candidate.display_value,'Ron DeSantis');await invoke(f);assert.equal(f.reads(),1);});
test('extraction rejects corrupt R2 bytes',async()=>{const f=await fixture();f.bucket.get=async()=>new TextEncoder().encode('corrupt');await assert.rejects(invoke(f));assert.equal(f.evidence.length,0);assert.equal(f.runs[0].status,'failed');});
test('extraction TEST and deployment mismatch never read R2',async()=>{for(const mutate of [(f:any)=>f.job.payload.execution_class='TEST',(f:any)=>f.job.payload.capability_route.deployment_id='old']){const f=await fixture();mutate(f);await assert.rejects(invoke(f));assert.equal(f.reads(),0);}});
test('stale extraction delivery never reads R2',async()=>{const f=await fixture();f.invalidate();await invoke(f);assert.equal(f.reads(),0);});
test('lease loss before evidence prevents writes',async()=>{const f=await fixture();f.bucket.get=async()=>{f.invalidate();return f.bytes;};await assert.rejects(invoke(f));assert.equal(f.evidence.length,0);});
