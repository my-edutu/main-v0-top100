-- Run only in an empty, disposable local festival_test_* database.
-- psql -h /tmp -U MAC -d festival_test_20261031 -f tests/festival/migration.sql
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() not like 'festival_test_%' then
    raise exception 'Refusing to run outside a disposable festival_test_ database';
  end if;
end $$;
create table public.profiles (id uuid primary key);
\ir ../../supabase/migrations/20261031031216_festival_attendance_interests.sql
insert into public.profiles values ('00000000-0000-0000-0000-000000000001');
set local role service_role;
insert into public.festival_attendance_interests (festival_key, member_id, full_name, phone, pickup_requested)
values ('afl-festival-2026', '00000000-0000-0000-0000-000000000001', 'Amara Okafor', '+2348031234567', true);
reset role;
\ir ../../supabase/migrations/20261031121526_festival_admission_tickets.sql
set local role service_role;
do $$ begin
  if (select registered_at from public.festival_attendance_interests) is not null then
    raise exception 'Legacy interest incorrectly became an admission ticket';
  end if;
  if (select ticket_id from public.festival_attendance_interests) is null then
    raise exception 'Ticket identity missing';
  end if;
end $$;
insert into public.festival_attendance_interests (festival_key, member_id, full_name, phone, pickup_requested)
values ('afl-festival-2026', '00000000-0000-0000-0000-000000000001', 'Amara Updated', '+2348031234567', false)
on conflict (festival_key, member_id) do update set full_name = excluded.full_name, pickup_requested = excluded.pickup_requested;
do $$ begin
  if (select count(*) from public.festival_attendance_interests) <> 1 then raise exception 'Duplicate interest'; end if;
  if (select pickup_requested from public.festival_attendance_interests) then raise exception 'Update failed'; end if;
  begin
    insert into public.festival_attendance_interests values ('bad', '00000000-0000-0000-0000-000000000001', 'Amara', 'bad phone', true, now(), now());
    raise exception 'Invalid phone accepted';
  exception when check_violation then null;
  end;
end $$;
do $$ declare claimed integer; original_ticket uuid; begin
  select ticket_id into original_ticket from public.festival_attendance_interests;
  update public.festival_attendance_interests set registered_at = now(), ticket_email_claimed_at = now(), ticket_email_claim_token = gen_random_uuid()
    where ticket_email_sent_at is null and (ticket_email_claimed_at is null or ticket_email_claimed_at < now() - interval '2 minutes');
  get diagnostics claimed = row_count;
  if claimed <> 1 then raise exception 'First email claim failed'; end if;
  update public.festival_attendance_interests set ticket_email_claimed_at = now(), ticket_email_claim_token = gen_random_uuid()
    where ticket_email_sent_at is null and (ticket_email_claimed_at is null or ticket_email_claimed_at < now() - interval '2 minutes');
  get diagnostics claimed = row_count;
  if claimed <> 0 then raise exception 'Concurrent request stole active claim'; end if;
  update public.festival_attendance_interests set ticket_email_claimed_at = now() - interval '3 minutes';
  update public.festival_attendance_interests set ticket_email_claimed_at = now(), ticket_email_claim_token = gen_random_uuid()
    where ticket_email_sent_at is null and (ticket_email_claimed_at is null or ticket_email_claimed_at < now() - interval '2 minutes');
  get diagnostics claimed = row_count;
  if claimed <> 1 then raise exception 'Abandoned claim cannot recover'; end if;
  update public.festival_attendance_interests set ticket_email_sent_at = now(), ticket_email_claimed_at = null, ticket_email_claim_token = null;
  update public.festival_attendance_interests set ticket_email_claimed_at = now(), ticket_email_claim_token = gen_random_uuid()
    where ticket_email_sent_at is null and (ticket_email_claimed_at is null or ticket_email_claimed_at < now() - interval '2 minutes');
  get diagnostics claimed = row_count;
  if claimed <> 0 then raise exception 'Accepted email was eligible for resend'; end if;
  if (select ticket_id from public.festival_attendance_interests) <> original_ticket then raise exception 'Ticket identity changed'; end if;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon', 'public.festival_attendance_interests', 'SELECT') or
     has_table_privilege('authenticated', 'public.festival_attendance_interests', 'SELECT') or
     has_table_privilege('authenticated', 'public.festival_attendance_interests', 'INSERT') then
    raise exception 'Personal data accessible outside server';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.festival_attendance_interests'::regclass) then
    raise exception 'RLS missing';
  end if;
end $$;
rollback;
\echo 'Festival migration: service access, unique upsert, validation, and private access verified; all changes rolled back.'
