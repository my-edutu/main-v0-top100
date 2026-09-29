-- Import audit and atomic, service-role-only awardee operations.
create table if not exists public.awardee_import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_sha256 text not null,
  mapping jsonb not null,
  summary jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  rolled_back_at timestamptz
);

create table if not exists public.awardee_import_changes (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.awardee_import_batches(id) on delete cascade,
  awardee_id uuid not null,
  action text not null check (action in ('insert', 'update')),
  source_rows jsonb not null,
  before_row jsonb,
  after_row jsonb not null
);

create index if not exists awardee_import_changes_batch_idx on public.awardee_import_changes(batch_id);
alter table public.awardee_import_batches enable row level security;
alter table public.awardee_import_changes enable row level security;
revoke all on public.awardee_import_batches from anon, authenticated;
revoke all on public.awardee_import_changes from anon, authenticated;
grant select, insert, update on public.awardee_import_batches to service_role;
grant select, insert on public.awardee_import_changes to service_role;
grant usage, select on sequence public.awardee_import_changes_id_seq to service_role;

create or replace function public.apply_reviewed_awardee_import(
  p_actions jsonb,
  p_admin_id uuid,
  p_filename text,
  p_file_sha256 text,
  p_mapping jsonb,
  p_summary jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_action jsonb;
  v_payload jsonb;
  v_before public.awardees%rowtype;
  v_after public.awardees%rowtype;
begin
  if jsonb_typeof(p_actions) <> 'array' or jsonb_array_length(p_actions) < 1
     or jsonb_array_length(p_actions) > 10000 then
    raise exception 'Invalid import batch size';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('awardee-import', 0));
  insert into public.awardee_import_batches(filename, file_sha256, mapping, summary, created_by)
  values (p_filename, p_file_sha256, p_mapping, p_summary, p_admin_id)
  returning id into v_batch_id;

  for v_action in select value from jsonb_array_elements(p_actions)
  loop
    v_payload := v_action->'payload';
    if v_action->>'type' = 'insert' then
      if exists (select 1 from public.awardees where lower(trim(email)) = lower(trim(v_payload->>'email'))) then
        raise exception 'Winner email already exists; preview the file again';
      end if;
      insert into public.awardees (
        name, email, slug, country, course, bio, year, image_url,
        tagline, headline, cgpa, social_links, metadata, is_public
      ) values (
        v_payload->>'name', lower(trim(v_payload->>'email')), v_payload->>'slug',
        v_payload->>'country', v_payload->>'course', v_payload->>'bio',
        (v_payload->>'year')::integer, v_payload->>'image_url',
        v_payload->>'tagline', v_payload->>'headline', v_payload->>'cgpa',
        coalesce(v_payload->'social_links', '{}'::jsonb),
        coalesce(v_payload->'metadata', '{}'::jsonb), false
      ) returning * into v_after;
      insert into public.awardee_import_changes(batch_id, awardee_id, action, source_rows, after_row)
      values (v_batch_id, v_after.id, 'insert', coalesce(v_action->'source', '[]'::jsonb), to_jsonb(v_after));
    elsif v_action->>'type' = 'update' then
      select * into v_before from public.awardees where id = (v_action->>'id')::uuid for update;
      if not found or v_before.profile_id is not null or lower(trim(v_before.email)) <> lower(trim(v_action->>'email')) then
        raise exception 'A winner changed since preview; preview the file again';
      end if;
      update public.awardees set
        country = coalesce(nullif(country, ''), v_payload->>'country'),
        course = coalesce(nullif(course, ''), v_payload->>'course'),
        bio = coalesce(nullif(bio, ''), v_payload->>'bio'),
        year = coalesce(year, (v_payload->>'year')::integer),
        image_url = coalesce(nullif(image_url, ''), v_payload->>'image_url'),
        tagline = coalesce(nullif(tagline, ''), v_payload->>'tagline'),
        headline = coalesce(nullif(headline, ''), v_payload->>'headline'),
        cgpa = coalesce(nullif(cgpa, ''), v_payload->>'cgpa'),
        social_links = coalesce(v_payload->'social_links', '{}'::jsonb) || coalesce(social_links, '{}'::jsonb),
        metadata = coalesce(metadata, '{}'::jsonb) || coalesce(v_payload->'metadata', '{}'::jsonb)
      where id = v_before.id returning * into v_after;
      insert into public.awardee_import_changes(batch_id, awardee_id, action, source_rows, before_row, after_row)
      values (v_batch_id, v_after.id, 'update', coalesce(v_action->'source', '[]'::jsonb), to_jsonb(v_before), to_jsonb(v_after));
    else
      raise exception 'Invalid import action';
    end if;
  end loop;
  return jsonb_build_object('id', v_batch_id, 'count', jsonb_array_length(p_actions));
end;
$$;

revoke all on function public.apply_reviewed_awardee_import(jsonb, uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.apply_reviewed_awardee_import(jsonb, uuid, text, text, jsonb, jsonb) to service_role;

create or replace function public.rollback_reviewed_awardee_import(p_batch_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_change public.awardee_import_changes%rowtype;
  v_current public.awardees%rowtype;
  v_before public.awardees%rowtype;
  v_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('awardee-import', 0));
  perform 1 from public.awardee_import_batches
    where id = p_batch_id and rolled_back_at is null for update;
  if not found then raise exception 'Import batch is unavailable or already rolled back'; end if;
  for v_change in select * from public.awardee_import_changes
    where batch_id = p_batch_id order by id desc
  loop
    select * into v_current from public.awardees where id = v_change.awardee_id for update;
    if not found or v_current.profile_id is not null or to_jsonb(v_current) <> v_change.after_row then
      raise exception 'A winner has changed or claimed their account; this batch cannot be undone';
    end if;
    if v_change.action = 'insert' then
      delete from public.awardees where id = v_change.awardee_id;
    else
      v_before := jsonb_populate_record(null::public.awardees, v_change.before_row);
      update public.awardees set
        country = v_before.country, course = v_before.course, bio = v_before.bio,
        year = v_before.year, image_url = v_before.image_url,
        tagline = v_before.tagline, headline = v_before.headline,
        cgpa = v_before.cgpa, social_links = v_before.social_links,
        metadata = v_before.metadata
      where id = v_change.awardee_id;
    end if;
    v_count := v_count + 1;
  end loop;
  update public.awardee_import_batches set rolled_back_at = now() where id = p_batch_id;
  return v_count;
end;
$$;

revoke all on function public.rollback_reviewed_awardee_import(uuid) from public, anon, authenticated;
grant execute on function public.rollback_reviewed_awardee_import(uuid) to service_role;

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
  select * into v_code from public.access_codes where code = upper(trim(p_code)) for update;
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
  update public.access_codes set
    uses_left = case when redemption_mode = 'single_use' then uses_left - 1 else uses_left end,
    status = case when redemption_mode = 'single_use' then 'used' else 'active' end,
    used_by = p_user_id,
    used_at = now()
  where id = v_code.id;
  return jsonb_build_object('awardeeId', p_awardee_id, 'profileId', p_user_id);
end;
$$;

revoke all on function public.claim_verified_awardee(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_verified_awardee(uuid, uuid, text, text) to service_role;
