-- Internal interview request and booking lifecycle. New routes use service-role
-- APIs after validating the signed-in member/admin; exposed tables remain closed.
alter table public.interview_applications
  add column if not exists member_id uuid references public.profiles(id) on delete set null,
  add column if not exists interview_topic text,
  add column if not exists impact_story text,
  add column if not exists request_format text,
  add column if not exists member_timezone text,
  add column if not exists preferred_windows jsonb not null default '[]'::jsonb,
  add column if not exists additional_note text,
  add column if not exists publication_consent boolean not null default false,
  add column if not exists booking_status text not null default 'awaiting_review'
    check (booking_status in ('awaiting_review','approved','declined','closed'));
update public.interview_applications set booking_status='closed' where member_id is null;
create unique index if not exists interview_one_open_request_per_member
  on public.interview_applications(member_id)
  where member_id is not null and booking_status in ('awaiting_review','approved');

create table if not exists public.interview_scheduling_settings (
  id boolean primary key default true check (id),
  team_timezone text not null default 'Africa/Lagos',
  duration_minutes integer not null default 30 check (duration_minutes between 15 and 180),
  buffer_minutes integer not null default 15 check (buffer_minutes between 0 and 180),
  daily_limit integer not null default 3 check (daily_limit between 1 and 100),
  minimum_notice_hours integer not null default 24 check (minimum_notice_hours between 1 and 720),
  proposal_expiry_hours integer not null default 48 check (proposal_expiry_hours between 1 and 336),
  working_windows jsonb not null default '[]'::jsonb,
  excluded_dates jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
insert into public.interview_scheduling_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.interview_bookings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.interview_applications(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  resource_id text not null default 'team',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reserved_until timestamptz not null,
  team_date date not null,
  state text not null check(state in ('proposed','confirmed','declined','expired','cancelled','completed')),
  revision integer not null default 1,
  expires_at timestamptz,
  meeting_url text,
  member_reason text,
  calendar_uid text not null default (gen_random_uuid()::text || '@top100afl.com'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at > starts_at and reserved_until >= ends_at)
);
create unique index if not exists interview_one_active_booking_per_application
  on public.interview_bookings(application_id) where state in ('proposed','confirmed');
create index if not exists interview_bookings_member_idx on public.interview_bookings(member_id, updated_at desc);
create index if not exists interview_bookings_start_idx on public.interview_bookings(starts_at) where state in ('proposed','confirmed');

create table if not exists public.interview_booking_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.interview_applications(id) on delete cascade,
  booking_id uuid references public.interview_bookings(id) on delete set null,
  actor_id uuid references public.profiles(id),
  actor_role text not null check(actor_role in ('member','admin','system')),
  action text not null,
  revision integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists interview_booking_events_application_idx on public.interview_booking_events(application_id, created_at);

create table if not exists public.interview_notification_outbox (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.interview_applications(id) on delete cascade,
  event_key text not null,
  recipient_email text,
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  channel text not null check(channel in ('email','dashboard')),
  payload jsonb not null,
  due_at timestamptz not null default now(),
  state text not null default 'pending' check(state in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  lease_until timestamptz,
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(event_key, channel, recipient_email, recipient_user_id)
);
create index if not exists interview_outbox_due_idx on public.interview_notification_outbox(due_at) where state in ('pending','failed');

alter table public.interview_scheduling_settings enable row level security;
alter table public.interview_bookings enable row level security;
alter table public.interview_booking_events enable row level security;
alter table public.interview_notification_outbox enable row level security;
revoke all on public.interview_scheduling_settings, public.interview_bookings, public.interview_booking_events, public.interview_notification_outbox from anon, authenticated;
grant all on public.interview_scheduling_settings, public.interview_bookings, public.interview_booking_events, public.interview_notification_outbox to service_role;
grant usage, select on sequence public.interview_booking_events_id_seq, public.interview_notification_outbox_id_seq to service_role;

create or replace function public.interview_submit_request(p_member_id uuid, p_email text, p_name text, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare app public.interview_applications%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text, 731902));
  select * into app from public.interview_applications where member_id=p_member_id and booking_status in ('awaiting_review','approved') for update;
  if found then return jsonb_build_object('application',to_jsonb(app),'existing',true); end if;
  insert into public.interview_applications(member_id,full_name,email,phone,country,cohort_year,role_title,organisation,bio,impact_story,interview_topic,request_format,member_timezone,preferred_windows,additional_note,publication_consent,preferred_format,status,verification,consent_recorded,consent_at)
  values(p_member_id,p_name,p_email,'',coalesce(p_payload->>'country',''),coalesce(nullif(p_payload->>'cohortYear','')::int,2026),coalesce(p_payload->>'roleTitle',''),coalesce(p_payload->>'organisation',''),' ',p_payload->>'impactStory',p_payload->>'topic',p_payload->>'format',p_payload->>'timezone',coalesce(p_payload->'preferredWindows','[]'::jsonb),p_payload->>'additionalNote',coalesce((p_payload->>'publicationConsent')::boolean,false),p_payload->>'format','pending','matched',coalesce((p_payload->>'publicationConsent')::boolean,false),now()) returning * into app;
  insert into public.interview_booking_events(application_id,actor_id,actor_role,action,details) values(app.id,p_member_id,'member','request_submitted',jsonb_build_object('topic',app.interview_topic));
  insert into public.interview_notification_outbox(application_id,event_key,recipient_email,channel,payload)
    values(app.id,app.id||':request:member',p_email,'email',jsonb_build_object('title','Interview request received','body','Your request is under review. No time has been scheduled yet.','cta_url','/dashboard/me/interview','action','request_received')),
          (app.id,app.id||':request:admin',null,'email',jsonb_build_object('title','New interview request','body',p_name||' submitted an interview request.','action','request_received'));
  insert into public.interview_notification_outbox(application_id,event_key,recipient_user_id,channel,payload)
    values(app.id,app.id||':request:dashboard',p_member_id,'dashboard',jsonb_build_object('title','Interview request received','body','Your request is under review. No time has been scheduled yet.','cta_label','View request','cta_url','/dashboard/me/interview','category','interview'));
  return jsonb_build_object('application',to_jsonb(app),'existing',false);
end $$;

create or replace function public.interview_booking_transition(p_application_id uuid,p_actor_id uuid,p_actor_role text,p_revision integer,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare app public.interview_applications%rowtype; book public.interview_bookings%rowtype; settings public.interview_scheduling_settings%rowtype; s timestamptz; e timestamptz; hold_until timestamptz; local_start timestamp; day_date date; next_state text; next_booking jsonb; event_revision integer;
begin
  select * into app from public.interview_applications where id=p_application_id for update;
  if not found then raise exception 'request_not_found' using errcode='P0002'; end if;
  if p_actor_role='member' and app.member_id is distinct from p_actor_id then raise exception 'forbidden' using errcode='42501'; end if;
  select * into settings from public.interview_scheduling_settings where id=true;
  select * into book from public.interview_bookings where application_id=app.id order by revision desc limit 1 for update;
  if p_action in ('approve','decline','propose','reschedule','admin_cancel','complete') and p_actor_role <> 'admin' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_action in ('accept','request_change','member_cancel') and p_actor_role <> 'member' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_revision is not null and coalesce(book.revision,0) <> p_revision then raise exception 'stale_revision' using errcode='40001'; end if;
  if p_action='approve' and app.booking_status<>'awaiting_review' then raise exception 'invalid_transition' using errcode='22023'; end if;
  if p_action in ('decline','propose','reschedule') and app.booking_status not in ('awaiting_review','approved') then raise exception 'invalid_transition' using errcode='22023'; end if;
  if p_action in ('accept','request_change') and (book.id is null or book.state not in ('proposed','confirmed')) then raise exception 'booking_not_active' using errcode='22023'; end if;
  if p_action='member_cancel' and app.booking_status not in ('awaiting_review','approved') then raise exception 'invalid_transition' using errcode='22023'; end if;
  if p_action='admin_cancel' and (book.id is null or book.state not in ('proposed','confirmed')) then raise exception 'booking_not_active' using errcode='22023'; end if;
  if p_action='approve' then update public.interview_applications set booking_status='approved',status='shortlisted' where id=app.id;
  elsif p_action='decline' then update public.interview_applications set booking_status='declined',status='declined' where id=app.id;
  elsif p_action in ('propose','reschedule') then
    if jsonb_array_length(settings.working_windows)=0 then raise exception 'availability_not_configured' using errcode='22023'; end if;
    s:=(p_payload->>'startsAt')::timestamptz; local_start:=s at time zone settings.team_timezone; day_date:=local_start::date;
    if s < now() + make_interval(hours=>settings.minimum_notice_hours) then raise exception 'insufficient_notice' using errcode='22023'; end if;
    if day_date::text=any(array(select jsonb_array_elements_text(settings.excluded_dates))) then raise exception 'excluded_date' using errcode='22023'; end if;
    if not exists(select 1 from jsonb_array_elements(settings.working_windows) w where (w->>'weekday')::int=extract(isodow from local_start)::int and local_start::time >= (w->>'start')::time and (local_start + make_interval(mins=>settings.duration_minutes))::time <= (w->>'end')::time) then raise exception 'outside_working_hours' using errcode='22023'; end if;
    e:=s+make_interval(mins=>settings.duration_minutes); hold_until:=e+make_interval(mins=>settings.buffer_minutes);
    perform pg_advisory_xact_lock(hashtextextended('interview-booking-shared-resource',731902));
    update public.interview_bookings set state='cancelled',updated_at=now() where application_id=app.id and state in ('proposed','confirmed');
    if exists(select 1 from public.interview_bookings b where b.resource_id='team' and (b.state='confirmed' or (b.state='proposed' and b.expires_at>now())) and tstzrange(b.starts_at,b.reserved_until,'[)') && tstzrange(s,hold_until,'[)')) then raise exception 'slot_conflict' using errcode='23P01'; end if;
    if (select count(*) from public.interview_bookings b where b.team_date=day_date and (b.state='confirmed' or (b.state='proposed' and b.expires_at>now()))) >= settings.daily_limit then raise exception 'daily_capacity_reached' using errcode='22023'; end if;
    if not coalesce((p_payload->>'meetingUrl') ~ '^https://[^[:space:]]+$',false) and coalesce(p_payload->>'format',app.request_format) <> 'written' then raise exception 'meeting_url_required' using errcode='22023'; end if;
    insert into public.interview_bookings(application_id,member_id,starts_at,ends_at,reserved_until,team_date,state,revision,expires_at,meeting_url,member_reason,calendar_uid)
      values(app.id,app.member_id,s,e,hold_until,day_date,'proposed',coalesce(book.revision,0)+1,least(now()+make_interval(hours=>settings.proposal_expiry_hours),s-interval '2 hours'),p_payload->>'meetingUrl',p_payload->>'reason',coalesce(book.calendar_uid,gen_random_uuid()::text||'@top100afl.com')) returning * into book;
    update public.interview_applications set booking_status='approved' where id=app.id;
  elsif p_action='accept' then
    if book.state<>'proposed' or book.expires_at<=now() then raise exception 'proposal_expired' using errcode='22023'; end if;
    update public.interview_bookings set state='confirmed',expires_at=null,updated_at=now() where id=book.id returning * into book;
  elsif p_action='request_change' then update public.interview_bookings set state='declined',updated_at=now() where id=book.id; update public.interview_applications set booking_status='approved' where id=app.id;
  elsif p_action in ('member_cancel','admin_cancel') then update public.interview_bookings set state='cancelled',updated_at=now() where id=book.id; update public.interview_applications set booking_status='closed' where id=app.id;
  elsif p_action='complete' then if book.state<>'confirmed' then raise exception 'booking_not_confirmed' using errcode='22023'; end if; update public.interview_bookings set state='completed',updated_at=now() where id=book.id; update public.interview_applications set booking_status='closed' where id=app.id;
  else raise exception 'invalid_action' using errcode='22023'; end if;
  select * into app from public.interview_applications where id=p_application_id;
  select * into book from public.interview_bookings where application_id=app.id order by revision desc limit 1;
  event_revision:=coalesce(book.revision,0);
  insert into public.interview_booking_events(application_id,booking_id,actor_id,actor_role,action,revision,details) values(app.id,book.id,p_actor_id,p_actor_role,p_action,event_revision,jsonb_build_object('reason',p_payload->>'reason','starts_at',book.starts_at));
  insert into public.interview_notification_outbox(application_id,event_key,recipient_email,channel,payload)
    values(app.id,app.id||':'||p_action||':'||event_revision||':member',app.email,'email',jsonb_build_object('title',case when p_action='propose' or p_action='reschedule' then 'A time has been proposed for your interview' when p_action='approve' then 'Your interview request is approved' when p_action='accept' then 'Your interview is confirmed' else 'Interview update' end,'body',coalesce(nullif(p_payload->>'reason',''),case when p_action='propose' or p_action='reschedule' then 'Proposed for '||to_char(book.starts_at at time zone settings.team_timezone,'Dy Mon DD, YYYY HH12:MI AM')||' ('||settings.team_timezone||'). Please sign in to accept or request another time.' when p_action='approve' then 'The team approved your request and will arrange an interview time.' when p_action='accept' then 'Your interview time is confirmed.' when p_action='decline' then 'The team has closed this interview request.' else 'Your interview request has been updated.' end),'action',p_action,'bookingId',book.id,'revision',event_revision,'startsAt',book.starts_at,'expiresAt',book.expires_at,'meetingUrl',book.meeting_url,'cta_url','/dashboard/me/interview')),
          (app.id,app.id||':'||p_action||':'||event_revision||':admin',null,'email',jsonb_build_object('title','Interview update: '||app.full_name,'body',p_action,'action',p_action,'bookingId',book.id,'revision',event_revision,'startsAt',book.starts_at)),
          (app.id,app.id||':'||p_action||':'||event_revision||':dashboard',app.member_id,'dashboard',jsonb_build_object('title',case when p_action='propose' or p_action='reschedule' then 'A time has been proposed' when p_action='approve' then 'Interview request approved' when p_action='accept' then 'Interview confirmed' else 'Interview update' end,'body',coalesce(nullif(p_payload->>'reason',''),case when p_action='propose' or p_action='reschedule' then 'Review the proposed time and accept or request another.' when p_action='approve' then 'The team will arrange an interview time.' when p_action='accept' then 'Your interview time is confirmed.' else 'Your interview request has been updated.' end),'cta_label','View interview','cta_url','/dashboard/me/interview','category','interview'));
  if p_action='accept' and book.id is not null then
    insert into public.interview_notification_outbox(application_id,event_key,recipient_email,channel,due_at,payload)
    select app.id,app.id||':reminder24:'||book.revision,app.email,'email',greatest(now(),book.starts_at-interval '24 hours'),jsonb_build_object('title','Interview reminder','body','Your Top100 interview is coming up in 24 hours.','action','reminder','bookingId',book.id,'revision',book.revision,'cta_url','/dashboard/me/interview') where book.starts_at>now()+interval '24 hours';
    insert into public.interview_notification_outbox(application_id,event_key,recipient_email,channel,due_at,payload)
    select app.id,app.id||':reminder1:'||book.revision,app.email,'email',greatest(now(),book.starts_at-interval '1 hour'),jsonb_build_object('title','Interview reminder','body','Your Top100 interview starts in one hour.','action','reminder','bookingId',book.id,'revision',book.revision,'cta_url','/dashboard/me/interview') where book.starts_at>now()+interval '1 hour';
    insert into public.interview_notification_outbox(application_id,event_key,recipient_user_id,channel,due_at,payload)
    select app.id,app.id||':reminder24:dashboard:'||book.revision,app.member_id,'dashboard',greatest(now(),book.starts_at-interval '24 hours'),jsonb_build_object('title','Interview reminder','body','Your Top100 interview is coming up in 24 hours.','action','reminder','bookingId',book.id,'revision',book.revision,'category','interview','cta_label','View interview','cta_url','/dashboard/me/interview') where book.starts_at>now()+interval '24 hours';
    insert into public.interview_notification_outbox(application_id,event_key,recipient_user_id,channel,due_at,payload)
    select app.id,app.id||':reminder1:dashboard:'||book.revision,app.member_id,'dashboard',greatest(now(),book.starts_at-interval '1 hour'),jsonb_build_object('title','Interview reminder','body','Your Top100 interview starts in one hour.','action','reminder','bookingId',book.id,'revision',book.revision,'category','interview','cta_label','View interview','cta_url','/dashboard/me/interview') where book.starts_at>now()+interval '1 hour';
  end if;
  return jsonb_build_object('application',to_jsonb(app),'booking',case when book.id is null then null else to_jsonb(book) end);
end $$;

create or replace function public.interview_outbox_claim(p_limit integer default 20)
returns setof public.interview_notification_outbox language plpgsql security invoker set search_path = '' as $$
begin
 return query with due as (select id from public.interview_notification_outbox where due_at<=now() and (state in ('pending','failed') or (state='processing' and lease_until<now())) order by due_at for update skip locked limit least(greatest(p_limit,1),100)) update public.interview_notification_outbox o set state='processing',attempts=o.attempts+1,lease_until=now()+interval '2 minutes' from due where o.id=due.id returning o.*;
end $$;
revoke all on function public.interview_submit_request(uuid,text,text,jsonb), public.interview_booking_transition(uuid,uuid,text,integer,text,jsonb), public.interview_outbox_claim(integer) from public, anon, authenticated;
grant execute on function public.interview_submit_request(uuid,text,text,jsonb), public.interview_booking_transition(uuid,uuid,text,integer,text,jsonb), public.interview_outbox_claim(integer) to service_role;

alter table public.user_notifications add column if not exists interview_outbox_id bigint references public.interview_notification_outbox(id) on delete set null;
create unique index if not exists user_notifications_interview_outbox_unique on public.user_notifications(interview_outbox_id);

create or replace function public.interview_expire_proposals()
returns integer language plpgsql security invoker set search_path = '' as $$
declare item record; n integer:=0;
begin
 for item in select b.id,b.application_id,b.member_id,b.revision,a.email from public.interview_bookings b join public.interview_applications a on a.id=b.application_id where b.state='proposed' and b.expires_at<=now() for update of b skip locked loop
   update public.interview_bookings set state='expired',updated_at=now() where id=item.id;
   insert into public.interview_booking_events(application_id,booking_id,actor_role,action,revision) values(item.application_id,item.id,'system','proposal_expired',item.revision);
   insert into public.interview_notification_outbox(application_id,event_key,recipient_email,channel,payload) values(item.application_id,item.application_id||':expired:'||item.revision||':email',item.email,'email',jsonb_build_object('title','Interview time expired','body','The proposed time expired. Our team will arrange another time.','action','proposal_expired','cta_url','/dashboard/me/interview')),(item.application_id,item.application_id||':expired:'||item.revision||':dashboard',null,'dashboard','{}'::jsonb),(item.application_id,item.application_id||':expired:'||item.revision||':admin',null,'email',jsonb_build_object('title','Interview proposal expired','body','A proposed time expired for an interview request.','action','proposal_expired','cta_url','/admin/interviews'));
   update public.interview_notification_outbox set recipient_user_id=item.member_id,payload=jsonb_build_object('title','Interview time expired','body','The proposed time expired. Our team will arrange another time.','category','interview','cta_label','View request','cta_url','/dashboard/me/interview') where event_key=item.application_id||':expired:'||item.revision||':dashboard';
   n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.interview_expire_proposals() from public,anon,authenticated;
grant execute on function public.interview_expire_proposals() to service_role;
