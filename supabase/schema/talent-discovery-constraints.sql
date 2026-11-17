-- Apply after talent-discovery.sql, inside the same reviewed release migration.
-- Explicitly reject NULL half-snapshots; SQL CHECK treats UNKNOWN as satisfied.
begin;
alter table public.talent_profiles drop constraint if exists talent_snapshot_pair_consistent;
alter table public.talent_profiles add constraint talent_snapshot_pair_consistent
  check ((published is null) = (published_revision is null));
alter table public.talent_profiles drop constraint if exists talent_snapshot_revision_valid;
alter table public.talent_profiles add constraint talent_snapshot_revision_valid
  check (published_revision is null or (published_revision >= 1 and published_revision <= revision));
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
 and t.published_revision >= 1 and nullif(trim(coalesce(nullif(p.slug,''),a.slug)),'') is not null
 and p.membership_status='approved' and coalesce(to_jsonb(p)->>'account_status','active')='active'
 and coalesce((to_jsonb(p)->>'is_public')::boolean,true) is true;
revoke all on public.talent_public_directory from public,anon,authenticated;
grant select on public.talent_public_directory to service_role;
commit;
