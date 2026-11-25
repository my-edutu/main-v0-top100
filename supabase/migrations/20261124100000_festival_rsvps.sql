create table public.festival_rsvps (
  festival_key text not null,
  member_id uuid not null references public.profiles(id) on delete cascade,
  attending boolean,
  guest_name text check (guest_name is null or char_length(guest_name) between 1 and 150),
  pickup text not null check (pickup in ('festival', 'dispatch')),
  dispatch jsonb check (dispatch is null or jsonb_typeof(dispatch) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (festival_key, member_id),
  check (attending is true or (guest_name is null and pickup = 'dispatch'))
);

alter table public.festival_rsvps enable row level security;
revoke all on table public.festival_rsvps from public, anon, authenticated;
grant select, insert, update on table public.festival_rsvps to service_role;
create index festival_rsvps_listing_idx on public.festival_rsvps (festival_key, updated_at desc, member_id);

-- An issued festival ticket is evidence of an earlier registration.
-- Earlier expressions of interest alone do not establish attendance.
insert into public.festival_rsvps (festival_key, member_id, attending, pickup, updated_at)
select festival_key, member_id, true,
  case when pickup_requested then 'festival' else 'dispatch' end, updated_at
from public.festival_attendance_interests
where registered_at is not null
on conflict (festival_key, member_id) do nothing;

-- Ticket links already in circulation can still create new registrations.
-- A ticket never overwrites an RSVP or dispatch request saved by the member.
create function public.record_festival_ticket_rsvp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.festival_rsvps (festival_key, member_id, attending, pickup, updated_at)
  values (new.festival_key, new.member_id, true,
    case when new.pickup_requested then 'festival' else 'dispatch' end, new.updated_at)
  on conflict (festival_key, member_id) do nothing;
  return new;
end;
$$;

revoke all on function public.record_festival_ticket_rsvp() from public, anon, authenticated;
grant execute on function public.record_festival_ticket_rsvp() to service_role;
create trigger record_festival_ticket_rsvp
after insert or update of registered_at on public.festival_attendance_interests
for each row when (new.registered_at is not null)
execute function public.record_festival_ticket_rsvp();

notify pgrst, 'reload schema';
