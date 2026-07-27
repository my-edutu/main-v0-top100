-- AFL-curated opportunities, including member-only listings that must never
-- reach a public caller.
create extension if not exists "pgcrypto";

create table if not exists public.member_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Opportunity' check (type in (
    'Workshop','Training','Fellowship','Grant','Scholarship','Mentorship','Residency','Opportunity'
  )),
  location text not null default 'Online',
  deadline text not null default 'Rolling',
  description text,
  url text,
  member_only boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_opportunities_published_idx
  on public.member_opportunities (published, member_only);
create index if not exists member_opportunities_type_idx on public.member_opportunities (type);

create or replace function public.touch_member_opportunities_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists member_opportunities_set_updated_at on public.member_opportunities;
create trigger member_opportunities_set_updated_at
  before update on public.member_opportunities
  for each row execute function public.touch_member_opportunities_updated_at();

alter table public.member_opportunities enable row level security;

-- Anonymous/public readers get published, non-member-only rows. The API also
-- enforces this; the policy is defence in depth for any direct client read.
do $$ begin
  create policy "Public reads published open opportunities" on public.member_opportunities
    for select using (published = true and member_only = false);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members read published opportunities" on public.member_opportunities
    for select using (published = true and auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role manages opportunities" on public.member_opportunities
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;
