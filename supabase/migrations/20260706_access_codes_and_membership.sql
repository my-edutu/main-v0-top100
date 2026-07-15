-- =====================================================================
-- Access codes + membership migration
-- =====================================================================
-- Adds admin-issued access codes (the gate for self-signup), extends
-- profiles with membership + BIO-limit + notification-preference fields,
-- and adds member_features (feature submissions for the member hub).
--
-- Broadcast notifications reuse the existing public.user_notifications
-- table (see supabase/schema.sql) — the admin "send" action fans out one
-- row per targeted member, so no new notification table is needed here.
--
-- Run this in the Supabase SQL editor (or via the CLI) once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ACCESS CODES — admin issues these; users redeem one at signup.
-- ---------------------------------------------------------------------
create table if not exists public.access_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text default 'Awardee invite',
  status      text not null default 'active'
              check (status in ('active', 'used', 'expired', 'revoked')),
  uses_left   integer not null default 1,
  email       text,                 -- optional: bind a code to one email
  created_by  uuid,                 -- admin auth.users id (nullable)
  used_by     uuid,                 -- redeemer auth.users id
  used_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '90 days'),
  created_at  timestamptz not null default now()
);

create index if not exists access_codes_code_idx   on public.access_codes (code);
create index if not exists access_codes_status_idx  on public.access_codes (status);
create index if not exists access_codes_created_idx on public.access_codes (created_at desc);

alter table public.access_codes enable row level security;

-- All reads/writes go through the admin API using the service-role key,
-- which bypasses RLS. We intentionally grant NO anon/authenticated access
-- so codes can never be enumerated from the client (mirrors feature_requests).
DO $$ BEGIN
  create policy "Service role manages access codes" on public.access_codes
    for all to service_role using (true) with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- PROFILES — membership status, BIO update limits, notification prefs.
-- (profiles table itself is created in supabase/schema.sql)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists membership_status text not null default 'pending';

DO $$ BEGIN
  alter table public.profiles
    add constraint profiles_membership_status_check
    check (membership_status in ('pending', 'approved', 'rejected', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

alter table public.profiles add column if not exists bio_update_count  integer not null default 0;
alter table public.profiles add column if not exists bio_update_limit  integer not null default 2;
alter table public.profiles add column if not exists notification_prefs jsonb   not null default '{}'::jsonb;
alter table public.profiles add column if not exists organization text;
alter table public.profiles add column if not exists field text;
alter table public.profiles add column if not exists access_code text;

create index if not exists profiles_membership_status_idx on public.profiles (membership_status);

-- ---------------------------------------------------------------------
-- MEMBER FEATURES — "feature my story" submissions from the member hub.
-- (distinct from the payment-oriented public.feature_requests table)
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
-- ---------------------------------------------------------------------
-- PROFILES — privilege guard.
-- The "Users can update own profile" policy (supabase/schema.sql) is
-- `for update using (auth.uid() = id)` with no WITH CHECK and no column
-- restriction, so a member can PATCH privileged columns straight through
-- PostgREST, bypassing the API entirely:
--   {"role":"admin"}                 -> admin via requireAdmin's DB fallback
--   {"membership_status":"approved"} -> self-approval
--   {"bio_update_count":0}           -> resets the BIO quota
-- RLS policies cannot restrict individual columns, so enforce it with a
-- trigger that pins privileged columns to their stored values for every
-- caller except the service role. All legitimate writes to these columns go
-- through createAdminClient() (service role), so nothing in-app regresses.
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
-- Helpful comments
-- ---------------------------------------------------------------------
comment on table  public.access_codes is 'Admin-issued signup access codes. Redeemed once (or uses_left times) at /auth/signup.';
comment on column public.profiles.membership_status is 'pending | approved | rejected | suspended — admin-controlled membership state.';
comment on table  public.member_features is 'Member-hub "feature my story" submissions, reviewed by admins.';
comment on function public.profiles_guard_privileged_columns is 'Pins role/membership_status/bio_update_*/access_code on UPDATE for non-service-role callers; prevents self-promotion via PostgREST.';
