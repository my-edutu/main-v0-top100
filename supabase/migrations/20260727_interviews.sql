-- ---------------------------------------------------------------------------
-- IMPACT INTERVIEWS
-- Awardee video/written interview series + the application queue that feeds it.
-- ---------------------------------------------------------------------------

-- Applications first: interviews.application_id references this table.
create table if not exists public.interview_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  country text,
  cohort_year integer,
  role_title text,
  organisation text,
  bio text not null,
  impact_story text not null,
  linkedin_url text,
  other_link text,
  preferred_format text not null default 'either'
    check (preferred_format in ('video', 'written', 'either')),
  headshot_path text,
  matched_awardee_id uuid references public.awardees(id) on delete set null,
  verification text not null default 'unmatched'
    check (verification in ('matched', 'unmatched')),
  status text not null default 'pending'
    check (status in ('pending', 'shortlisted', 'scheduled', 'published', 'declined')),
  admin_notes text,
  scheduled_at timestamptz,
  published_interview_id uuid,
  consent_recorded boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_applications_status_idx
  on public.interview_applications (status, created_at desc);
create index if not exists interview_applications_email_idx
  on public.interview_applications (lower(email));
create index if not exists interview_applications_matched_idx
  on public.interview_applications (matched_awardee_id);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  format text not null default 'video' check (format in ('video', 'written')),
  video_id text,
  duration_seconds integer,
  thumbnail_url text,
  pull_quote text,
  summary text,
  body text,
  awardee_id uuid references public.awardees(id) on delete set null,
  awardee_name text not null,
  country text,
  cohort_year integer,
  topics text[] not null default '{}',
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  sort_order integer not null default 0,
  application_id uuid references public.interview_applications(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A video interview without a video id would render an empty player.
  constraint interviews_video_requires_id
    check (format <> 'video' or (video_id is not null and length(video_id) > 0))
);

create index if not exists interviews_slug_idx on public.interviews (slug);
create index if not exists interviews_status_published_idx
  on public.interviews (status, published_at desc);
create index if not exists interviews_featured_idx on public.interviews (featured);
create index if not exists interviews_awardee_idx on public.interviews (awardee_id);
create index if not exists interviews_cohort_idx on public.interviews (cohort_year);

-- Reverse link, added now that public.interviews exists.
DO $$ BEGIN
  alter table public.interview_applications
    add constraint interview_applications_published_interview_fkey
    foreign key (published_interview_id)
    references public.interviews(id) on delete set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at triggers, matching public.handle_awardee_updated.
create or replace function public.handle_interview_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_interview_updated on public.interviews;
create trigger on_interview_updated
  before update on public.interviews
  for each row execute function public.handle_interview_updated();

drop trigger if exists on_interview_application_updated on public.interview_applications;
create trigger on_interview_application_updated
  before update on public.interview_applications
  for each row execute function public.handle_interview_updated();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.interviews enable row level security;
alter table public.interview_applications enable row level security;

DO $$ BEGIN
  create policy "Published interviews are public" on public.interviews
    for select using (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service manages interviews" on public.interviews
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Applications carry personal data: service role only, no public policy at all.
DO $$ BEGIN
  create policy "Service manages interview applications" on public.interview_applications
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- PRIVATE STORAGE BUCKET for applicant headshots
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('interview-applications', 'interview-applications', false)
on conflict (id) do nothing;
