-- A shared cohort code authorizes an application, not ownership of a record.
-- Keep the requested awardee separate from the account until an admin reviews it.
create table public.pending_awardee_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  awardee_id uuid not null references public.awardees(id),
  email text not null,
  created_at timestamptz not null default now()
);

create index pending_awardee_claims_awardee_idx on public.pending_awardee_claims(awardee_id);
alter table public.pending_awardee_claims enable row level security;
revoke all on public.pending_awardee_claims from anon, authenticated;
grant select, insert, update, delete on public.pending_awardee_claims to service_role;

create or replace function public.request_pending_awardee_claim(
  p_awardee_id uuid, p_user_id uuid, p_email text, p_code text
) returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare
  v_awardee public.awardees%rowtype;
  v_code public.access_codes%rowtype;
  v_email text := lower(trim(p_email));
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into v_awardee from public.awardees where id = p_awardee_id for update;
  if not found or v_awardee.profile_id is not null then
    raise exception 'Awardee record is unavailable or already claimed';
  end if;
  if v_awardee.email is null or lower(trim(v_awardee.email)) <> v_email then
    raise exception 'Account email does not match the awardee record';
  end if;
  if exists (select 1 from public.awardees where profile_id = p_user_id) then
    raise exception 'This account already owns an awardee record';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and
    (role <> 'user' or lower(trim(email)) <> v_email or membership_status <> 'pending')) then
    raise exception 'This account cannot request a claim';
  end if;
  if exists (select 1 from public.pending_awardee_claims where user_id = p_user_id) then
    raise exception 'This account already has a pending claim';
  end if;

  select * into v_code from public.access_codes where code = upper(trim(p_code));
  if not found then raise exception 'Invite code is unavailable'; end if;
  if v_code.redemption_mode = 'single_use' then
    select * into v_code from public.access_codes where id = v_code.id for update;
  else
    select * into v_code from public.access_codes where id = v_code.id for share;
  end if;
  if not found or v_code.status <> 'active' or v_code.expires_at <= now()
    or (v_code.email is not null and lower(trim(v_code.email)) <> v_email)
    or (v_code.redemption_mode = 'single_use' and v_code.uses_left < 1) then
    raise exception 'Invite code is unavailable';
  end if;

  insert into public.profiles (id, user_id, email, role, full_name, membership_status, is_public)
  values (p_user_id, p_user_id, v_email, 'user', v_awardee.name, 'pending', false)
  on conflict (id) do update set is_public = false;
  insert into public.pending_awardee_claims(user_id, awardee_id, email)
  values (p_user_id, p_awardee_id, v_email);
  if v_code.redemption_mode = 'single_use' then
    update public.access_codes set uses_left = uses_left - 1, status = 'used',
      used_by = p_user_id, used_at = now() where id = v_code.id;
  end if;
  return jsonb_build_object('status', 'pending', 'awardeeId', p_awardee_id);
end;
$$;

revoke all on function public.request_pending_awardee_claim(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.request_pending_awardee_claim(uuid,uuid,text,text) to service_role;

create or replace function public.approve_pending_awardee_claim(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = public
as $$
declare
  v_claim public.pending_awardee_claims%rowtype;
  v_awardee public.awardees%rowtype;
  v_slug text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into v_claim from public.pending_awardee_claims where user_id = p_user_id for update;
  if not found then raise exception 'Pending claim not found'; end if;
  select * into v_awardee from public.awardees where id = v_claim.awardee_id for update;
  if not found or v_awardee.profile_id is not null then
    raise exception 'Awardee record is unavailable or already claimed';
  end if;
  if lower(trim(v_awardee.email)) is distinct from v_claim.email then
    raise exception 'Awardee email changed; review this claim again';
  end if;
  if exists (select 1 from public.awardees where profile_id = p_user_id) then
    raise exception 'This account already owns an awardee record';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id
    and role = 'user' and membership_status = 'pending' and lower(trim(email)) = v_claim.email) then
    raise exception 'Pending member account is unavailable';
  end if;
  v_slug := v_awardee.slug;
  if exists (select 1 from public.profiles where slug = v_slug and id <> p_user_id) then
    v_slug := v_slug || '-' || left(p_user_id::text, 8);
  end if;
  update public.profiles set
    full_name = v_awardee.name, slug = v_slug,
    headline = coalesce(nullif(headline, ''), nullif(v_awardee.headline, ''), 'Top100 Africa Future Leaders awardee'),
    tagline = coalesce(nullif(tagline, ''), v_awardee.tagline),
    bio = coalesce(nullif(bio, ''), v_awardee.bio),
    location = coalesce(nullif(location, ''), v_awardee.country),
    field = coalesce(nullif(field, ''), v_awardee.course),
    field_of_study = coalesce(nullif(field_of_study, ''), v_awardee.course),
    avatar_url = coalesce(nullif(avatar_url, ''), v_awardee.avatar_url, v_awardee.image_url),
    social_links = coalesce(v_awardee.social_links, '{}'::jsonb) || coalesce(social_links, '{}'::jsonb),
    achievements = case when achievements = '[]'::jsonb then coalesce(v_awardee.achievements, '[]'::jsonb) else achievements end,
    interests = case when cardinality(interests) = 0 then coalesce(v_awardee.interests, array[]::text[]) else interests end,
    cohort = coalesce(nullif(cohort, ''), v_awardee.year::text),
    membership_status = 'approved', is_public = true
  where id = p_user_id;
  update public.awardees set profile_id = p_user_id, is_public = true where id = v_awardee.id;
  delete from public.pending_awardee_claims where user_id = p_user_id;
  return jsonb_build_object('awardeeId', v_awardee.id, 'profileId', p_user_id);
end;
$$;

revoke all on function public.approve_pending_awardee_claim(uuid) from public, anon, authenticated;
grant execute on function public.approve_pending_awardee_claim(uuid) to service_role;

-- Preserve the old bulk action for ordinary pending members, but exclude claims.
create or replace function public.approve_all_pending_members(p_admin_id uuid)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_approved integer;
begin
  if p_admin_id is null then raise exception 'An administrator id is required'; end if;
  with approved as (
    update public.profiles p set membership_status = 'approved'
    where p.role = 'user' and p.membership_status = 'pending'
      and not exists (select 1 from public.pending_awardee_claims c where c.user_id = p.id)
    returning p.id
  ), notices as (
    insert into public.user_notifications (user_id, title, body, category, metadata)
    select id, 'Your awardee account is approved',
      'Welcome to the network! Your account has full access — complete your BIO and connect with fellow awardees.',
      'account', jsonb_build_object('audience', 'all', 'source', 'membership-status', 'admin_id', p_admin_id)
    from approved returning user_id
  ) select count(*)::integer into v_approved from notices;
  return v_approved;
end;
$$;

revoke all on function public.approve_all_pending_members(uuid) from public, anon, authenticated;
grant execute on function public.approve_all_pending_members(uuid) to service_role;
