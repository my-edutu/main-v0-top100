create table public.programme_manager_partners (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 200),
 programme text not null default '', contact text not null default '', notes text not null default '',
 status text not null default 'prospect' check(status in ('prospect','in_discussion','confirmed','declined')),
 evidence text not null default '', created_at timestamptz not null default now(),
 check(status <> 'confirmed' or length(trim(evidence)) > 0)
);
create table public.programme_manager_outcomes (
 id uuid primary key default gen_random_uuid(), activity_id uuid references public.programme_manager_activities(id) on delete restrict,
 indicator text not null check(length(trim(indicator)) between 1 and 200), value numeric not null check(value >= 0),
 unit text not null check(length(trim(unit)) between 1 and 60), evidence text not null default '',
 status text not null default 'reported' check(status in ('reported','verified')),
 notes text not null default '', created_at timestamptz not null default now(),
 check(status <> 'verified' or length(trim(evidence)) > 0)
);
alter table public.programme_manager_partners enable row level security;
alter table public.programme_manager_outcomes enable row level security;
revoke all on public.programme_manager_partners, public.programme_manager_outcomes from anon, authenticated;
grant all on public.programme_manager_partners, public.programme_manager_outcomes to service_role;
