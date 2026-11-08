-- REVIEW BRANCH ONLY. Apply after the earlier schema, constraints and privacy-guard files.
-- Additive privacy revisions; never backfill consent or change production here.
begin;
alter table public.talent_profiles add column if not exists visibility_revision integer not null default 0 check (visibility_revision >= 0);

-- Withdrawal is permanent for an existing introduction. Re-enabling discovery
-- cannot make a previously introduced member's contact details accessible again.
create or replace function public.talent_withdraw_profile_introductions()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  with withdrawn as (
    update talent_introductions
    set status='withdrawn',revision=revision+1,updated_at=clock_timestamp()
    where profile_id=new.profile_id and status in ('awaiting_member','accepted','introduced')
    returning id
  )
  insert into talent_events(profile_id,entity_id,kind,details)
  select new.profile_id,id,'introduction_access_withdrawn',
    jsonb_build_object('reason','Profile was unpublished or discovery/introduction permission was withdrawn')
  from withdrawn;
  return new;
end $$;
revoke all on function public.talent_withdraw_profile_introductions() from public,anon,authenticated;
grant execute on function public.talent_withdraw_profile_introductions() to service_role;
drop trigger if exists talent_withdraw_profile_introductions on public.talent_profiles;
create trigger talent_withdraw_profile_introductions
  after update of discovery_enabled,introductions_enabled,published on public.talent_profiles
  for each row when (new.discovery_enabled is false or new.introductions_enabled is false or new.published is null)
  execute function public.talent_withdraw_profile_introductions();

-- Closing or rejecting an organisation brief also ends contact access. Reopening
-- the brief must not silently revive an earlier member's accepted introduction.
create or replace function public.talent_close_brief_introductions()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  with withdrawn as (
    update talent_introductions set status='withdrawn',revision=revision+1,updated_at=clock_timestamp()
    where request_id=new.id and status in ('awaiting_member','accepted','introduced')
    returning id,profile_id
  )
  insert into talent_events(profile_id,entity_id,kind,details)
  select profile_id,id,'introduction_access_withdrawn',jsonb_build_object('reason','Organisation brief was closed or declined') from withdrawn;
  return new;
end $$;
revoke all on function public.talent_close_brief_introductions() from public,anon,authenticated;
grant execute on function public.talent_close_brief_introductions() to service_role;
drop trigger if exists talent_close_brief_introductions on public.talent_requests;
create trigger talent_close_brief_introductions after update of status on public.talent_requests
  for each row when (new.status in ('declined','closed')) execute function public.talent_close_brief_introductions();

-- Remove the unversioned overload; stale callers must fail rather than grant
-- privacy permissions from an old browser tab. The default rejects missing versions.
drop function if exists public.talent_set_visibility(uuid,boolean,boolean,boolean,boolean,text);
create or replace function public.talent_set_visibility(
  p_actor uuid,p_discovery boolean,p_introductions boolean,p_promotion boolean,
  p_email_opt_out boolean,p_policy_version text,p_expected_revision integer default null
)
returns public.talent_profiles language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_profiles; purpose text; old_values boolean[]; new_values boolean[]; i integer;
begin
  perform talent_assert_member(p_actor);
  if p_policy_version is distinct from 'talent-discovery-2026-11-v1'
     or p_discovery is null or p_introductions is null or p_promotion is null or p_email_opt_out is null then
    raise exception using errcode='22023',message='Invalid privacy choices';
  end if;
  insert into talent_profiles(profile_id) values(p_actor) on conflict do nothing;
  select * into r from talent_profiles where profile_id=p_actor for update;
  if p_expected_revision is null or r.visibility_revision is distinct from p_expected_revision then
    raise exception using errcode='40001',message='Privacy choices changed; reload before saving';
  end if;
  old_values:=array[r.discovery_enabled,r.introductions_enabled,r.promotion_enabled,r.outreach_email_opt_out];
  new_values:=array[p_discovery,p_introductions,p_promotion,p_email_opt_out];
  for i in 1..4 loop
    purpose:=(array['discovery','introductions','promotion','upgrade_email_opt_out'])[i];
    if r.consent_version is distinct from p_policy_version or old_values[i] is distinct from new_values[i] then
      insert into talent_consents(profile_id,actor_id,purpose,granted,policy_version)
        values(p_actor,p_actor,purpose,new_values[i],p_policy_version);
    end if;
  end loop;
  update talent_profiles set discovery_enabled=p_discovery,introductions_enabled=p_introductions,
    promotion_enabled=p_promotion,outreach_email_opt_out=p_email_opt_out,consent_version=p_policy_version,
    visibility_revision=visibility_revision+1,updated_at=clock_timestamp()
    where profile_id=p_actor returning * into r;
  insert into talent_events(actor_id,profile_id,kind,details)
    values(p_actor,p_actor,'visibility_changed',jsonb_build_object('visibility_revision',r.visibility_revision,'discovery',p_discovery,'introductions',p_introductions,'promotion',p_promotion));
  return r;
end $$;
revoke all on function public.talent_set_visibility(uuid,boolean,boolean,boolean,boolean,text,integer) from public,anon,authenticated;
grant execute on function public.talent_set_visibility(uuid,boolean,boolean,boolean,boolean,text,integer) to service_role;

-- A restrictive emergency action never depends on stale client values. It reads
-- the latest email opt-out, so disabling discovery cannot accidentally resubscribe.
create or replace function public.talent_withdraw_discovery(p_actor uuid)
returns public.talent_profiles language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_profiles;
begin
  perform talent_assert_member(p_actor);
  insert into talent_profiles(profile_id) values(p_actor) on conflict do nothing;
  select * into r from talent_profiles where profile_id=p_actor for update;
  return talent_set_visibility(p_actor,false,false,false,r.outreach_email_opt_out,'talent-discovery-2026-11-v1',r.visibility_revision);
end $$;
revoke all on function public.talent_withdraw_discovery(uuid) from public,anon,authenticated;
grant execute on function public.talent_withdraw_discovery(uuid) to service_role;
-- Retain the newer snapshot-based API, but require its monotonic revision too.
-- Both supported request formats converge on the same locked versioned setter.
create or replace function public.talent_set_visibility_checked(
  p_actor uuid,p_expected jsonb,p_choices jsonb,p_withdraw boolean default false
)
returns public.talent_profiles language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_profiles; actual_snapshot jsonb; choice_key text;
begin
  perform talent_assert_member(p_actor);
  if p_withdraw is true then
    if p_expected is not null or p_choices is not null then
      raise exception using errcode='22023',message='Withdrawal does not accept new privacy grants';
    end if;
    return talent_withdraw_discovery(p_actor);
  end if;
  if p_withdraw is null then raise exception using errcode='22023',message='Choose a valid privacy action'; end if;
  insert into talent_profiles(profile_id) values(p_actor) on conflict do nothing;
  select * into r from talent_profiles where profile_id=p_actor for update;
  actual_snapshot:=jsonb_build_object(
    'discovery_enabled',r.discovery_enabled,'introductions_enabled',r.introductions_enabled,
    'promotion_enabled',r.promotion_enabled,'outreach_email_opt_out',r.outreach_email_opt_out,
    'consent_version',r.consent_version,'visibility_revision',r.visibility_revision
  );
  if p_expected is distinct from actual_snapshot then
    raise exception using errcode='40001',message='Saved privacy choices changed; reload before saving';
  end if;
  if jsonb_typeof(p_choices) is distinct from 'object'
    or not (p_choices ?& array['discoveryEnabled','introductionsEnabled','promotionEnabled','outreachEmailOptOut','policyVersion'])
    or (p_choices - array['discoveryEnabled','introductionsEnabled','promotionEnabled','outreachEmailOptOut','policyVersion']) <> '{}'::jsonb
    or p_choices->>'policyVersion' is distinct from 'talent-discovery-2026-11-v1' then
    raise exception using errcode='22023',message='Invalid privacy choices';
  end if;
  foreach choice_key in array array['discoveryEnabled','introductionsEnabled','promotionEnabled','outreachEmailOptOut'] loop
    if jsonb_typeof(p_choices->choice_key) is distinct from 'boolean' then
      raise exception using errcode='22023',message='Privacy choices must be booleans';
    end if;
  end loop;
  return talent_set_visibility(p_actor,
    (p_choices->>'discoveryEnabled')::boolean,(p_choices->>'introductionsEnabled')::boolean,
    (p_choices->>'promotionEnabled')::boolean,(p_choices->>'outreachEmailOptOut')::boolean,
    p_choices->>'policyVersion',r.visibility_revision);
end $$;
revoke all on function public.talent_set_visibility_checked(uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.talent_set_visibility_checked(uuid,jsonb,jsonb,boolean) to service_role;

notify pgrst, 'reload schema';
commit;
