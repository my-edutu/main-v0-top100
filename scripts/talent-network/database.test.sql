\set ON_ERROR_STOP on
-- NEVER point this harness at an existing database. CI creates this disposable DB.
select current_database() = 'talent_network_test' as safe_database \gset
\if :safe_database
\else
  \echo 'Refusing: use a new disposable database named talent_network_test.'
  \quit 1
\endif
DO $$ BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to replace existing application data; create a fresh test database';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key, full_name text, email text, slug text, headline text, bio text, role text default 'user', membership_status text default 'approved', account_status text default 'active', is_public boolean default true, notification_prefs jsonb default '{}');
create table public.awardees(id uuid primary key default gen_random_uuid(), profile_id uuid references profiles, name text, slug text, headline text, bio text, avatar_url text, year integer, is_public boolean default true);
create table public.opportunities(id uuid primary key default gen_random_uuid(), title text, status text, visibility text);
create table public.user_notifications(id uuid primary key default gen_random_uuid(), user_id uuid references profiles, title text, body text, category text, cta_label text, cta_url text, metadata jsonb);
grant usage on schema public to service_role;
grant all on public.profiles, public.awardees, public.opportunities, public.user_notifications to service_role;
\ir ../../supabase/schema/talent-discovery.sql
\ir ../../supabase/schema/talent-discovery-constraints.sql
-- A second application must not reset data or permissions.
\ir ../../supabase/schema/talent-discovery.sql
\ir ../../supabase/schema/talent-discovery-constraints.sql
create function public._talent_test_assert(p_ok boolean,p_name text) returns void language plpgsql as $$ begin if p_ok is distinct from true then raise exception 'FAIL: %',p_name; end if; raise notice 'PASS: %',p_name; end $$;
grant execute on function public._talent_test_assert(boolean,text) to service_role,anon,authenticated;

insert into profiles(id,full_name,email,slug,role) values
 ('10000000-0000-4000-8000-000000000001','Reviewer one','reviewer1@example.test','reviewer-one','superadmin'),
 ('10000000-0000-4000-8000-000000000002','Reviewer two','reviewer2@example.test','reviewer-two','admin'),
 ('20000000-0000-4000-8000-000000000001','Invented talent','member1@example.test','invented-talent','user'),
 ('20000000-0000-4000-8000-000000000002','Another invented talent','member2@example.test','another-talent','user');
insert into awardees(profile_id,name,slug,year) select id,full_name,slug,2026 from profiles;
set role service_role;
select public._talent_test_assert(not has_table_privilege('anon','public.talent_profiles','select'),'anonymous cannot read drafts');
select public._talent_test_assert(not has_table_privilege('authenticated','public.talent_public_directory','select'),'browser cannot bypass public response allowlist');
select public._talent_test_assert(not has_function_privilege('authenticated','public.talent_set_visibility(uuid,boolean,boolean,boolean,boolean,text)','execute'),'browser cannot invoke service transitions');
select public._talent_test_assert(not has_table_privilege('service_role','public.talent_events','update'),'audit history is append-only to runtime');
DO $$
DECLARE
  member_id constant uuid := '20000000-0000-4000-8000-000000000001';
  other_id constant uuid := '20000000-0000-4000-8000-000000000002';
  admin_id constant uuid := '10000000-0000-4000-8000-000000000001';
  d jsonb := '{"headline":"Graduate engineer","summary":"I build practical tools that help communities learn.","sector":"Engineering","country":"Nigeria","city":"","skills":["Research"],"languages":["English"],"interests":["Internship"],"workMode":"Remote","availability":"Open to conversations","experience":"","projects":[{"title":"Demo research","role":"Researcher","description":"Invented test work","outcome":"Learning","url":""}],"education":[{"institution":"Invented university","qualification":"BSc","field":"Engineering","year":"2026"}],"portfolioUrl":"","linkedinUrl":""}';
  p talent_profiles; b talent_requests; b2 talent_requests; i talent_introductions; i2 talent_introductions; o talent_outcomes; v talent_verifications; before_count integer; c jsonb;
BEGIN
  p := talent_save_draft(member_id,0,d,true);
  perform _talent_test_assert(p.revision=1 and not p.discovery_enabled,'first save does not opt member into discovery');
  perform _talent_test_assert((select count(*)=0 from talent_public_directory),'submitted draft is not public');
  p := talent_set_visibility(member_id,true,true,false,false,'talent-discovery-2026-11-v1');
  perform _talent_test_assert((select count(*)=0 from talent_public_directory),'consent alone does not publish');
  perform _talent_test_assert((select count(*)=4 from talent_consents where profile_id=member_id),'all purposes have independent receipts');
  BEGIN perform talent_save_draft(member_id,0,d,false); raise exception 'stale save accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  perform _talent_test_assert(true,'stale profile write is rejected');
  p := talent_review_profile(admin_id,member_id,1,'approve','Reviewed public content, not all qualifications.');
  perform _talent_test_assert((select count(*)=1 from talent_public_directory),'review plus explicit consent publishes one profile');
  BEGIN update talent_profiles set published_revision=null where profile_id=member_id; raise exception 'half snapshot accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  perform _talent_test_assert(true,'published snapshots cannot have a NULL revision');
  v := talent_review_claim(admin_id,member_id,1,'academic',0,'Checked issuing institution','Synthetic issuing-record reference');
  perform _talent_test_assert(v.scope='academic' and v.claim_index=0,'verification identifies one claim and revision');
  BEGIN perform talent_review_claim(admin_id,member_id,1,'academic',7,'Reviewed source','Synthetic reference'); raise exception 'missing item accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  perform _talent_test_assert(true,'nonexistent academic item cannot be verified');
  p := talent_save_draft(member_id,1,jsonb_set(d,'{headline}','"Updated draft headline"'),false);
  perform _talent_test_assert(p.published->>'headline'='Graduate engineer' and p.revision=2,'draft edits preserve reviewed public snapshot');
  BEGIN perform talent_review_profile(admin_id,member_id,2,'approve','Not submitted yet'); raise exception 'unsubmitted review accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  perform _talent_test_assert(true,'unsubmitted draft cannot be approved');
  p := talent_save_draft(member_id,2,d,true);
  p := talent_review_profile(admin_id,member_id,3,'approve','Reviewed updated submitted content.');
  perform _talent_test_assert((select count(*)=0 from talent_verifications where profile_id=member_id and published_revision=p.published_revision and revoked_at is null),'old verification does not verify a changed revision');
  p := talent_save_draft(admin_id,0,d,true);
  BEGIN perform talent_review_profile(admin_id,admin_id,1,'approve','Self review forbidden'); raise exception 'self review accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'admin cannot approve their own profile');
  insert into talent_requests(idempotency_key,organisation,contact_name,contact_email,title,kind,description,places,compensation)
    values(gen_random_uuid(),'Invented organisation','Invented contact','org@example.test','Paid internship','Internship','An entirely invented supervised research opportunity.',2,'Paid monthly') returning * into b;
  BEGIN perform talent_propose_introduction(admin_id,b.id,member_id,'Please review this opportunity.'); raise exception 'unqualified introduction accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'unqualified brief cannot reach members');
  BEGIN perform talent_review_request(admin_id,b.id,'qualified','Organisation evidence checked.',false); raise exception 'unchecked organisation accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  perform _talent_test_assert(true,'organisation attestation is required');
  b := talent_review_request(admin_id,b.id,'qualified','Synthetic organisation reference checked.',true);
  i := talent_propose_introduction(admin_id,b.id,member_id,'A reviewed internship matching your stated interest.');
  i2 := talent_propose_introduction(admin_id,b.id,member_id,'Repeated proposal should not create duplicates.');
  perform _talent_test_assert(i.id=i2.id and (select count(*)=1 from user_notifications),'duplicate proposal does not duplicate notification');
  BEGIN perform talent_introduction_contacts(admin_id,i.id,i.revision); raise exception 'premature contact access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'contact access waits for member approval');
  BEGIN perform talent_respond_introduction(other_id,i.id,i.revision,'accepted',''); raise exception 'foreign response accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  perform _talent_test_assert(true,'another member cannot approve an introduction');
  i := talent_respond_introduction(member_id,i.id,i.revision,'accepted','I approve this introduction.');
  c := talent_introduction_contacts(admin_id,i.id,i.revision);
  perform _talent_test_assert(c->>'memberEmail'='member1@example.test','approved contact access succeeds');
  perform _talent_test_assert((select count(*)=1 from talent_events where kind='introduction_contact_access'),'contact access is audited');
  p := talent_set_visibility(member_id,false,true,false,false,'talent-discovery-2026-11-v1');
  select * into i from talent_introductions where id=i.id;
  perform _talent_test_assert(i.status='withdrawn' and (select count(*)=0 from talent_public_directory),'withdrawal hides discovery and cancels pending introduction');
  BEGIN perform talent_introduction_contacts(admin_id,i.id,i.revision); raise exception 'revoked contact access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'contact permission is rechecked after withdrawal');
  p := talent_set_visibility(member_id,true,true,false,false,'talent-discovery-2026-11-v1');
  i2 := talent_propose_introduction(admin_id,b.id,member_id,'Do not resurrect a withdrawn request.');
  perform _talent_test_assert(i2.status='withdrawn','consent re-enable does not resurrect withdrawn request');
  insert into talent_requests(idempotency_key,organisation,contact_name,contact_email,title,kind,description,places,compensation)
    values(gen_random_uuid(),'Second invented organisation','Invented contact','org2@example.test','Another internship','Internship','Another entirely invented paid research opportunity.',1,'Paid monthly') returning * into b2;
  b2 := talent_review_request(admin_id,b2.id,'qualified','Synthetic organisation evidence checked.',true);
  i2 := talent_propose_introduction(admin_id,b2.id,member_id,'Another reviewed internship opportunity.');
  i2 := talent_respond_introduction(member_id,i2.id,i2.revision,'accepted','I approve.');
  i2 := talent_finish_introduction(admin_id,i2.id,i2.revision,'Introduced through a synthetic test conversation.',true);
  perform _talent_test_assert(i2.status='introduced','only approved introduction can be marked delivered');
  o := talent_record_outcome(member_id,i2.id,'interview','An invented interview happened.','',false);
  perform _talent_test_assert(o.verification_status='self_reported' and not o.publication_permission,'report is not a confirmed public outcome');
  BEGIN perform talent_confirm_outcome(admin_id,o.id,'confirmed','Synthetic independent confirmation.',o.updated_at-interval '1 minute'); raise exception 'stale outcome approved'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  perform _talent_test_assert(true,'outcome confirmation rejects stale report');
  o := talent_confirm_outcome(admin_id,o.id,'confirmed','Synthetic independent confirmation.',o.updated_at);
  perform _talent_test_assert(o.verification_status='confirmed','independent confirmation records evidence');
  o := talent_record_outcome(member_id,i2.id,'interview','Updated invented interview report.','',false);
  perform _talent_test_assert(o.verification_status='self_reported' and o.confirmation_reference is null,'edited outcome needs new confirmation');
  p := talent_set_visibility(member_id,true,true,false,true,'talent-discovery-2026-11-v1');
  perform talent_claim_upgrade_batch(admin_id,10);
  perform _talent_test_assert(not exists(select 1 from talent_upgrade_deliveries where profile_id=member_id),'upgrade email opt-out is honoured');
  select count(*) into before_count from talent_upgrade_deliveries;
  perform talent_claim_upgrade_batch(admin_id,10);
  perform _talent_test_assert((select count(*)=before_count from talent_upgrade_deliveries),'repeated claim never resends reserved accounts');
  update profiles set role='user' where id=admin_id;
  BEGIN perform talent_assert_admin(admin_id); raise exception 'demoted administrator accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  perform _talent_test_assert(true,'current database role is authoritative');
END $$;
reset role;
set role anon;
DO $$ BEGIN
  BEGIN perform * from public.talent_profiles; raise exception 'anonymous read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN perform public.talent_set_visibility('20000000-0000-4000-8000-000000000001',true,true,true,false,'talent-discovery-2026-11-v1'); raise exception 'anonymous RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
reset role;
select public._talent_test_assert(true,'real anonymous table and RPC access denied');
\echo 'Talent database checks completed on synthetic data only.'
