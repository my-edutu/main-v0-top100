-- Harden Project100 member writes without rewriting the already-applied base migration.

-- A group member's run must be the run that owns its group. The individual
-- foreign keys alone allowed a row to mix a group from one run with another.
create unique index if not exists project100_groups_run_id_id_uidx
  on public.project100_groups (run_id, id);

do $$
begin
  alter table public.project100_group_members
    add constraint project100_group_members_group_run_fk
    foreign key (run_id, group_id)
    references public.project100_groups (run_id, id)
    on delete cascade;
exception when duplicate_object then null;
end;
$$;

-- Members may create and update a draft's application answers, but cannot
-- set identifiers, status, consent timestamps, submission timestamps, or
-- database-managed audit fields through PostgREST.
revoke all privileges on table public.project100_applications from authenticated;
grant select on table public.project100_applications to authenticated;
grant insert (
  member_id, full_name, phone, country, location, interest, area_of_function,
  team_lead_preference, resource_support_needs, consent
) on table public.project100_applications to authenticated;
grant update (
  full_name, phone, country, location, interest, area_of_function,
  team_lead_preference, resource_support_needs, consent
) on table public.project100_applications to authenticated;

drop policy if exists project100_member_update_own_draft on public.project100_applications;
create policy project100_member_update_own_draft on public.project100_applications
  for update to authenticated
  using (auth.uid() = member_id and status = 'draft')
  with check (auth.uid() = member_id and status = 'draft');

create or replace function public.project100_record_consent_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.consent then new.consented_at = now(); end if;
  elsif new.consent and not old.consent then
    new.consented_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists project100_applications_record_consent_at on public.project100_applications;
create trigger project100_applications_record_consent_at
  before insert or update on public.project100_applications
  for each row execute function public.project100_record_consent_at();

-- Status changes are deliberately unavailable through table grants. This
-- constrained RPC is the only member-facing submission path: it identifies
-- the caller from auth.uid(), rechecks the authoritative schedule, and relies
-- on the submitted-completeness constraint before committing the transition.
create or replace function public.submit_project100_application()
returns public.project100_applications
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_member_id uuid := auth.uid();
  v_deadline timestamptz;
  v_application public.project100_applications%rowtype;
begin
  if v_member_id is null then
    raise exception 'Authentication is required';
  end if;

  select application_deadline into v_deadline
  from public.project100_settings
  where id = true;

  if v_deadline is null or now() > v_deadline then
    raise exception 'Project100 applications are closed';
  end if;

  select * into v_application
  from public.project100_applications
  where member_id = v_member_id
  for update;

  if not found then
    raise exception 'No Project100 draft exists for this member';
  end if;

  if v_application.status <> 'draft' then
    raise exception 'Project100 application has already been submitted';
  end if;

  update public.project100_applications
  set status = 'submitted', submitted_at = now()
  where id = v_application.id
  returning * into v_application;

  return v_application;
end;
$$;

revoke all on function public.submit_project100_application() from public, anon;
grant execute on function public.submit_project100_application() to authenticated;
