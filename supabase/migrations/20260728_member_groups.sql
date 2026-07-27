-- Awardee groups: topic communities awardees join and talk inside.
-- Prerequisite: supabase/SETUP-MEMBER-HUB.sql must already have been run
-- (this file references public.profiles).
--
-- Idempotent: safe to run more than once.
create extension if not exists "pgcrypto";

-- The RLS policies below gate writes on profiles.membership_status, and the
-- live database may not have had SETUP-MEMBER-HUB.sql applied yet. This is the
-- exact same guarded statement that file uses, so running either order works.
alter table public.profiles
  add column if not exists membership_status text not null default 'pending';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.member_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  topic text,
  cover_url text,

  -- open    — any approved member joins instantly
  -- request — joining creates a `pending` membership an admin/owner approves
  -- private — invitation only; never listed to non-members
  visibility text not null default 'open' check (visibility in ('open', 'request', 'private')),

  created_by uuid references public.profiles(id) on delete set null,
  is_archived boolean not null default false,

  -- Maintained by the member_group_members trigger below. Never write it by
  -- hand: the trigger recomputes it from scratch on every membership change.
  member_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.member_groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'owner')),
  status text not null default 'active' check (status in ('pending', 'active', 'banned')),
  joined_at timestamptz not null default now(),
  -- Drives the unread badge: messages newer than this are unread.
  last_read_at timestamptz,
  unique (group_id, profile_id)
);

create table if not exists public.member_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.member_groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  -- Messages are only ever soft-deleted, so moderation stays auditable.
  is_deleted boolean not null default false,
  deleted_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists member_groups_visibility_idx
  on public.member_groups (visibility) where is_archived = false;
create index if not exists member_group_members_profile_idx
  on public.member_group_members (profile_id);
create index if not exists member_group_members_group_status_idx
  on public.member_group_members (group_id, status);
create index if not exists member_group_messages_group_created_idx
  on public.member_group_messages (group_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_member_groups_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists member_groups_set_updated_at on public.member_groups;
create trigger member_groups_set_updated_at
  before update on public.member_groups
  for each row execute function public.touch_member_groups_updated_at();

-- Recompute member_count from the actual rows rather than incrementing a
-- counter: an increment drifts the moment two membership changes interleave,
-- a full recount inside the same transaction cannot.
create or replace function public.sync_member_group_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group uuid;
begin
  if tg_op = 'DELETE' then
    target_group := old.group_id;
  else
    target_group := new.group_id;
  end if;

  update public.member_groups g
     set member_count = (
       select count(*)
         from public.member_group_members m
        where m.group_id = target_group
          and m.status = 'active'
     )
   where g.id = target_group;

  -- A membership row moved between groups: the old group needs recounting too.
  if tg_op = 'UPDATE' and old.group_id is distinct from new.group_id then
    update public.member_groups g
       set member_count = (
         select count(*)
           from public.member_group_members m
          where m.group_id = old.group_id
            and m.status = 'active'
       )
     where g.id = old.group_id;
  end if;

  return null;
end;
$$;

drop trigger if exists member_group_members_sync_count on public.member_group_members;
create trigger member_group_members_sync_count
  after insert or update or delete on public.member_group_members
  for each row execute function public.sync_member_group_member_count();

-- ---------------------------------------------------------------------------
-- Policy helpers
--
-- These are `security definer` so the policies below can read
-- member_group_members without re-entering that table's own RLS policies,
-- which would recurse infinitely.
-- ---------------------------------------------------------------------------

create or replace function public.is_site_admin(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = pid and p.role in ('admin', 'superadmin')
  );
$$;

-- Reading rights: active members and members still awaiting approval.
create or replace function public.is_group_participant(gid uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.member_group_members m
     where m.group_id = gid and m.profile_id = pid
       and m.status in ('active', 'pending')
  );
$$;

-- Writing rights: an approved, active membership only.
create or replace function public.is_active_group_member(gid uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.member_group_members m
     where m.group_id = gid and m.profile_id = pid and m.status = 'active'
  );
$$;

create or replace function public.is_group_admin(gid uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.member_group_members m
     where m.group_id = gid and m.profile_id = pid
       and m.status = 'active' and m.role in ('owner', 'moderator')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
--
-- The API routes use the service-role client and bypass all of this; these
-- policies are defence in depth for anything that reaches the tables with a
-- member's own JWT.
-- ---------------------------------------------------------------------------

alter table public.member_groups enable row level security;
alter table public.member_group_members enable row level security;
alter table public.member_group_messages enable row level security;

-- member_groups -------------------------------------------------------------

drop policy if exists "Service role manages member groups" on public.member_groups;
create policy "Service role manages member groups" on public.member_groups
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Members read listed and joined groups" on public.member_groups;
create policy "Members read listed and joined groups" on public.member_groups
  for select using (
    visibility <> 'private'
    or public.is_group_participant(id, auth.uid())
    or public.is_site_admin(auth.uid())
  );

drop policy if exists "Approved members create groups" on public.member_groups;
create policy "Approved members create groups" on public.member_groups
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.membership_status = 'approved'
    )
  );

drop policy if exists "Group admins update their group" on public.member_groups;
create policy "Group admins update their group" on public.member_groups
  for update using (
    public.is_group_admin(id, auth.uid()) or public.is_site_admin(auth.uid())
  ) with check (
    public.is_group_admin(id, auth.uid()) or public.is_site_admin(auth.uid())
  );

drop policy if exists "Site admins delete groups" on public.member_groups;
create policy "Site admins delete groups" on public.member_groups
  for delete using (public.is_site_admin(auth.uid()));

-- member_group_members ------------------------------------------------------

drop policy if exists "Service role manages group memberships" on public.member_group_members;
create policy "Service role manages group memberships" on public.member_group_members
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Members read memberships of their groups" on public.member_group_members;
create policy "Members read memberships of their groups" on public.member_group_members
  for select using (
    profile_id = auth.uid()
    or public.is_group_participant(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  );

drop policy if exists "Members join groups themselves" on public.member_group_members;
create policy "Members join groups themselves" on public.member_group_members
  for insert with check (
    (
      profile_id = auth.uid()
      and exists (
        select 1 from public.profiles p
         where p.id = auth.uid() and p.membership_status = 'approved'
      )
      and exists (
        select 1 from public.member_groups g
         where g.id = group_id and g.is_archived = false and g.visibility <> 'private'
      )
    )
    or public.is_group_admin(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  );

drop policy if exists "Members and group admins update memberships" on public.member_group_members;
create policy "Members and group admins update memberships" on public.member_group_members
  for update using (
    profile_id = auth.uid()
    or public.is_group_admin(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  ) with check (
    profile_id = auth.uid()
    or public.is_group_admin(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  );

drop policy if exists "Members leave and admins remove" on public.member_group_members;
create policy "Members leave and admins remove" on public.member_group_members
  for delete using (
    profile_id = auth.uid()
    or public.is_group_admin(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  );

-- member_group_messages -----------------------------------------------------

drop policy if exists "Service role manages group messages" on public.member_group_messages;
create policy "Service role manages group messages" on public.member_group_messages
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Group participants read messages" on public.member_group_messages;
create policy "Group participants read messages" on public.member_group_messages
  for select using (
    public.is_group_participant(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  );

drop policy if exists "Active members post messages" on public.member_group_messages;
create policy "Active members post messages" on public.member_group_messages
  for insert with check (
    profile_id = auth.uid()
    and public.is_active_group_member(group_id, auth.uid())
    and exists (
      select 1 from public.member_groups g
       where g.id = group_id and g.is_archived = false
    )
  );

-- Soft-delete only. There is deliberately no delete policy on this table.
drop policy if exists "Authors and moderators soft-delete messages" on public.member_group_messages;
create policy "Authors and moderators soft-delete messages" on public.member_group_messages
  for update using (
    profile_id = auth.uid()
    or public.is_group_admin(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  ) with check (
    profile_id = auth.uid()
    or public.is_group_admin(group_id, auth.uid())
    or public.is_site_admin(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Starter groups
-- ---------------------------------------------------------------------------

insert into public.member_groups (slug, name, description, topic, visibility)
values
  (
    'founders-and-builders',
    'Founders & Builders',
    'Awardees building companies, products and teams. Share what you are working on, ask for introductions, and compare notes on the hard parts.',
    'Entrepreneurship',
    'open'
  ),
  (
    'climate-and-sustainability',
    'Climate & Sustainability',
    'Climate action, clean energy, conservation and sustainable development work across the continent.',
    'Climate',
    'open'
  ),
  (
    'policy-and-advocacy',
    'Policy & Advocacy',
    'Public policy, governance, human rights and advocacy campaigns — the work of changing the rules.',
    'Policy',
    'open'
  )
on conflict (slug) do nothing;

comment on column public.member_groups.member_count is
  'Count of active memberships. Maintained by sync_member_group_member_count(); never set directly.';
comment on column public.member_group_members.last_read_at is
  'Last time this member opened the group. Messages newer than this are unread.';
