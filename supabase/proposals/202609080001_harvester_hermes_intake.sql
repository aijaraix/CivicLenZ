-- PROPOSAL ONLY — NOT AN APPLIED MIGRATION.
--
-- This design is intentionally outside supabase/migrations/ until a governed
-- production schema review approves it. The external Harvester never receives
-- direct Supabase credentials; only the canonical HERMES service role would
-- execute this transaction after the local durable intake receipt exists.

begin;

create schema if not exists civiclenz_internal;
revoke all on schema civiclenz_internal from public, anon, authenticated;
grant usage on schema civiclenz_internal to service_role;

create table if not exists civiclenz_internal.producer_registry (
  producer_id text primary key,
  active boolean not null default true,
  allowed_result_contracts jsonb not null,
  allowed_capabilities jsonb not null,
  authority_boundary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists civiclenz_internal.research_work_ledger (
  research_work_identity text primary key,
  cohort_key text,
  capability text not null,
  state text not null,
  scope jsonb not null default '{}'::jsonb,
  current_as_of timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists civiclenz_internal.research_reservations (
  reservation_id text primary key,
  research_work_identity text not null references civiclenz_internal.research_work_ledger(research_work_identity),
  producer_id text not null references civiclenz_internal.producer_registry(producer_id),
  lease_expires_at timestamptz not null,
  state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists civiclenz_internal.harvester_intake_receipts (
  receipt_id uuid primary key,
  producer_id text not null references civiclenz_internal.producer_registry(producer_id),
  producer_version text not null,
  contract_version text not null,
  job_id text not null,
  research_work_identity text not null,
  research_reservation_id text,
  result_content_hash text not null check (result_content_hash ~ '^[a-f0-9]{64}$'),
  extraction_status text not null default 'extracted_unreviewed'
    check (extraction_status = 'extracted_unreviewed'),
  acknowledgement_state text not null,
  intake_state text not null default 'PENDING_CANONICAL_DISPATCH',
  received_at timestamptz not null,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ? 'extraction_status'
    and coalesce(payload->>'extraction_status' = 'extracted_unreviewed', false)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (producer_id, job_id),
  unique (producer_id, job_id, result_content_hash)
);

create table if not exists civiclenz_internal.harvester_evidence_metadata (
  receipt_id uuid not null references civiclenz_internal.harvester_intake_receipts(receipt_id) on delete cascade,
  evidence_key text not null,
  source_url text not null,
  retrieved_at timestamptz not null,
  mime_type text not null,
  byte_length bigint not null check (byte_length >= 0),
  declared_sha256 text not null check (declared_sha256 ~ '^[a-f0-9]{64}$'),
  actual_sha256 text,
  integrity_state text not null,
  canonical_r2_object_key text,
  method text not null,
  parser_version text not null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (receipt_id, evidence_key)
);

create table if not exists civiclenz_internal.canonical_dispatch_outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references civiclenz_internal.harvester_intake_receipts(receipt_id) on delete cascade,
  target text not null check (target in ('R2_RAW_EVIDENCE', 'SUPABASE_EXTRACTED_UNREVIEWED', 'RESEARCH_WORK_LEDGER')),
  state text not null default 'PENDING',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_error_class text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (receipt_id, target)
);

create index if not exists harvester_intake_receipts_pending_idx
  on civiclenz_internal.harvester_intake_receipts (intake_state, received_at);
create index if not exists canonical_dispatch_outbox_due_idx
  on civiclenz_internal.canonical_dispatch_outbox (state, next_attempt_at, created_at);

alter table civiclenz_internal.producer_registry enable row level security;
alter table civiclenz_internal.research_work_ledger enable row level security;
alter table civiclenz_internal.research_reservations enable row level security;
alter table civiclenz_internal.harvester_intake_receipts enable row level security;
alter table civiclenz_internal.harvester_evidence_metadata enable row level security;
alter table civiclenz_internal.canonical_dispatch_outbox enable row level security;

revoke all on all tables in schema civiclenz_internal from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema civiclenz_internal to service_role;

commit;
