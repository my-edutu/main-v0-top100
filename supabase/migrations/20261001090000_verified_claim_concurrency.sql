-- Keep separate awardee claims for the same account from racing, while allowing
-- a time-limited cohort invite code to be used concurrently by many awardees.
create or replace function public.claim_verified_awardee(
  p_awardee_id uuid,
  p_user_id uuid,
  p_email text,
  p_code text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_awardee public.awardees%rowtype;
  v_code public.access_codes%rowtype;
  v_email text := lower(trim(p_email));
  v_profile_slug text;
begin
  -- The transaction-level user lock makes the ownership check below serial for
  -- this account, even when two different awardee rows are claimed at once.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into v_awardee from public.awardees where id = p_awardee_id for update;
  if not found or v_awardee.profile_id is not null then
    raise exception 'Awardee record is unavailable or already claimed';
  end if;
  if v_awardee.email is null or lower(trim(v_awardee.email)) <> v_email then
    raise exception 'Verified email does not match the awardee record';
  end if;
  if exists (select 1 from public.awardees where profile_id = p_user_id and id <> p_awardee_id) then
    raise exception 'This account already owns an awardee record';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and (role <> 'user' or lower(trim(email)) <> v_email)) then
    raise exception 'This account cannot claim the selected awardee record';
  end if;

  -- First read only selects the correct lock mode. The locked reread below
  -- revalidates the current record before its fields are trusted.
  select * into v_code from public.access_codes where code = upper(trim(p_code));
  if not found then
    raise exception 'Invite code is unavailable for this email';
  end if;
  if v_code.redemption_mode = 'single_use' then
    select * into v_code from public.access_codes
      where id = v_code.id and redemption_mode = 'single_use' for update;
  else
    select * into v_code from public.access_codes
      where id = v_code.id and redemption_mode = 'time_limited' for share;
  end if;
  if not found or v_code.status <> 'active' or v_code.expires_at <= now()
    or (v_code.email is not null and lower(trim(v_code.email)) <> v_email)
    or (v_code.redemption_mode = 'single_use' and v_code.uses_left < 1) then
    raise exception 'Invite code is unavailable for this email';
  end if;

  v_profile_slug := v_awardee.slug;
  if exists (select 1 from public.profiles where slug = v_profile_slug and id <> p_user_id) then
    v_profile_slug := v_profile_slug || '-' || left(p_user_id::text, 8);
  end if;

  insert into public.profiles (
    id, user_id, email, role, full_name, slug, headline, tagline, bio,
    location, field, field_of_study, avatar_url, social_links, achievements,
    interests, cohort, membership_status, access_code, is_public
  ) values (
    p_user_id, p_user_id, v_email, 'user', v_awardee.name, v_profile_slug,
    coalesce(nullif(v_awardee.headline, ''), 'Top100 Africa Future Leaders awardee'),
    v_awardee.tagline, v_awardee.bio, v_awardee.country, v_awardee.course,
    v_awardee.course, coalesce(v_awardee.avatar_url, v_awardee.image_url),
    coalesce(v_awardee.social_links, '{}'::jsonb), coalesce(v_awardee.achievements, '[]'::jsonb),
    coalesce(v_awardee.interests, array[]::text[]), v_awardee.year::text,
    'pending', v_code.code, true
  ) on conflict (id) do update set
    user_id = coalesce(profiles.user_id, excluded.user_id),
    email = coalesce(nullif(profiles.email, ''), excluded.email),
    full_name = coalesce(nullif(profiles.full_name, ''), excluded.full_name),
    slug = coalesce(nullif(profiles.slug, ''), excluded.slug),
    headline = coalesce(nullif(profiles.headline, ''), excluded.headline),
    tagline = coalesce(nullif(profiles.tagline, ''), excluded.tagline),
    bio = coalesce(nullif(profiles.bio, ''), excluded.bio),
    location = coalesce(nullif(profiles.location, ''), excluded.location),
    field = coalesce(nullif(profiles.field, ''), excluded.field),
    field_of_study = coalesce(nullif(profiles.field_of_study, ''), excluded.field_of_study),
    avatar_url = coalesce(nullif(profiles.avatar_url, ''), excluded.avatar_url),
    social_links = excluded.social_links || coalesce(profiles.social_links, '{}'::jsonb),
    achievements = case when profiles.achievements = '[]'::jsonb then excluded.achievements else profiles.achievements end,
    interests = case when cardinality(profiles.interests) = 0 then excluded.interests else profiles.interests end,
    cohort = coalesce(nullif(profiles.cohort, ''), excluded.cohort),
    access_code = excluded.access_code,
    is_public = true;

  update public.awardees set profile_id = p_user_id, is_public = true where id = p_awardee_id;
  if v_code.redemption_mode = 'single_use' then
    update public.access_codes set
      uses_left = uses_left - 1,
      status = 'used',
      used_by = p_user_id,
      used_at = now()
    where id = v_code.id;
  end if;
  return jsonb_build_object('awardeeId', p_awardee_id, 'profileId', p_user_id);
end;
$$;

revoke all on function public.claim_verified_awardee(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_verified_awardee(uuid, uuid, text, text) to service_role;
