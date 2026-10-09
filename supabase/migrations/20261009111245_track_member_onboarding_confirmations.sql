-- Persist the two member-confirmed actions that browsers and external posts
-- cannot reliably detect. This extends the existing onboarding progress row.
alter table public.awardee_onboarding_progress
  add column if not exists home_screen_added_at timestamptz,
  add column if not exists intro_published_confirmed_at timestamptz;

create or replace function public.get_awardee_journey_manual_progress(p_profile_id uuid)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'home_screen_added_at', progress.home_screen_added_at,
    'intro_published_confirmed_at', progress.intro_published_confirmed_at
  )
  from public.awardee_onboarding_progress progress
  where progress.profile_id = p_profile_id;
$$;

create or replace function public.mark_awardee_journey_tasks(
  p_profile_id uuid,
  p_home_screen_added boolean default false,
  p_intro_published boolean default false
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_profile_id is null or (not p_home_screen_added and not p_intro_published) then
    raise exception 'A member and at least one completed task are required';
  end if;

  insert into public.awardee_onboarding_progress (
    profile_id, home_screen_added_at, intro_published_confirmed_at, updated_at
  ) values (
    p_profile_id,
    case when p_home_screen_added then now() else null end,
    case when p_intro_published then now() else null end,
    now()
  )
  on conflict (profile_id) do update set
    home_screen_added_at = case
      when p_home_screen_added then coalesce(awardee_onboarding_progress.home_screen_added_at, now())
      else awardee_onboarding_progress.home_screen_added_at
    end,
    intro_published_confirmed_at = case
      when p_intro_published then coalesce(awardee_onboarding_progress.intro_published_confirmed_at, now())
      else awardee_onboarding_progress.intro_published_confirmed_at
    end,
    updated_at = now();
end;
$$;

revoke all on function public.get_awardee_journey_manual_progress(uuid) from public, anon, authenticated;
grant execute on function public.get_awardee_journey_manual_progress(uuid) to service_role;
revoke all on function public.mark_awardee_journey_tasks(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.mark_awardee_journey_tasks(uuid, boolean, boolean) to service_role;

notify pgrst, 'reload schema';
