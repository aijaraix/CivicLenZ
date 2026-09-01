-- CivicLenZ civic collection runtime (seat-centric)
--
-- CONSERVATIVE MIGRATION
-- Live CivicLenZ tables already exist on project ref uazqyzmzydtmbypjuqjw.
-- This file uses CREATE IF NOT EXISTS / exception-safe type creation only.
-- It does NOT DROP, TRUNCATE, or recreate live civic tables.
--
-- Live column dump was NOT available when this migration was written
-- (missing infrastructure: Supabase MCP and a service-role connection from
-- this coding environment). Column names here are a conservative seat-centric
-- contract matching the production table names. If live columns differ, do
-- not apply blindly to production — reconcile first.
--
-- This migration does not invent VERIFIED counters, fake completeness
-- metrics, or public-read policies on internal operational tables.

create extension if not exists postgis;
create extension if not exists pgcrypto;

create or replace function public.civic_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Canonical geography and offices
-- ---------------------------------------------------------------------------

create table if not exists public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_key text not null unique,
  name text not null,
  kind text not null,
  state_code text,
  county_name text,
  parent_id uuid references public.jurisdictions(id) on delete set null,
  fips_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jurisdiction_boundaries (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete cascade,
  version_label text,
  effective_on date,
  geom geometry(MultiPolygon, 4326),
  geojson jsonb,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  seat_key text not null unique,
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  seat_name text not null,
  office_type text not null,
  government_level text not null,
  branch text,
  chamber text,
  district_name text,
  district_number text,
  seat_at_large boolean,
  occupancy_status text not null default 'unknown',
  record_status text not null default 'extracted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seats_record_status_check
    check (record_status in ('extracted', 'canonical', 'rejected', 'superseded'))
);

create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  person_key text not null unique,
  display_name text not null,
  full_legal_name text,
  first_name text,
  last_name text,
  normalized_name text not null,
  record_status text not null default 'extracted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint persons_record_status_check
    check (record_status in ('extracted', 'canonical', 'rejected', 'superseded'))
);

create table if not exists public.seat_occupancies (
  id uuid primary key default gen_random_uuid(),
  seat_id uuid not null references public.seats(id) on delete restrict,
  person_id uuid not null references public.persons(id) on delete restrict,
  term_label text,
  started_on date,
  ended_on date,
  elected_or_appointed text,
  current_status text not null default 'unknown',
  record_status text not null default 'extracted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seat_id, person_id, started_on),
  constraint seat_occupancies_record_status_check
    check (record_status in ('extracted', 'canonical', 'rejected', 'superseded'))
);

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  election_key text not null unique,
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  seat_id uuid references public.seats(id) on delete set null,
  name text not null,
  election_date date,
  election_kind text,
  record_status text not null default 'extracted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null unique,
  election_id uuid not null references public.elections(id) on delete restrict,
  seat_id uuid not null references public.seats(id) on delete restrict,
  person_id uuid not null references public.persons(id) on delete restrict,
  party_name text,
  outcome text,
  record_status text not null default 'extracted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (election_id, seat_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Evidence and claims
-- ---------------------------------------------------------------------------

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  name text not null,
  source_url text not null,
  source_tier text,
  source_type text,
  jurisdiction_label text,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_retrievals (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  source_url text not null,
  retrieved_at timestamptz not null,
  http_status integer,
  content_type text,
  etag text,
  last_modified text,
  content_sha256 text not null,
  byte_length integer,
  r2_bucket text,
  r2_key text,
  parser_version text,
  parse_status text not null default 'unparsed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, content_sha256)
);

create table if not exists public.evidence_objects (
  id uuid primary key default gen_random_uuid(),
  raw_retrieval_id uuid references public.raw_retrievals(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  evidence_type text not null,
  source_url text not null,
  content_sha256 text not null,
  captured_at timestamptz not null,
  exact_excerpt text,
  page_number integer,
  review_status text not null default 'unreviewed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  claim_key text not null unique,
  claim_type text not null,
  status text not null default 'COLLECTED_UNREVIEWED',
  subject_type text,
  subject_id uuid,
  predicate text,
  object_value text,
  jurisdiction_id uuid references public.jurisdictions(id) on delete set null,
  seat_id uuid references public.seats(id) on delete set null,
  person_id uuid references public.persons(id) on delete set null,
  election_id uuid references public.elections(id) on delete set null,
  raw_retrieval_id uuid references public.raw_retrievals(id) on delete set null,
  publication_eligible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claims_status_check check (status in (
    'COLLECTED_UNREVIEWED',
    'EXTRACTED',
    'ENTITY_MATCH_PENDING',
    'EVIDENCE_PENDING',
    'VERIFICATION_PENDING',
    'VERIFIED',
    'CONFLICT',
    'REJECTED',
    'STALE',
    'CHECKED_NO_AUTHORITATIVE_RESULT'
  ))
);

create table if not exists public.claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  evidence_id uuid not null references public.evidence_objects(id) on delete cascade,
  relation text not null default 'supports',
  created_at timestamptz not null default now(),
  unique (claim_id, evidence_id)
);

create table if not exists public.validation_runs (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references public.claims(id) on delete set null,
  job_id uuid,
  result text not null,
  detail jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.contradictions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  conflicting_claim_id uuid references public.claims(id) on delete set null,
  summary text not null,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.research_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_key text not null unique,
  seat_id uuid references public.seats(id) on delete set null,
  person_id uuid references public.persons(id) on delete set null,
  title text not null,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_contract_fields (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.research_contracts(id) on delete cascade,
  field_key text not null,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  unique (contract_id, field_key)
);

create table if not exists public.monitoring_state (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_key text not null,
  check_class text not null,
  active boolean not null default true,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  next_check_at timestamptz,
  last_content_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_key, check_class)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null,
  route text not null,
  status text not null default 'pending',
  source_key text,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  lease_owner text,
  leased_at timestamptz,
  lease_expires_at timestamptz,
  last_error_class text,
  last_error_message text,
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_route_check check (route in ('ingest', 'validate', 'monitor', 'heavy')),
  constraint jobs_status_check check (status in (
    'pending', 'leased', 'running', 'completed', 'failed', 'dead_lettered', 'routed_heavy'
  ))
);

create unique index if not exists jobs_active_dedupe_key
  on public.jobs (dedupe_key)
  where status in ('pending', 'leased', 'running');

create index if not exists jobs_due_idx
  on public.jobs (scheduled_for)
  where status = 'pending';

create table if not exists public.worker_runs (
  id uuid primary key default gen_random_uuid(),
  worker_key text not null,
  runtime text not null default 'cloudflare',
  deployment_id text,
  job_id uuid references public.jobs(id) on delete set null,
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  records_read integer not null default 0,
  records_written integer not null default 0,
  claims_verified integer not null default 0,
  error_class text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint worker_runs_status_check check (status in (
    'started', 'succeeded', 'failed', 'dead_lettered'
  ))
);

create index if not exists worker_runs_worker_started_idx
  on public.worker_runs (worker_key, started_at desc);

-- updated_at triggers (skip if a live trigger already exists)
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'jurisdictions', 'seats', 'persons', 'seat_occupancies', 'elections',
    'candidate_campaigns', 'sources', 'claims', 'research_contracts',
    'monitoring_state', 'jobs'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.civic_set_updated_at()',
      tbl || '_set_updated_at',
      tbl
    );
  exception
    when duplicate_object then null;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- RLS: keep ON. Internal operational tables have no public SELECT.
-- Service role bypasses RLS (Supabase default). Website must use anon key
-- only and must not receive SUPABASE_SERVICE_ROLE_KEY.
-- ---------------------------------------------------------------------------

alter table public.jurisdictions enable row level security;
alter table public.jurisdiction_boundaries enable row level security;
alter table public.seats enable row level security;
alter table public.persons enable row level security;
alter table public.seat_occupancies enable row level security;
alter table public.elections enable row level security;
alter table public.candidate_campaigns enable row level security;
alter table public.sources enable row level security;
alter table public.raw_retrievals enable row level security;
alter table public.evidence_objects enable row level security;
alter table public.claims enable row level security;
alter table public.claim_evidence enable row level security;
alter table public.validation_runs enable row level security;
alter table public.contradictions enable row level security;
alter table public.research_contracts enable row level security;
alter table public.research_contract_fields enable row level security;
alter table public.monitoring_state enable row level security;
alter table public.jobs enable row level security;
alter table public.worker_runs enable row level security;

-- Intentionally no policies on:
--   jobs, worker_runs, raw_retrievals, validation_runs,
--   contradictions, monitoring_state
-- Those tables are internal-only. Authenticated website roles cannot read them.
-- Canonical civic rows are also not publicly readable in this migration;
-- publication to Vercel remains a later reviewed step.
