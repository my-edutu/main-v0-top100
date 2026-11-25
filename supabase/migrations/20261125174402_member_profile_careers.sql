-- Career details may be private even when the awardee's main profile is listed.
create table public.member_profile_careers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  details jsonb check (details is null or jsonb_typeof(details) = 'object')
);

alter table public.member_profile_careers enable row level security;
revoke all on table public.member_profile_careers from public, anon, authenticated;
grant select, insert, update on table public.member_profile_careers to service_role;

create function public.update_member_profile_with_career(
  p_profile_id uuid,
  p_columns jsonb,
  p_preference_patch jsonb,
  p_increment_bio boolean,
  p_career jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_profile jsonb;
begin
  v_profile := public.update_member_profile_atomic(
    p_profile_id, p_columns, p_preference_patch, p_increment_bio
  );
  if v_profile is null then
    return null;
  end if;

  -- Retain a null row for explicit clears so legacy organization text does
  -- not prefill the career editor again.
  insert into public.member_profile_careers (profile_id, details)
  values (p_profile_id, nullif(p_career, 'null'::jsonb))
  on conflict (profile_id) do update set details = excluded.details;

  return v_profile || jsonb_build_object('career', p_career);
end;
$$;

revoke all on function public.update_member_profile_with_career(uuid, jsonb, jsonb, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.update_member_profile_with_career(uuid, jsonb, jsonb, boolean, jsonb) to service_role;
