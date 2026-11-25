create table public.member_recommendation_letters (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 90),
  recipient text not null check (char_length(recipient) <= 90),
  purpose text not null check (char_length(purpose) between 1 and 160),
  opportunity_key text generated always as (lower(regexp_replace(btrim(purpose), '[[:space:]]+', ' ', 'g'))) stored,
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  snapshot jsonb,
  unique (member_id, opportunity_key),
  check (finalized_at is null or snapshot is not null)
);

create index member_recommendation_letters_recent
  on public.member_recommendation_letters(member_id, updated_at desc);

alter table public.member_recommendation_letters enable row level security;
revoke all on public.member_recommendation_letters from public, anon, authenticated, service_role;
grant select, insert, update on public.member_recommendation_letters to service_role;

create function public.prevent_finalized_recommendation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.finalized_at is not null then
    raise exception 'A finalized recommendation letter cannot be modified' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_finalized_recommendation_update() from public, anon, authenticated;
create trigger prevent_finalized_recommendation_update
before update on public.member_recommendation_letters
for each row execute function public.prevent_finalized_recommendation_update();
