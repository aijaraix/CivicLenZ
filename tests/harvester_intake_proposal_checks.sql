-- Run only against an isolated disposable PostgreSQL database, never production.
begin;
insert into civiclenz_internal.producer_registry
 (producer_id,allowed_result_contracts,allowed_capabilities,authority_boundary)
 values ('test-producer','[]','[]','TEST_ONLY_NO_CIVIC_DATA');

insert into civiclenz_internal.harvester_intake_receipts
 (receipt_id,producer_id,producer_version,contract_version,job_id,research_work_identity,
 result_content_hash,acknowledgement_state,received_at,payload)
 values ('00000000-0000-4000-8000-000000000001','test-producer','test','test','test-job','test-work',
 repeat('a',64),'ACCEPTED_FOR_VALIDATION',now(),'{"extraction_status":"extracted_unreviewed"}');

insert into civiclenz_internal.canonical_dispatch_outbox(receipt_id,target)
 select '00000000-0000-4000-8000-000000000001'::uuid, t
 from unnest(array['R2_RAW_EVIDENCE','SUPABASE_EXTRACTED_UNREVIEWED','RESEARCH_WORK_LEDGER']) t;

do $$
declare bad jsonb;
begin
 if (select count(*) from civiclenz_internal.canonical_dispatch_outbox) <> 3 then
   raise exception 'each receipt must support three distinct downstream targets';
 end if;
 begin
  insert into civiclenz_internal.canonical_dispatch_outbox(receipt_id,target)
  values ('00000000-0000-4000-8000-000000000001','R2_RAW_EVIDENCE');
  raise exception 'duplicate target unexpectedly accepted';
 exception when unique_violation then null;
 end;
 foreach bad in array array['{}'::jsonb,'{"extraction_status":null}'::jsonb,
                           '{"extraction_status":"VERIFIED"}'::jsonb] loop
  begin
   update civiclenz_internal.harvester_intake_receipts set payload=bad;
   raise exception 'invalid payload status unexpectedly accepted';
  exception when check_violation then null;
  end;
 end loop;
 begin
  update civiclenz_internal.harvester_intake_receipts set extraction_status='VERIFIED';
  raise exception 'verification promotion unexpectedly accepted';
 exception when check_violation then null;
 end;
 if has_schema_privilege('anon','civiclenz_internal','USAGE')
    or has_table_privilege('authenticated','civiclenz_internal.harvester_intake_receipts','SELECT') then
  raise exception 'public role has internal access';
 end if;
end $$;
rollback;
