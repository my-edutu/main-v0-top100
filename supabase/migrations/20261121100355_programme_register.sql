create table public.programme_manager_programmes (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(trim(name)) between 1 and 200),
 priority text not null default 'P2' check(priority in ('P0','P1','P2')),
 status text not null default 'planned' check(status in ('planned','active','on_hold','completed')),
 owner text not null default '', next_action text not null default '', notes text not null default '',
 created_at timestamptz not null default now()
);
alter table public.programme_manager_programmes enable row level security;
revoke all on public.programme_manager_programmes from anon, authenticated;
grant all on public.programme_manager_programmes to service_role;
insert into public.programme_manager_programmes(name,priority,next_action) values
 ('Project100','P0','Confirm a qualified education delivery partner'),
 ('Community Impact Network','P1','Recruit the first 20–30 active volunteers'),
 ('Career Pathways Labs','P1','Identify three mentors and prepare a 15-person pilot');
