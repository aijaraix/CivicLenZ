-- Cover foreign-key lookups used by capability health and coverage-audit joins.
create index if not exists physical_capabilities_last_successful_worker_run_idx
  on public.physical_capabilities (last_successful_worker_run_id)
  where last_successful_worker_run_id is not null;

create index if not exists physical_capabilities_last_failed_worker_run_idx
  on public.physical_capabilities (last_failed_worker_run_id)
  where last_failed_worker_run_id is not null;

create index if not exists subject_scope_coverage_seat_idx
  on public.subject_scope_coverage (seat_id);

create index if not exists subject_scope_coverage_contract_idx
  on public.subject_scope_coverage (research_contract_id);

create index if not exists subject_scope_coverage_audit_worker_run_idx
  on public.subject_scope_coverage (coverage_audit_worker_run_id)
  where coverage_audit_worker_run_id is not null;
