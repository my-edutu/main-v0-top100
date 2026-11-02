-- Admin APIs use the service role. No public directory of contact data or tokens.
create table public.award_outreach_contacts (
  awardee_id uuid primary key references public.awardees(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  suppressed boolean not null default false,
  owner text not null default '' check (length(owner) <= 120),
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  reason text not null default 'unknown' check (reason in ('unknown','price','timing','payment_problem','delivery','unclear_value','already_paid','not_interested','other')),
  notes text not null default '' check (length(notes) <= 3000),
  tracking_started_at timestamptz,
  first_clicked_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create table public.award_outreach_templates (
  key text primary key check (key in ('recovery','awareness','follow_up','final','verification','paid')),
  subject text not null check (length(subject) between 1 and 160),
  body text not null check (length(body) between 1 and 6000),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.award_outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  template text not null check (template in ('recovery','awareness','follow_up','final','verification','paid')),
  subject text not null,
  body text not null,
  audience_filter jsonb not null,
  cancelled_at timestamptz
);
create table public.award_outreach_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.award_outreach_campaigns(id) on delete cascade,
  awardee_id uuid not null references public.awardees(id) on delete cascade,
  email text not null,
  name text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','skipped','failed','delivery_unknown')),
  lease_token uuid,
  lease_until timestamptz,
  sent_at timestamptz,
  outcome text,
  unique(campaign_id, email)
);
create index award_outreach_pending_idx on public.award_outreach_recipients(campaign_id) where status='pending';
create unique index award_outreach_one_processing_email on public.award_outreach_recipients(email) where status='processing';
alter table public.award_outreach_contacts enable row level security;
alter table public.award_outreach_templates enable row level security;
alter table public.award_outreach_campaigns enable row level security;
alter table public.award_outreach_recipients enable row level security;
revoke all on public.award_outreach_contacts, public.award_outreach_templates, public.award_outreach_campaigns, public.award_outreach_recipients from public, anon, authenticated;
grant all on public.award_outreach_contacts, public.award_outreach_templates, public.award_outreach_campaigns, public.award_outreach_recipients to service_role;

create function public.queue_award_outreach(p_id uuid, p_admin uuid, p_template text, p_subject text, p_body text, p_filter jsonb, p_members jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare existing public.award_outreach_campaigns;
begin
  if jsonb_array_length(p_members) not between 1 and 500 then raise exception 'Choose between 1 and 500 eligible recipients'; end if;
  insert into public.award_outreach_campaigns(id,created_by,template,subject,body,audience_filter)
  values(p_id,p_admin,p_template,p_subject,p_body,p_filter) on conflict(id) do nothing;
  if not found then
    select * into existing from public.award_outreach_campaigns where id=p_id;
    if existing.created_by is distinct from p_admin or existing.template <> p_template or existing.subject <> p_subject or existing.body <> p_body or existing.audience_filter <> p_filter then raise exception 'Campaign request identity is already in use'; end if;
    return p_id;
  end if;
  insert into public.award_outreach_contacts(awardee_id)
    select distinct (m->>'awardee_id')::uuid from jsonb_array_elements(p_members) m on conflict do nothing;
  insert into public.award_outreach_recipients(campaign_id,awardee_id,email,name)
    select p_id,(m->>'awardee_id')::uuid,lower(trim(m->>'email')),m->>'name' from jsonb_array_elements(p_members) m
    on conflict(campaign_id,email) do nothing;
  return p_id;
end $$;
create function public.claim_award_outreach(p_limit integer default 3)
returns setof public.award_outreach_recipients language plpgsql security invoker set search_path = public as $$
begin
  -- A crashed or timed-out SMTP send may have been accepted. Never retry it automatically.
  update public.award_outreach_recipients set status='delivery_unknown',outcome='Worker lease expired; check delivery before resending.'
    where status='processing' and lease_until < now();
  return query
    with jobs as (
      select r.id from public.award_outreach_recipients r join public.award_outreach_campaigns c on c.id=r.campaign_id
      where r.status='pending' and c.cancelled_at is null
        and not exists (select 1 from public.award_outreach_recipients active where active.email=r.email and active.status in ('processing','delivery_unknown'))
        and r.id=(
          select first_job.id from public.award_outreach_recipients first_job
          join public.award_outreach_campaigns first_campaign on first_campaign.id=first_job.campaign_id
          where first_job.email=r.email and first_job.status='pending' and first_campaign.cancelled_at is null
          order by first_campaign.created_at,first_job.id limit 1
        )
      order by c.created_at,r.id for update of r skip locked limit greatest(1,least(p_limit,3))
    )
    update public.award_outreach_recipients r set status='processing',lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
    from jobs where r.id=jobs.id returning r.*;
end $$;
revoke all on function public.queue_award_outreach(uuid,uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.claim_award_outreach(integer) from public,anon,authenticated;
grant execute on function public.queue_award_outreach(uuid,uuid,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.claim_award_outreach(integer) to service_role;
