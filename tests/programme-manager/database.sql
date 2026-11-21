create role anon; create role authenticated; create role service_role bypassrls;
create table public.events(id uuid primary key);
create table public.profiles(id uuid primary key);
\i supabase/migrations/20261121094701_programme_manager.sql
\i supabase/migrations/20261121095730_programme_planning.sql
\i supabase/migrations/20261121095953_programme_partners_impact.sql
\i supabase/migrations/20261121100124_programme_member_interest.sql
\i supabase/migrations/20261121100355_programme_register.sql
\i supabase/migrations/20261121100545_programme_weekly_reports.sql
insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000001');
do $$ declare activity uuid; begin
 select id into activity from public.programme_manager_activities limit 1;
 begin insert into public.programme_manager_interests(member_id,kind,activity_id) values ('00000000-0000-0000-0000-000000000001','programme',activity); raise exception 'closed activity accepted'; exception when check_violation then null; end;
 update public.programme_manager_activities set status='approved', open_for_interest=true, costs='[{"essential":true,"quoted":100,"in_kind":20,"quote_evidence":"quote","in_kind_evidence":"letter"}]', cash_received=80, cash_evidence='receipt' where id=activity;
 insert into public.programme_manager_interests(member_id,kind,activity_id) values ('00000000-0000-0000-0000-000000000001','programme',activity);
 begin update public.programme_manager_activities set cash_received=0 where id=activity; raise exception 'underfunded approval accepted'; exception when check_violation then null; end;
 begin insert into public.programme_manager_partners(name,status) values ('Partner','confirmed'); raise exception 'unverified partner accepted'; exception when check_violation then null; end;
 begin insert into public.programme_manager_outcomes(indicator,value,unit,status) values ('Attendance',3,'people','verified'); raise exception 'unverified outcome accepted'; exception when check_violation then null; end;
end $$;
