-- Persist the handbook prompt and explicit read acknowledgement on the
-- existing awardee onboarding progress row. Eligibility is resolved from
-- the existing approved profile and its single linked 2026 awardee record.
alter table public.awardee_onboarding_progress
  add column if not exists handbook_prompt_seen_at timestamptz,
  add column if not exists handbook_read_at timestamptz;

drop function if exists public.save_awardee_onboarding_progress(uuid, boolean, boolean, text, boolean);

create or replace function public.save_awardee_onboarding_progress(
  p_profile_id uuid,
  p_welcome_read boolean default false,
  p_external_share_confirmed boolean default null,
  p_external_share_platform text default null,
  p_top100_moment_complete boolean default false,
  p_handbook_prompt_seen boolean default false,
  p_handbook_read boolean default false
) returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_external_share_platform is not null and p_external_share_platform not in ('linkedin', 'facebook', 'instagram', 'other') then
    raise exception 'Invalid share platform';
  end if;

  insert into public.awardee_onboarding_progress (
    profile_id, welcome_read_at, external_share_confirmed_at,
    external_share_platform, top100_moment_completed_at,
    handbook_prompt_seen_at, handbook_read_at, updated_at
  ) values (
    p_profile_id,
    case when p_welcome_read then now() else null end,
    case when p_external_share_confirmed is true then now() else null end,
    case when p_external_share_confirmed is true then coalesce(p_external_share_platform, 'other') else null end,
    case when p_top100_moment_complete then now() else null end,
    case when p_handbook_prompt_seen then now() else null end,
    case when p_handbook_read then now() else null end,
    now()
  )
  on conflict (profile_id) do update set
    welcome_read_at = case when p_welcome_read then coalesce(awardee_onboarding_progress.welcome_read_at, now()) else awardee_onboarding_progress.welcome_read_at end,
    external_share_confirmed_at = case
      when p_external_share_confirmed is true then coalesce(awardee_onboarding_progress.external_share_confirmed_at, now())
      when p_external_share_confirmed is false then null
      else awardee_onboarding_progress.external_share_confirmed_at
    end,
    external_share_platform = case
      when p_external_share_confirmed is true then coalesce(p_external_share_platform, awardee_onboarding_progress.external_share_platform, 'other')
      when p_external_share_confirmed is false then null
      else awardee_onboarding_progress.external_share_platform
    end,
    top100_moment_completed_at = case
      when p_top100_moment_complete then coalesce(awardee_onboarding_progress.top100_moment_completed_at, now())
      else awardee_onboarding_progress.top100_moment_completed_at
    end,
    handbook_prompt_seen_at = case
      when p_handbook_prompt_seen then coalesce(awardee_onboarding_progress.handbook_prompt_seen_at, now())
      else awardee_onboarding_progress.handbook_prompt_seen_at
    end,
    handbook_read_at = case
      when p_handbook_read then coalesce(awardee_onboarding_progress.handbook_read_at, now())
      else awardee_onboarding_progress.handbook_read_at
    end,
    updated_at = now();
end;
$$;

revoke all on function public.save_awardee_onboarding_progress(uuid, boolean, boolean, text, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function public.save_awardee_onboarding_progress(uuid, boolean, boolean, text, boolean, boolean, boolean) to service_role;

create or replace function public.get_awardee_journey_data(p_profile_id uuid)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id, 'full_name', p.full_name, 'headline', p.headline, 'bio', p.bio,
      'location', p.location, 'organization', p.organization, 'field', p.field,
      'avatar_url', p.avatar_url
    ),
    'handbook_eligible', (
      p.role = 'user'
      and p.membership_status = 'approved'
      and nullif(trim(p.cohort), '') = '2026'
      and (select count(*) = 1 and bool_and(a.year = 2026)
           from public.awardees a where a.profile_id = p.id)
    ),
    'progress', (
      select jsonb_build_object(
        'welcome_read_at', progress.welcome_read_at,
        'external_share_confirmed_at', progress.external_share_confirmed_at,
        'external_share_platform', progress.external_share_platform,
        'top100_moment_completed_at', progress.top100_moment_completed_at,
        'handbook_prompt_seen_at', progress.handbook_prompt_seen_at,
        'handbook_read_at', progress.handbook_read_at
      ) from public.awardee_onboarding_progress progress where progress.profile_id = p.id
    ),
    'settings', (
      select to_jsonb(settings) from public.awardee_onboarding_settings settings where settings.id = true
    ),
    'campaign', (
      select jsonb_build_object(
        'id', campaign.id, 'title', campaign.title, 'description', campaign.description,
        'ngn_amount_minor', campaign.ngn_amount_minor, 'usd_amount_minor', campaign.usd_amount_minor,
        'price_version', campaign.price_version, 'application_open', campaign.application_open
      ) from public.magazine_feature_campaigns campaign
      where campaign.id = coalesce(
        (select settings.magazine_campaign_id from public.awardee_onboarding_settings settings where settings.id = true),
        'afl-magazine-2026'
      )
    ),
    'has_published_intro_post', exists (
      select 1 from public.member_posts post
      where post.profile_id = p.id and post.status = 'published' and post.tags @> array['afl-introduction']::text[]
    ),
    'magazine_order', (
      select jsonb_build_object('status', orders.status)
      from public.magazine_feature_orders orders
      where orders.profile_id = p.id and orders.campaign_id = coalesce(
        (select settings.magazine_campaign_id from public.awardee_onboarding_settings settings where settings.id = true),
        'afl-magazine-2026'
      )
    ),
    'application', (
      select jsonb_build_object('status', application.status)
      from public.magazine_feature_applications application
      where application.profile_id = p.id and application.campaign_id = coalesce(
        (select settings.magazine_campaign_id from public.awardee_onboarding_settings settings where settings.id = true),
        'afl-magazine-2026'
      )
    ),
    'award_order', (
      select jsonb_build_object('award_payment_status', orders.award_payment_status, 'status', orders.status)
      from public.award_orders orders
      where orders.profile_id = p.id and orders.status <> 'cancelled'
      order by orders.created_at desc limit 1
    )
  ) from public.profiles p where p.id = p_profile_id;
$$;

revoke all on function public.get_awardee_journey_data(uuid) from public, anon, authenticated;
grant execute on function public.get_awardee_journey_data(uuid) to service_role;

notify pgrst, 'reload schema';
