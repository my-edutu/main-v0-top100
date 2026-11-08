-- UNAPPLIED review-branch SQL. Apply after talent-discovery.sql and its
-- constraints in an isolated database first. No existing consent is enabled.
begin;

-- A stale full settings form must not undo a withdrawal made in another tab.
-- Compare the confirmed settings while holding the same row lock used by the
-- existing transition, then delegate to its audit/withdrawal implementation.
create or replace function public.talent_set_visibility_checked(
  p_actor uuid,
  p_expected jsonb,
  p_choices jsonb,
  p_withdraw boolean default false
)
returns public.talent_profiles
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  current_profile public.talent_profiles;
  actual_snapshot jsonb;
  choice_key text;
begin
  perform public.talent_assert_member(p_actor);
  insert into public.talent_profiles(profile_id) values(p_actor) on conflict do nothing;
  select * into current_profile from public.talent_profiles where profile_id = p_actor for update;

  -- This operation can only remove permissions. Ignore stale email checkbox
  -- drafts and retain the latest saved email preference under the lock.
  if p_withdraw is true then
    if p_expected is not null or p_choices is not null then
      raise exception using errcode='22023', message='Withdrawal does not accept new privacy grants';
    end if;
    return public.talent_set_visibility(
      p_actor, false, false, false, current_profile.outreach_email_opt_out,
      'talent-discovery-2026-11-v1'
    );
  end if;

  if p_withdraw is null then
    raise exception using errcode='22023', message='Choose a valid privacy action';
  end if;
  actual_snapshot := jsonb_build_object(
    'discovery_enabled', current_profile.discovery_enabled,
    'introductions_enabled', current_profile.introductions_enabled,
    'promotion_enabled', current_profile.promotion_enabled,
    'outreach_email_opt_out', current_profile.outreach_email_opt_out,
    'consent_version', current_profile.consent_version
  );
  if p_expected is distinct from actual_snapshot then
    raise exception using errcode='40001', message='Saved privacy choices changed; reload before saving';
  end if;

  if jsonb_typeof(p_choices) is distinct from 'object'
     or not (p_choices ?& array['discoveryEnabled','introductionsEnabled','promotionEnabled','outreachEmailOptOut','policyVersion'])
     or (p_choices - array['discoveryEnabled','introductionsEnabled','promotionEnabled','outreachEmailOptOut','policyVersion']) <> '{}'::jsonb
     or p_choices->>'policyVersion' is distinct from 'talent-discovery-2026-11-v1' then
    raise exception using errcode='22023', message='Invalid privacy choices';
  end if;
  foreach choice_key in array array['discoveryEnabled','introductionsEnabled','promotionEnabled','outreachEmailOptOut'] loop
    if jsonb_typeof(p_choices->choice_key) is distinct from 'boolean' then
      raise exception using errcode='22023', message='Privacy choices must be booleans';
    end if;
  end loop;

  return public.talent_set_visibility(
    p_actor,
    (p_choices->>'discoveryEnabled')::boolean,
    (p_choices->>'introductionsEnabled')::boolean,
    (p_choices->>'promotionEnabled')::boolean,
    (p_choices->>'outreachEmailOptOut')::boolean,
    p_choices->>'policyVersion'
  );
end;
$$;

revoke all on function public.talent_set_visibility_checked(uuid,jsonb,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.talent_set_visibility_checked(uuid,jsonb,jsonb,boolean) to service_role;
comment on function public.talent_set_visibility_checked(uuid,jsonb,jsonb,boolean) is
  'Service-only atomic compare-and-set for consent; withdrawal can never grant permission or revert an email opt-out.';
commit;
