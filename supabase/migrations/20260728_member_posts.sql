-- Member-authored posts on the public awardee profile.
--
-- Deliberately NOT the editorial `posts` table: member posts need their own
-- ownership column, their own moderation lifecycle, and a different URL space
-- (/awardees/<awardee-slug>/posts/<post-slug>). Reusing `posts` would have
-- meant one table where "who may publish this" depends on a nullable column.
--
-- Prerequisite: supabase/SETUP-MEMBER-HUB.sql must already have been run
-- (public.profiles must exist).
create extension if not exists "pgcrypto";

create table if not exists public.member_posts (
  id uuid primary key default gen_random_uuid(),

  -- cascade, not restrict: a member post carries no payment or courier record,
  -- so there is nothing that has to outlive the profile that wrote it.
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Unique per author, not globally: two awardees may each have a `my-story`
  -- post, because the public URL is already namespaced by the awardee slug.
  slug text not null,

  title text not null check (char_length(title) between 3 and 160),
  excerpt text check (char_length(excerpt) <= 320),
  -- Raw markdown. Stored verbatim and escaped at render time — never
  -- sanitised on write, so the original is always recoverable.
  body text not null check (char_length(body) between 20 and 40000),
  cover_url text,
  tags text[] not null default '{}',

  -- draft     : author-only, never public.
  -- published : visible on the public profile.
  -- flagged   : hidden from public by an admin; the author sees the note and
  --             may fix and re-publish.
  -- removed   : hidden permanently. The author may neither edit, re-publish
  --             nor delete it — the row is the moderation record.
  status text not null default 'draft'
    check (status in ('draft', 'published', 'flagged', 'removed')),

  moderation_note text,
  moderated_by uuid references public.profiles(id) on delete set null,

  published_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_posts_slug_per_author unique (profile_id, slug),

  -- A published post must have a publication timestamp: without this the
  -- public list could order by a NULL published_at and silently drop rows.
  constraint member_posts_published_needs_timestamp check (
    status <> 'published' or published_at is not null
  )
);

-- The dashboard list: every post by one author, any status.
create index if not exists member_posts_profile_status_idx
  on public.member_posts (profile_id, status);

-- The public feed and the admin moderation queue.
create index if not exists member_posts_status_published_idx
  on public.member_posts (status, published_at desc);

create or replace function public.touch_member_posts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists member_posts_set_updated_at on public.member_posts;
create trigger member_posts_set_updated_at
  before update on public.member_posts
  for each row execute function public.touch_member_posts_updated_at();

alter table public.member_posts enable row level security;

-- Defence in depth. Every server route uses the service-role client and so
-- bypasses all of this; these policies exist for direct PostgREST access.

drop policy if exists "Anyone reads published member posts" on public.member_posts;
create policy "Anyone reads published member posts" on public.member_posts
  for select using (status = 'published');

drop policy if exists "Members read their own member posts" on public.member_posts;
create policy "Members read their own member posts" on public.member_posts
  for select using (auth.uid() = profile_id);

drop policy if exists "Members create their own member posts" on public.member_posts;
create policy "Members create their own member posts" on public.member_posts
  for insert with check (
    auth.uid() = profile_id
    and status in ('draft', 'published')
  );

-- A member may never move a post into (or out of) a moderation status. The API
-- enforces this too — RLS alone would not, since the API is the only place the
-- "was it already removed" rule can produce a useful error message.
drop policy if exists "Members update their own member posts" on public.member_posts;
create policy "Members update their own member posts" on public.member_posts
  for update
  using (auth.uid() = profile_id and status <> 'removed')
  with check (auth.uid() = profile_id and status in ('draft', 'published'));

drop policy if exists "Members delete their own member posts" on public.member_posts;
create policy "Members delete their own member posts" on public.member_posts
  for delete using (auth.uid() = profile_id and status <> 'removed');

drop policy if exists "Admins manage member posts" on public.member_posts;
create policy "Admins manage member posts" on public.member_posts
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin')
    )
  );

drop policy if exists "Service role manages member posts" on public.member_posts;
create policy "Service role manages member posts" on public.member_posts
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table public.member_posts is
  'Awardee-authored posts shown at /awardees/<slug>/posts/<post-slug>. Publish-immediately, moderate-after.';
comment on column public.member_posts.slug is
  'Unique per author only — the public URL is namespaced by the awardee slug.';
comment on column public.member_posts.body is
  'Raw markdown. Never sanitised on write; escaped at render time.';
