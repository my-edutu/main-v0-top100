create table public.member_founder_listings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  startup text not null check (char_length(btrim(startup)) between 1 and 160),
  summary text not null check (char_length(btrim(summary)) between 1 and 400),
  linkedin_url text not null check (
    char_length(linkedin_url) <= 500 and linkedin_url ~ '^https://www[.]linkedin[.]com/in/[A-Za-z0-9][A-Za-z0-9_%.-]*/$'
  ),
  created_at timestamptz not null default now()
);

create index member_founder_listings_created_idx on public.member_founder_listings (created_at desc, profile_id);

alter table public.member_founder_listings enable row level security;
revoke all on table public.member_founder_listings from public, anon, authenticated;
grant select, insert, update, delete on table public.member_founder_listings to service_role;
