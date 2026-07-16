-- =====================================================================
-- ONE-TIME SETUP: member hub database objects  (safe to re-run)
-- =====================================================================
-- The live database is missing everything the member dashboard needs:
--   * profiles membership columns  -> everyone shows "pending" forever and
--     the admin Approve button errors
--   * access_codes                 -> invite-code signup always fails
--   * user_notifications           -> admin broadcasts have nowhere to go
--   * member_features              -> "get featured" submissions fail
--   * dm_conversations/dm_messages -> the new Messages section
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste this whole file
-- -> Run. Every statement is idempotent, so re-running is harmless.
--
-- This file consolidates, in order:
--   1. user_notifications               (from supabase/schema.sql)
--   2. 20260706_access_codes_and_membership.sql
--   3. 20260716_direct_messages.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USER NOTIFICATIONS (in-app dashboard notifications)
-- ---------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  category text default 'general',
  cta_label text,
  cta_url text,
  scheduled_for timestamp with time zone,
  delivered_at timestamp with time zone default now(),
  read_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb
);

create index if not exists user_notifications_user_idx on public.user_notifications(user_id);
create index if not exists user_notifications_category_idx on public.user_notifications(category);

alter table public.user_notifications enable row level security;

DO $$ BEGIN
  create policy "Users read their notifications" on public.user_notifications
    for select using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Users update notification status" on public.user_notifications
    for update using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service inserts notifications" on public.user_notifications
    for insert with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 2a. ACCESS CODES — admin issues these; users redeem one at signup.
-- ---------------------------------------------------------------------
create table if not exists public.access_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text default 'Awardee invite',
  status      text not null default 'active'
              check (status in ('active', 'used', 'expired', 'revoked')),
  uses_left   integer not null default 1,
  email       text,
  created_by  uuid,
  used_by     uuid,
  used_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '90 days'),
  created_at  timestamptz not null default now()
);

create index if not exists access_codes_code_idx   on public.access_codes (code);
create index if not exists access_codes_status_idx  on public.access_codes (status);
create index if not exists access_codes_created_idx on public.access_codes (created_at desc);

alter table public.access_codes enable row level security;

DO $$ BEGIN
  create policy "Service role manages access codes" on public.access_codes
    for all to service_role using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 2b. PROFILES — membership status, BIO limits, notification prefs.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists membership_status text not null default 'pending';

DO $$ BEGIN
  alter table public.profiles
    add constraint profiles_membership_status_check
    check (membership_status in ('pending', 'approved', 'rejected', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Legacy drift fix: the live database has a NOT NULL "Email" (capital E)
-- column from an old import that the app never writes, so every new profile
-- insert — including real signups — fails. Make it optional.
DO $$ BEGIN
  alter table public.profiles alter column "Email" drop not null;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

alter table public.profiles add column if not exists bio_update_count  integer not null default 0;
alter table public.profiles add column if not exists bio_update_limit  integer not null default 2;
alter table public.profiles add column if not exists notification_prefs jsonb   not null default '{}'::jsonb;
alter table public.profiles add column if not exists organization text;
alter table public.profiles add column if not exists field text;
alter table public.profiles add column if not exists access_code text;

create index if not exists profiles_membership_status_idx on public.profiles (membership_status);

-- ---------------------------------------------------------------------
-- 2c. MEMBER FEATURES — "feature my story" submissions.
-- ---------------------------------------------------------------------
create table if not exists public.member_features (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.profiles (id) on delete cascade,
  member_name   text not null,
  title         text not null,
  category      text not null default 'bio'
                check (category in ('bio', 'story', 'product', 'project')),
  summary       text,
  contact_email text,
  status        text not null default 'pending'
                check (status in ('pending', 'reviewing', 'approved', 'published')),
  created_at    timestamptz not null default now()
);

create index if not exists member_features_member_idx on public.member_features (member_id);
create index if not exists member_features_status_idx on public.member_features (status);
create index if not exists member_features_created_idx on public.member_features (created_at desc);

alter table public.member_features enable row level security;

DO $$ BEGIN
  create policy "Service role manages member features" on public.member_features
    for all to service_role using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Members read their own features" on public.member_features
    for select to authenticated using (auth.uid() = member_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Members create their own features" on public.member_features
    for insert to authenticated with check (auth.uid() = member_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 2d. PROFILES privilege guard — stops members self-approving or
--     self-promoting through PostgREST (RLS cannot restrict columns).
-- ---------------------------------------------------------------------
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.role              := old.role;
  new.membership_status := old.membership_status;
  new.bio_update_count  := old.bio_update_count;
  new.bio_update_limit  := old.bio_update_limit;
  new.access_code       := old.access_code;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ---------------------------------------------------------------------
-- 3a. DIRECT MESSAGE CONVERSATIONS — one row per member pair.
-- ---------------------------------------------------------------------
create table if not exists public.dm_conversations (
  id               uuid primary key default gen_random_uuid(),
  member_one       uuid not null references public.profiles (id) on delete cascade,
  member_two       uuid not null references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  constraint dm_conversations_distinct_members check (member_one <> member_two),
  constraint dm_conversations_ordered_pair check (member_one < member_two),
  constraint dm_conversations_unique_pair unique (member_one, member_two)
);

create index if not exists dm_conversations_member_one_idx on public.dm_conversations (member_one, last_message_at desc);
create index if not exists dm_conversations_member_two_idx on public.dm_conversations (member_two, last_message_at desc);

alter table public.dm_conversations enable row level security;

DO $$ BEGIN
  create policy "Service role manages dm conversations" on public.dm_conversations
    for all to service_role using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 3b. DIRECT MESSAGES
-- ---------------------------------------------------------------------
create table if not exists public.dm_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.dm_conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 4000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create index if not exists dm_messages_conversation_idx on public.dm_messages (conversation_id, created_at);
create index if not exists dm_messages_unread_idx on public.dm_messages (conversation_id, sender_id) where read_at is null;

alter table public.dm_messages enable row level security;

DO $$ BEGIN
  create policy "Service role manages dm messages" on public.dm_messages
    for all to service_role using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 3c. TIGHTEN public.messages (contact/application inbox) RLS.
--     The old policies let ANY authenticated user read/update every
--     submission. Restrict to admins; keep public inserts.
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can read messages" on public.messages;
drop policy if exists "Authenticated users can update messages" on public.messages;

DO $$ BEGIN
  create policy "Admins can view messages" on public.messages
    for select to authenticated using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'superadmin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Admins can update messages" on public.messages
    for update to authenticated using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'superadmin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Admins can delete messages" on public.messages
    for delete to authenticated using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'superadmin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------
comment on table  public.access_codes is 'Admin-issued signup access codes. Redeemed once (or uses_left times) at signup.';
comment on column public.profiles.membership_status is 'pending | approved | rejected | suspended — admin-controlled membership state.';
comment on table  public.member_features is 'Member-hub "feature my story" submissions, reviewed by admins.';
comment on table  public.dm_conversations is 'Member-to-member direct message threads (dashboard Messages section).';
comment on table  public.dm_messages is 'Messages inside dm_conversations. Written via service-role API only.';
