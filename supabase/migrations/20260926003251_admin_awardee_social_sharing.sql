create table public.admin_social_share_drafts (
  id uuid primary key default gen_random_uuid(),
  awardee_id uuid not null references public.awardees(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  platform text not null check (platform in ('linkedin', 'facebook', 'instagram')),
  caption text not null check (char_length(btrim(caption)) between 1 and 5000),
  status text not null default 'draft' check (status in ('draft', 'marked_posted')),
  publish_state text not null default 'ready'
    check (publish_state in ('ready', 'publishing', 'failed', 'uncertain', 'published')),
  publish_error text,
  publish_started_at timestamptz,
  linkedin_post_urn text,
  snapshot_profile_updated_at timestamptz,
  snapshot_name text not null,
  snapshot_bio text not null default '',
  snapshot_facts jsonb not null default '{}'::jsonb,
  snapshot_profile_url text not null,
  snapshot_image_url text,
  snapshot_image_source text not null default 'none'
    check (snapshot_image_source in ('portfolio-cover', 'profile-photo', 'none')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  marked_posted_by uuid references auth.users(id) on delete set null,
  marked_posted_at timestamptz,
  public_post_url text check (public_post_url is null or public_post_url ~ '^https://'),
  constraint admin_social_share_drafts_posted_state_check check (
    (status = 'draft' and marked_posted_at is null and marked_posted_by is null)
    or (status = 'marked_posted' and marked_posted_at is not null and marked_posted_by is not null)
  ),
  constraint admin_social_share_drafts_publish_state_check check (
    (status = 'draft' and publish_state <> 'published')
    or (status = 'marked_posted' and publish_state in ('ready', 'published'))
  )
);

create index admin_social_share_drafts_status_updated_idx
  on public.admin_social_share_drafts(status, updated_at desc);
create index admin_social_share_drafts_awardee_idx
  on public.admin_social_share_drafts(awardee_id, updated_at desc);
create unique index admin_social_share_one_draft_per_platform_idx
  on public.admin_social_share_drafts(awardee_id, platform)
  where status = 'draft';

alter table public.admin_social_share_drafts enable row level security;
revoke all on public.admin_social_share_drafts from public, anon, authenticated;
grant all on public.admin_social_share_drafts to service_role;

comment on table public.admin_social_share_drafts is
  'Admin-managed social captions and externally shared post history. The app does not publish to social platform APIs.';
