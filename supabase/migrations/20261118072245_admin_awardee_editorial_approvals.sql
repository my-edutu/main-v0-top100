create table if not exists public.admin_awardee_editorial_approvals (
  awardee_id uuid primary key references public.awardees(id) on delete cascade,
  revision uuid not null default gen_random_uuid(),
  source_signature text not null check (source_signature ~ '^[a-f0-9]{64}$'),
  story text not null check (char_length(btrim(story)) between 1 and 6000),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now()
);

alter table public.admin_awardee_editorial_approvals enable row level security;
revoke all on public.admin_awardee_editorial_approvals from public, anon, authenticated;
grant select, insert, update on public.admin_awardee_editorial_approvals to service_role;
