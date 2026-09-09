-- Enforce the application deadline at the write boundary, not only in routes.
-- RLS evaluates these policies as part of the INSERT/UPDATE statement, so a
-- request that crosses the deadline between its server read and database write
-- cannot persist a draft.
create or replace function public.project100_application_deadline_open()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((
    select clock_timestamp() <= application_deadline
    from public.project100_settings
    where id = true
  ), false);
$$;

revoke all on function public.project100_application_deadline_open() from public;
grant execute on function public.project100_application_deadline_open() to authenticated;

drop policy if exists project100_member_create_own_draft on public.project100_applications;
create policy project100_member_create_own_draft on public.project100_applications
  for insert to authenticated
  with check (
    auth.uid() = member_id
    and status = 'draft'
    and public.project100_application_deadline_open()
  );

drop policy if exists project100_member_update_own_draft on public.project100_applications;
create policy project100_member_update_own_draft on public.project100_applications
  for update to authenticated
  using (
    auth.uid() = member_id
    and status = 'draft'
    and public.project100_application_deadline_open()
  )
  with check (
    auth.uid() = member_id
    and status = 'draft'
    and public.project100_application_deadline_open()
  );
