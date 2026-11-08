\set ON_ERROR_STOP on
-- Run AFTER database.test.sql, only in its disposable synthetic database.
select current_database() = 'talent_network_test'
  and to_regprocedure('public._talent_test_assert(boolean,text)') is not null as safe_database \gset
\if :safe_database
\else
  \echo 'Refusing: first run the synthetic talent_network_test database harness.'
  \quit 1
\endif
\ir ../../supabase/schema/talent-discovery-privacy-guard.sql
\ir ../../supabase/schema/talent-discovery-privacy-guard.sql
begin;
insert into public.profiles(id,full_name,email,slug,role,membership_status)
values('30000000-0000-4000-8000-000000000001','Privacy test member','privacy@example.test','privacy-test-member','user','approved');
insert into public.awardees(profile_id,name,slug,year)
values('30000000-0000-4000-8000-000000000001','Privacy test member','privacy-test-member',2026);
set local role service_role;
select public._talent_test_assert(not has_function_privilege('anon','public.talent_set_visibility_checked(uuid,jsonb,jsonb,boolean)','execute'),'anonymous cannot invoke consent compare-and-set');
select public._talent_test_assert(not has_function_privilege('authenticated','public.talent_set_visibility_checked(uuid,jsonb,jsonb,boolean)','execute'),'browser cannot invoke consent compare-and-set');
DO $$
declare
  member_id constant uuid := '30000000-0000-4000-8000-000000000001';
  empty_snapshot jsonb := '{"discovery_enabled":false,"introductions_enabled":false,"promotion_enabled":false,"outreach_email_opt_out":false,"consent_version":null}';
  enabled_snapshot jsonb;
  disabled_snapshot jsonb;
  choices jsonb := '{"discoveryEnabled":true,"introductionsEnabled":true,"promotionEnabled":true,"outreachEmailOptOut":true,"policyVersion":"talent-discovery-2026-11-v1"}';
  p public.talent_profiles;
  receipts integer;
begin
  p := public.talent_set_visibility_checked(member_id,empty_snapshot,choices,false);
  perform public._talent_test_assert(p.discovery_enabled and p.outreach_email_opt_out,'a current snapshot can explicitly grant discovery and opt out of email');
  enabled_snapshot := jsonb_build_object('discovery_enabled',true,'introductions_enabled',true,'promotion_enabled',true,'outreach_email_opt_out',true,'consent_version',p.consent_version);
  p := public.talent_set_visibility_checked(member_id,null,null,true);
  perform public._talent_test_assert(not p.discovery_enabled and not p.introductions_enabled and not p.promotion_enabled and p.outreach_email_opt_out,'withdrawal removes all discovery grants without undoing the saved email opt-out');
  select count(*) into receipts from public.talent_consents where profile_id=member_id;
  begin
    perform public.talent_set_visibility_checked(member_id,enabled_snapshot,choices,false);
    raise exception 'FAIL: stale settings re-enabled discovery';
  exception when serialization_failure then null;
  end;
  select * into p from public.talent_profiles where profile_id=member_id;
  perform public._talent_test_assert(not p.discovery_enabled and p.outreach_email_opt_out,'a stale settings form cannot undo withdrawal');
  perform public._talent_test_assert((select count(*)=receipts from public.talent_consents where profile_id=member_id),'a rejected stale form creates no consent receipts');
  disabled_snapshot := jsonb_build_object('discovery_enabled',false,'introductions_enabled',false,'promotion_enabled',false,'outreach_email_opt_out',true,'consent_version',p.consent_version);
  begin
    perform public.talent_set_visibility_checked(member_id,null,choices,false);
    raise exception 'FAIL: missing saved snapshot accepted';
  exception when serialization_failure then null;
  end;
  perform public._talent_test_assert(true,'missing saved privacy state is rejected');
  begin
    perform public.talent_set_visibility_checked(member_id,disabled_snapshot,jsonb_set(choices,'{discoveryEnabled}','"true"'),false);
    raise exception 'FAIL: string boolean accepted';
  exception when invalid_parameter_value then null;
  end;
  perform public._talent_test_assert(true,'RPC rejects string booleans even if called outside the route');
  begin
    perform public.talent_set_visibility_checked(member_id,null,choices,true);
    raise exception 'FAIL: withdrawal accepted permission grants';
  exception when invalid_parameter_value then null;
  end;
  perform public._talent_test_assert(true,'withdrawal cannot carry permission grants');
  p := public.talent_set_visibility_checked(member_id,disabled_snapshot,choices,false);
  perform public._talent_test_assert(p.discovery_enabled,'reviewing the new saved snapshot permits a deliberate later opt-in');
end $$;
rollback;
