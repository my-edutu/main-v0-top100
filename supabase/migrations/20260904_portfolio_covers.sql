alter table public.profiles add column if not exists portfolio_cover_url text;

create table if not exists public.portfolio_cover_generations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','ready','selected','failed','rejected','expired')),
  tailoring text not null check (tailoring in ('male','female')),
  fields jsonb not null default '{}'::jsonb,
  consent_version text not null default 'portfolio-cover-v1',
  consented_at timestamptz not null default now(),
  source_path text,
  option_paths jsonb not null default '{}'::jsonb,
  selected_variant text check (selected_variant in ('executive-charcoal','leadership-ivory')),
  selected_url text,
  provider_request_ids jsonb not null default '[]'::jsonb,
  attempt integer not null default 1 check (attempt between 1 and 2),
  failure_code text,
  failure_message text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  reset_by uuid references auth.users(id) on delete set null,
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_cover_generations_member_idx on public.portfolio_cover_generations(member_id, created_at desc);
create unique index if not exists portfolio_cover_one_active_idx on public.portfolio_cover_generations(member_id)
  where status in ('queued','processing');

alter table public.portfolio_cover_generations enable row level security;
drop policy if exists portfolio_cover_member_read on public.portfolio_cover_generations;
create policy portfolio_cover_member_read on public.portfolio_cover_generations
  for select using (auth.uid() = member_id);

insert into storage.buckets (id, name, public) values
  (coalesce(nullif(current_setting('app.portfolio_source_bucket', true), ''), 'portfolio-sources'), coalesce(nullif(current_setting('app.portfolio_source_bucket', true), ''), 'portfolio-sources'), false),
  (coalesce(nullif(current_setting('app.portfolio_option_bucket', true), ''), 'portfolio-options'), coalesce(nullif(current_setting('app.portfolio_option_bucket', true), ''), 'portfolio-options'), false),
  (coalesce(nullif(current_setting('app.portfolio_cover_bucket', true), ''), 'portfolio-covers'), coalesce(nullif(current_setting('app.portfolio_cover_bucket', true), ''), 'portfolio-covers'), true)
on conflict (id) do nothing;

create or replace function public.set_portfolio_cover_updated_at() returns trigger
language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists portfolio_cover_updated_at on public.portfolio_cover_generations;
create trigger portfolio_cover_updated_at before update on public.portfolio_cover_generations
for each row execute function public.set_portfolio_cover_updated_at();

-- Keep the public BIO directory aware of the selected cover without exposing
-- any private source or option objects.
drop view if exists public.awardee_directory;
create view public.awardee_directory as
  select
    a.id as awardee_id,
    coalesce(p.id, a.profile_id) as profile_id,
    coalesce(p.slug, a.slug) as slug,
    coalesce(p.full_name, a.name) as name,
    coalesce(p.location, a.country) as country,
    p.location,
    coalesce(p.current_school, a.course) as current_school,
    coalesce(p.field_of_study, a.course) as field_of_study,
    coalesce(p.bio, a.bio) as bio,
    coalesce(p.avatar_url, a.avatar_url, a.image_url) as avatar_url,
    p.cover_image_url,
    p.portfolio_cover_url,
    coalesce(p.headline, a.headline) as headline,
    coalesce(p.tagline, a.tagline) as tagline,
    coalesce(p.achievements, a.achievements) as achievements,
    coalesce(p.gallery, a.gallery) as gallery,
    coalesce(p.video_links, a.video_links) as video_links,
    coalesce(p.social_links, a.social_links) as social_links,
    coalesce(p.interests, a.interests) as interests,
    p.cohort,
    p.metadata,
    coalesce(p.cgpa, a.cgpa) as cgpa,
    coalesce(p.year, a.year) as year,
    a.featured,
    a.created_at,
    coalesce(p.updated_at, a.updated_at) as updated_at,
    coalesce(p.is_public, a.is_public, true) as is_public,
    coalesce(p.role, 'user'::text) as role,
    coalesce(p.mentor, ''::text) as mentor,
    coalesce(p.impact_projects, a.impact_projects, 0) as impact_projects,
    coalesce(p.lives_impacted, a.lives_impacted, 0) as lives_impacted,
    coalesce(p.awards_received, a.awards_received, 0) as awards_received,
    coalesce(p.youtube_video_url, a.youtube_video_url) as youtube_video_url
  from public.awardees a
  left join public.profiles p on p.id = a.profile_id
  where coalesce(p.is_public, a.is_public, true);
grant select on public.awardee_directory to anon, authenticated;
