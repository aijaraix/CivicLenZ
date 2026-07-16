-- CivicLenZ product foundation
-- This migration is intentionally conservative: it stores the minimum personal
-- information required for account features and keeps petition/signature records
-- private by default.

create type public.app_role as enum ('member', 'reviewer', 'admin');
create type public.petition_status as enum (
  'draft',
  'submitted_for_review',
  'published',
  'paused',
  'closed',
  'removed'
);
create type public.message_status as enum ('draft', 'copied', 'opened_official_channel', 'sent', 'failed');
create type public.alert_frequency as enum ('immediate', 'daily', 'weekly', 'off');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'member',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  state_code text,
  county_name text,
  district_name text,
  source text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, label)
);

create unique index user_jurisdictions_one_primary
  on public.user_jurisdictions(user_id)
  where is_primary;

create table public.official_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  official_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, official_id)
);

create table public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  official_id text,
  jurisdiction_id uuid references public.user_jurisdictions(id) on delete cascade,
  topic text,
  frequency public.alert_frequency not null default 'weekly',
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.petitions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  public_slug text unique,
  title text not null check (char_length(title) between 10 and 160),
  summary text not null check (char_length(summary) between 30 and 500),
  body text not null check (char_length(body) between 100 and 20000),
  action_type text not null default 'civic_action_request',
  target_official_id text,
  target_office text,
  jurisdiction_label text not null,
  status public.petition_status not null default 'draft',
  creator_attested_at timestamptz,
  moderation_notes text,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.petition_evidence (
  id uuid primary key default gen_random_uuid(),
  petition_id uuid not null references public.petitions(id) on delete cascade,
  title text not null,
  url text not null,
  publisher text,
  published_on date,
  note text,
  created_at timestamptz not null default now()
);

create table public.petition_signatures (
  id uuid primary key default gen_random_uuid(),
  petition_id uuid not null references public.petitions(id) on delete cascade,
  signer_id uuid not null references public.profiles(id) on delete cascade,
  public_display_name text,
  consented_at timestamptz not null default now(),
  eligibility_attested_at timestamptz,
  created_at timestamptz not null default now(),
  unique(petition_id, signer_id)
);

create table public.member_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  official_id text not null,
  subject text,
  body text not null,
  status public.message_status not null default 'draft',
  official_channel_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger alert_preferences_set_updated_at
  before update on public.alert_preferences
  for each row execute procedure public.set_updated_at();

create trigger petitions_set_updated_at
  before update on public.petitions
  for each row execute procedure public.set_updated_at();

create trigger member_messages_set_updated_at
  before update on public.member_messages
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_jurisdictions enable row level security;
alter table public.official_follows enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.petitions enable row level security;
alter table public.petition_evidence enable row level security;
alter table public.petition_signatures enable row level security;
alter table public.member_messages enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_events enable row level security;

create policy "members can read their profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "members can update their profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "members manage their own jurisdictions"
  on public.user_jurisdictions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "members manage their own follows"
  on public.official_follows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "members manage their own alert preferences"
  on public.alert_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "members can create and view their petitions"
  on public.petitions for select
  using (status = 'published' or auth.uid() = creator_id);

create policy "members can create their petitions"
  on public.petitions for insert
  with check (auth.uid() = creator_id and status = 'draft');

create policy "members can update their own unpublished petitions"
  on public.petitions for update
  using (auth.uid() = creator_id and status in ('draft', 'submitted_for_review'))
  with check (auth.uid() = creator_id and status in ('draft', 'submitted_for_review'));

create policy "public can read evidence for published petitions"
  on public.petition_evidence for select
  using (
    exists (
      select 1 from public.petitions
      where petitions.id = petition_evidence.petition_id
        and petitions.status = 'published'
    )
  );

create policy "creators manage evidence for their petitions"
  on public.petition_evidence for all
  using (
    exists (
      select 1 from public.petitions
      where petitions.id = petition_evidence.petition_id
        and petitions.creator_id = auth.uid()
        and petitions.status in ('draft', 'submitted_for_review')
    )
  )
  with check (
    exists (
      select 1 from public.petitions
      where petitions.id = petition_evidence.petition_id
        and petitions.creator_id = auth.uid()
        and petitions.status in ('draft', 'submitted_for_review')
    )
  );

create policy "members manage their own signatures"
  on public.petition_signatures for all
  using (auth.uid() = signer_id)
  with check (auth.uid() = signer_id);

create policy "members manage their own messages"
  on public.member_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "members can add their own consents"
  on public.consent_records for insert
  with check (auth.uid() = user_id);

create policy "members can read their own consents"
  on public.consent_records for select
  using (auth.uid() = user_id);
