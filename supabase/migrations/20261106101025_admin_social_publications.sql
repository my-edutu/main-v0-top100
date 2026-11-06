-- One editorial feature per awardee/platform. Confirmed and ambiguous deliveries
-- cannot be reclaimed by the app; this protects against duplicate publication.
create table public.admin_social_publications (
  id uuid primary key default gen_random_uuid(),
  awardee_id uuid not null references public.awardees(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'facebook', 'instagram', 'x')),
  state text not null default 'ready' check (state in ('ready', 'publishing', 'published', 'failed', 'uncertain')),
  caption text not null check (char_length(btrim(caption)) between 1 and 5000),
  profile_signature text not null check (profile_signature ~ '^[a-f0-9]{64}$'),
  image_url text,
  claim_id uuid unique,
  message text,
  post_id text,
  post_url text check (post_url is null or post_url ~ '^https://'),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (awardee_id, platform),
  check (state <> 'published' or post_id is not null),
  check (state = 'ready' or claim_id is not null)
);
alter table public.admin_social_publications enable row level security;
revoke all on public.admin_social_publications from public, anon, authenticated;
grant all on public.admin_social_publications to service_role;
create index admin_social_publications_state_idx on public.admin_social_publications(state, updated_at);
comment on table public.admin_social_publications is 'Admin-authorized editorial features and confirmed platform delivery IDs. Ambiguous deliveries require manual reconciliation before retry.';
