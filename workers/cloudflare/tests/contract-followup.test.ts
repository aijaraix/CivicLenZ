/** FIXTURE behavioral tests; never production certification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runValidationFollowup, FOLLOWUP_VERSION } from '../shared/src/contract-followup.ts';
import { sha256Hex } from '../shared/src/hash.ts';
const id = (n:number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(name='Alex Example') {
 const html=`<html><head><title>Governor ${name}</title></head><body><h1>Governor ${name}</h1></body></html>`;
 const link={receipt_id:id(2),receipt_job_id:id(3),evidence_need_id:id(4),claim_id:id(5),parent_evidence_id:id(6),scope:'current_occupant',allowance:'validation-followup-initial-v1'};
 const common={contract_id:id(10),contract_version:'1',orchestration_authority:'hermes',execution_class:'PRODUCTION'};
 const job:any={job_id:id(1),job_type:'contract_scope_research',target_type:'seat',target_id:id(8),seat_id:id(8),research_need_id:id(9),attempt_count:1,max_attempts:5,dedupe_key:'followup-work',lease_expires_at:new Date(Date.now()+300000).toISOString(),payload:{...common,research_work_identity:'followup-work',scope_key:'current_occupant',validation_followup:link,capability_route:{version:FOLLOWUP_VERSION,capability:'current_occupant_context_research',worker:'civiclenz-collector',research_need_id:id(9),deployment_id:'release',source_id:id(11),source_key:'florida-governor-official',source_url:'https://www.flgov.com/',retrieval_url:'https://www.flgov.com/eog/',max_bytes:1048576,timeout_seconds:15}}};
 const parent:any={job_id:id(3),job_type:'contract_evidence_validate',target_id:id(8),research_need_id:id(4),dedupe_key:'parent-work',payload:{...common,research_work_identity:'parent-work'},checkpoint:{validation_run_id:id(2),independent_safety_check:'UNCHANGED_OCCUPANCY_AND_VERIFIED_CLAIMS'}};
 const receipt:any={validation_run_id:id(2),status:'ACCEPTED_FOR_VALIDATION',validator_key:'hermes.internal.receipt.v1',subject_id:id(8),input_summary:{job_id:id(3),research_work_identity:'parent-work'},result_summary:{claim_id:id(5),evidence_id:id(6),gate_facts:{outcome:'NEEDS_FURTHER_VALIDATION'}}};
 const claim:any={claim_id:id(5),subject_type:'seat',subject_id:id(8),seat_id:id(8),field_key:'current_occupant',verification_state:'collected_unreviewed',display_value:name};
 const oldEvidence:any={evidence_id:id(6),verification_state:'pending'};
 const source:any={active:true,source_key:'florida-governor-official',source_url:'https://www.flgov.com/',authority_tier:'TIER_1_PRIMARY_OFFICIAL'};
 const field:any={verification_requirement:'official_source',sensitivity_rule:'publication_eligible_claims_only',source_priority:{policy:'florida-governor-official'}};
 const seat:any={seat_id:id(8),seat_key:'us-fl-governor'};
 const people:any[]=[{person_id:id(20),canonical_name:name,identity_status:'unverified'}];
 const runs:any[]=[],raws:any[]=[],evidence:any[]=[],validations:any[]=[],writes:string[]=[];
 const objects=new Map<string,Uint8Array>(); let live=true,fetches=0,corrupt=false;
 const database=async(path:string,method='GET',body?:any):Promise<any[]>=>{
  const table=path.split('?')[0];
  if(method!=='GET') {
   writes.push(table);
   assert.ok(['worker_runs','raw_retrievals','evidence_objects','validation_runs'].includes(table),'forbidden civic mutation');
   const rows=table==='worker_runs'?runs:table==='raw_retrievals'?raws:table==='evidence_objects'?evidence:validations;
   if(method==='POST'){assert.equal(rows.length,0);rows.push(structuredClone(body));return [body];}
   assert.equal(method,'PATCH');assert.equal(table,'worker_runs');Object.assign(rows[0],body);return rows;
  }
  if(path.startsWith(`jobs?job_id=eq.${id(1)}`))return live?[job]:[];
  if(table==='jobs')return [parent];
  if(table==='worker_runs')return runs;
  if(table==='validation_runs')return [receipt];
  if(table==='claims')return [claim];
  if(table==='raw_retrievals')return raws;
  if(table==='evidence_objects')return path.includes(`evidence_id=eq.${id(6)}`)?[oldEvidence]:evidence;
  if(table==='claim_evidence')return [{role:'supports'}];
  if(table==='seats')return [seat];
  if(table==='sources')return [source];
  if(table==='research_contracts')return [{version:'1'}];
  if(table==='research_contract_fields')return [field];
  if(table==='persons')return people;
  throw Error('unexpected_database_read');
 };
 const bucket={put:async(k:string,b:Uint8Array)=>{objects.set(k,b.slice());},get:async(k:string)=>corrupt?new Uint8Array([0]):objects.get(k)};
 const fetchImpl:any=async(url:string,init:any)=>{fetches++;assert.equal(url,'https://www.flgov.com/eog/');assert.equal(init.redirect,'manual');return new Response(html,{headers:{'content-type':'text/html'}});};
 return {job,parent,receipt,claim,oldEvidence,source,field,seat,people,runs,raws,evidence,validations,writes,objects,database,bucket,fetchImpl,
  message:{schemaVersion:'hermes.validation-followup.v1',job_id:id(1),attempt_token:'a'.repeat(64),research_work_identity:'followup-work'},deploymentId:'release',
  invalidate:()=>{live=false;},corrupt:()=>{corrupt=true;},fetches:()=>fetches};
}

test('real worker code persists fixture bytes, exact locator, assessments and no civic promotions',async()=>{
 const f=fixture(),before=JSON.stringify([f.claim,f.oldEvidence,f.people,f.receipt]);await runValidationFollowup(f);await runValidationFollowup(f);
 assert.equal(f.fetches(),1);assert.equal(f.runs[0].status,'succeeded');assert.equal(f.validations.length,1);
 const v=f.validations[0],r=v.result_summary;
 assert.equal(r.decision,'NEEDS_FURTHER_VALIDATION');assert.equal(r.schema_certified,false);assert.equal(r.auto_verification_allowed,false);assert.equal(r.publication_eligible,false);
 assert.equal(r.identity_assessment.resolved,false);assert.equal(r.currentness_assessment.current_as_of,null);
 assert.equal(r.currentness_assessment.tenure_effective_period_established,false);assert.equal(r.dataset_applicability.state,'NOT_APPLICABLE');
 assert.ok(Date.parse(v.started_at)<=Date.parse(v.completed_at));assert.equal(JSON.stringify([f.claim,f.oldEvidence,f.people,f.receipt]),before);
 const bytes=[...f.objects.values()][0];assert.equal(await sha256Hex(bytes),f.raws[0].content_hash);
 const match=f.evidence[0].supporting_locator.match(/offset:(\d+);length:(\d+)/)!;
 assert.equal(new TextDecoder().decode(bytes.slice(+match[1],+match[1]+ +match[2])),f.evidence[0].excerpt);
});
test('no hardcoded officeholder and differing authoritative candidate remains unresolved',async()=>{
 const f=fixture('Taylor Sample');f.claim.display_value='Different Candidate';await runValidationFollowup(f);
 assert.equal(f.validations[0].result_summary.display_value,'Taylor Sample');assert.equal(f.validations[0].result_summary.agrees_with_original_display,false);
 assert.equal(f.claim.display_value,'Different Candidate');
});
test('identical immutable source bytes reuse the verified raw artifact without a duplicate retrieval row',async()=>{
 const f=fixture(), bytes=new TextEncoder().encode('<html><head><title>Governor Alex Example</title></head><body><h1>Governor Alex Example</h1></body></html>');
 const digest=await sha256Hex(bytes), key=`validation-followup/prior-run/${digest}.html`, uri=`r2://civiclenzevidence/${key}`;
 f.objects.set(key,bytes);f.raws.push({retrieval_id:id(40),source_id:id(11),http_status:200,byte_length:bytes.byteLength,raw_object_uri:uri,retrieval_status:'stored',content_hash:digest});
 await runValidationFollowup(f);
 assert.equal(f.raws.length,1);assert.equal(f.validations.length,1);
 assert.equal(f.validations[0].result_summary.raw_retrieval_reused,true);
 assert.ok(!f.writes.filter(x=>x==='raw_retrievals').length);
});
test('stale delivery and wrong deployment, budget lane, invalid attempt or identity cannot fetch',async()=>{
 const stale=fixture();stale.invalidate();await runValidationFollowup(stale);assert.equal(stale.writes.length,0);
 for(const mutate of [(f:any)=>f.job.payload.capability_route.deployment_id='old',(f:any)=>f.job.payload.validation_followup.allowance='other',(f:any)=>f.job.payload.scope_key='identity',(f:any)=>f.job.attempt_count=0,(f:any)=>f.job.attempt_count=6,(f:any)=>f.job.payload.execution_class='TEST',(f:any)=>f.message.research_work_identity='wrong',(f:any)=>f.job.lease_expires_at='invalid']){
  const f=fixture();mutate(f);await assert.rejects(runValidationFollowup(f));assert.equal(f.fetches(),0);assert.equal(f.writes.length,0);
 }
});
test('unacknowledged receipt, unrelated Seat, source or field policy cannot authorize HTTP',async()=>{
 for(const mutate of [(f:any)=>f.parent.checkpoint.independent_safety_check='unknown',(f:any)=>f.parent.target_id=id(70),(f:any)=>f.receipt.result_summary.claim_id=id(70),(f:any)=>f.seat.seat_key='us-fl-other',(f:any)=>f.source.active=false,(f:any)=>f.field.source_priority.policy='florida-election-calendar',(f:any)=>f.claim.verification_state='verified']){
  const f=fixture();mutate(f);await assert.rejects(runValidationFollowup(f));assert.equal(f.fetches(),0);assert.equal(f.validations.length,0);assert.equal(f.runs[0].status,'failed');
 }
});
test('HTTP 200 with unrelated HTML is retained as retrieval but cannot pass parsing',async()=>{
 const f=fixture();f.fetchImpl=async()=>new Response('<html>maintenance</html>',{headers:{'content-type':'text/html'}});
 await assert.rejects(runValidationFollowup(f));assert.equal(f.raws.length,1);assert.equal(f.validations.length,0);assert.equal(f.runs[0].status,'failed');
});
test('redirects, network failure, R2 corruption and lease loss do not produce successful assessments',async()=>{
 for(const mode of ['redirect','network','r2','lease']){
  const f=fixture();
  if(mode==='redirect')f.fetchImpl=async()=>new Response('',{status:302,headers:{location:'https://example.org'}});
  if(mode==='network')f.fetchImpl=async()=>{throw Error('offline');};
  if(mode==='r2')f.corrupt();
  if(mode==='lease'){const fetcher=f.fetchImpl;f.fetchImpl=async(...a:any[])=>{const r=await fetcher(...a);f.invalidate();return r;};}
  await assert.rejects(runValidationFollowup(f));assert.equal(f.validations.length,0);assert.equal(f.runs[0].status,'failed');
 }
});

function governorFixture(scope='identity') {
 const f=fixture();
 f.message.schemaVersion='hermes.governor-context.v1';
 f.job.payload.scope_key=scope;
 Object.assign(f.job.payload.validation_followup,{scope,allowance:'governor-context-initial-v1',context_parent_job_id:id(30)});
 Object.assign(f.job.payload.capability_route,{version:'hermes-governor-context-v1',capability:'governor_authoritative_context',retrieval_url:'https://www.flgov.com/eog/leadership'});
 f.field.verification_requirement=scope==='identity'?'official_source':'review';
 const db=f.database;
 f.database=async(path,method='GET',body)=>path.startsWith(`jobs?job_id=eq.${id(30)}`)?[{
  target_id:f.job.target_id,dedupe_key:'prior-work',payload:{orchestration_authority:'hermes',execution_class:'PRODUCTION',research_work_identity:'prior-work',
   validation_followup:{receipt_id:id(2)},capability_route:{version:FOLLOWUP_VERSION}},
  checkpoint:{independent_acknowledgement:'HERMES_ARTIFACT_LINEAGE_AND_UNCHANGED_TRUTH'}}]:db(path,method,body);
 f.fetchImpl=async(url:any,init:any)=>{
  assert.equal(url,'https://www.flgov.com/eog/leadership');assert.equal(init.redirect,'manual');
  return new Response('<main><article><h2>Governor</h2><a href="/eog/leadership/people/alex-example">Alex Example</a></article></main>',{headers:{'content-type':'text/html'}});
 };
 return f;
}
test('governor contexts reuse existing scope and preserve review, identity, temporal and publication gates',async()=>{
 for(const scope of ['identity','person','occupancy']) {
  const f=governorFixture(scope);await runValidationFollowup(f);
  const v=f.validations[0],r=v.result_summary;
  assert.equal(f.runs[0].worker_key,'hermes.cloudflare.governor_context');
  assert.equal(v.validator_key,'hermes-governor-context-v1');
  assert.equal(r.research_scope,scope);
  assert.equal(r.authoritative_context.officialProfileUrl,'https://www.flgov.com/eog/leadership/people/alex-example');
  assert.equal(r.identity_assessment.contextual_candidate_proposed,true);
  assert.equal(r.identity_assessment.resolved,false);
  assert.equal(r.currentness_assessment.current_as_of,null);
  assert.equal(r.authoritative_context.start_date,null);
  assert.equal(r.schema_certified,false);assert.equal(r.publication_eligible,false);
  assert.equal(r.review_required,scope!=='identity');
  assert.ok(Date.parse(v.started_at)<=Date.parse(v.completed_at));
 }
});
test('governor retry preserves bounded canonical attempt and completes the same work identity',async()=>{
 const f=governorFixture();f.job.attempt_count=2;await runValidationFollowup(f);
 assert.equal(f.runs[0].status,'succeeded');
 assert.equal(f.runs[0].metadata.attempt_count,2);
 assert.equal(f.validations[0].input_summary.research_work_identity,'followup-work');
});
test('HTTP 200 access challenge preserves raw failure evidence without validation success',async()=>{
 const f=governorFixture();f.fetchImpl=async()=>new Response('<html>wsidchk verify you are human</html>',{headers:{'content-type':'text/html'}});
 await assert.rejects(runValidationFollowup(f),/authoritative_source_access_restricted/);
 assert.equal(f.raws.length,1);assert.equal(f.validations.length,0);
 assert.equal(f.runs[0].status,'failed');assert.equal(f.runs[0].metadata.retryable,false);
});
test('metadata-only page is not a supported governor identity structure',async()=>{
 const f=governorFixture();f.fetchImpl=async()=>new Response('<title>Governor Alex Example</title>',{headers:{'content-type':'text/html'}});
 await assert.rejects(runValidationFollowup(f),/governor_card_structure_unproven/);
 assert.equal(f.validations.length,0);
});
test('governor context rejects missing proven parent before HTTP',async()=>{
 const f=governorFixture();delete f.job.payload.validation_followup.context_parent_job_id;
 f.fetchImpl=async()=>{throw Error('must_not_fetch');};
 await assert.rejects(runValidationFollowup(f),/context_parent_missing/);
});
test('person research does not waive the persisted review requirement',async()=>{
 const f=governorFixture('person');f.field.verification_requirement='official_source';
 f.fetchImpl=async()=>{throw Error('must_not_fetch');};
 await assert.rejects(runValidationFollowup(f),/followup_context_rejected/);
});
test('HTTP 403 is durable access-restriction failure, never factual not-found',async()=>{
 const f=governorFixture();f.fetchImpl=async()=>new Response('challenge',{status:403});
 await assert.rejects(runValidationFollowup(f));
 assert.equal(f.runs[0].error_class,'authoritative_source_access_restricted');
 assert.equal(f.runs[0].metadata.http_status,403);
 assert.equal(f.runs[0].metadata.retryable,false);
 assert.equal(f.validations.length,0);
});
