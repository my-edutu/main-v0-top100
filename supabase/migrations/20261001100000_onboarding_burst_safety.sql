-- Durable notifications and atomic member progress updates for onboarding bursts.

create table if not exists public.member_email_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  kind text not null check (kind in ('welcome', 'direct_message')),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.dm_conversations(id) on delete cascade,
  sender_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'dead')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processing_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint member_email_outbox_dm_conversation_check check (
    (kind = 'direct_message' and conversation_id is not null) or
    (kind = 'welcome' and conversation_id is null)
  )
);

create index if not exists member_email_outbox_pending_idx
  on public.member_email_outbox (available_at, created_at)
  where status in ('pending', 'processing');

alter table public.member_email_outbox enable row level security;
revoke all on table public.member_email_outbox from public, anon, authenticated;
grant select, insert, update on table public.member_email_outbox to service_role;

create or replace function public.claim_member_email_outbox(p_limit integer default 25)
returns setof public.member_email_outbox
language sql
security invoker
set search_path = pg_catalog, public
as $$
  with picked as (
    select id
    from public.member_email_outbox
    where (status = 'pending' and available_at <= now())
       or (status = 'processing' and processing_at < now() - interval '5 minutes')
    order by available_at, created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  )
  update public.member_email_outbox as jobs
  set status = 'processing', processing_at = now(), attempts = jobs.attempts + 1
  from picked
  where jobs.id = picked.id
  returning jobs.*;
$$;

create or replace function public.finish_member_email_outbox(
  p_id uuid,
  p_success boolean,
  p_error text default null
) returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  update public.member_email_outbox
  set status = case when p_success then 'sent' when attempts >= 8 then 'dead' else 'pending' end,
      sent_at = case when p_success then now() else sent_at end,
      processing_at = null,
      available_at = case
        when p_success then available_at
        else now() + make_interval(secs => least(3600, (30 * power(2, least(greatest(attempts - 1, 0), 7)))::integer))
      end,
      last_error = case when p_success then null else left(coalesce(p_error, 'Delivery failed'), 500) end
  where id = p_id and status = 'processing';
end;
$$;

revoke all on function public.claim_member_email_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_member_email_outbox(integer) to service_role;
revoke all on function public.finish_member_email_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_member_email_outbox(uuid, boolean, text) to service_role;

create or replace function public.merge_profile_notification_prefs(
  p_profile_id uuid,
  p_patch jsonb
) returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $$
  update public.profiles
  set notification_prefs = coalesce(notification_prefs, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)
  where id = p_profile_id
  returning notification_prefs;
$$;

create or replace function public.record_dashboard_visit(
  p_profile_id uuid,
  p_session_id text
) returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_prefs jsonb;
  v_count integer;
begin
  select coalesce(notification_prefs, '{}'::jsonb)
    into v_prefs
    from public.profiles
    where id = p_profile_id
    for update;
  if not found then return null; end if;

  v_count := coalesce(nullif(v_prefs->>'dashboardLoginCount', '')::integer, 0);
  if v_prefs->>'lastDashboardSession' is distinct from p_session_id then
    v_count := v_count + 1;
    v_prefs := jsonb_set(v_prefs, '{dashboardLoginCount}', to_jsonb(v_count), true);
    v_prefs := jsonb_set(v_prefs, '{lastDashboardSession}', to_jsonb(p_session_id), true);
    update public.profiles set notification_prefs = v_prefs where id = p_profile_id;
  end if;
  return v_count;
end;
$$;

revoke all on function public.merge_profile_notification_prefs(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.merge_profile_notification_prefs(uuid, jsonb) to service_role;
revoke all on function public.record_dashboard_visit(uuid, text) from public, anon, authenticated;
grant execute on function public.record_dashboard_visit(uuid, text) to service_role;

create or replace function public.save_awardee_onboarding_progress(
  p_profile_id uuid,
  p_welcome_read boolean default false,
  p_external_share_confirmed boolean default null,
  p_external_share_platform text default null
) returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_external_share_platform is not null and p_external_share_platform not in ('linkedin', 'facebook', 'instagram', 'other') then
    raise exception 'Invalid share platform';
  end if;
  insert into public.awardee_onboarding_progress (
    profile_id, welcome_read_at, external_share_confirmed_at, external_share_platform, updated_at
  ) values (
    p_profile_id,
    case when p_welcome_read then now() else null end,
    case when p_external_share_confirmed is true then now() else null end,
    case when p_external_share_confirmed is true then coalesce(p_external_share_platform, 'other') else null end,
    now()
  )
  on conflict (profile_id) do update set
    welcome_read_at = case when p_welcome_read then coalesce(awardee_onboarding_progress.welcome_read_at, now()) else awardee_onboarding_progress.welcome_read_at end,
    external_share_confirmed_at = case
      when p_external_share_confirmed is true then coalesce(awardee_onboarding_progress.external_share_confirmed_at, now())
      when p_external_share_confirmed is false then null
      else awardee_onboarding_progress.external_share_confirmed_at
    end,
    external_share_platform = case
      when p_external_share_confirmed is true then coalesce(p_external_share_platform, awardee_onboarding_progress.external_share_platform, 'other')
      when p_external_share_confirmed is false then null
      else awardee_onboarding_progress.external_share_platform
    end,
    updated_at = now();
end;
$$;

revoke all on function public.save_awardee_onboarding_progress(uuid, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.save_awardee_onboarding_progress(uuid, boolean, boolean, text) to service_role;

-- Search by arbitrary name fragments remains index-backed as future cohorts grow.
create extension if not exists pg_trgm;
create index if not exists awardees_unclaimed_name_trgm_idx
  on public.awardees using gin (name gin_trgm_ops)
  where profile_id is null;
