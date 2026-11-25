-- Preserve drafts/history and the existing service-role-only access model.
alter table public.admin_social_share_drafts
  drop constraint if exists admin_social_share_drafts_platform_check;
alter table public.admin_social_share_drafts
  add constraint admin_social_share_drafts_platform_check
  check (platform in ('linkedin', 'facebook', 'instagram', 'x'));
