-- Merge member preference patches and enforce BIO edit limits in one row update.
create or replace function public.update_member_profile_atomic(
  p_profile_id uuid,
  p_columns jsonb,
  p_preference_patch jsonb,
  p_increment_bio boolean default false
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  update public.profiles as profile set
    headline = case when p_columns ? 'headline' then p_columns->>'headline' else profile.headline end,
    bio = case when p_columns ? 'bio' then p_columns->>'bio' else profile.bio end,
    location = case when p_columns ? 'location' then p_columns->>'location' else profile.location end,
    organization = case when p_columns ? 'organization' then p_columns->>'organization' else profile.organization end,
    tagline = case when p_columns ? 'tagline' then p_columns->>'tagline' else profile.tagline end,
    field = case when p_columns ? 'field' then p_columns->>'field' else profile.field end,
    field_of_study = case when p_columns ? 'field_of_study' then p_columns->>'field_of_study' else profile.field_of_study end,
    notification_prefs = coalesce(profile.notification_prefs, '{}'::jsonb) || coalesce(p_preference_patch, '{}'::jsonb),
    bio_update_count = profile.bio_update_count + case when p_increment_bio then 1 else 0 end
  where profile.id = p_profile_id
    and (not p_increment_bio or profile.bio_update_count < profile.bio_update_limit)
  returning profile.* into v_profile;

  if not found then return null; end if;
  return to_jsonb(v_profile);
end;
$$;

revoke all on function public.update_member_profile_atomic(uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.update_member_profile_atomic(uuid, jsonb, jsonb, boolean) to service_role;
