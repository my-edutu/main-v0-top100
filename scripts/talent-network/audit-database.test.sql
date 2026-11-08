\set ON_ERROR_STOP on
-- Only run after database.test.sql on its disposable synthetic database.
-- This script never bootstraps, truncates or replaces application tables.
select current_database() = 'talent_network_test' as safe_database \gset
\if :safe_database
\else
  \echo 'Refusing: only talent_network_test is permitted.'
  \quit 1
\endif
DO $$ BEGIN
  IF to_regprocedure('public._talent_test_assert(boolean,text)') IS NULL THEN
    RAISE EXCEPTION 'Run the baseline disposable SQL harness first';
  END IF;
  IF (SELECT count(*) FROM public.profiles)<>4 OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id NOT IN (
      '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'
    )
  ) THEN RAISE EXCEPTION 'Refusing: unexpected profiles, not the disposable baseline'; END IF;
END $$;
\ir ../../supabase/schema/talent-discovery-review-fixes.sql
\ir ../../supabase/schema/talent-discovery-review-fixes.sql
set role service_role;
select _talent_test_assert(not has_function_privilege('anon','public.talent_set_visibility(uuid,boolean,boolean,boolean,boolean,text,integer)','execute'),'versioned consent is not callable by anonymous clients');
select _talent_test_assert(not has_function_privilege('authenticated','public.talent_withdraw_discovery(uuid)','execute'),'withdrawal still requires the authenticated server boundary');
select _talent_test_assert(not has_table_privilege('service_role','public.talent_events','update'),'patch retains append-only audit permissions');
DO $$
DECLARE
  member_id constant uuid := '20000000-0000-4000-8000-000000000001';
  admin_id constant uuid := '10000000-0000-4000-8000-000000000002';
  p talent_profiles; i talent_introductions; b talent_requests; stale_revision integer; d jsonb; snapshot jsonb; choices jsonb;
BEGIN
  select * into p from talent_profiles where profile_id=member_id;
  perform _talent_test_assert(p.visibility_revision=0,'additive migration starts existing profiles at privacy revision zero');
  BEGIN perform talent_set_visibility(member_id,true,true,false,false,'talent-discovery-2026-11-v1'); raise exception 'unversioned consent accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  perform _talent_test_assert(true,'old clients cannot grant without a reviewed revision');
  stale_revision:=p.visibility_revision;
  p:=talent_withdraw_discovery(member_id);
  perform _talent_test_assert(not p.discovery_enabled and not p.introductions_enabled and not p.promotion_enabled,'emergency withdrawal is restrictive');
  perform _talent_test_assert(p.outreach_email_opt_out,'withdrawal preserves the latest email opt-out');
  perform _talent_test_assert(p.visibility_revision=stale_revision+1,'privacy version increments separately from draft revision');
  perform _talent_test_assert(not exists(select 1 from talent_introductions where profile_id=member_id and status in ('awaiting_member','accepted','introduced')),'withdrawal also ends delivered introduction access');
  BEGIN perform talent_set_visibility(member_id,true,true,true,false,'talent-discovery-2026-11-v1',stale_revision); raise exception 'stale grant accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  perform _talent_test_assert(true,'stale tab cannot reverse newer withdrawal');
  p:=talent_set_visibility(member_id,true,true,false,true,'talent-discovery-2026-11-v1',p.visibility_revision);
  select * into i from talent_introductions where profile_id=member_id order by created_at desc,id limit 1;
  BEGIN perform talent_introduction_contacts(admin_id,i.id,i.revision); raise exception 'old contact access revived'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'fresh discovery opt-in does not revive an old introduction');
  perform _talent_test_assert(exists(select 1 from talent_events where profile_id=member_id and kind='introduction_access_withdrawn'),'forced access withdrawal is audited');
  -- A new, separately approved introduction remains possible.
  insert into talent_requests(idempotency_key,organisation,contact_name,contact_email,title,kind,description,places,compensation)
    values(gen_random_uuid(),'Audit fixture organisation','Invented contact','audit@example.test','Audit internship','Internship','Entirely invented opportunity for disposable testing.',1,'Paid monthly') returning * into b;
  b:=talent_review_request(admin_id,b.id,'qualified','Synthetic independent organisation review.',true);
  i:=talent_propose_introduction(admin_id,b.id,member_id,'A separate opportunity requires fresh member permission.');
  i:=talent_respond_introduction(member_id,i.id,i.revision,'accepted','Synthetic approval.');
  i:=talent_finish_introduction(admin_id,i.id,i.revision,'Completed an invented introduction for testing.',true);
  perform _talent_test_assert(i.status='introduced','new member-approved journey still works');
  b:=talent_review_request(admin_id,b.id,'closed','The synthetic opportunity has closed.',true);
  b:=talent_review_request(admin_id,b.id,'qualified','Rechecked the synthetic organisation opportunity.',true);
  select * into i from talent_introductions where id=i.id;
  perform _talent_test_assert(i.status='withdrawn','reopening a closed brief cannot revive delivered contact access');
  BEGIN perform talent_introduction_contacts(admin_id,i.id,i.revision); raise exception 'reopened brief revived contact'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'closed-brief contact access stays denied');
  -- Unpublishing also invalidates completed introduction access.
  insert into talent_requests(idempotency_key,organisation,contact_name,contact_email,title,kind,description,places,compensation)
    values(gen_random_uuid(),'Second audit organisation','Invented contact','audit2@example.test','Second audit internship','Internship','Another entirely invented opportunity for testing.',1,'Paid monthly') returning * into b;
  b:=talent_review_request(admin_id,b.id,'qualified','Synthetic independent organisation review.',true);
  i:=talent_propose_introduction(admin_id,b.id,member_id,'Separate synthetic invitation for unpublication test.');
  i:=talent_respond_introduction(member_id,i.id,i.revision,'accepted','Synthetic approval.');
  i:=talent_finish_introduction(admin_id,i.id,i.revision,'Completed a second invented introduction.',true);
  select * into p from talent_profiles where profile_id=member_id; d:=p.draft;
  p:=talent_review_profile(admin_id,member_id,p.revision,'unpublish','Removing the synthetic published profile.');
  select * into i from talent_introductions where id=i.id;
  perform _talent_test_assert(i.status='withdrawn','unpublishing closes a delivered introduction');
  p:=talent_save_draft(member_id,p.revision,d,true);
  p:=talent_review_profile(admin_id,member_id,p.revision,'approve','Re-reviewed the synthetic profile.');
  BEGIN perform talent_introduction_contacts(admin_id,i.id,i.revision); raise exception 'republishing revived contact'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'republishing does not restore withdrawn contact permission');
  -- Preserve the earlier checked API, now including a monotonic privacy version.
  select * into p from talent_profiles where profile_id=member_id;
  snapshot:=jsonb_build_object('discovery_enabled',p.discovery_enabled,'introductions_enabled',p.introductions_enabled,'promotion_enabled',p.promotion_enabled,'outreach_email_opt_out',p.outreach_email_opt_out,'consent_version',p.consent_version,'visibility_revision',p.visibility_revision);
  choices:=jsonb_build_object('discoveryEnabled',p.discovery_enabled,'introductionsEnabled',p.introductions_enabled,'promotionEnabled',p.promotion_enabled,'outreachEmailOptOut',p.outreach_email_opt_out,'policyVersion','talent-discovery-2026-11-v1');
  stale_revision:=p.visibility_revision;
  p:=talent_set_visibility_checked(member_id,snapshot,choices,false);
  perform _talent_test_assert(p.visibility_revision=stale_revision+1,'checked API uses the same monotonic privacy setter');
  BEGIN perform talent_set_visibility_checked(member_id,snapshot,choices,false); raise exception 'identical stale booleans granted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  perform _talent_test_assert(true,'matching booleans do not bypass a stale privacy revision');
  p:=talent_set_visibility_checked(member_id,null,null,true);
  perform _talent_test_assert(not p.discovery_enabled and p.outreach_email_opt_out,'checked withdrawal remains restrictive and preserves email opt-out');
END $$;
reset role;
\echo 'Talent privacy audit SQL checks completed on disposable synthetic data only.'
