alter table public.member_recommendation_letters
  add column used_free_letter boolean not null default false,
  add constraint recommendation_free_letter_finalized
    check (not used_free_letter or (finalized_at is not null and credit_pack_id is null));

create index recommendation_letters_free_by_member
  on public.member_recommendation_letters(member_id) where used_free_letter;

create or replace function public.finalize_member_recommendation(
  p_member_id uuid, p_letter_id uuid, p_revision uuid, p_award_paid boolean, p_verified_pack_id uuid
)
returns public.member_recommendation_letters
language plpgsql
set search_path = ''
as $$
declare
  letter public.member_recommendation_letters;
  pack_id uuid;
  use_free_letter boolean := false;
begin
  -- Serialize finalizations per member, including across different letters.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('recommendation:' || p_member_id::text, 0));
  select * into letter from public.member_recommendation_letters
    where id = p_letter_id and member_id = p_member_id for update;
  if not found or letter.revision <> p_revision or letter.snapshot is null then
    return null;
  end if;
  if letter.finalized_at is not null then
    return letter;
  end if;

  if p_award_paid is not true then
    select count(*) < 3 into use_free_letter
      from public.member_recommendation_letters
      where member_id = p_member_id and used_free_letter;
    if not use_free_letter then
      update public.recommendation_letter_packs set remaining = remaining - 1
        where id = p_verified_pack_id and member_id = p_member_id and status = 'paid' and remaining > 0
        returning id into pack_id;
      if not found then
        raise exception 'No recommendation credits available' using errcode = 'P0001';
      end if;
    end if;
  end if;

  update public.member_recommendation_letters
    set finalized_at = now(), updated_at = now(), credit_pack_id = pack_id, used_free_letter = use_free_letter
    where id = p_letter_id and member_id = p_member_id returning * into letter;
  return letter;
end;
$$;

revoke all on function public.finalize_member_recommendation(uuid, uuid, uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.finalize_member_recommendation(uuid, uuid, uuid, boolean, uuid) to service_role;
