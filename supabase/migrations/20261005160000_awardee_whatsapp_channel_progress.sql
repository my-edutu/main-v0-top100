-- Persist a member's explicit WhatsApp channel completion on their journey.

alter table public.awardee_onboarding_progress
  add column if not exists whatsapp_channel_joined_at timestamptz;

create or replace function public.mark_awardee_whatsapp_channel_joined(p_profile_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  joined_at timestamptz;
begin
  insert into public.awardee_onboarding_progress (
    profile_id, whatsapp_channel_joined_at, updated_at
  ) values (
    p_profile_id, now(), now()
  )
  on conflict (profile_id) do update set
    whatsapp_channel_joined_at = coalesce(
      awardee_onboarding_progress.whatsapp_channel_joined_at,
      now()
    ),
    updated_at = now()
  returning whatsapp_channel_joined_at into joined_at;

  return joined_at;
end;
$$;

revoke all on function public.mark_awardee_whatsapp_channel_joined(uuid) from public, anon, authenticated;
grant execute on function public.mark_awardee_whatsapp_channel_joined(uuid) to service_role;

create or replace function public.get_awardee_whatsapp_channel_joined_at(p_profile_id uuid)
returns timestamptz
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select progress.whatsapp_channel_joined_at
  from public.awardee_onboarding_progress progress
  where progress.profile_id = p_profile_id;
$$;

revoke all on function public.get_awardee_whatsapp_channel_joined_at(uuid) from public, anon, authenticated;
grant execute on function public.get_awardee_whatsapp_channel_joined_at(uuid) to service_role;

notify pgrst, 'reload schema';
