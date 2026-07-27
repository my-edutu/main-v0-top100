-- Member-authored posts: a pending state and the member who submitted it.
-- Prerequisite: supabase/migrations/004_create_posts_table.sql.

-- Widen the status constraint to admit 'pending'. Public blog queries filter
-- status = 'published', so pending posts stay invisible with no query changes.
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check
  check (status in ('draft', 'pending', 'published', 'scheduled', 'archived'));

alter table public.posts
  add column if not exists submitted_by_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists posts_submitted_by_idx on public.posts (submitted_by_profile_id);
create index if not exists posts_pending_idx on public.posts (status) where status = 'pending';

-- Members read their own submissions regardless of status. The existing
-- "published and public" policy already covers everything else.
do $$ begin
  create policy "Members read their own submitted posts" on public.posts
    for select using (auth.uid() = submitted_by_profile_id);
exception when duplicate_object then null; end $$;
