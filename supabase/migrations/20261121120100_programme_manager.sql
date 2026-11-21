-- Programme planning is private to admin APIs; it does not create public events.
create table public.programme_manager_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 240),
  programme text not null check (char_length(trim(programme)) between 1 and 160),
  owner text not null default '' check (char_length(owner) <= 120),
  due_date date,
  priority text not null default 'P1' check (priority in ('P0', 'P1', 'P2')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'blocked', 'done')),
  blocker text not null default '' check (char_length(blocker) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.programme_manager_tasks enable row level security;
revoke all on public.programme_manager_tasks from anon, authenticated;
grant all on public.programme_manager_tasks to service_role;

insert into public.programme_manager_tasks (title, programme, priority) values
  ('Confirm a qualified education delivery partner', 'Project100', 'P0'),
  ('Recruit the first 20–30 active volunteers', 'Community Impact Network', 'P1'),
  ('Identify three mentors and prepare a 15-person pilot', 'Career Pathways Labs', 'P1');
