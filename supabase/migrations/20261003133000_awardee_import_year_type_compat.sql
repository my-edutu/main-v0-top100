-- Keep awardee import updates compatible with the historical text `year` column
-- and fresh databases where `awardees.year` is integer.
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
        image_url = coalesce(nullif(image_url, ''), v_payload->>'image_url'),
        tagline = coalesce(nullif(tagline, ''), v_payload->>'tagline'),
        headline = coalesce(nullif(headline, ''), v_payload->>'headline'),
        cgpa = coalesce(nullif(cgpa, ''), v_payload->>'cgpa'),
        social_links = coalesce(v_payload->'social_links', '{}'::jsonb) || coalesce(social_links, '{}'::jsonb),
        metadata = coalesce(metadata, '{}'::jsonb) || coalesce(v_payload->'metadata', '{}'::jsonb)
      where id = v_before.id;

      if pg_typeof(v_before.year) = 'text'::regtype then
        update public.awardees set
          year = coalesce(nullif(year, ''), nullif(v_payload->>'year', ''))
        where id = v_before.id;
      elsif pg_typeof(v_before.year) = 'integer'::regtype then
        update public.awardees set
          year = coalesce(year, nullif(v_payload->>'year', '')::integer)
        where id = v_before.id;
      else
        raise exception 'Unsupported awardee year column type: %', pg_typeof(v_before.year);
      end if;

      select * into v_after from public.awardees where id = v_before.id;
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
