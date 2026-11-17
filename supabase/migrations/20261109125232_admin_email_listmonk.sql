-- Private records for Listmonk campaigns and the Top100 delivery gateway.
-- SMTP acceptance is distinct from remote delivery and is never called delivered.
create table public.top100_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  listmonk_id bigint unique,
  listmonk_uuid uuid unique,
  created_by uuid not null,
  subject text not null check (length(subject) between 1 and 160),
  body text not null check (length(body) between 1 and 6000),
  audience_filter jsonb not null,
  template text not null,
  status text not null default 'creating' check (status in ('creating','draft','armed','scheduled','running','cancelled','completed','failed')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.top100_email_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.top100_email_campaigns(id) on delete cascade,
  awardee_id uuid not null references public.awardees(id),
  email text not null,
  name text not null,
  subscriber_uuid uuid not null,
  status text not null default 'pending' check (status in ('pending','sending','accepted','delivery_unknown','skipped','failed','delivered','bounced')),
  outcome text,
  stalwart_queue_id text unique,
  attempted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (campaign_id, subscriber_uuid),
  unique (campaign_id, email)
);
create index top100_email_recipients_campaign_status_idx on public.top100_email_recipients(campaign_id,status);
alter table public.top100_email_campaigns enable row level security;
alter table public.top100_email_recipients enable row level security;
revoke all on public.top100_email_campaigns, public.top100_email_recipients from public, anon, authenticated;
grant select, insert, update, delete on public.top100_email_campaigns, public.top100_email_recipients to service_role;

-- Reserve one sending slot every 20 seconds across all gateway instances.
create table public.top100_email_rate (singleton boolean primary key default true check (singleton), next_at timestamptz not null);
insert into public.top100_email_rate(singleton,next_at) values (true, now());
alter table public.top100_email_rate enable row level security;
revoke all on public.top100_email_rate from public, anon, authenticated;
grant select, update on public.top100_email_rate to service_role;
create function public.reserve_top100_email_slot() returns timestamptz language plpgsql volatile security invoker set search_path = '' as $$
declare slot timestamptz;
begin
  update public.top100_email_rate set next_at = greatest(next_at, clock_timestamp()) + interval '20 seconds'
    where singleton = true returning next_at - interval '20 seconds' into slot;
  if slot is null then raise exception 'Email sending rate is unavailable'; end if;
  return slot;
end;
$$;
revoke all on function public.reserve_top100_email_slot() from public, anon, authenticated;
grant execute on function public.reserve_top100_email_slot() to service_role;
