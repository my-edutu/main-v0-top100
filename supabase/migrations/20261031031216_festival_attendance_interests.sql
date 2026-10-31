-- A saved expression of interest, not a ticket, payment receipt, or award fulfillment instruction.
create table public.festival_attendance_interests (
  festival_key text not null check (length(festival_key) between 1 and 100),
  member_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 150),
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  pickup_requested boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (festival_key, member_id)
);
create index festival_interests_updated_idx on public.festival_attendance_interests (festival_key, updated_at desc, member_id);
alter table public.festival_attendance_interests enable row level security;
revoke all on public.festival_attendance_interests from public, anon, authenticated;
grant select, insert, update, delete on public.festival_attendance_interests to service_role;
create policy festival_interest_service_access on public.festival_attendance_interests
  for all to service_role using (true) with check (true);
comment on table public.festival_attendance_interests is 'Server-only festival interest; current award payment must be verified separately. Never marks award delivery or event admission confirmed.';
