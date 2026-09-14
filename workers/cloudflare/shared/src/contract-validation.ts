/** Accepts a HERMES-leased internal handoff. Never leases, publishes, or writes Occupancy. */
import { uuidFromName } from './ids.ts';
import { valueHash } from './hash.ts';
type Row=Record<string,any>;
type Database=(path:string,method?:string,body?:Row)=>Promise<Row[]>;
const uuid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
const same=(a:unknown,b:unknown)=>a!=null&&a===b;
const canonical=(j:Row)=>j.payload?.orchestration_authority==='hermes'&&j.payload?.execution_class==='PRODUCTION'&&same(j.dedupe_key,j.payload?.research_work_identity);
export async function runCanonicalValidation(input:{message:unknown,database:Database,deploymentId?:string}):Promise<void>{
 const m=input.message as Row,db=input.database;
 if(m?.schemaVersion!=='hermes.validation.v1'||!uuid(m.job_id)||!/^[a-f0-9]{64}$/.test(m.attempt_token??''))throw Error('invalid_validation_envelope');
 const lease=`jobs?job_id=eq.${m.job_id}&status=eq.leased&leased_by=eq.${m.attempt_token}&lease_expires_at=gt.now`;
 const [j]=await db(lease);if(!j)return;
 const p=j.payload??{},route=p.capability_route??{};
 if(!canonical(j)||j.job_type!=='contract_evidence_validate'||p.dispatch_blocker||!uuid(j.research_need_id)
   ||!same(m.research_work_identity,j.dedupe_key)||route.version!=='hermes-validation-receipt-v1'
   ||route.worker!=='civiclenz-validator'||!input.deploymentId||route.deployment_id!==input.deploymentId
   ||!same(route.research_need_id,j.research_need_id)||Date.parse(j.lease_expires_at)-Date.now()<90000)throw Error('validation_route_or_lease_rejected');
 const runId=await uuidFromName(`hermes-validation-worker:${j.job_id}:${m.attempt_token}`);
 const receiptId=await uuidFromName(`hermes-validation-receipt:${j.dedupe_key}`);
 if((await db(`worker_runs?worker_run_id=eq.${runId}`)).length)return;
 const lineage:Row={job_id:j.job_id,research_need_id:j.research_need_id,research_work_identity:j.dedupe_key,
   orchestration_authority:'hermes',execution_class:'PRODUCTION',attempt_token:m.attempt_token,attempt_count:j.attempt_count,
   lease_expires_at:j.lease_expires_at,validator_worker:'civiclenz-validator',validator_deployment_id:input.deploymentId,
   worker_run_id:runId,validation_run_id:receiptId,route};
 await db('worker_runs','POST',{worker_run_id:runId,job_id:j.job_id,worker_key:'hermes.cloudflare.validation',runtime:'cloudflare',deployment_id:input.deploymentId,status:'started',metadata:lineage});
 try{
  for(const key of ['parent_job_id','retrieval_id','evidence_id','extraction_run_id'])if(!uuid(p[key]))throw Error('invalid_handoff_lineage');
  const [parent]=await db(`jobs?job_id=eq.${p.parent_job_id}&status=eq.succeeded`);
  if(!parent||!canonical(parent)||parent.job_type!=='contract_evidence_extract'||!same(parent.research_need_id,j.research_need_id)
    ||!same(parent.target_id,j.target_id)||!same(parent.dedupe_key,p.parent_research_work_identity)
    ||!same(parent.checkpoint?.extraction_run_id,p.extraction_run_id)||!same(parent.checkpoint?.evidence_id,p.evidence_id)
    ||!same(parent.checkpoint?.retrieval_id,p.retrieval_id)||!uuid(parent.payload?.parent_job_id))throw Error('extraction_parent_mismatch');
  const [root]=await db(`jobs?job_id=eq.${parent.payload.parent_job_id}&status=eq.succeeded`);
  if(!root||!canonical(root)||root.job_type!=='contract_scope_research'||!same(root.research_need_id,j.research_need_id)
    ||!same(root.target_id,j.target_id)||!same(root.dedupe_key,p.root_research_work_identity)
    ||!same(root.dedupe_key,parent.payload.parent_research_work_identity)||!same(root.checkpoint?.retrieval_id,p.retrieval_id))throw Error('root_retrieval_mismatch');
  for(const ancestor of [parent,root])if(!same(ancestor.payload.contract_id,p.contract_id)||!same(ancestor.payload.contract_version,p.contract_version)||ancestor.payload.scope_key!=='evidence')throw Error('contract_lineage_mismatch');
  const [raw]=await db(`raw_retrievals?retrieval_id=eq.${p.retrieval_id}&job_id=eq.${root.job_id}`);
  const [evidence]=await db(`evidence_objects?evidence_id=eq.${p.evidence_id}`);
  const [extraction]=await db(`worker_runs?worker_run_id=eq.${p.extraction_run_id}&job_id=eq.${parent.job_id}&status=eq.succeeded`);
  if(!raw||raw.http_status!==200||raw.byte_length<1||!same(raw.content_hash,root.checkpoint.sha256)
    ||!same(raw.metadata?.attempt_token,root.checkpoint.attempt_token)||!same(raw.metadata?.worker_run_id,root.checkpoint.worker_run_id)
    ||!evidence||evidence.verification_state!=='pending'||!same(evidence.retrieval_id,raw.retrieval_id)
    ||!same(evidence.content_hash,raw.content_hash)||!same(evidence.source_id,raw.source_id)||!same(evidence.asset_uri,raw.raw_object_uri)
    ||!extraction||extraction.metadata?.orchestration_authority!=='hermes'||extraction.metadata?.execution_class!=='PRODUCTION'||extraction.worker_key!=='hermes.cloudflare.extraction'||!same(extraction.metadata?.extraction_run_id,p.extraction_run_id)
    ||!same(extraction.metadata?.research_need_id,j.research_need_id)||!same(extraction.metadata?.research_work_identity,parent.dedupe_key)
    ||!same(extraction.metadata?.attempt_token,parent.checkpoint.attempt_token)||!same(extraction.metadata?.retrieval_id,raw.retrieval_id)
    ||!same(extraction.metadata?.evidence_id,evidence.evidence_id)||!same(extraction.metadata?.sha256,raw.content_hash)
    ||!same(extraction.deployment_id,parent.payload.capability_route.deployment_id))throw Error('receipt_evidence_lineage_mismatch');
  const candidate=extraction.metadata.candidate;
  if(!candidate||candidate.subject_type!=='seat'||j.target_type!=='seat'||!same(candidate.subject_id,j.target_id)
    ||!same(j.seat_id,j.target_id)||candidate.field_key!=='current_occupant'||candidate.verification_state!=='collected_unreviewed'
    ||typeof candidate.display_value!=='string'||!candidate.display_value.trim()||candidate.display_value.length>200
    ||extraction.metadata.schema_certified!==false)throw Error('candidate_lineage_or_scope_mismatch');
  const [seat]=await db(`seats?seat_id=eq.${j.target_id}`);if(!seat)throw Error('candidate_seat_missing');
  const [source]=await db(`sources?source_id=eq.${raw.source_id}`);
  if(!source||!source.active)throw Error('source_inactive_or_missing');
  const claimId=await uuidFromName(`hermes-validation-claim:${j.dedupe_key}:${candidate.subject_id}:${candidate.field_key}`);
  const hash=await valueHash(candidate.field_key,candidate.display_value);
  const [existing]=await db(`claims?claim_id=eq.${claimId}`);
  if(existing&&(existing.verification_state!=='collected_unreviewed'||existing.subject_id!==j.target_id||existing.subject_type!=='seat'
    ||existing.seat_id!==j.target_id||existing.field_key!==candidate.field_key||existing.display_value!==candidate.display_value||existing.value_hash!==hash))throw Error('canonical_claim_collision');
  const assertLease=async()=>{if(!(await db(lease)).length)throw Error('canonical_validation_lease_lost');};
  await assertLease();
  if(!existing)await db('claims','POST',{claim_id:claimId,subject_type:'seat',subject_id:j.target_id,seat_id:j.target_id,
    field_key:candidate.field_key,normalized_value:candidate.display_value,display_value:candidate.display_value,value_hash:hash,
    verification_state:'collected_unreviewed',confidence:'insufficient'});
  await assertLease();
  const [link]=await db(`claim_evidence?claim_id=eq.${claimId}&evidence_id=eq.${evidence.evidence_id}`);
  if(link&&link.role!=='supports')throw Error('claim_evidence_role_collision');
  if(!link)await db('claim_evidence','POST',{claim_id:claimId,evidence_id:evidence.evidence_id,role:'supports'});
  // Read-only follow-through: matching names are candidates, never identity proof.
  const people=await db(`persons?canonical_name=eq.${encodeURIComponent(candidate.display_value)}&select=person_id,canonical_name,identity_status&limit=20`);
  const contradictions=await db(`contradictions?or=(seat_id.eq.${j.target_id},and(subject_type.eq.seat,subject_id.eq.${j.target_id}))&select=contradiction_id,status,field_key&limit=100`);
  const competing=await db(`claims?seat_id=eq.${j.target_id}&field_key=eq.current_occupant&select=claim_id,display_value,verification_state&limit=100`);
  const gateFacts={assessed_at:new Date().toISOString(),name_match_candidate_ids:people.map(x=>x.person_id),identity_resolved:false,
    evidence_excerpt_present:typeof evidence.excerpt==='string'&&evidence.excerpt.includes(candidate.display_value),
    evidence_locator:evidence.supporting_locator??null,source_id:source.source_id??raw.source_id,source_active:source.active,
    source_authority:source.authority_tier,retrieved_at:raw.retrieved_at??null,tenure_effective_period_established:false,
    existing_contradiction_ids:contradictions.map(x=>x.contradiction_id),
    competing_claim_ids:competing.filter(x=>x.claim_id!==claimId&&x.display_value!==candidate.display_value).map(x=>x.claim_id),
    query_limits:{people:20,contradictions:100,claims:100},dataset_reference_period_present:false,
    outcome:'NEEDS_FURTHER_VALIDATION',auto_verification_allowed:false,reason:'schema_certified=false; name match and retrieval date do not prove identity or current tenure'};
  const next='identity/evidence/source/currentness/contradiction/dataset validation pending';
  const receipt={...lineage,parent_extraction_job_id:parent.job_id,parent_research_work_identity:parent.dedupe_key,
    root_job_id:root.job_id,root_research_work_identity:root.dedupe_key,retrieval_id:raw.retrieval_id,
    content_hash:raw.content_hash,evidence_id:evidence.evidence_id,claim_id:claimId,extraction_run_id:extraction.worker_run_id,
    schema_certified:false,gate_facts:gateFacts,received_at:new Date().toISOString(),decision:'ACCEPTED_FOR_VALIDATION',
    reason:'Lineage accepted; extraction is not schema certified; no truth or publication decision',next_required_gate:next,
    gate_assessment:{identity:'PENDING: display name is not identity proof',evidence:'PENDING: linked exact retrieval/hash; sufficiency not decided',
      source_authority:source.authority_tier,currentness:'PENDING: retrieval time is not effective office tenure',
      contradiction:'PENDING: canonical reconciliation required',dataset_reconciliation:'PENDING: applicability must be established',
      canonical_decision:'PENDING',publication_eligible:false}};
  await assertLease();
  const [prior]=await db(`validation_runs?validation_run_id=eq.${receiptId}`);
  if(prior&&(prior.status!=='ACCEPTED_FOR_VALIDATION'||prior.input_summary?.research_work_identity!==j.dedupe_key
    ||prior.result_summary?.claim_id!==claimId||prior.result_summary?.evidence_id!==evidence.evidence_id))throw Error('validation_receipt_collision');
  if(!prior)await db('validation_runs','POST',{validation_run_id:receiptId,subject_type:'seat',subject_id:j.target_id,seat_id:j.target_id,
    validator_key:'hermes.internal.receipt.v1',status:'ACCEPTED_FOR_VALIDATION',input_summary:receipt,result_summary:receipt,completed_at:new Date().toISOString()});
  await assertLease();
  await db(`worker_runs?worker_run_id=eq.${runId}&status=eq.started`,'PATCH',{status:'succeeded',completed_at:new Date().toISOString(),records_read:1,records_written:1,metadata:{...receipt,receipt_attempt_token:prior?.input_summary?.attempt_token??m.attempt_token}});
 }catch(e){
  const code=e instanceof Error&&/^[a-z0-9_]+$/.test(e.message)?e.message:'canonical_receipt_failed';
  await db(`worker_runs?worker_run_id=eq.${runId}&status=eq.started`,'PATCH',{status:'failed',completed_at:new Date().toISOString(),error_class:code,error_message:'Canonical receipt failed; no verification or publication',metadata:{...lineage,retryable:false}});throw e;
 }
}
