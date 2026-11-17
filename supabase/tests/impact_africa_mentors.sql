-- Run against a disposable database after applying the mentor migration.
begin;

insert into auth.users (id, email) values
  ('adc80000-0000-4000-8000-000000000001', 'mentor-check@example.test'),
  ('adc80000-0000-4000-8000-000000000002', 'member-one@example.test'),
  ('adc80000-0000-4000-8000-000000000003', 'member-two@example.test');
update auth.users set encrypted_password = 'synthetic' where id in (
  'adc80000-0000-4000-8000-000000000001', 'adc80000-0000-4000-8000-000000000003'
);
update auth.users set raw_app_meta_data = '{"impact_africa_mentor_login":true}' where id = 'adc80000-0000-4000-8000-000000000001';

do $$
begin
  if has_table_privilege('authenticated', 'public.impact_mentors', 'SELECT')
    or has_table_privilege('anon', 'public.impact_mentor_slots', 'SELECT')
    or has_function_privilege('authenticated', 'public.impact_book_mentor_slot(uuid,uuid,uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.impact_mentor_login_method(text)', 'EXECUTE') then
    raise exception 'Mentorship data or RPC accessible without the app server';
  end if;
end;
$$;

set local role service_role;

do $$
declare
  v_owner uuid := 'adc80000-0000-4000-8000-000000000001';
  v_member uuid := 'adc80000-0000-4000-8000-000000000002';
  v_other uuid := 'adc80000-0000-4000-8000-000000000003';
  v_mentor uuid;
  v_match uuid;
  v_other_match uuid;
  v_slot uuid;
  v_start timestamptz := now() + interval '1 day';
begin
  if public.impact_mentor_login_method('member-two@example.test') <> 'top100'
    or public.impact_mentor_login_method('mentor-check@example.test') <> 'code'
    or public.impact_mentor_login_method('unknown@example.test') <> 'new' then
    raise exception 'Password and mentor code sign-ins are not separated';
  end if;

  insert into public.impact_mentors(user_id, name, headline, bio, expertise, accepting_requests)
    values (v_owner, 'Ada Mentor', 'Product Lead', 'I build tools and coach teams.', 'Career growth', true)
    returning id into v_mentor;
  perform public.impact_request_mentor_match(v_member, v_mentor, 'I want help with my portfolio.');
  perform public.impact_request_mentor_match(v_other, v_mentor, 'I want to move into a product role.');
  select id into v_match from public.impact_mentor_matches where member_id = v_member;
  select id into v_other_match from public.impact_mentor_matches where member_id = v_other;

  insert into public.impact_mentor_slots(mentor_id, starts_at, ends_at, meeting_url)
    values (v_mentor, v_start, v_start + interval '30 minutes', 'https://meet.example.test/private') returning id into v_slot;

  begin
    insert into public.impact_mentor_slots(mentor_id, starts_at, ends_at, meeting_url)
      values (v_mentor, v_start + interval '15 minutes', v_start + interval '45 minutes', 'https://meet.example.test/overlap');
    raise exception 'Overlapping availability accepted';
  exception when exclusion_violation then null;
  end;
  begin
    perform public.impact_book_mentor_slot(v_member, v_match, v_slot);
    raise exception 'Pending match booked a slot';
  exception when insufficient_privilege then null;
  end;

  update public.impact_mentor_matches set status = 'accepted' where id in (v_match, v_other_match);
  begin
    perform public.impact_book_mentor_slot(v_other, v_match, v_slot);
    raise exception 'Different member booked someone else''s match';
  exception when insufficient_privilege then null;
  end;
  perform public.impact_book_mentor_slot(v_member, v_match, v_slot);
  begin
    perform public.impact_book_mentor_slot(v_other, v_other_match, v_slot);
    raise exception 'Same slot booked twice';
  exception when unique_violation then null;
  end;
  begin
    delete from public.impact_mentor_slots where id = v_slot;
    raise exception 'Booked slot was deleted';
  exception when foreign_key_violation then null;
  end;
end;
$$;

rollback;
