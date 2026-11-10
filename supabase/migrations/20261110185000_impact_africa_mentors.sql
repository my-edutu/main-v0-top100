begin;

create extension if not exists btree_gist;

create table public.impact_mentors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  headline text not null check (char_length(headline) between 2 and 120),
  bio text not null check (char_length(bio) between 10 and 1200),
  expertise text not null check (char_length(expertise) between 2 and 240),
  accepting_requests boolean not null default false,
  search_text text generated always as (name || ' ' || headline || ' ' || expertise) stored,
  updated_at timestamptz not null default now()
);
create index impact_mentors_directory on public.impact_mentors (name, id) where accepting_requests;

create table public.impact_mentor_matches (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.impact_mentors(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  goal text not null check (char_length(goal) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (mentor_id, member_id)
);
create index impact_mentor_matches_member on public.impact_mentor_matches (member_id, created_at desc);

create table public.impact_mentor_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.impact_mentors(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_url text not null check (char_length(meeting_url) <= 500 and meeting_url like 'https://%'),
  check (ends_at = starts_at + interval '30 minutes'),
  exclude using gist (mentor_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
);
create index impact_mentor_slots_schedule on public.impact_mentor_slots (mentor_id, starts_at);

create table public.impact_mentor_bookings (
  slot_id uuid primary key references public.impact_mentor_slots(id),
  match_id uuid not null references public.impact_mentor_matches(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index impact_mentor_bookings_match on public.impact_mentor_bookings (match_id);

alter table public.impact_mentors enable row level security;
alter table public.impact_mentor_matches enable row level security;
alter table public.impact_mentor_slots enable row level security;
alter table public.impact_mentor_bookings enable row level security;

revoke all on public.impact_mentors, public.impact_mentor_matches, public.impact_mentor_slots,
  public.impact_mentor_bookings from public, anon, authenticated;
grant select, insert, update on public.impact_mentors, public.impact_mentor_matches to service_role;
grant select, insert, delete on public.impact_mentor_slots to service_role;
grant select, insert on public.impact_mentor_bookings to service_role;

-- Keep the mentor code flow separate from existing password and member accounts.
create function public.impact_mentor_login_method(p_email text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when exists (select 1 from public.profiles p where p.id = u.id) then 'top100'
      when u.raw_app_meta_data->'impact_africa_mentor_login' = 'true'::jsonb then 'code'
      when nullif(u.encrypted_password, '') is not null then 'top100'
      else 'code'
    end
    from auth.users u
    where lower(u.email) = p_email
    limit 1
  ), 'new');
$$;

create function public.impact_request_mentor_match(p_member uuid, p_mentor uuid, p_goal text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.impact_mentors
    where id = p_mentor and accepting_requests and user_id <> p_member for share;
  if not found then
    raise exception 'Mentor unavailable' using errcode = 'P0002';
  end if;
  insert into public.impact_mentor_matches (member_id, mentor_id, goal) values (p_member, p_mentor, p_goal);
end;
$$;

create function public.impact_book_mentor_slot(p_member uuid, p_match uuid, p_slot uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_mentor uuid;
begin
  -- Serialize bookings for the member across mentors, and check the match and slot together.
  perform pg_advisory_xact_lock(hashtextextended(p_member::text, 1938));
  select mentor_id into v_mentor from public.impact_mentor_matches
    where id = p_match and member_id = p_member and status = 'accepted' for share;
  if not found then
    raise exception 'An accepted match is required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.impact_mentor_slots
      where id = p_slot and mentor_id = v_mentor and starts_at > now()) then
    raise exception 'Time is no longer available' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.impact_mentor_bookings b
    join public.impact_mentor_matches m on m.id = b.match_id
    join public.impact_mentor_slots booked on booked.id = b.slot_id
    join public.impact_mentor_slots requested on requested.id = p_slot
    where m.member_id = p_member
      and tstzrange(booked.starts_at, booked.ends_at, '[)') && tstzrange(requested.starts_at, requested.ends_at, '[)')
  ) then
    raise exception 'Member already booked for this time' using errcode = '23505';
  end if;
  insert into public.impact_mentor_bookings (slot_id, match_id) values (p_slot, p_match);
end;
$$;

revoke all on function public.impact_mentor_login_method(text),
  public.impact_request_mentor_match(uuid, uuid, text),
  public.impact_book_mentor_slot(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.impact_mentor_login_method(text),
  public.impact_request_mentor_match(uuid, uuid, text),
  public.impact_book_mentor_slot(uuid, uuid, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
