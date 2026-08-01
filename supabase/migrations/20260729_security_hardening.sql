-- 20260729_security_hardening.sql
-- Remediates the Supabase database-linter security findings reported 2026-07-27.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. function_search_path_mutable
--    Pin search_path on every public function that lacks it, so a caller cannot
--    shadow `public` with a schema of their own and hijack an unqualified name.
-- ---------------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proconfig is null
  loop
    execute format('alter function %s set search_path = public', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. anon/authenticated_security_definer_function_executable
--    Trigger functions are granted EXECUTE to anon/authenticated by Supabase's
--    default grants, which publishes them at /rest/v1/rpc/<name>. They are only
--    ever meant to fire from triggers, so take the grant away.
--
--    NOTE: the RLS helper functions (is_site_admin, is_group_participant,
--    is_active_group_member, is_group_admin) deliberately keep their grants.
--    Postgres checks EXECUTE privilege when evaluating an RLS policy expression
--    as the querying role, so revoking them would turn every member_groups read
--    into "permission denied" instead of an empty result. They are SECURITY
--    DEFINER by necessity (to break RLS recursion) and now have a pinned
--    search_path; they return only a boolean.
-- ---------------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke all on function %s from anon, authenticated', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. security_definer_view — public.awardee_directory
--    The view stays SECURITY DEFINER on purpose: it is the curated public
--    projection of awardees ⋈ profiles, and `profiles` intentionally has no
--    anon SELECT policy. What is fixed here is the payload — the view no longer
--    selects email, personal_email or phone, so the definer bypass cannot leak
--    contact details. lib/awardees.ts already hard-codes those three to null and
--    app/api/awardees/[id]/route.ts strips email, so no consumer loses data.
-- ---------------------------------------------------------------------------
--    CREATE OR REPLACE VIEW cannot remove columns, so this is a drop/recreate.
drop view if exists public.awardee_directory;

create view public.awardee_directory as
  select
    a.id as awardee_id,
    coalesce(p.id, a.profile_id) as profile_id,
    coalesce(p.slug, a.slug) as slug,
    coalesce(p.full_name, a.name) as name,
    coalesce(p.location, a.country) as country,
    p.location,
    coalesce(p.current_school, a.course) as current_school,
    coalesce(p.field_of_study, a.course) as field_of_study,
    coalesce(p.bio, a.bio) as bio,
    coalesce(p.avatar_url, a.avatar_url, a.image_url) as avatar_url,
    p.cover_image_url,
    coalesce(p.headline, a.headline) as headline,
    coalesce(p.tagline, a.tagline) as tagline,
    coalesce(p.achievements, a.achievements) as achievements,
    coalesce(p.gallery, a.gallery) as gallery,
    coalesce(p.video_links, a.video_links) as video_links,
    coalesce(p.social_links, a.social_links) as social_links,
    coalesce(p.interests, a.interests) as interests,
    p.cohort,
    p.metadata,
    coalesce(p.cgpa, a.cgpa) as cgpa,
    coalesce(p.year, a.year) as year,
    a.featured,
    a.created_at,
    coalesce(p.updated_at, a.updated_at) as updated_at,
    coalesce(p.is_public, a.is_public, true) as is_public,
    coalesce(p.role, 'user'::text) as role,
    coalesce(p.mentor, ''::text) as mentor,
    coalesce(p.impact_projects, a.impact_projects, 0) as impact_projects,
    coalesce(p.lives_impacted, a.lives_impacted, 0) as lives_impacted,
    coalesce(p.awards_received, a.awards_received, 0) as awards_received,
    coalesce(p.youtube_video_url, a.youtube_video_url) as youtube_video_url
  from public.awardees a
  left join public.profiles p on p.id = a.profile_id
  where coalesce(p.is_public, a.is_public, true);

grant select on public.awardee_directory to anon, authenticated;

comment on view public.awardee_directory is
  'Public awardee projection. SECURITY DEFINER by design so anon can read it without a profiles SELECT policy; contains no contact PII.';

-- ---------------------------------------------------------------------------
-- 4. public.awardees leaked every awardee email to anon
--    RLS is row-level only, so the "is_public = true" policy still exposed the
--    email column to GET /rest/v1/awardees?select=email. Column-level grants
--    close that. service_role is unaffected, and every route that legitimately
--    reads awardee emails (search, verify-email, export, signup) uses
--    createAdminClient().
-- ---------------------------------------------------------------------------
do $$
declare col record;
begin
  revoke select on public.awardees from anon, authenticated;
  for col in
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'awardees'
      and column_name <> 'email'
  loop
    execute format('grant select (%I) on public.awardees to anon, authenticated', col.column_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. rls_policy_always_true
--    Every write to these three tables goes through createAdminClient(), which
--    uses service_role and bypasses RLS. The permissive anon policies are pure
--    attack surface: anyone with the publishable key could forge contact-form
--    messages or delete other people's push subscriptions.
-- ---------------------------------------------------------------------------
--    Guarded on to_regclass: push_subscriptions and magazine_downloads exist in
--    the live project but have no CREATE TABLE in this repo, so a fresh
--    SETUP-ALL run would otherwise fail here.
do $$
declare t record;
begin
  for t in
    select * from (values
      ('push_subscriptions', 'Anyone can create subscription'),
      ('push_subscriptions', 'Anyone can delete own subscription'),
      ('messages',           'Anyone can submit messages'),
      ('magazine_downloads', 'Allow public inserts')
    ) as v(tbl, pol)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop policy if exists %I on public.%I', t.pol, t.tbl);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. public_bucket_allows_listing
--    `awardees` and `uploads` are public buckets, so objects are served over
--    /storage/v1/object/public/... without touching RLS. These SELECT policies
--    only enable /storage/v1/object/list/..., i.e. anonymous enumeration of
--    every file. Nothing in the app calls .list(); images keep working.
-- ---------------------------------------------------------------------------
drop policy if exists "Public Access"           on storage.objects;
drop policy if exists "Allow public read access" on storage.objects;

-- ---------------------------------------------------------------------------
-- 7. multiple_permissive_policies on public.awardees
--    Two exact-duplicate pairs, left over from an earlier migration.
-- ---------------------------------------------------------------------------
drop policy if exists "Public visible awardees"    on public.awardees;
drop policy if exists "Service manages all awardees" on public.awardees;
