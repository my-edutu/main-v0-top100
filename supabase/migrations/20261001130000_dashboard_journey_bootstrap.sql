-- Return the member's dashboard journey data in one PostgREST call. The
-- underlying indexed lookups still run in Postgres, avoiding eight networked
-- API requests for every first dashboard load.
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
        'external_share_platform', progress.external_share_platform
      )
      from public.awardee_onboarding_progress progress
      where progress.profile_id = p.id
    ),
    'settings', (
      select to_jsonb(settings) from public.awardee_onboarding_settings settings where settings.id = true
    ),
    'campaign', (
      select jsonb_build_object(
        'id', campaign.id, 'title', campaign.title, 'description', campaign.description,
        'ngn_amount_minor', campaign.ngn_amount_minor, 'usd_amount_minor', campaign.usd_amount_minor,
        'price_version', campaign.price_version, 'application_open', campaign.application_open
      )
      from public.magazine_feature_campaigns campaign
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
  )
  from public.profiles p
  where p.id = p_profile_id;
$$;

revoke all on function public.get_awardee_journey_data(uuid) from public, anon, authenticated;
grant execute on function public.get_awardee_journey_data(uuid) to service_role;
