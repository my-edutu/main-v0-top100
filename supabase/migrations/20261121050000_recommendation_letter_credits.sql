create table public.recommendation_letter_packs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  request_body text not null,
  checkout_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  remaining smallint not null default 0 check (remaining between 0 and 5),
  charge_id text unique,
  created_at timestamptz not null default now(),
  check ((status = 'paid' and charge_id is not null and checkout_id is not null)
     or (status <> 'paid' and remaining = 0 and charge_id is null))
);

create unique index recommendation_letter_packs_active
  on public.recommendation_letter_packs(member_id) where status = 'pending' or remaining > 0;
create index recommendation_letter_packs_member on public.recommendation_letter_packs(member_id);

alter table public.recommendation_letter_packs enable row level security;
revoke all on public.recommendation_letter_packs from public, anon, authenticated, service_role;
grant select, insert, update on public.recommendation_letter_packs to service_role;

alter table public.member_recommendation_letters
  add column credit_pack_id uuid references public.recommendation_letter_packs(id) deferrable initially deferred;

create function public.finalize_member_recommendation(
  p_member_id uuid, p_letter_id uuid, p_revision uuid, p_award_paid boolean, p_verified_pack_id uuid
)
returns public.member_recommendation_letters
language plpgsql
set search_path = ''
as $$
declare
  letter public.member_recommendation_letters;
  pack_id uuid;
begin
  select * into letter from public.member_recommendation_letters
    where id = p_letter_id and member_id = p_member_id for update;
  if not found or letter.revision <> p_revision or letter.snapshot is null then
    return null;
  end if;
  if letter.finalized_at is not null then
    return letter;
  end if;

  if p_award_paid is not true then
    update public.recommendation_letter_packs set remaining = remaining - 1
      where id = p_verified_pack_id and member_id = p_member_id and status = 'paid' and remaining > 0
      returning id into pack_id;
    if not found then
      raise exception 'No recommendation credits available' using errcode = 'P0001';
    end if;
  end if;

  update public.member_recommendation_letters
    set finalized_at = now(), updated_at = now(), credit_pack_id = pack_id
    where id = p_letter_id and member_id = p_member_id returning * into letter;
  return letter;
end;
$$;

revoke all on function public.finalize_member_recommendation(uuid, uuid, uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.finalize_member_recommendation(uuid, uuid, uuid, boolean, uuid) to service_role;
