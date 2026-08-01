-- 20260729_security_hardening_2.sql
-- Second remediation pass: PUBLIC function grants, a broken posts UPDATE policy,
-- leftover duplicate policies, and the auth_rls_initplan performance lint.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. The first pass revoked EXECUTE from anon/authenticated, but Postgres also
--    grants EXECUTE to PUBLIC by default (`=X/postgres` in proacl), which is
--    what actually kept every function reachable at /rest/v1/rpc/<name>.
--    Revoke from PUBLIC, then grant back only the RLS helpers that policies
--    genuinely need — policy expressions are evaluated with the querying role's
--    privileges, so without these grants member_groups reads would fail with
--    "permission denied" instead of returning an empty set.
--    No application code calls supabase.rpc() against this schema.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public;

do $$
declare f record;
begin
  for f in
    select * from (values
      ('public.is_site_admin(uuid)',                'anon, authenticated'),
      ('public.is_group_participant(uuid, uuid)',   'anon, authenticated'),
      ('public.is_active_group_member(uuid, uuid)', 'anon, authenticated'),
      ('public.is_group_admin(uuid, uuid)',         'anon, authenticated'),
      ('public.is_post_owner(uuid)',                'authenticated')
    ) as v(sig, roles)
  loop
    if to_regprocedure(f.sig) is not null then
      execute format('grant execute on function %s to %s', f.sig, f.roles);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. posts_update_owner was created with USING (true) WITH CHECK (true) while
--    its three sibling policies all use is_post_owner(author_id). Any signed-in
--    user could edit or reassign any post. Restore the owner check.
-- ---------------------------------------------------------------------------
--    `posts` exists in the live project but has no CREATE TABLE in this repo,
--    so this is guarded for a fresh SETUP-ALL run.
do $$
begin
  if to_regclass('public.posts') is not null and to_regprocedure('public.is_post_owner(uuid)') is not null then
    drop policy if exists posts_update_owner on public.posts;
    create policy posts_update_owner on public.posts
      for update to authenticated
      using (is_post_owner(author_id))
      with check (is_post_owner(author_id));

    -- exact-duplicate permissive policies on the same table
    drop policy if exists "Public published posts"         on public.posts;
    drop policy if exists "Service role manages all posts"  on public.posts;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. feature_requests accepted unauthenticated inserts. Every read and write in
--    app/api/feature-requests/route.ts uses createAdminClient(), so the anon
--    policy is unused attack surface.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can submit feature_requests" on public.feature_requests;

-- ---------------------------------------------------------------------------
-- 4. awardees is read-only for anon/authenticated; all writes use service_role.
--    RLS already blocked these, but the grants had no reason to exist.
-- ---------------------------------------------------------------------------
revoke insert, update, delete, references on public.awardees from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. auth_rls_initplan — wrap auth.uid() / auth.role() / auth.jwt() in a scalar
--    subquery so the planner evaluates them once per statement instead of once
--    per row. Rewrites each affected policy in place, preserving name, command,
--    roles and permissive/restrictive kind.
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
  new_qual text;
  new_check text;
  cmd text;
  ddl text;
begin
  for p in
    select c.relname as tbl, pol.polname, pol.polcmd, pol.polpermissive,
      coalesce(
        (select string_agg(quote_ident(r.rolname), ', ') from pg_roles r where r.oid = any(pol.polroles)),
        'public') as roles,
      pg_get_expr(pol.polqual, pol.polrelid) as qual,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as wc
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  loop
    new_qual  := regexp_replace(p.qual, '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');
    new_check := regexp_replace(p.wc,   '(?<!SELECT )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g');

    continue when new_qual is not distinct from p.qual
             and new_check is not distinct from p.wc;

    cmd := case p.polcmd
             when 'r' then 'select' when 'a' then 'insert'
             when 'w' then 'update' when 'd' then 'delete'
             else 'all' end;

    ddl := format('create policy %I on public.%I as %s for %s to %s',
                  p.polname, p.tbl,
                  case when p.polpermissive then 'permissive' else 'restrictive' end,
                  cmd, p.roles);

    if new_qual is not null then
      ddl := ddl || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      ddl := ddl || format(' with check (%s)', new_check);
    end if;

    execute format('drop policy %I on public.%I', p.polname, p.tbl);
    execute ddl;
  end loop;
end $$;
