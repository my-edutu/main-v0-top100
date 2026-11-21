create table public.programme_manager_weekly_reports (
 week_start date primary key, generated_at timestamptz not null default now(), report jsonb not null
);
alter table public.programme_manager_weekly_reports enable row level security;
revoke all on public.programme_manager_weekly_reports from anon, authenticated;
grant all on public.programme_manager_weekly_reports to service_role;
