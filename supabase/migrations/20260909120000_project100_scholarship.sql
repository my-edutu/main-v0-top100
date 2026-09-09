-- Project100 Scholarship applications, schedule, and durable grouping records.
-- This migration is additive and may be safely replayed by setup generation.

create extension if not exists "pgcrypto";

create table if not exists public.project100_settings (
  id boolean primary key default true check (id),
  application_deadline timestamptz not null default '2026-11-07T23:59:59.000Z',
  kickoff_at timestamptz not null default '2027-01-01T00:00:00.000Z',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project100_settings_kickoff_after_deadline
    check (kickoff_at >= application_deadline)
);

insert into public.project100_settings (id, application_deadline, kickoff_at)
values (true, '2026-11-07T23:59:59.000Z', '2027-01-01T00:00:00.000Z')
on conflict (id) do nothing;

create table if not exists public.project100_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  full_name text,
  phone text,
  country text,
  location text,
  interest text,
  area_of_function text,
  team_lead_preference boolean,
  resource_support_needs text,
  consent boolean not null default false,
  consented_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project100_applications_submitted_complete check (
    status = 'draft' or (
      nullif(btrim(full_name), '') is not null
      and nullif(btrim(phone), '') is not null
      and nullif(btrim(country), '') is not null
      and nullif(btrim(location), '') is not null
      and nullif(btrim(interest), '') is not null
      and nullif(btrim(area_of_function), '') is not null
      and team_lead_preference is not null
      and nullif(btrim(resource_support_needs), '') is not null
      and consent is true
      and consented_at is not null
      and submitted_at is not null
    )
  )
);

create index if not exists project100_applications_status_created_idx
  on public.project100_applications (status, created_at desc);
create index if not exists project100_applications_country_location_idx
  on public.project100_applications (country, location);
create index if not exists project100_applications_interest_idx
  on public.project100_applications (interest);
create index if not exists project100_applications_area_of_function_idx
  on public.project100_applications (area_of_function);

create table if not exists public.project100_grouping_runs (
  id uuid primary key default gen_random_uuid(),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  group_size integer not null check (group_size > 0),
  random_seed text not null,
  application_count integer not null check (application_count >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists project100_grouping_runs_created_idx
  on public.project100_grouping_runs (created_at desc);

create table if not exists public.project100_groups (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.project100_grouping_runs(id) on delete cascade,
  group_number integer not null check (group_number > 0),
  created_at timestamptz not null default now(),
  unique (run_id, group_number)
);

create index if not exists project100_groups_run_idx on public.project100_groups (run_id, group_number);

create table if not exists public.project100_group_members (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.project100_grouping_runs(id) on delete cascade,
  group_id uuid not null references public.project100_groups(id) on delete cascade,
  application_id uuid not null references public.project100_applications(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (group_id, application_id),
  unique (run_id, application_id)
);

create index if not exists project100_group_members_group_idx
  on public.project100_group_members (group_id);
create index if not exists project100_group_members_application_idx
  on public.project100_group_members (application_id);

create or replace function public.project100_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.project100_lock_submitted_application()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'submitted' then
    raise exception 'Submitted Project100 applications are immutable';
  end if;

  if new.status = 'submitted' then
    new.submitted_at = coalesce(new.submitted_at, now());
    new.consented_at = coalesce(new.consented_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists project100_settings_touch_updated_at on public.project100_settings;
create trigger project100_settings_touch_updated_at
  before update on public.project100_settings
  for each row execute function public.project100_touch_updated_at();

drop trigger if exists project100_applications_touch_updated_at on public.project100_applications;
create trigger project100_applications_touch_updated_at
  before update on public.project100_applications
  for each row execute function public.project100_touch_updated_at();

drop trigger if exists project100_applications_lock_submitted on public.project100_applications;
create trigger project100_applications_lock_submitted
  before update on public.project100_applications
  for each row execute function public.project100_lock_submitted_application();

alter table public.project100_settings enable row level security;
alter table public.project100_applications enable row level security;
alter table public.project100_grouping_runs enable row level security;
alter table public.project100_groups enable row level security;
alter table public.project100_group_members enable row level security;

grant select, insert, update on public.project100_applications to authenticated;

drop policy if exists project100_member_read_own_application on public.project100_applications;
create policy project100_member_read_own_application on public.project100_applications
  for select to authenticated
  using (auth.uid() = member_id);

drop policy if exists project100_member_create_own_draft on public.project100_applications;
create policy project100_member_create_own_draft on public.project100_applications
  for insert to authenticated
  with check (auth.uid() = member_id and status = 'draft');

drop policy if exists project100_member_update_own_draft on public.project100_applications;
create policy project100_member_update_own_draft on public.project100_applications
  for update to authenticated
  using (auth.uid() = member_id and status = 'draft')
  with check (auth.uid() = member_id);
