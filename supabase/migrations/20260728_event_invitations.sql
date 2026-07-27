-- Event invitations + RSVP for awardees.
--
-- The FK points at public.events (supabase/migrations/005_create_events_table.sql),
-- which is the table the live /api/events route and lib/homepage-feed.ts both read
-- (`supabase.from('events')`). public.upcoming_events (003) is legacy and unread.
--
-- Prerequisite: supabase/SETUP-MEMBER-HUB.sql must already have been run
-- (profiles.membership_status is used to resolve the 'approved' audience).
create extension if not exists "pgcrypto";

create table if not exists public.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null
    constraint event_invitations_event_id_fkey references public.events(id) on delete cascade,
  -- The constraint is named explicitly because the table has two FKs to
  -- profiles: PostgREST cannot embed the member without an unambiguous hint,
  -- and the admin roster query uses this name.
  profile_id uuid not null
    constraint event_invitations_profile_id_fkey references public.profiles(id) on delete cascade,
  -- The admin who sent it. Kept as a soft link: if that admin's profile is
  -- deleted the invitation itself must survive, so it is nulled, not cascaded.
  invited_by uuid
    constraint event_invitations_invited_by_fkey references public.profiles(id) on delete set null,
  -- Optional personal note from the admin, shown on the member's card.
  message text,
  rsvp text not null default 'pending'
       check (rsvp in ('pending', 'attending', 'declined', 'maybe')),
  rsvp_at timestamptz,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Re-inviting the same member to the same event is an update (in practice a
  -- no-op, since the admin route inserts with ON CONFLICT DO NOTHING), never a
  -- second row that would reset an RSVP they already gave.
  constraint event_invitations_unique_per_member unique (event_id, profile_id)
);

-- Drives both the member's "your invitations" list and the nav pending badge.
create index if not exists event_invitations_profile_rsvp_idx
  on public.event_invitations (profile_id, rsvp);

-- Drives the admin RSVP roster for one event.
create index if not exists event_invitations_event_idx
  on public.event_invitations (event_id);

create or replace function public.touch_event_invitations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_invitations_set_updated_at on public.event_invitations;
create trigger event_invitations_set_updated_at
  before update on public.event_invitations
  for each row execute function public.touch_event_invitations_updated_at();

-- A member may only ever move rsvp / rsvp_at / seen_at. Pin every other column
-- back to its previous value for non-service-role callers, so a direct
-- PostgREST update cannot re-point an invitation at another event or member,
-- or forge who sent it. RLS alone cannot express "only these columns".
create or replace function public.event_invitations_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.id         := old.id;
  new.event_id   := old.event_id;
  new.profile_id := old.profile_id;
  new.invited_by := old.invited_by;
  new.message    := old.message;
  new.created_at := old.created_at;

  return new;
end;
$$;

drop trigger if exists event_invitations_guard_columns_trg on public.event_invitations;
create trigger event_invitations_guard_columns_trg
  before update on public.event_invitations
  for each row execute function public.event_invitations_guard_columns();

alter table public.event_invitations enable row level security;

drop policy if exists "Members read their own event invitations" on public.event_invitations;
create policy "Members read their own event invitations" on public.event_invitations
  for select using (auth.uid() = profile_id);

-- The USING clause scopes the update to their own row; the WITH CHECK clause
-- stops them handing the row to someone else. The column guard trigger above
-- restricts *which* columns the update may actually move.
drop policy if exists "Members rsvp to their own event invitations" on public.event_invitations;
create policy "Members rsvp to their own event invitations" on public.event_invitations
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "Service role manages event invitations" on public.event_invitations;
create policy "Service role manages event invitations" on public.event_invitations
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.event_invitations is
  'Targeted invitations to public.events rows, with the member RSVP. One row per (event, member).';
comment on column public.event_invitations.rsvp is
  'pending | attending | declined | maybe — pending means invited but not yet answered.';
comment on column public.event_invitations.seen_at is
  'Stamped the first time the member''s dashboard renders the invitation; drives the "New invitation" pill.';
