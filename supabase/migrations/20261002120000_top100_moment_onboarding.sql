-- One-time Top100 Moment shown after a member completes profile onboarding.

alter table public.awardee_onboarding_progress
  add column if not exists top100_moment_completed_at timestamptz;

alter table public.awardee_onboarding_settings
  add column if not exists cohort_year integer not null default 2026,
  add column if not exists selected_awardee_count integer not null default 100,
  add column if not exists applicant_count integer not null default 2000,
  add column if not exists applicant_country_count integer not null default 61;

alter table public.awardee_onboarding_settings
  drop constraint if exists awardee_onboarding_settings_cohort_year_check,
  add constraint awardee_onboarding_settings_cohort_year_check check (cohort_year between 2020 and 2100),
  drop constraint if exists awardee_onboarding_settings_selected_awardee_count_check,
  add constraint awardee_onboarding_settings_selected_awardee_count_check check (selected_awardee_count between 1 and 10000),
  drop constraint if exists awardee_onboarding_settings_applicant_count_check,
  add constraint awardee_onboarding_settings_applicant_count_check check (applicant_count between 1 and 1000000),
  drop constraint if exists awardee_onboarding_settings_country_count_check,
  add constraint awardee_onboarding_settings_country_count_check check (applicant_country_count between 1 and 250);

-- Members who completed onboarding before this release should not receive a
-- surprise first-entry takeover. Members still completing setup remain eligible.
insert into public.awardee_onboarding_progress (profile_id, top100_moment_completed_at)
select profiles.id, now()
from public.profiles profiles
where nullif(profiles.notification_prefs->>'onboardingCompletedAt', '') is not null
on conflict (profile_id) do update
set top100_moment_completed_at = coalesce(
  public.awardee_onboarding_progress.top100_moment_completed_at,
  excluded.top100_moment_completed_at
);

drop function if exists public.save_awardee_onboarding_progress(uuid, boolean, boolean, text);

create or replace function public.save_awardee_onboarding_progress(
  p_profile_id uuid,
  p_welcome_read boolean default false,
  p_external_share_confirmed boolean default null,
  p_external_share_platform text default null,
  p_top100_moment_complete boolean default false
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
    external_share_platform, top100_moment_completed_at, updated_at
  ) values (
    p_profile_id,
    case when p_welcome_read then now() else null end,
    case when p_external_share_confirmed is true then now() else null end,
    case when p_external_share_confirmed is true then coalesce(p_external_share_platform, 'other') else null end,
    case when p_top100_moment_complete then now() else null end,
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
    updated_at = now();
end;
$$;

revoke all on function public.save_awardee_onboarding_progress(uuid, boolean, boolean, text, boolean) from public, anon, authenticated;
grant execute on function public.save_awardee_onboarding_progress(uuid, boolean, boolean, text, boolean) to service_role;

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
    'progress', (
      select jsonb_build_object(
        'welcome_read_at', progress.welcome_read_at,
        'external_share_confirmed_at', progress.external_share_confirmed_at,
        'external_share_platform', progress.external_share_platform,
        'top100_moment_completed_at', progress.top100_moment_completed_at
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
