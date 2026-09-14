/** Canonical stored-byte extraction. No civic claim, occupancy or publication writes. */
import { dispatchSourceAdapter } from './adapters.ts';
import { sha256Hex } from './hash.ts';
import { uuidFromName } from './ids.ts';
import { objectKeyFromRawObjectUri } from './r2-keys.ts';
import { withTimeout } from './timeouts.ts';
import { CivicError } from './errors.ts';
import type { EvidenceBucket } from './types.ts';
type Row=Record<string,any>;
type Database=(path:string,method?:string,body?:Row)=>Promise<Row[]>;
export async function runContractExtraction(input:{message:unknown,database:Database,bucket:EvidenceBucket,deploymentId?:string}):Promise<void>{
 const m=input.message as Row;
 if(m?.schemaVersion!=='hermes.extraction.v1'||!/^[a-f0-9-]{36}$/.test(m.job_id??'')||!/^[a-f0-9]{64}$/.test(m.attempt_token??''))throw Error('invalid_extraction_envelope');
 const query=`jobs?job_id=eq.${m.job_id}&status=eq.leased&leased_by=eq.${m.attempt_token}&lease_expires_at=gt.now`;
 const [job]=await input.database(query);if(!job)return;
 const p=job.payload??{},r=p.capability_route??{};
 if(job.job_type!=='contract_evidence_extract'||p.orchestration_authority!=='hermes'||p.execution_class!=='PRODUCTION'
   ||p.scope_key!=='evidence'||p.dispatch_blocker||p.research_work_identity!==job.dedupe_key||m.research_work_identity!==job.dedupe_key
   ||r.version!=='hermes-evidence-v1'||r.stage!=='extraction'||r.capability!=='official_profile_evidence_extraction'
   ||!input.deploymentId||r.deployment_id!==input.deploymentId||r.source_key!=='florida-governor-official'
   ||Date.parse(job.lease_expires_at)-Date.now()<90000||!/^[a-f0-9-]{36}$/.test(p.parent_job_id??'')
   ||!/^[a-f0-9-]{36}$/.test(r.input_retrieval_id??''))throw Error('extraction_route_rejected');
 const [parent]=await input.database(`jobs?job_id=eq.${p.parent_job_id}&status=eq.succeeded`);
 if(!parent||parent.research_need_id!==job.research_need_id||parent.target_id!==job.target_id
   ||parent.payload?.execution_class!=='PRODUCTION'||parent.payload?.orchestration_authority!=='hermes'
   ||parent.dedupe_key!==p.parent_research_work_identity||parent.checkpoint?.retrieval_id!==r.input_retrieval_id
   ||parent.checkpoint?.sha256!==r.input_sha256)throw Error('extraction_parent_rejected');
 const [raw]=await input.database(`raw_retrievals?retrieval_id=eq.${r.input_retrieval_id}&job_id=eq.${p.parent_job_id}`);
 if(!raw||raw.content_hash!==r.input_sha256||raw.byte_length<1||raw.byte_length>1048576||raw.http_status!==200
   ||raw.source_id!==r.source_id||raw.source_url!=='https://www.flgov.com/eog/')throw Error('extraction_input_rejected');
 const id=await uuidFromName(`hermes-extraction-run:${job.job_id}:${m.attempt_token}`);
 if((await input.database(`worker_runs?worker_run_id=eq.${id}`)).length)return;
 const lineage={orchestration_authority:'hermes',execution_class:'PRODUCTION',research_need_id:job.research_need_id,
   research_work_identity:job.dedupe_key,parent_research_work_identity:p.parent_research_work_identity,
   attempt_token:m.attempt_token,attempt_count:job.attempt_count,lease_expires_at:job.lease_expires_at,
   capability:r.capability,route:r,tool:'workers/cloudflare/shared/src/adapters.ts:dispatchSourceAdapter',worker_module:'workers/cloudflare/shared/src/contract-extraction.ts',extraction_run_id:id,parser_key:'official-profile-discovery',parser_version:'canonical-stored-v1',
   retrieval_id:raw.retrieval_id,retrieval_job_id:raw.job_id,retrieval_attempt_token:raw.metadata.attempt_token,
   retrieval_worker_run_id:raw.metadata.worker_run_id,sha256:raw.content_hash,byte_length:raw.byte_length};
 await input.database('worker_runs','POST',{worker_run_id:id,job_id:job.job_id,worker_key:'hermes.cloudflare.extraction',runtime:'cloudflare',deployment_id:input.deploymentId,status:'started',metadata:lineage});
 try{
   const key=objectKeyFromRawObjectUri(raw.raw_object_uri);if(!key||!input.bucket.get)throw Error('extraction_r2_required');
   const bytes=await withTimeout(input.bucket.get(key),10000,new CivicError('r2_timeout','R2 read timeout',{retryable:true}));
   if(!bytes||bytes.byteLength!==raw.byte_length||await sha256Hex(bytes)!==raw.content_hash)throw Error('extraction_r2_hash_mismatch');
   const parsed=await dispatchSourceAdapter({sourceKey:r.source_key,bytes,sourceUrl:raw.source_url,contentType:raw.content_type});
   if(parsed.holders.length!==1||parsed.verificationState!=='extracted')throw Error('extraction_ambiguous');
   const holder=parsed.holders[0];
   const [seat]=await input.database(`seats?seat_id=eq.${job.target_id}`);
   if(!seat||seat.seat_key!==holder.seatKey||holder.vacant)throw Error('extraction_subject_mismatch');
   const html=new TextDecoder('utf-8',{fatal:true}).decode(bytes),pos=html.indexOf(holder.displayName);
   if(pos<0)throw Error('extraction_exact_locator_missing');
   const start=Math.max(0,pos-100),end=Math.min(html.length,pos+holder.displayName.length+100);
   const excerpt=html.slice(start,end),offset=new TextEncoder().encode(html.slice(0,start)).length;
   if(!(await input.database(query)).length)throw Error('extraction_lease_lost');
   const evidenceId=await uuidFromName(`hermes-evidence:${raw.retrieval_id}:${raw.content_hash}:${offset}`);
   const [prior]=await input.database(`evidence_objects?evidence_id=eq.${evidenceId}`);
   if(prior&&(prior.content_hash!==raw.content_hash||prior.retrieval_id!==raw.retrieval_id||prior.excerpt!==excerpt))throw Error('extraction_evidence_collision');
   if(!prior)await input.database('evidence_objects','POST',{evidence_id:evidenceId,source_id:raw.source_id,retrieval_id:raw.retrieval_id,
     evidence_type:'html_excerpt',source_url:raw.source_url,supporting_locator:`utf8-byte-offset:${offset};length:${new TextEncoder().encode(excerpt).length}`,
     excerpt,asset_uri:raw.raw_object_uri,content_hash:raw.content_hash,verification_state:'pending'});
   if(!(await input.database(query)).length)throw Error('extraction_lease_lost');
   await input.database(`worker_runs?worker_run_id=eq.${id}&status=eq.started`,'PATCH',{status:'succeeded',completed_at:new Date().toISOString(),records_read:1,records_written:1,
     metadata:{...lineage,evidence_id:evidenceId,candidate_count:1,evidence_objects_created:prior?0:1,
       candidate:{subject_type:'seat',subject_id:job.target_id,field_key:'current_occupant',display_value:holder.displayName,verification_state:'collected_unreviewed'},
       schema_certified:parsed.schemaCertified,handoff_state:'AWAITING_CANONICAL_VALIDATION',physical_r2_sha256:raw.content_hash}});
 }catch(e){
   const code=e instanceof CivicError?e.errorClass:e instanceof Error&&/^[a-z0-9_]+$/.test(e.message)?e.message:'extraction_failed';
   await input.database(`worker_runs?worker_run_id=eq.${id}&status=eq.started`,'PATCH',{status:'failed',completed_at:new Date().toISOString(),error_class:code,error_message:'Stored-byte extraction failed; no claim published',metadata:{...lineage,retryable:e instanceof CivicError&&e.retryable}});throw e;
 }
}
