-- Exclusive, member-only opportunities.
--
-- The existing /api/opportunities route is a public, unauthenticated proxy over
-- an external feed. This table is the admin-managed store that sits alongside
-- it and adds the thing awardees actually pay for: listings outsiders cannot
-- see. Visibility tiering is enforced server-side by visibleTiersFor() in
-- lib/opportunities/server.ts; the RLS policies below are defence in depth.
--
-- Prerequisite: supabase/SETUP-MEMBER-HUB.sql must already have been run
-- (public.profiles.membership_status is referenced by the 'approved' tier).
create extension if not exists "pgcrypto";

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),

  title text not null check (char_length(title) between 3 and 200),
  slug text not null unique,
  -- Scholarship / Fellowship / Grant / Internship / Job / Mentorship / Programme
  type text not null,

  organization text,
  location text,
  summary text,
  description text, -- markdown
  application_url text,
  contact_email text,

  deadline date,
  amount_note text,

  -- 'public'   — anyone, including signed-out visitors
  -- 'members'  — any signed-in member
  -- 'approved' — only members whose profiles.membership_status = 'approved'
  visibility text not null default 'members'
    check (visibility in ('public', 'members', 'approved')),

  is_featured boolean not null default false,

  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed', 'archived')),

  created_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_status_deadline_idx
  on public.opportunities (status, deadline);

create index if not exists opportunities_visibility_status_idx
  on public.opportunities (visibility, status);

-- A member bookmarking a listing.
create table if not exists public.opportunity_saves (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (opportunity_id, profile_id)
);

create index if not exists opportunity_saves_profile_idx
  on public.opportunity_saves (profile_id);

-- Mirrors public.touch_award_orders_updated_at() in 20260726_award_orders.sql.
create or replace function public.touch_opportunities_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.touch_opportunities_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.opportunities enable row level security;
alter table public.opportunity_saves enable row level security;

-- Signed-out visitors: published + public only. This is the SQL twin of
-- visibleTiersFor(null) === ['public'].
drop policy if exists "Anon reads public opportunities" on public.opportunities;
create policy "Anon reads public opportunities" on public.opportunities
  for select to anon
  using (status = 'published' and visibility = 'public');

-- Signed-in members: published rows their tier allows. 'approved' rows require
-- an approved membership_status, matching visibleTiersFor({ status }).
--
-- profiles.membership_status is added by supabase/SETUP-MEMBER-HUB.sql, which
-- may not have been run on this database yet. Rather than fail the whole
-- migration on a missing column, fall back to a policy that grants only the
-- 'public'/'members' tiers — the least privileged reading, never the most.
drop policy if exists "Members read opportunities in their tier" on public.opportunities;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'membership_status'
  ) then
    execute $policy$
      create policy "Members read opportunities in their tier" on public.opportunities
        for select to authenticated
        using (
          status = 'published'
          and (
            visibility in ('public', 'members')
            or (
              visibility = 'approved'
              and exists (
                select 1 from public.profiles p
                where p.id = auth.uid() and p.membership_status = 'approved'
              )
            )
          )
        )
    $policy$;
  else
    raise notice 'public.profiles.membership_status is missing — creating the members-tier policy without the approved tier. Run supabase/SETUP-MEMBER-HUB.sql, then re-run this migration.';
    execute $policy$
      create policy "Members read opportunities in their tier" on public.opportunities
        for select to authenticated
        using (status = 'published' and visibility in ('public', 'members'))
    $policy$;
  end if;
end $$;

drop policy if exists "Admins manage opportunities" on public.opportunities;
create policy "Admins manage opportunities" on public.opportunities
  for all to authenticated
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

drop policy if exists "Service role manages opportunities" on public.opportunities;
create policy "Service role manages opportunities" on public.opportunities
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- A member may only ever see, create or remove their own bookmarks.
drop policy if exists "Members read their own saves" on public.opportunity_saves;
create policy "Members read their own saves" on public.opportunity_saves
  for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "Members create their own saves" on public.opportunity_saves;
create policy "Members create their own saves" on public.opportunity_saves
  for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "Members delete their own saves" on public.opportunity_saves;
create policy "Members delete their own saves" on public.opportunity_saves
  for delete to authenticated using (auth.uid() = profile_id);

drop policy if exists "Service role manages opportunity saves" on public.opportunity_saves;
create policy "Service role manages opportunity saves" on public.opportunity_saves
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on column public.opportunities.visibility is
  'public | members | approved — the tier a caller must reach to see this row. Enforced by visibleTiersFor() in lib/opportunities/server.ts.';
