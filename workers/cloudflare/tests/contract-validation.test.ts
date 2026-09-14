import test from 'node:test';
import assert from 'node:assert/strict';
import {runCanonicalValidation} from '../shared/src/contract-validation.ts';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){
 const token='a'.repeat(64),need=id(9),seat=id(8),rawId=id(4),evId=id(5),exId=id(6);
 const common={orchestration_authority:'hermes',execution_class:'PRODUCTION',contract_id:id(10),contract_version:'1',scope_key:'evidence'};
 const root:any={job_id:id(3),job_type:'contract_scope_research',dedupe_key:'root',research_need_id:need,target_id:seat,payload:{...common,research_work_identity:'root'},checkpoint:{retrieval_id:rawId,sha256:'hash',attempt_token:'root-token',worker_run_id:id(7)}};
 const parent:any={job_id:id(2),job_type:'contract_evidence_extract',dedupe_key:'parent',research_need_id:need,target_id:seat,payload:{...common,research_work_identity:'parent',parent_job_id:root.job_id,parent_research_work_identity:'root',capability_route:{deployment_id:'extract-release'}},checkpoint:{extraction_run_id:exId,evidence_id:evId,retrieval_id:rawId,attempt_token:'extract-token'}};
 const job:any={job_id:id(1),job_type:'contract_evidence_validate',dedupe_key:'work',research_need_id:need,target_type:'seat',target_id:seat,seat_id:seat,attempt_count:1,lease_expires_at:new Date(Date.now()+300000).toISOString(),payload:{...common,research_work_identity:'work',parent_job_id:parent.job_id,parent_research_work_identity:'parent',root_research_work_identity:'root',retrieval_id:rawId,evidence_id:evId,extraction_run_id:exId,capability_route:{version:'hermes-validation-receipt-v1',worker:'civiclenz-validator',deployment_id:'release',research_need_id:need}}};
 const raw:any={retrieval_id:rawId,job_id:root.job_id,source_id:id(11),content_hash:'hash',byte_length:42,http_status:200,raw_object_uri:'r2://bucket/object',metadata:{attempt_token:'root-token',worker_run_id:id(7)}};
 const evidence:any={evidence_id:evId,retrieval_id:rawId,source_id:raw.source_id,content_hash:'hash',asset_uri:raw.raw_object_uri,verification_state:'pending'};
 const extraction:any={worker_run_id:exId,job_id:parent.job_id,worker_key:'hermes.cloudflare.extraction',deployment_id:'extract-release',metadata:{orchestration_authority:'hermes',execution_class:'PRODUCTION',extraction_run_id:exId,research_need_id:need,research_work_identity:'parent',attempt_token:'extract-token',retrieval_id:rawId,evidence_id:evId,sha256:'hash',schema_certified:false,candidate:{subject_type:'seat',subject_id:seat,field_key:'current_occupant',display_value:'Ron DeSantis',verification_state:'collected_unreviewed'}}};
 const runs:any[]=[],claims:any[]=[],links:any[]=[],receipts:any[]=[];let live=true;const writes:string[]=[];
 const db=async(path:string,method='GET',body?:any)=>{
  if(method!=='GET')writes.push(path.split('?')[0]);
  if(path.startsWith(`jobs?job_id=eq.${job.job_id}`))return live?[job]:[];
  if(path.startsWith(`jobs?job_id=eq.${parent.job_id}`))return [parent];
  if(path.startsWith(`jobs?job_id=eq.${root.job_id}`))return [root];
  if(path.startsWith('raw_retrievals?'))return [raw];if(path.startsWith('evidence_objects?'))return [evidence];
  if(path.startsWith(`worker_runs?worker_run_id=eq.${exId}`))return [extraction];
  if(path.startsWith('seats?'))return [{seat_id:seat}];if(path.startsWith('sources?'))return [{active:true,authority_tier:'TIER_1_PRIMARY_OFFICIAL'}];
  if(path.startsWith('persons?')||path.startsWith('contradictions?'))return [];
  for(const [name,rows] of [['worker_runs',runs],['claims',claims],['claim_evidence',links],['validation_runs',receipts]] as const){
   if(path.split('?')[0]===name){if(method==='GET')return rows;if(method==='POST'){assert.equal(rows.length,0,'duplicate insert');rows.push(body);return [body];}if(method==='PATCH'){assert.equal(name,'worker_runs');Object.assign(rows[0],body);return rows;}}
  }
  throw Error('forbidden_database_operation');
 };
 const message={schemaVersion:'hermes.validation.v1',job_id:job.job_id,attempt_token:token,research_work_identity:'work'};
 return {job,parent,root,raw,evidence,extraction,runs,claims,links,receipts,writes,message,database:db,invalidate:()=>{live=false;}};
}
const invoke=(f:any)=>runCanonicalValidation({...f,deploymentId:'release'});
test('canonical receipt preserves unreviewed truth states and duplicate delivery is idempotent',async()=>{
 const f=fixture();await invoke(f);await invoke(f);assert.equal(f.claims.length,1);assert.equal(f.links.length,1);assert.equal(f.receipts.length,1);assert.equal(f.runs.length,1);
 assert.equal(f.claims[0].verification_state,'collected_unreviewed');assert.equal(f.evidence.verification_state,'pending');assert.equal(f.receipts[0].status,'ACCEPTED_FOR_VALIDATION');assert.equal(f.receipts[0].result_summary.schema_certified,false);assert.equal(f.receipts[0].result_summary.gate_assessment.publication_eligible,false);assert.equal(f.runs[0].status,'succeeded');assert.ok(f.writes.every(x=>['claims','claim_evidence','validation_runs','worker_runs'].includes(x)));
});
test('stale lease does no work',async()=>{const f=fixture();f.invalidate();await invoke(f);assert.equal(f.writes.length,0);});
test('wrong deployment, TEST and work mismatch reject before start',async()=>{for(const change of [(f:any)=>f.job.payload.capability_route.deployment_id='old',(f:any)=>f.job.payload.execution_class='TEST',(f:any)=>f.message.research_work_identity='other']){const f=fixture();change(f);await assert.rejects(invoke(f));assert.equal(f.writes.length,0);}});
test('individually existing but mismatched lineage never produces claim or receipt',async()=>{
 for(const change of [(f:any)=>f.parent.research_need_id=id(99),(f:any)=>f.parent.dedupe_key='wrong',(f:any)=>f.root.dedupe_key='wrong',(f:any)=>f.raw.content_hash='wrong',(f:any)=>f.evidence.retrieval_id=id(99),(f:any)=>f.evidence.verification_state='verified',(f:any)=>f.extraction.metadata.research_work_identity='wrong',(f:any)=>f.extraction.metadata.candidate.subject_id=id(99),(f:any)=>f.extraction.metadata.schema_certified=true]){
  const f=fixture();change(f);await assert.rejects(invoke(f));assert.equal(f.claims.length,0);assert.equal(f.receipts.length,0);assert.equal(f.runs[0].status,'failed');
 }
});
test('loss of lease before persistence never creates a receipt',async()=>{const f=fixture();const db=f.database;f.database=async(...args:any[])=>{const result=await (db as any)(...args);if(args[0].startsWith('sources?'))f.invalidate();return result;};await assert.rejects(invoke(f));assert.equal(f.claims.length,0);assert.equal(f.receipts.length,0);});
