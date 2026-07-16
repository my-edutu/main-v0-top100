-- =====================================================================
-- Direct messages (member-to-member) + messages-table RLS tightening
-- =====================================================================
-- Adds the two tables backing the dashboard "Messages" section:
--   dm_conversations — one row per member pair
--   dm_messages      — individual messages inside a conversation
--
-- All reads/writes go through /api/member/conversations* using the
-- service-role key (same pattern as member_features / access_codes), so
-- RLS grants no anon/authenticated access.
--
-- Run this in the Supabase SQL editor (or via the CLI) once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CONVERSATIONS — exactly one row per unordered member pair.
-- The API normalizes ordering so member_one < member_two always holds.
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
-- MESSAGES
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
-- TIGHTEN public.messages (contact/application inbox) RLS.
-- The old policies let ANY authenticated user read and update every
-- submission. Restrict reads/updates/deletes to admins; keep public
-- inserts so the contact/application forms still work.
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

comment on table public.dm_conversations is 'Member-to-member direct message threads (dashboard Messages section).';
comment on table public.dm_messages is 'Messages inside dm_conversations. Written via service-role API only.';
