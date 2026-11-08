-- Additive, unapplied talent discovery schema. No production data is changed by
-- checking out this branch. Generate the migration with the project's installed
-- Supabase CLI during local review; see docs/talent-network/LOCAL_REVIEW.md.
begin;
create extension if not exists pgcrypto;

create table if not exists public.talent_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object' and octet_length(draft::text) <= 65536),
  published jsonb check (published is null or jsonb_typeof(published) = 'object'),
  revision integer not null default 0 check (revision >= 0),
  published_revision integer,
  publication_status text not null default 'draft' check (publication_status in ('draft','submitted','approved','changes_requested')),
  discovery_enabled boolean not null default false,
  introductions_enabled boolean not null default false,
  promotion_enabled boolean not null default false,
  outreach_email_opt_out boolean not null default false,
  consent_version text,
  review_note text check (char_length(review_note) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((published is null and published_revision is null) or (published is not null and published_revision between 1 and revision))
);
create table if not exists public.talent_consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  purpose text not null check (purpose in ('discovery','introductions','promotion','upgrade_email_opt_out')),
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.talent_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  organisation text not null check (char_length(organisation) between 2 and 160),
  website text not null default '',
  contact_name text not null,
  contact_email text not null,
  title text not null,
  kind text not null,
  description text not null check (char_length(description) between 30 and 4000),
  skills text[] not null default '{}',
  country text not null default '',
  work_mode text not null default 'Flexible',
  places integer not null check (places between 1 and 1000),
  compensation text not null,
  deadline date,
  talent_slug text,
  contact_consent_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','qualified','declined','closed')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.talent_introductions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.talent_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'awaiting_member' check (status in ('awaiting_member','accepted','declined','introduced','withdrawn','reported','closed','expired')),
  revision integer not null default 1,
  introduction_note text not null default '',
  member_note text not null default '',
  proposed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique(request_id, profile_id)
);
create table if not exists public.talent_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete cascade,
  entity_id uuid,
  kind text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.talent_verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.talent_profiles(profile_id) on delete cascade,
  published_revision integer not null,
  scope text not null check (scope in ('recognition','academic','project')),
  claim_index integer check (claim_index >= 0 and claim_index < 8),
  method text not null check (char_length(method) between 5 and 160),
  evidence_reference text not null check (char_length(evidence_reference) between 5 and 1000),
  reviewer_id uuid references public.profiles(id) on delete set null,
  checked_at timestamptz not null default now(),
  revoked_at timestamptz
);
create table if not exists public.talent_outcomes (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.talent_introductions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('interview','offer','placement','scholarship','grant','mentorship','other')),
  summary text not null check (char_length(summary) between 10 and 2000),
  evidence_url text not null default '',
  publication_permission boolean not null default false,
  verification_status text not null default 'self_reported' check (verification_status in ('self_reported','confirmed','rejected')),
  confirmation_reference text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(introduction_id, kind)
);
create table if not exists public.talent_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  stage text not null check (stage in ('saved','preparing','applied','interview','offer','unsuccessful','withdrawn')),
  reported_by text not null default 'member' check (reported_by = 'member'),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, opportunity_id)
);
create table if not exists public.talent_upgrade_deliveries (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null check (status in ('sending','sent','failed','unknown','skipped')),
  attempt_id uuid not null default gen_random_uuid(),
  approved_by uuid references public.profiles(id) on delete set null,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_code text,
  recipient_hash text unique,
  provider_message_id text
);
create index if not exists talent_profiles_public_idx on public.talent_profiles(profile_id) where discovery_enabled and published is not null;
create index if not exists talent_profiles_review_idx on public.talent_profiles(publication_status, updated_at);
create index if not exists talent_consents_profile_idx on public.talent_consents(profile_id, created_at desc);
create index if not exists talent_introductions_member_idx on public.talent_introductions(profile_id, created_at desc);
create index if not exists talent_requests_status_idx on public.talent_requests(status, created_at desc);
create index if not exists talent_verifications_revision_idx on public.talent_verifications(profile_id,published_revision) where revoked_at is null;
create index if not exists talent_applications_profile_idx on public.talent_applications(profile_id, updated_at desc);

-- Browser roles never read these private tables or execute the transition RPCs.
-- Server routes perform fresh authentication/authorization before service access.
do $$ declare t text; begin
  foreach t in array array['talent_profiles','talent_consents','talent_requests','talent_introductions','talent_events','talent_verifications','talent_outcomes','talent_applications','talent_upgrade_deliveries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;
revoke update, delete on public.talent_consents, public.talent_events from service_role;

create or replace function public.talent_assert_member(p_actor uuid)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from profiles p where p.id=p_actor and p.membership_status='approved' and coalesce(to_jsonb(p)->>'account_status','active')='active')
     or not exists(select 1 from awardees a where a.profile_id=p_actor) then
    raise exception using errcode='42501', message='Approved linked membership required';
  end if;
end $$;
create or replace function public.talent_assert_admin(p_actor uuid)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from profiles p where p.id=p_actor and p.role in ('admin','superadmin') and coalesce(to_jsonb(p)->>'account_status','active')='active' and coalesce(p.membership_status,'') not in ('suspended','rejected')) then
    raise exception using errcode='42501', message='Active administrator required';
  end if;
end $$;
create or replace function public.talent_save_draft(p_actor uuid, p_expected_revision integer, p_draft jsonb, p_submit boolean default false)
returns public.talent_profiles language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_profiles; begin
  perform talent_assert_member(p_actor);
  if jsonb_typeof(p_draft) <> 'object' or octet_length(p_draft::text)>65536 then raise exception using errcode='22023',message='Invalid talent draft'; end if;
  insert into talent_profiles(profile_id) values(p_actor) on conflict do nothing;
  select * into r from talent_profiles where profile_id=p_actor for update;
  if r.revision<>p_expected_revision then raise exception using errcode='40001',message='Profile changed; reload before saving'; end if;
  if p_submit and (char_length(coalesce(p_draft->>'headline',''))<5 or char_length(coalesce(p_draft->>'summary',''))<30 or coalesce(p_draft->>'sector','')='' or coalesce(p_draft->>'country','')='' or coalesce(jsonb_array_length(p_draft->'skills'),0)=0 or coalesce(jsonb_array_length(p_draft->'interests'),0)=0) then
    raise exception using errcode='22023',message='Complete the required profile details';
  end if;
  update talent_profiles set draft=p_draft, revision=revision+1, publication_status=case when p_submit then 'submitted' else 'draft' end, review_note=null, updated_at=now() where profile_id=p_actor returning * into r;
  insert into talent_events(actor_id,profile_id,kind,details) values(p_actor,p_actor,case when p_submit then 'profile_submitted' else 'draft_saved' end,jsonb_build_object('revision',r.revision));
  return r;
end $$;
create or replace function public.talent_set_visibility(p_actor uuid,p_discovery boolean,p_introductions boolean,p_promotion boolean,p_email_opt_out boolean,p_policy_version text)
returns public.talent_profiles language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_profiles; purpose text; old_values boolean[]; new_values boolean[]; i integer; begin
  perform talent_assert_member(p_actor);
  if p_policy_version is distinct from 'talent-discovery-2026-11-v1' or p_discovery is null or p_introductions is null or p_promotion is null or p_email_opt_out is null then raise exception using errcode='22023',message='Invalid privacy choices'; end if;
  insert into talent_profiles(profile_id) values(p_actor) on conflict do nothing;
  select * into r from talent_profiles where profile_id=p_actor for update;
  old_values:=array[r.discovery_enabled,r.introductions_enabled,r.promotion_enabled,r.outreach_email_opt_out];
  new_values:=array[p_discovery,p_introductions,p_promotion,p_email_opt_out];
  for i in 1..4 loop
    purpose:=(array['discovery','introductions','promotion','upgrade_email_opt_out'])[i];
    if r.consent_version is distinct from p_policy_version or old_values[i] is distinct from new_values[i] then
      insert into talent_consents(profile_id,actor_id,purpose,granted,policy_version) values(p_actor,p_actor,purpose,new_values[i],p_policy_version);
    end if;
  end loop;
  update talent_profiles set discovery_enabled=p_discovery,introductions_enabled=p_introductions,promotion_enabled=p_promotion,outreach_email_opt_out=p_email_opt_out,consent_version=p_policy_version,updated_at=now() where profile_id=p_actor returning * into r;
  if not p_discovery or not p_introductions then
    update talent_introductions set status='withdrawn',revision=revision+1,updated_at=now() where profile_id=p_actor and status in ('awaiting_member','accepted');
  end if;
  insert into talent_events(actor_id,profile_id,kind,details) values(p_actor,p_actor,'visibility_changed',jsonb_build_object('discovery',p_discovery,'introductions',p_introductions,'promotion',p_promotion));
  return r;
end $$;
create or replace function public.talent_review_profile(p_actor uuid,p_profile_id uuid,p_revision integer,p_decision text,p_note text default '')
returns public.talent_profiles language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_profiles; begin
  perform talent_assert_admin(p_actor);
  if p_actor=p_profile_id then raise exception using errcode='42501',message='An independent reviewer is required'; end if;
  if p_decision not in ('approve','changes_requested','unpublish') or char_length(p_note)>2000 then raise exception using errcode='22023',message='Invalid review decision'; end if;
  select * into r from talent_profiles where profile_id=p_profile_id for update;
  if not found then raise exception using errcode='P0002',message='Profile not found'; end if;
  if r.revision<>p_revision then raise exception using errcode='40001',message='Review is stale'; end if;
  if p_decision<>'unpublish' and r.publication_status<>'submitted' then raise exception using errcode='22023',message='Only submitted profiles can be reviewed'; end if;
  if p_decision='approve' then perform talent_assert_member(p_profile_id); end if;
  update talent_profiles set
    published=case when p_decision='approve' then draft when p_decision='unpublish' then null else published end,
    published_revision=case when p_decision='approve' then revision when p_decision='unpublish' then null else published_revision end,
    publication_status=case when p_decision='approve' then 'approved' else 'changes_requested' end,
    review_note=p_note, reviewed_by=p_actor,reviewed_at=now(),updated_at=now()
  where profile_id=p_profile_id returning * into r;
  if p_decision='unpublish' then update talent_introductions set status='withdrawn',revision=revision+1,updated_at=now() where profile_id=p_profile_id and status in ('awaiting_member','accepted'); end if;
  insert into talent_events(actor_id,profile_id,kind,details) values(p_actor,p_profile_id,'profile_reviewed',jsonb_build_object('revision',p_revision,'decision',p_decision));
  return r;
end $$;

create or replace view public.talent_public_directory with (security_invoker=true) as
select t.profile_id, a.id as awardee_id,coalesce(nullif(p.slug,''),a.slug) as slug,a.name,a.avatar_url,a.year::text as year,t.published,t.published_revision,t.updated_at,
 t.introductions_enabled,t.promotion_enabled,t.published->>'headline' as headline,t.published->>'sector' as sector,
 t.published->>'country' as country,t.published->>'workMode' as work_mode,
 coalesce(t.published->'skills','[]'::jsonb) as skills,coalesce(t.published->'interests','[]'::jsonb) as interests,
 coalesce(t.published->'languages','[]'::jsonb) as languages,
 array(select lower(value) from jsonb_array_elements_text(coalesce(t.published->'skills','[]'::jsonb))) as skill_keys,
 array(select lower(value) from jsonb_array_elements_text(coalesce(t.published->'languages','[]'::jsonb))) as language_keys,
 concat_ws(' ',a.name,t.published->>'headline',t.published->>'summary',t.published->>'sector',t.published->'skills',t.published->'projects') as search_text
from talent_profiles t join profiles p on p.id=t.profile_id
join lateral (select a1.* from awardees a1 where a1.profile_id=t.profile_id and a1.is_public is true order by a1.year desc nulls last,a1.id limit 1) a on true
where t.discovery_enabled is true and t.consent_version='talent-discovery-2026-11-v1' and t.published is not null
 and p.membership_status='approved' and coalesce(to_jsonb(p)->>'account_status','active')='active'
 and coalesce((to_jsonb(p)->>'is_public')::boolean,true) is true;
revoke all on public.talent_public_directory from public,anon,authenticated;
grant select on public.talent_public_directory to service_role;

create or replace function public.talent_propose_introduction(p_actor uuid,p_request_id uuid,p_profile_id uuid,p_note text default '')
returns public.talent_introductions language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_introductions; begin
  perform talent_assert_admin(p_actor);
  if char_length(p_note)>2000 then raise exception using errcode='22023',message='Introduction note too long'; end if;
  perform 1 from talent_requests where id=p_request_id and status='qualified' for update;
  if not found then raise exception using errcode='42501',message='Review and qualify the organisation brief first'; end if;
  perform 1 from talent_profiles where profile_id=p_profile_id for update;
  if not exists(select 1 from talent_public_directory where profile_id=p_profile_id and introductions_enabled) then raise exception using errcode='42501',message='Member is not accepting introductions'; end if;
  insert into talent_introductions(request_id,profile_id,introduction_note,proposed_by) values(p_request_id,p_profile_id,p_note,p_actor)
  on conflict(request_id,profile_id) do nothing returning * into r;
  if r.id is null then select * into r from talent_introductions where request_id=p_request_id and profile_id=p_profile_id; return r; end if;
  insert into talent_events(actor_id,profile_id,entity_id,kind) values(p_actor,p_profile_id,r.id,'introduction_proposed');
  perform talent_notify_member(p_profile_id,'An organisation would like to connect','Review the opportunity, its terms and the information you would share. You can accept, decline or report it.','/dashboard/introductions',r.id);
  return r;
end $$;
create or replace function public.talent_respond_introduction(p_actor uuid,p_introduction_id uuid,p_revision integer,p_decision text,p_note text default '')
returns public.talent_introductions language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_introductions; begin
  perform talent_assert_member(p_actor);
  -- Same lock order as visibility withdrawal: profile, then introduction.
  perform 1 from talent_profiles where profile_id=p_actor for update;
  select * into r from talent_introductions where id=p_introduction_id and profile_id=p_actor for update;
  if not found then raise exception using errcode='P0002',message='Introduction not found'; end if;
  if r.revision<>p_revision then raise exception using errcode='40001',message='Introduction changed; reload'; end if;
  if char_length(p_note)>2000 then raise exception using errcode='22023',message='Response too long'; end if;
  if not ((p_decision in ('accepted','declined') and r.status='awaiting_member') or (p_decision='withdrawn' and r.status in ('awaiting_member','accepted','introduced')) or (p_decision='reported' and r.status not in ('closed','expired','reported'))) then raise exception using errcode='22023',message='This response is not available'; end if;
  if p_decision='accepted' and (r.expires_at<=now() or not exists(select 1 from talent_public_directory where profile_id=p_actor and introductions_enabled)) then raise exception using errcode='42501',message='Introduction is expired or visibility was withdrawn'; end if;
  update talent_introductions set status=p_decision,member_note=p_note,revision=revision+1,updated_at=now() where id=p_introduction_id returning * into r;
  insert into talent_events(actor_id,profile_id,entity_id,kind,details) values(p_actor,p_actor,r.id,'introduction_response',jsonb_build_object('decision',p_decision));
  return r;
end $$;


create or replace function public.talent_notify_member(p_profile_id uuid,p_title text,p_body text,p_path text,p_entity_id uuid)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  -- SQL literals are coerced to either the legacy text user_id or current UUID.
  -- The notification and authoritative transition commit or roll back together.
  execute format('insert into public.user_notifications(user_id,title,body,category,cta_label,cta_url,metadata) values(%L,%L,%L,%L,%L,%L,%L::jsonb)',
    p_profile_id::text,p_title,p_body,'talent','Review in your dashboard',p_path,jsonb_build_object('talent_entity_id',p_entity_id)::text);
end $$;
create or replace function public.talent_review_request(p_actor uuid,p_request_id uuid,p_decision text,p_note text,p_organisation_checked boolean)
returns public.talent_requests language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_requests; begin
  perform talent_assert_admin(p_actor);
  if p_decision not in ('qualified','declined','closed') or char_length(trim(p_note))<10 or char_length(p_note)>2000 then raise exception using errcode='22023',message='A valid review and supporting note are required'; end if;
  if p_decision='qualified' and p_organisation_checked is not true then raise exception using errcode='22023',message='Organisation and opportunity checks are required'; end if;
  select * into r from talent_requests where id=p_request_id for update;
  if not found then raise exception using errcode='P0002',message='Brief not found'; end if;
  if p_decision='qualified' and r.deadline is not null and r.deadline<current_date then raise exception using errcode='22023',message='This opportunity has expired'; end if;
  update talent_requests set status=p_decision,review_note=p_note,reviewed_by=p_actor,reviewed_at=now() where id=p_request_id returning * into r;
  if p_decision in ('declined','closed') then update talent_introductions set status='withdrawn',revision=revision+1,updated_at=now() where request_id=p_request_id and status in ('awaiting_member','accepted'); end if;
  insert into talent_events(actor_id,entity_id,kind,details) values(p_actor,p_request_id,'brief_reviewed',jsonb_build_object('decision',p_decision));
  return r;
end $$;
create or replace function public.talent_review_claim(p_actor uuid,p_profile_id uuid,p_revision integer,p_scope text,p_claim_index integer,p_method text,p_reference text)
returns public.talent_verifications language plpgsql security invoker set search_path=public,pg_temp as $$
declare p talent_profiles; r talent_verifications; begin
  perform talent_assert_admin(p_actor);
  if p_actor=p_profile_id then raise exception using errcode='42501',message='An independent reviewer is required'; end if;
  if p_scope not in ('recognition','academic','project') or char_length(trim(p_method))<5 or char_length(p_method)>160 or char_length(trim(p_reference))<5 or char_length(p_reference)>1000 then raise exception using errcode='22023',message='A specific claim, method and evidence reference are required'; end if;
  select * into p from talent_profiles where profile_id=p_profile_id for update;
  if not found or p.published is null then raise exception using errcode='P0002',message='Published profile not found'; end if;
  if p.published_revision<>p_revision then raise exception using errcode='40001',message='Review the current published revision'; end if;
  if (p_scope='recognition' and p_claim_index is not null) or (p_scope<>'recognition' and (p_claim_index is null or p_claim_index<0 or p_claim_index>=jsonb_array_length(p.published -> (case when p_scope='academic' then 'education' else 'projects' end)))) then raise exception using errcode='22023',message='The claimed item is not in this revision'; end if;
  -- A new review supersedes the old check without deleting its history.
  update talent_verifications set revoked_at=now() where profile_id=p_profile_id and published_revision=p_revision and scope=p_scope and claim_index is not distinct from p_claim_index and revoked_at is null;
  insert into talent_verifications(profile_id,published_revision,scope,claim_index,method,evidence_reference,reviewer_id) values(p_profile_id,p_revision,p_scope,p_claim_index,p_method,p_reference,p_actor) returning * into r;
  insert into talent_events(actor_id,profile_id,entity_id,kind,details) values(p_actor,p_profile_id,r.id,'claim_checked',jsonb_build_object('scope',p_scope,'revision',p_revision));
  return r;
end $$;
create or replace function public.talent_revoke_claim(p_actor uuid,p_verification_id uuid,p_note text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_verifications; begin
  perform talent_assert_admin(p_actor);
  if char_length(trim(p_note))<5 or char_length(p_note)>1000 then raise exception using errcode='22023',message='A revocation reason is required'; end if;
  select * into r from talent_verifications where id=p_verification_id for update;
  if not found then raise exception using errcode='P0002',message='Check not found'; end if;
  update talent_verifications set revoked_at=coalesce(revoked_at,now()) where id=p_verification_id;
  insert into talent_events(actor_id,profile_id,entity_id,kind,details) values(p_actor,r.profile_id,r.id,'claim_revoked',jsonb_build_object('reason',p_note));
end $$;
create or replace function public.talent_introduction_contacts(p_actor uuid,p_introduction_id uuid,p_revision integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare i talent_introductions; b talent_requests; p profiles; begin
  perform talent_assert_admin(p_actor);
  select * into i from talent_introductions where id=p_introduction_id;
  if not found then raise exception using errcode='P0002',message='Introduction not found'; end if;
  select * into b from talent_requests where id=i.request_id and status='qualified' for update;
  if not found then raise exception using errcode='42501',message='The brief is not active'; end if;
  perform 1 from talent_profiles where profile_id=i.profile_id for update;
  select * into i from talent_introductions where id=p_introduction_id for update;
  if i.revision<>p_revision then raise exception using errcode='40001',message='Introduction changed'; end if;
  if i.status not in ('accepted','introduced') or i.expires_at<=now() or not exists(select 1 from talent_public_directory where profile_id=i.profile_id and introductions_enabled) then raise exception using errcode='42501',message='Fresh member permission is required'; end if;
  select * into p from profiles where id=i.profile_id;
  insert into talent_events(actor_id,profile_id,entity_id,kind) values(p_actor,i.profile_id,i.id,'introduction_contact_access');
  return jsonb_build_object('memberName',p.full_name,'memberEmail',p.email,'organisation',b.organisation,'contactName',b.contact_name,'contactEmail',b.contact_email,'purpose',b.title);
end $$;
create or replace function public.talent_finish_introduction(p_actor uuid,p_introduction_id uuid,p_revision integer,p_note text,p_completed boolean)
returns public.talent_introductions language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_introductions; begin
  perform talent_assert_admin(p_actor);
  if p_completed is not true or char_length(trim(p_note))<10 or char_length(p_note)>2000 then raise exception using errcode='22023',message='Confirm the completed introduction and record how it occurred'; end if;
  -- This validates and locks the brief, profile and introduction in that order.
  perform talent_introduction_contacts(p_actor,p_introduction_id,p_revision);
  select * into r from talent_introductions where id=p_introduction_id for update;
  if r.status<>'accepted' then raise exception using errcode='22023',message='Only an accepted introduction may be marked delivered'; end if;
  update talent_introductions set status='introduced',revision=revision+1,updated_at=now() where id=p_introduction_id returning * into r;
  insert into talent_events(actor_id,profile_id,entity_id,kind,details) values(p_actor,r.profile_id,r.id,'introduction_delivered',jsonb_build_object('operator_note',p_note));
  perform talent_notify_member(r.profile_id,'Your introduction has been completed','The Top100 team has marked your approved introduction as completed. You can record what happens next.','/dashboard/introductions',r.id);
  return r;
end $$;
create or replace function public.talent_record_outcome(p_actor uuid,p_introduction_id uuid,p_kind text,p_summary text,p_evidence_url text,p_publication_permission boolean)
returns public.talent_outcomes language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_outcomes; begin
  perform talent_assert_member(p_actor);
  if p_kind not in ('interview','offer','placement','scholarship','grant','mentorship','other') or char_length(trim(p_summary))<10 or char_length(p_summary)>2000 or char_length(p_evidence_url)>500 or p_publication_permission is null then raise exception using errcode='22023',message='Check the outcome details'; end if;
  perform 1 from talent_introductions where id=p_introduction_id and profile_id=p_actor and status in ('accepted','introduced','closed','withdrawn') for update;
  if not found then raise exception using errcode='42501',message='This introduction does not belong to this member or is not eligible'; end if;
  insert into talent_outcomes(introduction_id,profile_id,kind,summary,evidence_url,publication_permission) values(p_introduction_id,p_actor,p_kind,p_summary,p_evidence_url,p_publication_permission)
  on conflict(introduction_id,kind) do update set summary=excluded.summary,evidence_url=excluded.evidence_url,publication_permission=excluded.publication_permission,verification_status='self_reported',confirmation_reference=null,reviewed_by=null,reviewed_at=null,updated_at=now() returning * into r;
  insert into talent_events(actor_id,profile_id,entity_id,kind) values(p_actor,p_actor,r.id,'outcome_reported');
  return r;
end $$;
create or replace function public.talent_confirm_outcome(p_actor uuid,p_outcome_id uuid,p_decision text,p_reference text,p_expected_updated_at timestamptz)
returns public.talent_outcomes language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_outcomes; begin
  perform talent_assert_admin(p_actor);
  if p_decision not in ('confirmed','rejected') or char_length(trim(p_reference))<10 or char_length(p_reference)>2000 then raise exception using errcode='22023',message='A decision and confirmation reference are required'; end if;
  select * into r from talent_outcomes where id=p_outcome_id for update;
  if not found then raise exception using errcode='P0002',message='Outcome not found'; end if;
  if r.profile_id=p_actor then raise exception using errcode='42501',message='An independent reviewer is required'; end if;
  if r.updated_at is distinct from p_expected_updated_at then raise exception using errcode='40001',message='The outcome changed; review the new report'; end if;
  update talent_outcomes set verification_status=p_decision,confirmation_reference=p_reference,reviewed_by=p_actor,reviewed_at=now(),updated_at=now() where id=p_outcome_id returning * into r;
  insert into talent_events(actor_id,profile_id,entity_id,kind,details) values(p_actor,r.profile_id,r.id,'outcome_reviewed',jsonb_build_object('decision',p_decision));
  return r;
end $$;
create or replace function public.talent_record_application(p_actor uuid,p_opportunity_id uuid,p_stage text,p_notes text)
returns public.talent_applications language plpgsql security invoker set search_path=public,pg_temp as $$
declare r talent_applications; begin
  perform talent_assert_member(p_actor);
  if p_stage not in ('saved','preparing','applied','interview','offer','unsuccessful','withdrawn') or char_length(p_notes)>2000 then raise exception using errcode='22023',message='Check the application update'; end if;
  if not exists(select 1 from opportunities where id=p_opportunity_id and status in ('published','closed') and visibility in ('public','members','approved')) and not (p_stage='withdrawn' and exists(select 1 from talent_applications where profile_id=p_actor and opportunity_id=p_opportunity_id)) then raise exception using errcode='42501',message='Opportunity is not available to this member'; end if;
  insert into talent_applications(profile_id,opportunity_id,stage,notes) values(p_actor,p_opportunity_id,p_stage,p_notes)
  on conflict(profile_id,opportunity_id) do update set stage=excluded.stage,notes=excluded.notes,updated_at=now() returning * into r;
  insert into talent_events(actor_id,profile_id,entity_id,kind,details) values(p_actor,p_actor,r.id,'application_stage_reported',jsonb_build_object('stage',p_stage,'source','member'));
  return r;
end $$;
create or replace function public.talent_claim_upgrade_batch(p_actor uuid,p_limit integer default 5)
returns table(profile_id uuid,attempt_id uuid,member_name text) language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  perform talent_assert_admin(p_actor);
  if p_limit<1 or p_limit>10 then raise exception using errcode='22023',message='Send at most ten members per reviewed batch'; end if;
  return query with candidates as (
    select p.id,p.full_name from profiles p
    where p.membership_status='approved' and coalesce(to_jsonb(p)->>'account_status','active')='active'
      and exists(select 1 from awardees a where a.profile_id=p.id)
      and nullif(trim(p.email),'') is not null
      and coalesce(p.notification_prefs->>'opportunityAlerts','true')<>'false'
      and coalesce(p.notification_prefs->>'emailOptOut','false')<>'true'
      and coalesce(p.notification_prefs->>'emailUnsubscribed','false')<>'true'
      and not exists(select 1 from talent_profiles t where t.profile_id=p.id and t.outreach_email_opt_out)
      and not exists(select 1 from talent_upgrade_deliveries d where d.profile_id=p.id)
    order by p.id limit p_limit for update of p skip locked
  ), inserted as (
    insert into talent_upgrade_deliveries(profile_id,status,approved_by)
    select c.id,'sending',p_actor from candidates c on conflict do nothing
    returning talent_upgrade_deliveries.profile_id,talent_upgrade_deliveries.attempt_id
  ) select i.profile_id,i.attempt_id,c.full_name from inserted i join candidates c on c.id=i.profile_id;
end $$;

-- Functions are server-only; invoker security never grants extra privileges.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('talent_assert_member','talent_assert_admin','talent_save_draft','talent_set_visibility','talent_review_profile','talent_propose_introduction','talent_respond_introduction','talent_notify_member','talent_review_request','talent_review_claim','talent_revoke_claim','talent_introduction_contacts','talent_finish_introduction','talent_record_outcome','talent_confirm_outcome','talent_record_application','talent_claim_upgrade_batch') loop
    execute format('revoke all on function %s from public,anon,authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
commit;
