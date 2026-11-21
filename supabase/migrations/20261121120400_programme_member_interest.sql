alter table public.programme_manager_activities add column open_for_interest boolean not null default false;
alter table public.programme_manager_activities add constraint interest_requires_approval check (not open_for_interest or status = 'approved');
create table public.programme_manager_interests (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('mentor','volunteer','programme')),
 activity_id uuid references public.programme_manager_activities(id) on delete restrict,
 consented_at timestamptz not null default now(),
 check ((kind = 'programme') = (activity_id is not null))
);
create unique index programme_manager_general_interest_unique on public.programme_manager_interests(member_id,kind) where activity_id is null;
create unique index programme_manager_activity_interest_unique on public.programme_manager_interests(member_id,activity_id) where activity_id is not null;
alter table public.programme_manager_interests enable row level security;
revoke all on public.programme_manager_interests from anon,authenticated;
grant all on public.programme_manager_interests to service_role;
create function public.programme_interest_guard() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.activity_id is not null and not exists (select 1 from public.programme_manager_activities where id = new.activity_id and status = 'approved' and open_for_interest for share) then
  raise exception 'Activity is not open for interest' using errcode = '23514';
 end if;
 return new;
end $$;
create trigger programme_interest_guard before insert or update on public.programme_manager_interests for each row execute function public.programme_interest_guard();
