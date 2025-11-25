-- Centralized database schema for Top100 Africa Future Leaders
-- This file can be re-run safely thanks to IF NOT EXISTS / IF EXISTS guards.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- PROFILES (user controlled data that powers the dashboard + awardee listing)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key,
  email text unique,
  role text not null default 'user',
  full_name text,
  username text unique,
  headline text,
  tagline text,
  bio text,
  current_school text,
  field_of_study text,
  graduation_year smallint,
  location text,
  avatar_url text,
  cover_image_url text,
  personal_email text,
  phone text,
  social_links jsonb default '{}'::jsonb,
  achievements jsonb default '[]'::jsonb,
  gallery jsonb default '[]'::jsonb,
  video_links jsonb default '[]'::jsonb,
  interests text[] default array[]::text[],
  mentor text,
  cohort text,
  slug text unique,
  is_public boolean not null default true,
  metadata jsonb default '{}'::jsonb,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Ensure newly added columns exist even if table was created previously
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists tagline text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists current_school text;
alter table public.profiles add column if not exists field_of_study text;
alter table public.profiles add column if not exists graduation_year smallint;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists cover_image_url text;
alter table public.profiles add column if not exists personal_email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists social_links jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists achievements jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists gallery jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists video_links jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists interests text[] default array[]::text[];
alter table public.profiles add column if not exists mentor text;
alter table public.profiles add column if not exists cohort text;
alter table public.profiles add column if not exists slug text unique;
alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists last_seen_at timestamp with time zone;

create index if not exists profiles_slug_idx on public.profiles (slug);
create index if not exists profiles_is_public_idx on public.profiles (is_public);

-- Keep updated_at in sync on mutations
create or replace function public.handle_profile_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_profile_updated();

-- Auto-provision profiles when auth.users rows are inserted
alter table public.profiles drop constraint if exists profiles_id_fkey;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS (events, news, deadlines surfaced inside the dashboard)
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  category text default 'general',
  cta_label text,
  cta_url text,
  scheduled_for timestamp with time zone,
  delivered_at timestamp with time zone default now(),
  read_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb
);

create index if not exists user_notifications_user_idx on public.user_notifications(user_id);
create index if not exists user_notifications_category_idx on public.user_notifications(category);

-- ---------------------------------------------------------------------------
-- AWARDEES linkage (keeps public directory in sync with profile updates)
-- ---------------------------------------------------------------------------
alter table public.awardees add column if not exists profile_id uuid references public.profiles (id) on delete set null;
alter table public.awardees add column if not exists featured boolean default false;
alter table public.awardees add column if not exists highlights jsonb default '[]'::jsonb;
create index if not exists awardees_profile_idx on public.awardees(profile_id);

-- Directory view merges editable profile data with legacy awardee seed data
create or replace view public.awardee_directory as
select
  a.id as awardee_id,
  coalesce(p.id, a.profile_id) as profile_id,
  coalesce(p.slug, a.slug) as slug,
  coalesce(p.full_name, a.name) as name,
  coalesce(p.email, a.email) as email,
  coalesce(p.location, a.country) as country,
  p.location as location,
  coalesce(p.current_school, a.course) as current_school,
  coalesce(p.field_of_study, a.course) as field_of_study,
  coalesce(p.bio, a.bio) as bio,
  coalesce(p.avatar_url, a.image_url) as avatar_url,
  p.cover_image_url,
  p.headline,
  p.tagline,
  p.personal_email,
  p.phone,
  p.achievements,
  p.gallery,
  p.video_links,
  p.social_links,
  p.interests,
  p.cohort,
  p.metadata,
  a.cgpa,
  a.year,
  a.featured,
  a.created_at,
  p.updated_at,
  coalesce(p.is_public, true) as is_public,
  coalesce(p.role, 'user') as role,
  coalesce(p.mentor, '') as mentor
from public.awardees a
left join public.profiles p on p.id = a.profile_id
where coalesce(p.is_public, true);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_notifications enable row level security;
alter table public.awardees enable row level security;

-- Profiles: users can manage their own data
DO $$ BEGIN
  create policy "Users can view own profile" on public.profiles
    for select using (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profiles: allow public listing consumption for visible profiles
DO $$ BEGIN
  create policy "Public view for listed profiles" on public.profiles
    for select using (is_public);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notifications: users can read and mutate their own notifications
DO $$ BEGIN
  create policy "Users read their notifications" on public.user_notifications
    for select using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Users update notification status" on public.user_notifications
    for update using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service inserts notifications" on public.user_notifications
    for insert with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Awardees: anyone can read, but updates restricted to service role
DO $$ BEGIN
  create policy "Public awardee directory" on public.awardees
    for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service manages awardees" on public.awardees
    for all using (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- UTILITY FUNCTIONS (optional helpers for syncing awardees + profiles)
-- ---------------------------------------------------------------------------
create or replace function public.sync_awardee_profile()
returns trigger as $$
begin
  -- ensure awardees row has a slug; prefer profile slug
  if new.slug is null or new.slug = '' then
    new.slug := coalesce(
      (select slug from public.profiles where id = new.profile_id),
      regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g')
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_awardees_before_insert on public.awardees;
create trigger on_awardees_before_insert
  before insert on public.awardees
  for each row execute function public.sync_awardee_profile();

drop trigger if exists on_awardees_before_update on public.awardees;
create trigger on_awardees_before_update
  before update on public.awardees
  for each row execute function public.sync_awardee_profile();


-- ---------------------------------------------------------------------------
-- BLOG POSTS (editorial content for homepage and public blog)
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text,
  cover_image text,
  cover_image_alt text,
  author text,
  excerpt text,
  tags text[] default array[]::text[],
  read_time integer,
  is_featured boolean default false,
  status text not null default 'draft',
  visibility text not null default 'public',
  scheduled_at timestamp with time zone,
  author_id uuid references public.profiles (id),
  meta_title text,
  meta_description text,
  meta_keywords text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_is_featured_idx on public.posts (is_featured);
create index if not exists posts_visibility_idx on public.posts (visibility);
create index if not exists posts_slug_idx on public.posts (slug);

-- Keep updated_at in sync on mutations
create or replace function public.handle_post_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_post_updated on public.posts;
create trigger on_post_updated
  before update on public.posts
  for each row execute function public.handle_post_updated();

alter table public.posts enable row level security;

DO $$ BEGIN
  create policy "Public published posts" on public.posts
    for select using (status = 'published' and visibility = 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service manages posts" on public.posts
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  alter publication supabase_realtime add table public.posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    IF SQLSTATE = '42704' THEN
      -- publication does not exist (local dev), ignore
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- EVENTS (public timeline of programs, meetups, and gatherings)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  summary text,
  description text,
  location text,
  city text,
  country text,
  is_virtual boolean not null default false,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone,
  registration_url text,
  registration_label text default 'Register',
  featured_image_url text,
  gallery jsonb default '[]'::jsonb,
  tags text[] default array[]::text[],
  capacity integer,
  status text not null default 'draft',
  visibility text not null default 'public',
  is_featured boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists events_status_idx on public.events (status);
create index if not exists events_start_at_idx on public.events (start_at);
create index if not exists events_is_featured_idx on public.events (is_featured);
create index if not exists events_visibility_idx on public.events (visibility);

create or replace function public.handle_event_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_event_updated on public.events;
create trigger on_event_updated
  before update on public.events
  for each row execute function public.handle_event_updated();

alter table public.events enable row level security;

DO $$ BEGIN
  create policy "Public published events" on public.events
    for select using (status = 'published' and visibility = 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service manages events" on public.events
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  alter publication supabase_realtime add table public.events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    IF SQLSTATE = '42704' THEN
      -- publication does not exist (local dev), ignore
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- YOUTUBE VIDEOS (videos for the homepage event highlights)
-- ---------------------------------------------------------------------------
create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_id text not null unique,
  date text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists youtube_videos_video_id_idx on public.youtube_videos (video_id);

create or replace function public.handle_youtube_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_youtube_updated on public.youtube_videos;
create trigger on_youtube_updated
  before update on public.youtube_videos
  for each row execute function public.handle_youtube_updated();

alter table public.youtube_videos enable row level security;

DO $$ BEGIN
  create policy "Public youtube videos" on public.youtube_videos
    for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service manages youtube videos" on public.youtube_videos
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  alter publication supabase_realtime add table public.youtube_videos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    IF SQLSTATE = '42704' THEN
      -- publication does not exist (local dev), ignore
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SITE SETTINGS (global configuration for the website)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),

  -- General Site Information
  site_name text not null default 'Top100 Africa Future Leaders',
  site_description text default 'Showcasing Africa''s emerging leaders',
  site_url text default 'https://top100afl.org',
  site_tagline text,
  contact_email text not null default 'admin@top100afl.org',
  support_email text,

  -- Social Media Links
  social_links jsonb default '{
    "twitter": "https://twitter.com/top100afl",
    "linkedin": "https://linkedin.com/company/top100afl",
    "instagram": "https://instagram.com/top100afl",
    "facebook": "",
    "youtube": "",
    "tiktok": ""
  }'::jsonb,

  -- SEO Settings
  seo_meta_title text,
  seo_meta_description text,
  seo_meta_keywords text[] default array[]::text[],
  seo_og_image text,
  seo_twitter_card text default 'summary_large_image',
  google_analytics_id text,
  google_tag_manager_id text,
  google_search_console_verification text,
  facebook_pixel_id text,

  -- Branding
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  primary_color text default '#000000',
  secondary_color text default '#666666',
  accent_color text default '#0066cc',

  -- Email/SMTP Configuration
  smtp_host text,
  smtp_port integer,
  smtp_username text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  email_footer_text text,

  -- Homepage Customization
  hero_title text default 'Africa Future Leaders',
  hero_subtitle text default 'Showcasing Africa''s emerging leaders',
  hero_cta_text text default 'Explore Awardees',
  hero_cta_url text default '/awardees',
  hero_background_image text,
  hero_video_url text,
  show_hero_section boolean default true,
  show_featured_awardees boolean default true,
  show_recent_events boolean default true,
  show_blog_section boolean default true,
  show_impact_section boolean default true,
  show_newsletter_section boolean default true,
  featured_awardees_title text default 'Featured Awardees',
  featured_awardees_count integer default 6,

  -- Footer Customization
  footer_about_text text default 'Top100 Africa Future Leaders showcases the continent''s most promising young leaders.',
  footer_copyright text default '© 2024 Top100 Africa Future Leaders. All rights reserved.',
  footer_links jsonb default '[]'::jsonb,
  show_footer_social boolean default true,
  show_footer_newsletter boolean default true,

  -- Feature Toggles
  registration_enabled boolean default true,
  newsletter_enabled boolean default true,
  blog_enabled boolean default true,
  events_enabled boolean default true,
  awardees_directory_enabled boolean default true,
  contact_form_enabled boolean default true,

  -- System Settings
  maintenance_mode boolean default false,
  maintenance_message text default 'We are currently performing scheduled maintenance. Please check back soon.',
  allow_public_profiles boolean default true,
  require_email_verification boolean default true,
  max_upload_size_mb integer default 10,

  -- API Keys & Integration
  youtube_api_key text,
  google_maps_api_key text,
  recaptcha_site_key text,
  recaptcha_secret_key text,
  brevo_api_key text,
  cloudinary_cloud_name text,
  cloudinary_api_key text,
  cloudinary_api_secret text,

  -- Content Moderation
  enable_comment_moderation boolean default true,
  enable_profanity_filter boolean default true,
  auto_approve_comments boolean default false,

  -- Notifications
  admin_notification_email text,
  notify_on_new_registration boolean default true,
  notify_on_new_contact_message boolean default true,
  notify_on_new_blog_comment boolean default false,

  -- Advanced Settings
  custom_css text,
  custom_js text,
  custom_head_html text,
  robots_txt text,
  sitemap_enabled boolean default true,

  -- Metadata
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Ensure only one settings row exists
create unique index if not exists site_settings_singleton on public.site_settings ((true));

-- Keep updated_at in sync on mutations
create or replace function public.handle_settings_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_settings_updated on public.site_settings;
create trigger on_settings_updated
  before update on public.site_settings
  for each row execute function public.handle_settings_updated();

alter table public.site_settings enable row level security;

-- Allow public read access to non-sensitive settings
DO $$ BEGIN
  create policy "Public read site settings" on public.site_settings
    for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only service role can modify settings
DO $$ BEGIN
  create policy "Service manages site settings" on public.site_settings
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert default settings if none exist
insert into public.site_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.site_settings);

DO $$ BEGIN
  alter publication supabase_realtime add table public.site_settings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    IF SQLSTATE = '42704' THEN
      -- publication does not exist (local dev), ignore
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;