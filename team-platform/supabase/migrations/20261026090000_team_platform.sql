-- ============================================================================
-- team.top100afl.com — Team Management Platform
-- Migration 20261026090000_team_platform.sql
--
-- Additive only. References public.awardees, public.profiles, public.award_orders
-- and public.award_payment_attempts as the awardee / payment sources of truth.
-- It never rewrites those records.
--
-- Roles: super_admin | team_leader | agent
-- Money: integer minor units + explicit currency. No floating point.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.team_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.team_one_of(p_value text, p_allowed text[])
returns boolean
language sql immutable
as $$ select p_value = any(p_allowed) $$;

-- ---------------------------------------------------------------------------
-- 1. Teams, memberships and settings
-- ---------------------------------------------------------------------------

create table if not exists public.team_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('super_admin', 'team_leader', 'agent')),
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  phone text,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_memberships_team_email_uidx
  on public.team_memberships (team_id, lower(email));
create unique index if not exists team_memberships_user_uidx
  on public.team_memberships (user_id) where user_id is not null;
create index if not exists team_memberships_team_status_idx
  on public.team_memberships (team_id, status, role);

drop trigger if exists team_memberships_touch on public.team_memberships;
create trigger team_memberships_touch before update on public.team_memberships
  for each row execute function public.team_touch_updated_at();

create table if not exists public.team_settings (
  team_id uuid primary key references public.team_teams(id) on delete cascade,
  assignment_strategy text not null default 'least_loaded'
    check (assignment_strategy in ('least_loaded', 'round_robin')),
  -- The gate is for the admin-triggered assignment run. It defaults to on so a
  -- freshly provisioned team can distribute its first batch immediately, and
  -- an administrator can pause distribution at any time.
  auto_assign_enabled boolean not null default true,
  default_country text not null default 'Nigeria',
  -- max = 0 means "no administrator-configured maximum".
  withdrawal_min_minor bigint not null default 0 check (withdrawal_min_minor >= 0),
  withdrawal_max_minor bigint not null default 0 check (withdrawal_max_minor >= 0),
  commission_hold_hours integer not null default 0 check (commission_hold_hours between 0 and 2160),
  sender_name text not null default 'Top100 Africa Future Leaders',
  sender_email text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint team_settings_withdrawal_bounds check (
    withdrawal_max_minor = 0 or withdrawal_max_minor >= withdrawal_min_minor
  )
);

-- ---------------------------------------------------------------------------
-- 2. Awardee campaign records
--
-- This is a campaign projection, not a second awardee identity or a second
-- payment ledger. public_awardee_id / profile_id link back to the public
-- awardee record; payment_status is only written by verified payment
-- functions or the award_orders sync trigger below.
-- ---------------------------------------------------------------------------

create table if not exists public.team_awardees (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  external_key text,
  public_awardee_id uuid references public.awardees(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  phone text,
  country text,
  state text,
  city text,
  address text,
  notes text,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded')),
  payment_currency text check (payment_currency is null or payment_currency in ('NGN', 'USD')),
  payment_amount_minor bigint check (payment_amount_minor is null or payment_amount_minor >= 0),
  paid_at timestamptz,
  payment_source_type text check (payment_source_type is null or payment_source_type in ('award_order')),
  payment_source_id uuid,
  payment_verified_at timestamptz,
  payment_verified_by uuid references auth.users(id) on delete set null,
  payment_note text,
  contact_status text not null default 'not_contacted'
    check (contact_status in ('not_contacted', 'contacted', 'responded')),
  last_contacted_at timestamptz,
  last_contact_channel text,
  next_followup_at date,
  followup_status text not null default 'none'
    check (followup_status in ('none', 'scheduled', 'due', 'overdue', 'completed')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_awardees_external_key_uidx
  on public.team_awardees (team_id, external_key) where external_key is not null and external_key <> '';
create unique index if not exists team_awardees_email_uidx
  on public.team_awardees (team_id, lower(email)) where email is not null and email <> '';
create index if not exists team_awardees_team_payment_idx
  on public.team_awardees (team_id, payment_status, is_active);
create index if not exists team_awardees_team_country_idx
  on public.team_awardees (team_id, country);
create index if not exists team_awardees_next_followup_idx
  on public.team_awardees (team_id, next_followup_at) where next_followup_at is not null;
create index if not exists team_awardees_public_id_idx
  on public.team_awardees (public_awardee_id) where public_awardee_id is not null;
create index if not exists team_awardees_profile_id_idx
  on public.team_awardees (profile_id) where profile_id is not null;

drop trigger if exists team_awardees_touch on public.team_awardees;
create trigger team_awardees_touch before update on public.team_awardees
  for each row execute function public.team_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Assignments (one active owner per awardee)
-- ---------------------------------------------------------------------------

create table if not exists public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  awardee_id uuid not null references public.team_awardees(id) on delete cascade,
  agent_id uuid not null references public.team_memberships(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'reassigned', 'removed')),
  assignment_strategy text,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references auth.users(id) on delete set null,
  end_reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists team_assignments_one_active_uidx
  on public.team_assignments (awardee_id) where status = 'active';
create index if not exists team_assignments_agent_idx
  on public.team_assignments (team_id, agent_id, status);
create index if not exists team_assignments_awardee_idx
  on public.team_assignments (awardee_id, assigned_at desc);

-- ---------------------------------------------------------------------------
-- 4. Follow-up activity
-- ---------------------------------------------------------------------------

create table if not exists public.team_followups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  assignment_id uuid references public.team_assignments(id) on delete set null,
  awardee_id uuid not null references public.team_awardees(id) on delete cascade,
  agent_id uuid not null references public.team_memberships(id) on delete restrict,
  channel text not null check (channel in ('call', 'whatsapp', 'email')),
  outcome text not null check (outcome in (
    'no_answer', 'number_unavailable', 'message_sent', 'awaiting_response',
    'interested', 'payment_reported', 'payment_verified', 'not_interested',
    'followup_scheduled', 'email_sent', 'email_failed', 'other'
  )),
  notes text,
  responded boolean not null default false,
  payment_expected boolean not null default false,
  contacted_at timestamptz not null default now(),
  next_followup_at date,
  email_log_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists team_followups_awardee_idx
  on public.team_followups (awardee_id, contacted_at desc);
create index if not exists team_followups_agent_idx
  on public.team_followups (team_id, agent_id, contacted_at desc);
create index if not exists team_followups_next_idx
  on public.team_followups (team_id, next_followup_at) where next_followup_at is not null;

create or replace function public.team_followup_sync_awardee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team_awardees
  set last_contacted_at = greatest(coalesce(last_contacted_at, to_timestamp(0)), new.contacted_at),
      last_contact_channel = new.channel,
      contact_status = case
        when new.responded then 'responded'
        when contact_status = 'responded' then 'responded'
        else 'contacted'
      end,
      next_followup_at = new.next_followup_at,
      followup_status = case
        when new.next_followup_at is null then 'completed'
        when new.next_followup_at < current_date then 'overdue'
        when new.next_followup_at = current_date then 'due'
        else 'scheduled'
      end
  where id = new.awardee_id;
  return new;
end;
$$;

drop trigger if exists team_followups_sync on public.team_followups;
create trigger team_followups_sync after insert on public.team_followups
  for each row execute function public.team_followup_sync_awardee();

-- Refresh follow-up due state cheaply whenever the table is read by a route
-- that asks for it (also called by the daily cron endpoint).
create or replace function public.team_refresh_followup_states(p_team_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.team_awardees
  set followup_status = case
    when next_followup_at is null then followup_status
    when next_followup_at < current_date then 'overdue'
    when next_followup_at = current_date then 'due'
    else 'scheduled'
  end
  where team_id = p_team_id
    and next_followup_at is not null
    and followup_status in ('scheduled', 'due', 'overdue');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Templates, email log, notifications, audit
-- ---------------------------------------------------------------------------

create table if not exists public.team_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email')),
  name text not null,
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists team_templates_name_uidx
  on public.team_templates (team_id, channel, lower(name));

drop trigger if exists team_templates_touch on public.team_templates;
create trigger team_templates_touch before update on public.team_templates
  for each row execute function public.team_touch_updated_at();

create table if not exists public.team_email_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  awardee_id uuid not null references public.team_awardees(id) on delete cascade,
  agent_id uuid not null references public.team_memberships(id) on delete restrict,
  template_id uuid references public.team_templates(id) on delete set null,
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  provider_response jsonb,
  error text,
  idempotency_key text not null,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists team_email_logs_idempotency_uidx
  on public.team_email_logs (team_id, idempotency_key);
create index if not exists team_email_logs_agent_idx
  on public.team_email_logs (team_id, agent_id, attempted_at desc);
create index if not exists team_email_logs_awardee_idx
  on public.team_email_logs (awardee_id, attempted_at desc);

create table if not exists public.team_notifications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid references public.team_memberships(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists team_notifications_user_idx
  on public.team_notifications (user_id, read_at, created_at desc);

create table if not exists public.team_audit_logs (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.team_teams(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_membership_id uuid references public.team_memberships(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists team_audit_logs_team_idx
  on public.team_audit_logs (team_id, created_at desc);
create index if not exists team_audit_logs_actor_idx
  on public.team_audit_logs (actor_user_id, created_at desc);

create or replace function public.team_audit(
  p_team_id uuid,
  p_actor_user_id uuid,
  p_actor_membership_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_audit_logs (
    team_id, actor_user_id, actor_membership_id, action, entity_type, entity_id, metadata
  ) values (
    p_team_id, p_actor_user_id, p_actor_membership_id, p_action, p_entity_type, p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.team_notify(
  p_team_id uuid,
  p_user_id uuid,
  p_membership_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_user_id is null then return null; end if;
  insert into public.team_notifications (team_id, user_id, membership_id, type, title, body, link)
  values (p_team_id, p_user_id, p_membership_id, p_type, p_title, p_body, p_link)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.team_notify_admins(
  p_team_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.team_memberships%rowtype; v_count integer := 0;
begin
  for v_row in
    select * from public.team_memberships
    where team_id = p_team_id and role = 'super_admin' and status = 'active' and user_id is not null
  loop
    perform public.team_notify(p_team_id, v_row.user_id, v_row.id, p_type, p_title, p_body, p_link);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Commission rules and ledger
-- ---------------------------------------------------------------------------

create table if not exists public.team_commission_rules (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  name text not null,
  payment_currency text not null check (payment_currency in ('NGN', 'USD')),
  commission_currency text not null default 'NGN' check (commission_currency in ('NGN', 'USD')),
  commission_amount_minor bigint not null check (commission_amount_minor > 0),
  country_scope text,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_commission_rules_team_idx
  on public.team_commission_rules (team_id, is_active, priority desc);

drop trigger if exists team_commission_rules_touch on public.team_commission_rules;
create trigger team_commission_rules_touch before update on public.team_commission_rules
  for each row execute function public.team_touch_updated_at();

create table if not exists public.team_commission_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  awardee_id uuid not null references public.team_awardees(id) on delete restrict,
  agent_id uuid not null references public.team_memberships(id) on delete restrict,
  rule_id uuid references public.team_commission_rules(id) on delete set null,
  entry_type text not null default 'earning' check (entry_type in ('earning', 'adjustment', 'reversal')),
  parent_commission_id uuid references public.team_commission_entries(id) on delete restrict,
  payment_type text not null default 'award_order',
  payment_id uuid not null,
  payment_currency text not null check (payment_currency in ('NGN', 'USD')),
  amount_minor bigint not null,
  currency text not null check (currency in ('NGN', 'USD')),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed')),
  available_at timestamptz not null default now(),
  earned_at timestamptz not null default now(),
  reason text,
  rule_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists team_commission_one_earning_uidx
  on public.team_commission_entries (team_id, payment_type, payment_id)
  where entry_type = 'earning';
create unique index if not exists team_commission_one_reversal_uidx
  on public.team_commission_entries (parent_commission_id)
  where entry_type = 'reversal';
create index if not exists team_commission_agent_idx
  on public.team_commission_entries (team_id, agent_id, currency, status, available_at);
create index if not exists team_commission_awardee_idx
  on public.team_commission_entries (awardee_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. Withdrawals and payouts
-- ---------------------------------------------------------------------------

create table if not exists public.team_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  agent_id uuid not null references public.team_memberships(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  settled_amount_minor bigint check (settled_amount_minor is null or settled_amount_minor >= 0),
  currency text not null default 'NGN' check (currency in ('NGN', 'USD')),
  payout_method text not null check (payout_method in ('bank_transfer', 'paystack', 'other')),
  payout_details jsonb not null,
  status text not null default 'requested' check (status in (
    'requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'cancelled'
  )),
  idempotency_key text not null,
  request_note text,
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists team_withdrawals_idempotency_uidx
  on public.team_withdrawal_requests (team_id, idempotency_key);
create index if not exists team_withdrawals_agent_idx
  on public.team_withdrawal_requests (team_id, agent_id, status, created_at desc);
create index if not exists team_withdrawals_status_idx
  on public.team_withdrawal_requests (team_id, status, created_at);

drop trigger if exists team_withdrawals_touch on public.team_withdrawal_requests;
create trigger team_withdrawals_touch before update on public.team_withdrawal_requests
  for each row execute function public.team_touch_updated_at();

create table if not exists public.team_withdrawal_payouts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.team_withdrawal_requests(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency in ('NGN', 'USD')),
  transaction_reference text not null,
  paid_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. Import jobs
-- ---------------------------------------------------------------------------

create table if not exists public.team_import_jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  filename text not null,
  file_sha256 text,
  status text not null default 'previewed' check (status in ('previewed', 'committed', 'failed')),
  mapping jsonb not null default '{}'::jsonb,
  -- Raw spreadsheet rows are kept so an administrator can remap a column
  -- without uploading the file again. They are never used for commit directly.
  raw_rows jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);
create index if not exists team_import_jobs_team_idx
  on public.team_import_jobs (team_id, created_at desc);

create table if not exists public.team_import_changes (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.team_import_jobs(id) on delete cascade,
  awardee_id uuid not null,
  action text not null check (action in ('insert', 'update')),
  before_row jsonb,
  after_row jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists team_import_changes_job_idx
  on public.team_import_changes (job_id);

-- ---------------------------------------------------------------------------
-- 9. Role helpers + balance
-- ---------------------------------------------------------------------------

create or replace function public.team_assert_admin(p_team_id uuid, p_actor uuid)
returns public.team_memberships
language plpgsql stable security definer
set search_path = public
as $$
declare v_m public.team_memberships%rowtype;
begin
  select * into v_m from public.team_memberships
  where team_id = p_team_id and user_id = p_actor and status = 'active' and role = 'super_admin';
  if not found then
    raise exception using errcode = '42501', message = 'administrator access required';
  end if;
  return v_m;
end;
$$;

create or replace function public.team_assert_staff(p_team_id uuid, p_actor uuid)
returns public.team_memberships
language plpgsql stable security definer
set search_path = public
as $$
declare v_m public.team_memberships%rowtype;
begin
  select * into v_m from public.team_memberships
  where team_id = p_team_id and user_id = p_actor and status = 'active'
    and role in ('super_admin', 'team_leader');
  if not found then
    raise exception using errcode = '42501', message = 'team staff access required';
  end if;
  return v_m;
end;
$$;

create or replace function public.team_agent_balance(
  p_team_id uuid,
  p_agent_id uuid,
  p_currency text default 'NGN'
)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_confirmed bigint := 0;
  v_available_now bigint := 0;
  v_pending bigint := 0;
  v_reserved bigint := 0;
  v_paid bigint := 0;
  v_total_earned bigint := 0;
begin
  select
    coalesce(sum(case when e.status = 'confirmed' then e.amount_minor else 0 end), 0),
    coalesce(sum(case when e.status = 'confirmed' and e.available_at <= now() then e.amount_minor else 0 end), 0),
    coalesce(sum(case when e.status = 'pending' or (e.status = 'confirmed' and e.available_at > now()) then e.amount_minor else 0 end), 0)
  into v_confirmed, v_available_now, v_pending
  from public.team_commission_entries e
  where e.team_id = p_team_id and e.agent_id = p_agent_id and e.currency = p_currency;

  select
    coalesce(sum(case when w.status = 'paid' then coalesce(w.settled_amount_minor, w.amount_minor) else w.amount_minor end), 0),
    coalesce(sum(case when w.status = 'paid' then coalesce(w.settled_amount_minor, w.amount_minor) else 0 end), 0)
  into v_reserved, v_paid
  from public.team_withdrawal_requests w
  where w.team_id = p_team_id and w.agent_id = p_agent_id and w.currency = p_currency
    and w.status in ('requested', 'under_review', 'approved', 'processing', 'paid');

  v_total_earned := v_confirmed + v_pending;
  return jsonb_build_object(
    'currency', p_currency,
    'confirmed_earned_minor', v_confirmed,
    'available_balance_minor', v_available_now - v_reserved,
    'pending_commission_minor', v_pending,
    'pending_withdrawal_minor', v_reserved - v_paid,
    'withdrawn_minor', v_paid,
    'total_earned_minor', v_total_earned,
    'withdrawable_minor', greatest(v_available_now - v_reserved, 0)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Verified payment application (commission creation)
-- ---------------------------------------------------------------------------

create or replace function public.team_apply_verified_payment(
  p_team_id uuid,
  p_awardee_id uuid,
  p_payment_type text,
  p_payment_id uuid,
  p_payment_currency text,
  p_payment_amount_minor bigint,
  p_paid_at timestamptz,
  p_actor uuid default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_awardee public.team_awardees%rowtype;
  v_assignment public.team_assignments%rowtype;
  v_rule public.team_commission_rules%rowtype;
  v_entry public.team_commission_entries%rowtype;
  v_settings public.team_settings%rowtype;
  v_currency text := upper(coalesce(p_payment_currency, 'NGN'));
  v_paid_at timestamptz := coalesce(p_paid_at, now());
  v_available_at timestamptz;
  v_agent_user uuid;
begin
  if p_team_id is null or p_awardee_id is null or p_payment_id is null then
    raise exception using errcode = '22023', message = 'team, awardee and payment IDs are required';
  end if;
  if p_payment_type <> 'award_order' then
    raise exception using errcode = '22023', message = 'unsupported payment source';
  end if;
  if v_currency not in ('NGN', 'USD') then
    raise exception using errcode = '22023', message = 'unsupported payment currency';
  end if;

  select * into v_awardee from public.team_awardees
  where id = p_awardee_id and team_id = p_team_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'awardee not found in this team';
  end if;

  update public.team_awardees
  set payment_status = 'paid',
      payment_currency = v_currency,
      payment_amount_minor = greatest(coalesce(p_payment_amount_minor, 0), 0),
      paid_at = v_paid_at,
      payment_source_type = p_payment_type,
      payment_source_id = p_payment_id,
      payment_verified_at = now(),
      payment_note = null
  where id = p_awardee_id;

  -- Exactly one earning per verified payment, enforced by a partial unique
  -- index. Re-running reconciliation is therefore safe.
  select * into v_entry from public.team_commission_entries
  where team_id = p_team_id and payment_type = p_payment_type
    and payment_id = p_payment_id and entry_type = 'earning';

  if found then
    return jsonb_build_object('outcome', 'already_earned', 'commission_id', v_entry.id);
  end if;

  select * into v_assignment from public.team_assignments
  where awardee_id = p_awardee_id and status = 'active';
  if not found then
    perform public.team_audit(p_team_id, p_actor, null, 'payment.verified_unassigned', 'award_order', p_payment_id::text,
      jsonb_build_object('awardee_id', p_awardee_id, 'amount_minor', p_payment_amount_minor, 'currency', v_currency));
    return jsonb_build_object('outcome', 'paid_without_assignment', 'commission_id', null);
  end if;

  select * into v_rule from public.team_commission_rules r
  where r.team_id = p_team_id and r.is_active
    and r.payment_currency = v_currency
    and (r.country_scope is null or upper(r.country_scope) = upper(coalesce(v_awardee.country, '')))
  order by
    case when r.country_scope is null then 1 else 0 end,
    r.priority desc, r.created_at asc
  limit 1;

  if not found then
    perform public.team_audit(p_team_id, p_actor, null, 'payment.no_commission_rule', 'award_order', p_payment_id::text,
      jsonb_build_object('awardee_id', p_awardee_id, 'payment_currency', v_currency));
    return jsonb_build_object('outcome', 'paid_without_rule', 'commission_id', null);
  end if;

  select * into v_settings from public.team_settings where team_id = p_team_id;
  v_available_at := v_paid_at + make_interval(hours => coalesce(v_settings.commission_hold_hours, 0));

  insert into public.team_commission_entries (
    team_id, awardee_id, agent_id, rule_id, entry_type, payment_type, payment_id,
    payment_currency, amount_minor, currency, status, available_at, earned_at,
    rule_snapshot, created_by
  ) values (
    p_team_id, p_awardee_id, v_assignment.agent_id, v_rule.id, 'earning', p_payment_type, p_payment_id,
    v_currency, v_rule.commission_amount_minor, v_rule.commission_currency,
    case when v_available_at <= now() then 'confirmed' else 'pending' end,
    v_available_at, v_paid_at,
    jsonb_build_object(
      'rule_id', v_rule.id, 'rule_name', v_rule.name,
      'commission_amount_minor', v_rule.commission_amount_minor,
      'commission_currency', v_rule.commission_currency,
      'payment_currency', v_currency, 'payment_amount_minor', p_payment_amount_minor,
      'country_scope', v_rule.country_scope
    ),
    p_actor
  ) returning * into v_entry;

  select user_id into v_agent_user from public.team_memberships where id = v_assignment.agent_id;
  if v_agent_user is not null then
    perform public.team_notify(
      p_team_id, v_agent_user, v_assignment.agent_id, 'commission_earned',
      'Commission earned',
      'A verified award payment generated a commission.',
      '/earnings'
    );
  end if;

  perform public.team_audit(p_team_id, p_actor, null, 'commission.created', 'commission_entry', v_entry.id::text,
    jsonb_build_object(
      'awardee_id', p_awardee_id, 'agent_id', v_assignment.agent_id,
      'payment_id', p_payment_id, 'amount_minor', v_rule.commission_amount_minor,
      'currency', v_rule.commission_currency
    ));

  return jsonb_build_object(
    'outcome', 'commission_created', 'commission_id', v_entry.id,
    'agent_id', v_assignment.agent_id, 'amount_minor', v_rule.commission_amount_minor,
    'currency', v_rule.commission_currency
  );
end;
$$;

create or replace function public.team_reverse_verified_payment(
  p_team_id uuid,
  p_awardee_id uuid,
  p_payment_type text,
  p_payment_id uuid,
  p_reason text,
  p_actor uuid default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_earning public.team_commission_entries%rowtype;
  v_reversal public.team_commission_entries%rowtype;
  v_agent_user uuid;
begin
  update public.team_awardees
  set payment_status = 'refunded', payment_note = left(coalesce(p_reason, 'Payment reversed'), 500)
  where id = p_awardee_id and team_id = p_team_id;

  select * into v_earning from public.team_commission_entries
  where team_id = p_team_id and payment_type = p_payment_type
    and payment_id = p_payment_id and entry_type = 'earning';

  if not found then
    perform public.team_audit(p_team_id, p_actor, null, 'payment.reversed_without_commission', 'award_order', p_payment_id::text,
      jsonb_build_object('awardee_id', p_awardee_id, 'reason', p_reason));
    return jsonb_build_object('outcome', 'reversed_without_commission');
  end if;

  select * into v_reversal from public.team_commission_entries where parent_commission_id = v_earning.id;
  if found then
    return jsonb_build_object('outcome', 'already_reversed', 'reversal_id', v_reversal.id);
  end if;

  insert into public.team_commission_entries (
    team_id, awardee_id, agent_id, rule_id, entry_type, parent_commission_id,
    payment_type, payment_id, payment_currency, amount_minor, currency, status,
    available_at, earned_at, reason, rule_snapshot, created_by
  ) values (
    p_team_id, v_earning.awardee_id, v_earning.agent_id, v_earning.rule_id, 'reversal', v_earning.id,
    p_payment_type, p_payment_id, v_earning.payment_currency, -v_earning.amount_minor, v_earning.currency, 'confirmed',
    now(), now(), left(coalesce(p_reason, 'Payment reversed'), 500), v_earning.rule_snapshot, p_actor
  ) returning * into v_reversal;

  select user_id into v_agent_user from public.team_memberships where id = v_earning.agent_id;
  if v_agent_user is not null then
    perform public.team_notify(
      p_team_id, v_agent_user, v_earning.agent_id, 'commission_reversed',
      'Commission reversed',
      coalesce(p_reason, 'A previously verified payment was reversed.'),
      '/earnings'
    );
  end if;

  perform public.team_audit(p_team_id, p_actor, null, 'commission.reversed', 'commission_entry', v_reversal.id::text,
    jsonb_build_object('earning_id', v_earning.id, 'amount_minor', -v_earning.amount_minor, 'reason', p_reason));

  return jsonb_build_object('outcome', 'reversed', 'reversal_id', v_reversal.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. award_orders sync trigger (payment source of truth)
--
-- Exception-safe: a team-platform problem must never break the public award
-- payment flow.
-- ---------------------------------------------------------------------------

create or replace function public.team_sync_award_order_payment()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_awardee public.team_awardees%rowtype;
  v_currency text := 'NGN';
  v_amount bigint;
  v_paid_at timestamptz;
begin
  select ta.* into v_awardee
  from public.team_awardees ta
  where ta.is_active
    and (
      (new.awardee_id is not null and ta.public_awardee_id = new.awardee_id)
      or (ta.profile_id is not null and ta.profile_id = new.profile_id)
      or (ta.public_awardee_id is not null and ta.public_awardee_id in (
        select a.id from public.awardees a where a.profile_id = new.profile_id
      ))
    )
  order by ta.created_at asc
  limit 1;

  if not found then
    return new;
  end if;

  if new.award_payment_status = 'paid' then
    if new.award_paid_attempt_id is not null then
      select upper(a.currency), coalesce(a.captured_amount_minor, a.requested_amount_minor)
      into v_currency, v_amount
      from public.award_payment_attempts a
      where a.id = new.award_paid_attempt_id;
    end if;
    v_amount := coalesce(v_amount, new.award_amount_kobo, 0);
    v_paid_at := coalesce(new.award_paid_at, new.paid_at, now());
    perform public.team_apply_verified_payment(
      v_awardee.team_id, v_awardee.id, 'award_order', new.id,
      v_currency, v_amount, v_paid_at, null
    );
  elsif new.award_payment_status = 'pending' then
    update public.team_awardees
    set payment_status = 'pending',
        payment_currency = coalesce(v_currency, payment_currency)
    where id = v_awardee.id and payment_status = 'unpaid';
  elsif new.award_payment_status = 'refunded' then
    perform public.team_reverse_verified_payment(
      v_awardee.team_id, v_awardee.id, 'award_order', new.id,
      'Award payment was refunded.', null
    );
  elsif new.award_payment_status = 'failed' then
    update public.team_awardees set payment_status = 'unpaid'
    where id = v_awardee.id and payment_status = 'pending';
  end if;

  return new;
exception when others then
  raise warning 'team platform award payment sync skipped for order %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists team_sync_award_order_payment on public.award_orders;
create trigger team_sync_award_order_payment
  after update of award_payment_status on public.award_orders
  for each row execute function public.team_sync_award_order_payment();

-- ---------------------------------------------------------------------------
-- 12. Reconciliation
-- ---------------------------------------------------------------------------

create or replace function public.team_reconcile_payments(
  p_team_id uuid,
  p_actor uuid,
  p_limit integer default 500
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_order record;
  v_awardee public.team_awardees%rowtype;
  v_currency text;
  v_amount bigint;
  v_created integer := 0;
  v_already integer := 0;
  v_no_rule integer := 0;
  v_unassigned integer := 0;
  v_scanned integer := 0;
  v_result jsonb;
begin
  perform public.team_assert_admin(p_team_id, p_actor);

  for v_order in
    select o.*
    from public.award_orders o
    where o.award_payment_status = 'paid'
      and exists (
        select 1 from public.team_awardees ta
        where ta.team_id = p_team_id and (
          (o.awardee_id is not null and ta.public_awardee_id = o.awardee_id)
          or (ta.profile_id is not null and ta.profile_id = o.profile_id)
        )
      )
      and not exists (
        select 1 from public.team_commission_entries e
        where e.team_id = p_team_id and e.payment_type = 'award_order'
          and e.payment_id = o.id and e.entry_type = 'earning'
      )
    order by coalesce(o.award_paid_at, o.created_at) asc
    limit least(greatest(coalesce(p_limit, 500), 1), 2000)
  loop
    v_scanned := v_scanned + 1;
    select ta.* into v_awardee from public.team_awardees ta
    where ta.team_id = p_team_id and (
      (v_order.awardee_id is not null and ta.public_awardee_id = v_order.awardee_id)
      or (ta.profile_id is not null and ta.profile_id = v_order.profile_id)
    ) order by ta.created_at asc limit 1;

    if found then
      v_currency := 'NGN'; v_amount := coalesce(v_order.award_amount_kobo, 0);
      if v_order.award_paid_attempt_id is not null then
        select upper(a.currency), coalesce(a.captured_amount_minor, a.requested_amount_minor)
        into v_currency, v_amount
        from public.award_payment_attempts a where a.id = v_order.award_paid_attempt_id;
      end if;
      v_result := public.team_apply_verified_payment(
        p_team_id, v_awardee.id, 'award_order', v_order.id,
        coalesce(v_currency, 'NGN'), coalesce(v_amount, 0),
        coalesce(v_order.award_paid_at, v_order.paid_at, v_order.created_at, now()), p_actor
      );
      case v_result->>'outcome'
        when 'commission_created' then v_created := v_created + 1;
        when 'already_earned' then v_already := v_already + 1;
        when 'paid_without_rule' then v_no_rule := v_no_rule + 1;
        when 'paid_without_assignment' then v_unassigned := v_unassigned + 1;
        else null;
      end case;
    end if;
  end loop;

  perform public.team_audit(p_team_id, p_actor, null, 'payments.reconciled', 'team', p_team_id::text,
    jsonb_build_object('scanned', v_scanned, 'created', v_created, 'no_rule', v_no_rule, 'unassigned', v_unassigned));

  return jsonb_build_object(
    'scanned', v_scanned, 'commissions_created', v_created,
    'already_reconciled', v_already, 'paid_without_rule', v_no_rule,
    'paid_without_assignment', v_unassigned
  );
end;
$$;

-- Paid order rows linked to campaign awardees but missing a commission, plus
-- the reverse drift check. Read by the admin reconciliation view.
create or replace view public.team_payment_reconciliation as
select
  ta.team_id,
  o.id as award_order_id,
  o.profile_id,
  ta.id as awardee_id,
  ta.name as awardee_name,
  o.award_payment_status,
  o.award_paid_at,
  o.award_paid_attempt_id,
  o.award_amount_kobo,
  a.currency as payment_currency,
  coalesce(a.captured_amount_minor, a.requested_amount_minor, o.award_amount_kobo) as payment_amount_minor,
  e.id as commission_id,
  e.amount_minor as commission_amount_minor,
  e.currency as commission_currency,
  case
    when o.award_payment_status = 'paid' and e.id is null then 'missing_commission'
    when o.award_payment_status = 'paid' and e.id is not null then 'reconciled'
    when o.award_payment_status = 'refunded' and e.id is not null and not exists (
      select 1 from public.team_commission_entries r where r.parent_commission_id = e.id
    ) then 'missing_reversal'
    else 'informational'
  end as reconciliation_state
from public.team_awardees ta
join public.award_orders o on (
  (o.awardee_id is not null and ta.public_awardee_id = o.awardee_id)
  or (ta.profile_id is not null and ta.profile_id = o.profile_id)
)
left join public.award_payment_attempts a on a.id = o.award_paid_attempt_id
left join public.team_commission_entries e on e.team_id = ta.team_id
  and e.payment_type = 'award_order' and e.payment_id = o.id and e.entry_type = 'earning';

-- ---------------------------------------------------------------------------
-- 13. Fair assignment engine
-- ---------------------------------------------------------------------------

create or replace function public.team_auto_assign(
  p_team_id uuid,
  p_actor uuid,
  p_limit integer default 1000,
  p_country text default 'Nigeria',
  p_include_pending boolean default false
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_settings public.team_settings%rowtype;
  v_awardee record;
  v_agent public.team_memberships%rowtype;
  v_assigned integer := 0;
  v_skipped integer := 0;
  v_batch jsonb := '{}'::jsonb;
  v_agent_counts jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 5000);
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));

  select * into v_settings from public.team_settings where team_id = p_team_id;
  if not found then
    raise exception using errcode = '22023', message = 'team settings are missing';
  end if;
  if not v_settings.auto_assign_enabled then
    raise exception using errcode = '22023', message = 'automatic assignment is paused';
  end if;

  for v_awardee in
    select ta.id, ta.name
    from public.team_awardees ta
    where ta.team_id = p_team_id and ta.is_active
      and ta.payment_status in ('unpaid', case when p_include_pending then 'pending' else 'unpaid' end)
      and (p_country is null or upper(coalesce(ta.country, '')) = upper(p_country))
      and not exists (
        select 1 from public.team_assignments a where a.awardee_id = ta.id and a.status = 'active'
      )
    order by (upper(coalesce(ta.country, '')) = 'NIGERIA') desc, ta.created_at asc
    limit v_limit
  loop
    select m.* into v_agent
    from public.team_memberships m
    left join public.team_assignments a on a.agent_id = m.id and a.status = 'active'
    where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent'
    group by m.id
    order by
      count(a.id) asc,
      case when v_settings.assignment_strategy = 'round_robin' then m.last_assigned_at end asc nulls first,
      m.created_at asc
    limit 1;

    if not found then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.team_assignments (
      team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by
    ) values (
      p_team_id, v_awardee.id, v_agent.id, 'active', v_settings.assignment_strategy, p_actor
    ) on conflict (awardee_id) where status = 'active' do nothing;

    if found then
      v_assigned := v_assigned + 1;
      update public.team_memberships set last_assigned_at = now() where id = v_agent.id;
      v_batch := jsonb_set(
        v_batch, array[v_agent.id::text],
        to_jsonb(coalesce((v_batch->>v_agent.id::text)::integer, 0) + 1)
      );
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  for v_agent in
    select * from public.team_memberships where team_id = p_team_id and role = 'agent' and status = 'active'
  loop
    if coalesce((v_batch->>v_agent.id::text)::integer, 0) > 0 then
      perform public.team_notify(
        p_team_id, v_agent.user_id, v_agent.id, 'awardees_assigned',
        (v_batch->>v_agent.id::text) || ' new awardees assigned',
        'Open My Awardees to begin follow-up.',
        '/awardees'
      );
    end if;
  end loop;

  select coalesce(jsonb_object_agg(m.id, c.cnt), '{}'::jsonb) into v_agent_counts
  from public.team_memberships m
  left join (
    select agent_id, count(*)::integer as cnt from public.team_assignments
    where team_id = p_team_id and status = 'active' group by agent_id
  ) c on c.agent_id = m.id
  where m.team_id = p_team_id and m.role = 'agent' and m.status = 'active';

  perform public.team_audit(p_team_id, p_actor, null, 'assignments.auto', 'team', p_team_id::text,
    jsonb_build_object('assigned', v_assigned, 'skipped', v_skipped, 'country', p_country));

  return jsonb_build_object(
    'assigned', v_assigned, 'skipped', v_skipped,
    'country', p_country, 'agent_counts', v_agent_counts
  );
end;
$$;

create or replace function public.team_reassign_awardee(
  p_team_id uuid,
  p_actor uuid,
  p_awardee_id uuid,
  p_new_agent_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_old public.team_assignments%rowtype;
  v_new public.team_assignments%rowtype;
  v_new_agent public.team_memberships%rowtype;
  v_old_agent public.team_memberships%rowtype;
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));

  select * into v_new_agent from public.team_memberships
  where id = p_new_agent_id and team_id = p_team_id and status = 'active' and role = 'agent';
  if not found then
    raise exception using errcode = '22023', message = 'target agent is not active';
  end if;

  select * into v_old from public.team_assignments
  where awardee_id = p_awardee_id and team_id = p_team_id and status = 'active' for update;

  if found and v_old.agent_id = p_new_agent_id then
    return jsonb_build_object('outcome', 'unchanged', 'assignment_id', v_old.id);
  end if;

  if found then
    select * into v_old_agent from public.team_memberships where id = v_old.agent_id;
    update public.team_assignments
    set status = 'reassigned', ended_at = now(), ended_by = p_actor, end_reason = left(coalesce(p_reason, 'Manual reassignment'), 500)
    where id = v_old.id;
  end if;

  insert into public.team_assignments (team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by)
  values (p_team_id, p_awardee_id, p_new_agent_id, 'active', 'manual', p_actor)
  returning * into v_new;

  perform public.team_notify(p_team_id, v_new_agent.user_id, v_new_agent.id, 'awardee_assigned',
    'New awardee assigned', 'An awardee was assigned to you.', '/awardees/' || p_awardee_id);
  if v_old.id is not null and v_old_agent.user_id is not null then
    perform public.team_notify(p_team_id, v_old_agent.user_id, v_old_agent.id, 'awardee_reassigned',
      'Awardee reassigned', 'One awardee was reassigned to another agent.', '/awardees');
  end if;

  perform public.team_audit(p_team_id, p_actor, null, 'assignment.reassigned', 'awardee', p_awardee_id::text,
    jsonb_build_object('from_agent', v_old.agent_id, 'to_agent', p_new_agent_id, 'reason', p_reason));

  return jsonb_build_object('outcome', 'reassigned', 'assignment_id', v_new.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Withdrawal request + transitions
-- ---------------------------------------------------------------------------

create or replace function public.team_request_withdrawal(
  p_team_id uuid,
  p_actor uuid,
  p_amount_minor bigint,
  p_currency text,
  p_payout_method text,
  p_payout_details jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_member public.team_memberships%rowtype;
  v_settings public.team_settings%rowtype;
  v_existing public.team_withdrawal_requests%rowtype;
  v_balance jsonb;
  v_available bigint;
  v_request public.team_withdrawal_requests%rowtype;
  v_currency text := upper(coalesce(p_currency, 'NGN'));
begin
  select * into v_member from public.team_memberships
  where team_id = p_team_id and user_id = p_actor and status = 'active';
  if not found then
    raise exception using errcode = '42501', message = 'active team membership required';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception using errcode = '22023', message = 'withdrawal amount must be positive';
  end if;
  if v_currency not in ('NGN', 'USD') then
    raise exception using errcode = '22023', message = 'unsupported currency';
  end if;
  if p_payout_method not in ('bank_transfer', 'paystack', 'other') then
    raise exception using errcode = '22023', message = 'unsupported payout method';
  end if;
  if p_payout_details is null or jsonb_typeof(p_payout_details) <> 'object' then
    raise exception using errcode = '22023', message = 'payout details are required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('team-withdraw:' || p_team_id::text || ':' || v_member.id::text || ':' || v_currency, 0)
  );

  select * into v_existing from public.team_withdrawal_requests
  where team_id = p_team_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('outcome', 'existing', 'request_id', v_existing.id, 'status', v_existing.status);
  end if;

  select * into v_settings from public.team_settings where team_id = p_team_id;
  v_balance := public.team_agent_balance(p_team_id, v_member.id, v_currency);
  v_available := (v_balance->>'withdrawable_minor')::bigint;

  if p_amount_minor < coalesce(v_settings.withdrawal_min_minor, 0) then
    raise exception using errcode = '22023', message = 'amount is below the minimum withdrawal';
  end if;
  if coalesce(v_settings.withdrawal_max_minor, 0) > 0
     and p_amount_minor > v_settings.withdrawal_max_minor then
    raise exception using errcode = '22023', message = 'amount is above the maximum withdrawal';
  end if;
  if p_amount_minor > v_available then
    raise exception using errcode = '22023', message = 'amount exceeds available balance';
  end if;

  insert into public.team_withdrawal_requests (
    team_id, agent_id, amount_minor, currency, payout_method, payout_details, status, idempotency_key
  ) values (
    p_team_id, v_member.id, p_amount_minor, v_currency, p_payout_method, p_payout_details, 'requested', p_idempotency_key
  ) returning * into v_request;

  perform public.team_notify(
    p_team_id, v_member.user_id, v_member.id, 'withdrawal_requested',
    'Withdrawal request received',
    'Your withdrawal request is awaiting review.',
    '/withdrawals'
  );
  perform public.team_notify_admins(
    p_team_id, 'withdrawal_submitted', 'Withdrawal request submitted',
    v_member.full_name || ' requested a withdrawal.', '/admin/withdrawals'
  );
  perform public.team_audit(p_team_id, p_actor, v_member.id, 'withdrawal.requested', 'withdrawal', v_request.id::text,
    jsonb_build_object('amount_minor', p_amount_minor, 'currency', v_currency, 'method', p_payout_method));

  return jsonb_build_object('outcome', 'created', 'request_id', v_request.id, 'status', 'requested');
end;
$$;

create or replace function public.team_transition_withdrawal(
  p_request_id uuid,
  p_actor uuid,
  p_action text,
  p_note text default null,
  p_reference text default null,
  p_paid_amount_minor bigint default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_request public.team_withdrawal_requests%rowtype;
  v_member public.team_memberships%rowtype;
  v_agent public.team_memberships%rowtype;
  v_allowed boolean := false;
  v_next text;
begin
  select * into v_request from public.team_withdrawal_requests where id = p_request_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'withdrawal request not found';
  end if;

  select * into v_member from public.team_memberships
  where team_id = v_request.team_id and user_id = p_actor and status = 'active';
  if not found then
    raise exception using errcode = '42501', message = 'active team membership required';
  end if;

  select * into v_agent from public.team_memberships where id = v_request.agent_id;

  -- Segregation of duties: the requester can never review, approve, process
  -- or mark their own payout paid, even when they hold super_admin.
  if p_action in ('review', 'approve', 'process', 'pay')
     and v_agent.user_id is not null
     and v_agent.user_id = v_member.user_id then
    raise exception using errcode = '42501',
      message = 'you cannot approve or pay your own withdrawal request';
  end if;

  -- Agents may only cancel their own still-unreviewed request. Every other
  -- transition requires a super admin, including a leader's own request.
  if p_action = 'cancel' and v_member.id = v_request.agent_id and v_request.status = 'requested' then
    v_allowed := true;
    v_next := 'cancelled';
  elsif v_member.role = 'super_admin' then
    v_allowed := case
      when p_action = 'review' and v_request.status = 'requested' then true
      when p_action = 'approve' and v_request.status in ('requested', 'under_review') then true
      when p_action = 'reject' and v_request.status in ('requested', 'under_review', 'approved') then true
      when p_action = 'process' and v_request.status = 'approved' then true
      when p_action = 'pay' and v_request.status in ('approved', 'processing') then true
      when p_action = 'cancel' and v_request.status in ('requested', 'under_review') then true
      else false
    end;
    v_next := case p_action
      when 'review' then 'under_review'
      when 'approve' then 'approved'
      when 'reject' then 'rejected'
      when 'process' then 'processing'
      when 'pay' then 'paid'
      when 'cancel' then 'cancelled'
    end;
  end if;

  if not v_allowed then
    raise exception using errcode = '42501', message = 'this withdrawal transition is not permitted';
  end if;

  -- Re-check solvency at approval/processing/payment. A commission reversal
  -- between request and approval must not be able to overdraw the ledger.
  if p_action in ('approve', 'process', 'pay') then
    if (public.team_agent_balance(v_request.team_id, v_request.agent_id, v_request.currency)->>'available_balance_minor')::bigint < 0 then
      raise exception using errcode = '22023', message = 'agent ledger no longer covers this withdrawal';
    end if;
  end if;

  if p_action = 'pay' then
    if nullif(trim(p_reference), '') is null then
      raise exception using errcode = '22023', message = 'a transaction reference is required to mark a withdrawal paid';
    end if;
    if p_paid_amount_minor is null or p_paid_amount_minor <= 0 or p_paid_amount_minor > v_request.amount_minor then
      raise exception using errcode = '22023', message = 'paid amount must be positive and not exceed the request';
    end if;
    insert into public.team_withdrawal_payouts (
      request_id, amount_minor, currency, transaction_reference, paid_by, paid_at, note
    ) values (
      v_request.id, p_paid_amount_minor, v_request.currency, left(trim(p_reference), 200), p_actor, now(), p_note
    );
  end if;

  update public.team_withdrawal_requests
  set status = v_next,
      settled_amount_minor = case when p_action = 'pay' then p_paid_amount_minor else settled_amount_minor end,
      admin_note = coalesce(nullif(p_note, ''), admin_note),
      reviewed_by = case when p_action = 'review' then p_actor else reviewed_by end,
      reviewed_at = case when p_action = 'review' then now() else reviewed_at end,
      approved_by = case when p_action = 'approve' then p_actor else approved_by end,
      approved_at = case when p_action = 'approve' then now() else approved_at end,
      rejected_at = case when p_action = 'reject' then now() else rejected_at end,
      paid_at = case when p_action = 'pay' then now() else paid_at end
  where id = v_request.id;

  if v_agent.user_id is not null then
    perform public.team_notify(
      v_request.team_id, v_agent.user_id, v_request.agent_id,
      'withdrawal_' || v_next,
      case v_next
        when 'under_review' then 'Withdrawal under review'
        when 'approved' then 'Withdrawal approved'
        when 'processing' then 'Withdrawal processing'
        when 'paid' then 'Withdrawal paid'
        when 'rejected' then 'Withdrawal rejected'
        when 'cancelled' then 'Withdrawal cancelled'
        else 'Withdrawal updated'
      end,
      case when v_next = 'paid'
        then 'Your payout was completed. Reference: ' || coalesce(p_reference, '')
        else 'Your withdrawal request status is now ' || replace(v_next, '_', ' ') || '.'
      end,
      '/withdrawals'
    );
  end if;

  perform public.team_audit(v_request.team_id, p_actor, v_member.id, 'withdrawal.' || p_action, 'withdrawal', v_request.id::text,
    jsonb_build_object('from_status', v_request.status, 'to_status', v_next,
      'amount_minor', v_request.amount_minor, 'paid_amount_minor', p_paid_amount_minor,
      'reference', p_reference, 'note', p_note));

  return jsonb_build_object('outcome', v_next, 'request_id', v_request.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 15. Import commit
-- ---------------------------------------------------------------------------

create or replace function public.team_commit_import(
  p_job_id uuid,
  p_actor uuid
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_job public.team_import_jobs%rowtype;
  v_row jsonb;
  v_before public.team_awardees%rowtype;
  v_after public.team_awardees%rowtype;
  v_ins integer := 0;
  v_upd integer := 0;
  v_id uuid;
begin
  select * into v_job from public.team_import_jobs where id = p_job_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'import job not found';
  end if;
  perform public.team_assert_admin(v_job.team_id, p_actor);
  if v_job.status <> 'previewed' then
    raise exception using errcode = '22023', message = 'import job has already been committed';
  end if;
  if jsonb_array_length(v_job.rows) = 0 then
    raise exception using errcode = '22023', message = 'import job has no rows';
  end if;

  for v_row in select value from jsonb_array_elements(v_job.rows) loop
    if coalesce(v_row->>'action', 'insert') = 'update' then
      select * into v_before from public.team_awardees
      where id = (v_row->>'id')::uuid and team_id = v_job.team_id for update;
      if not found then
        raise exception using errcode = '22023', message = 'an awardee changed since preview; preview the file again';
      end if;
      update public.team_awardees set
        name = coalesce(nullif(trim(v_row->>'name'), ''), name),
        email = coalesce(nullif(trim(v_row->>'email'), ''), email),
        phone = coalesce(nullif(trim(v_row->>'phone'), ''), phone),
        country = coalesce(nullif(trim(v_row->>'country'), ''), country),
        state = coalesce(nullif(trim(v_row->>'state'), ''), state),
        city = coalesce(nullif(trim(v_row->>'city'), ''), city),
        address = coalesce(nullif(trim(v_row->>'address'), ''), address),
        external_key = coalesce(nullif(trim(v_row->>'external_key'), ''), external_key),
        public_awardee_id = coalesce(public_awardee_id, nullif(v_row->>'public_awardee_id', '')::uuid),
        profile_id = coalesce(profile_id, nullif(v_row->>'profile_id', '')::uuid),
        metadata = coalesce(metadata, '{}'::jsonb) || coalesce(v_row->'metadata', '{}'::jsonb)
      where id = v_before.id
      returning * into v_after;
      v_upd := v_upd + 1;
      insert into public.team_import_changes (job_id, awardee_id, action, before_row, after_row)
      values (p_job_id, v_after.id, 'update', to_jsonb(v_before), to_jsonb(v_after));
    else
      insert into public.team_awardees (
        team_id, external_key, public_awardee_id, profile_id, name, email, phone,
        country, state, city, address, metadata
      ) values (
        v_job.team_id,
        nullif(trim(v_row->>'external_key'), ''),
        nullif(v_row->>'public_awardee_id', '')::uuid,
        nullif(v_row->>'profile_id', '')::uuid,
        trim(v_row->>'name'),
        nullif(lower(trim(v_row->>'email')), ''),
        nullif(trim(v_row->>'phone'), ''),
        nullif(trim(v_row->>'country'), ''),
        nullif(trim(v_row->>'state'), ''),
        nullif(trim(v_row->>'city'), ''),
        nullif(trim(v_row->>'address'), ''),
        coalesce(v_row->'metadata', '{}'::jsonb)
      ) returning * into v_after;
      v_ins := v_ins + 1;
      insert into public.team_import_changes (job_id, awardee_id, action, after_row)
      values (p_job_id, v_after.id, 'insert', to_jsonb(v_after));
    end if;
  end loop;

  update public.team_import_jobs
  set status = 'committed', committed_at = now(),
      summary = coalesce(summary, '{}'::jsonb) || jsonb_build_object('inserted', v_ins, 'updated', v_upd)
  where id = p_job_id;

  perform public.team_audit(v_job.team_id, p_actor, null, 'import.committed', 'import_job', p_job_id::text,
    jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'filename', v_job.filename));

  return jsonb_build_object('inserted', v_ins, 'updated', v_upd);
end;
$$;

revoke all on function public.team_commit_import(uuid, uuid) from public, anon, authenticated;
grant execute on function public.team_commit_import(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 16. Dashboard aggregates
-- ---------------------------------------------------------------------------

create or replace function public.team_agent_dashboard(
  p_team_id uuid,
  p_actor uuid,
  p_currency text default 'NGN'
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_member public.team_memberships%rowtype;
  v_balance jsonb;
  v_assigned bigint := 0;
  v_contacted bigint := 0;
  v_paid bigint := 0;
  v_pending bigint := 0;
  v_due bigint := 0;
  v_overdue bigint := 0;
  v_activity jsonb;
  v_commissions jsonb;
  v_withdrawals jsonb;
begin
  select * into v_member from public.team_memberships
  where team_id = p_team_id and user_id = p_actor and status = 'active';
  if not found then
    raise exception using errcode = '42501', message = 'active team membership required';
  end if;
  perform public.team_refresh_followup_states(p_team_id);
  v_balance := public.team_agent_balance(p_team_id, v_member.id, p_currency);

  select
    count(*),
    count(*) filter (where ta.contact_status <> 'not_contacted'),
    count(*) filter (where ta.payment_status = 'paid'),
    count(*) filter (where ta.payment_status = 'pending'),
    count(*) filter (where ta.next_followup_at = current_date),
    count(*) filter (where ta.next_followup_at < current_date)
  into v_assigned, v_contacted, v_paid, v_pending, v_due, v_overdue
  from public.team_assignments a
  join public.team_awardees ta on ta.id = a.awardee_id
  where a.team_id = p_team_id and a.agent_id = v_member.id and a.status = 'active';

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_activity from (
    select f.id, f.channel, f.outcome, f.notes, f.contacted_at, ta.name as awardee_name, ta.id as awardee_id
    from public.team_followups f
    join public.team_awardees ta on ta.id = f.awardee_id
    where f.team_id = p_team_id and f.agent_id = v_member.id
    order by f.contacted_at desc limit 6
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_commissions from (
    select e.id, e.amount_minor, e.currency, e.entry_type, e.status, e.earned_at, e.available_at,
           ta.name as awardee_name
    from public.team_commission_entries e
    join public.team_awardees ta on ta.id = e.awardee_id
    where e.team_id = p_team_id and e.agent_id = v_member.id
    order by e.created_at desc limit 6
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_withdrawals from (
    select w.id, w.amount_minor, w.settled_amount_minor, w.currency, w.status, w.created_at, w.paid_at,
           p.transaction_reference
    from public.team_withdrawal_requests w
    left join public.team_withdrawal_payouts p on p.request_id = w.id
    where w.team_id = p_team_id and w.agent_id = v_member.id
    order by w.created_at desc limit 4
  ) x;

  return jsonb_build_object(
    'role', v_member.role,
    'assigned', v_assigned,
    'contacted', v_contacted,
    'not_contacted', greatest(v_assigned - v_contacted, 0),
    'paid', v_paid,
    'unpaid', greatest(v_assigned - v_paid, 0),
    'pending_verification', v_pending,
    'due_today', v_due,
    'overdue', v_overdue,
    'conversion_rate', case when v_assigned = 0 then 0 else round((v_paid::numeric / v_assigned::numeric) * 100, 1) end,
    'balance', v_balance,
    'recent_activity', v_activity,
    'recent_commissions', v_commissions,
    'recent_withdrawals', v_withdrawals
  );
end;
$$;

create or replace function public.team_admin_dashboard(
  p_team_id uuid,
  p_actor uuid,
  p_currency text default 'NGN'
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_staff public.team_memberships%rowtype;
  v_total bigint := 0;
  v_assigned bigint := 0;
  v_paid bigint := 0;
  v_pending bigint := 0;
  v_agents bigint := 0;
  v_commissions bigint := 0;
  v_confirmed_commissions bigint := 0;
  v_pending_commissions bigint := 0;
  v_withdrawn bigint := 0;
  v_withdrawal_queue bigint := 0;
  v_ranking jsonb;
  v_activity jsonb;
  v_countries jsonb;
begin
  select * into v_staff from public.team_memberships
  where team_id = p_team_id and user_id = p_actor and status = 'active';
  if not found or v_staff.role not in ('super_admin', 'team_leader') then
    raise exception using errcode = '42501', message = 'team staff access required';
  end if;
  perform public.team_refresh_followup_states(p_team_id);

  select count(*), count(*) filter (where exists (
      select 1 from public.team_assignments a where a.awardee_id = ta.id and a.status = 'active'
    )),
    count(*) filter (where ta.payment_status = 'paid'),
    count(*) filter (where ta.payment_status = 'pending')
  into v_total, v_assigned, v_paid, v_pending
  from public.team_awardees ta
  where ta.team_id = p_team_id and ta.is_active;

  select count(*) into v_agents from public.team_memberships
  where team_id = p_team_id and role = 'agent' and status = 'active';

  select
    coalesce(sum(amount_minor), 0),
    coalesce(sum(amount_minor) filter (where status = 'confirmed'), 0),
    coalesce(sum(amount_minor) filter (where status = 'pending'), 0)
  into v_commissions, v_confirmed_commissions, v_pending_commissions
  from public.team_commission_entries
  where team_id = p_team_id and currency = p_currency;

  select coalesce(sum(coalesce(settled_amount_minor, amount_minor)), 0) into v_withdrawn
  from public.team_withdrawal_requests
  where team_id = p_team_id and currency = p_currency and status = 'paid';

  select count(*) into v_withdrawal_queue from public.team_withdrawal_requests
  where team_id = p_team_id and status in ('requested', 'under_review', 'approved', 'processing');

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_ranking from (
    select m.id, m.full_name, m.email,
      count(a.id) as assigned,
      count(a.id) filter (where ta.contact_status <> 'not_contacted') as contacted,
      count(a.id) filter (where ta.payment_status = 'paid') as paid,
      case when count(a.id) = 0 then 0
        else round((count(a.id) filter (where ta.payment_status = 'paid'))::numeric / count(a.id)::numeric * 100, 1)
      end as conversion_rate
    from public.team_memberships m
    left join public.team_assignments a on a.agent_id = m.id and a.status = 'active'
    left join public.team_awardees ta on ta.id = a.awardee_id
    where m.team_id = p_team_id and m.role = 'agent' and m.status = 'active'
    group by m.id, m.full_name, m.email
    order by paid desc, conversion_rate desc, assigned asc
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_activity from (
    select d::date as day,
      (select count(*) from public.team_followups f where f.team_id = p_team_id and f.contacted_at::date = d::date) as followups,
      (select count(*) from public.team_commission_entries e where e.team_id = p_team_id and e.entry_type = 'earning' and e.earned_at::date = d::date) as commissions
    from generate_series(current_date - interval '13 days', current_date, interval '1 day') d
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_countries from (
    select coalesce(nullif(ta.country, ''), 'Unknown') as country,
      count(*) as awardees,
      count(*) filter (where ta.payment_status = 'paid') as paid
    from public.team_awardees ta
    where ta.team_id = p_team_id and ta.is_active
    group by 1 order by count(*) desc limit 8
  ) x;

  return jsonb_build_object(
    'role', v_staff.role,
    'total_awardees', v_total,
    'assigned', v_assigned,
    'unassigned', greatest(v_total - v_assigned, 0),
    'paid', v_paid,
    'unpaid', greatest(v_total - v_paid - v_pending, 0),
    'pending_verification', v_pending,
    'active_agents', v_agents,
    'commissions_generated_minor', v_commissions,
    'confirmed_commissions_minor', v_confirmed_commissions,
    'pending_commissions_minor', v_pending_commissions,
    'outstanding_liability_minor', greatest(v_confirmed_commissions - v_withdrawn, 0),
    'withdrawn_minor', v_withdrawn,
    'withdrawal_queue', v_withdrawal_queue,
    'conversion_rate', case when v_total = 0 then 0 else round(v_paid::numeric / v_total::numeric * 100, 1) end,
    'ranking', v_ranking,
    'activity', v_activity,
    'countries', v_countries
  );
end;
$$;

-- Refresh pending commission entries to confirmed once their hold elapses.
create or replace function public.team_release_commissions()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.team_commission_entries
  set status = 'confirmed'
  where status = 'pending' and available_at <= now() and amount_minor > 0;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- A flat read model so PostgREST can filter by active agent without losing
-- unassigned awardees. security_invoker keeps RLS in force for any direct
-- authenticated read; the app reads it with the service role after its own
-- authorization check.
create or replace view public.team_awardee_directory
with (security_invoker = true) as
select
  ta.*,
  a.id as assignment_id,
  a.agent_id,
  a.assigned_at,
  m.full_name as agent_name,
  m.email as agent_email
from public.team_awardees ta
left join public.team_assignments a on a.awardee_id = ta.id and a.status = 'active'
left join public.team_memberships m on m.id = a.agent_id;

-- ---------------------------------------------------------------------------
-- 17. RLS
-- ---------------------------------------------------------------------------

alter table public.team_teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_settings enable row level security;
alter table public.team_awardees enable row level security;
alter table public.team_assignments enable row level security;
alter table public.team_followups enable row level security;
alter table public.team_templates enable row level security;
alter table public.team_email_logs enable row level security;
alter table public.team_notifications enable row level security;
alter table public.team_audit_logs enable row level security;
alter table public.team_commission_rules enable row level security;
alter table public.team_commission_entries enable row level security;
alter table public.team_withdrawal_requests enable row level security;
alter table public.team_withdrawal_payouts enable row level security;
alter table public.team_import_jobs enable row level security;
alter table public.team_import_changes enable row level security;

create or replace function public.team_my_membership(p_team_id uuid)
returns public.team_memberships
language sql stable security definer
set search_path = public
as $$
  select m.* from public.team_memberships m
  where m.team_id = p_team_id and m.user_id = auth.uid() and m.status = 'active'
  limit 1
$$;

create or replace function public.team_my_role(p_team_id uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select m.role from public.team_memberships m
  where m.team_id = p_team_id and m.user_id = auth.uid() and m.status = 'active'
  limit 1
$$;

create or replace function public.team_i_am_admin(p_team_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_memberships m
    where m.team_id = p_team_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'super_admin'
  )
$$;

create or replace function public.team_i_am_staff(p_team_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_memberships m
    where m.team_id = p_team_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('super_admin', 'team_leader')
  )
$$;

create or replace function public.team_i_have_awardee(p_awardee_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_assignments a
    join public.team_memberships m on m.id = a.agent_id
    where a.awardee_id = p_awardee_id and a.status = 'active'
      and m.user_id = auth.uid() and m.status = 'active'
  )
$$;

-- Teams
drop policy if exists team_teams_member_read on public.team_teams;
create policy team_teams_member_read on public.team_teams
  for select to authenticated
  using (exists (
    select 1 from public.team_memberships m
    where m.team_id = id and m.user_id = auth.uid() and m.status = 'active'
  ));

-- Memberships
drop policy if exists team_memberships_read on public.team_memberships;
create policy team_memberships_read on public.team_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.team_i_am_admin(team_id));

-- Settings
drop policy if exists team_settings_read on public.team_settings;
create policy team_settings_read on public.team_settings
  for select to authenticated using (public.team_my_membership(team_id) is not null);

-- Awardees
drop policy if exists team_awardees_read on public.team_awardees;
create policy team_awardees_read on public.team_awardees
  for select to authenticated
  using (
    public.team_i_am_staff(team_id)
    or public.team_i_have_awardee(id)
  );

-- Assignments
drop policy if exists team_assignments_read on public.team_assignments;
create policy team_assignments_read on public.team_assignments
  for select to authenticated
  using (
    public.team_i_am_staff(team_id)
    or exists (
      select 1 from public.team_memberships m
      where m.id = agent_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- Follow-ups
drop policy if exists team_followups_read on public.team_followups;
create policy team_followups_read on public.team_followups
  for select to authenticated
  using (
    public.team_i_am_staff(team_id)
    or exists (
      select 1 from public.team_memberships m
      where m.id = agent_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- Templates (all members read; admin writes happen through the service role)
drop policy if exists team_templates_read on public.team_templates;
create policy team_templates_read on public.team_templates
  for select to authenticated using (public.team_my_membership(team_id) is not null);

-- Email logs
drop policy if exists team_email_logs_read on public.team_email_logs;
create policy team_email_logs_read on public.team_email_logs
  for select to authenticated
  using (
    public.team_i_am_admin(team_id)
    or exists (
      select 1 from public.team_memberships m
      where m.id = agent_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- Notifications
drop policy if exists team_notifications_read on public.team_notifications;
create policy team_notifications_read on public.team_notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists team_notifications_update on public.team_notifications;
create policy team_notifications_update on public.team_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit logs: admins only
drop policy if exists team_audit_admin_read on public.team_audit_logs;
create policy team_audit_admin_read on public.team_audit_logs
  for select to authenticated using (public.team_i_am_admin(team_id));

-- Commission rules: members read
drop policy if exists team_commission_rules_read on public.team_commission_rules;
create policy team_commission_rules_read on public.team_commission_rules
  for select to authenticated using (public.team_my_membership(team_id) is not null);

-- Commission entries: own or admin
drop policy if exists team_commission_entries_read on public.team_commission_entries;
create policy team_commission_entries_read on public.team_commission_entries
  for select to authenticated
  using (
    public.team_i_am_admin(team_id)
    or exists (
      select 1 from public.team_memberships m
      where m.id = agent_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- Withdrawals: own or admin
drop policy if exists team_withdrawals_read on public.team_withdrawal_requests;
create policy team_withdrawals_read on public.team_withdrawal_requests
  for select to authenticated
  using (
    public.team_i_am_admin(team_id)
    or exists (
      select 1 from public.team_memberships m
      where m.id = agent_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists team_payouts_read on public.team_withdrawal_payouts;
create policy team_payouts_read on public.team_withdrawal_payouts
  for select to authenticated
  using (exists (
    select 1 from public.team_withdrawal_requests w
    where w.id = request_id
      and (
        public.team_i_am_admin(w.team_id)
        or exists (
          select 1 from public.team_memberships m
          where m.id = w.agent_id and m.user_id = auth.uid() and m.status = 'active'
        )
      )
  ));

-- Imports: admin only
drop policy if exists team_import_jobs_admin on public.team_import_jobs;
create policy team_import_jobs_admin on public.team_import_jobs
  for select to authenticated using (public.team_i_am_admin(team_id));
drop policy if exists team_import_changes_admin on public.team_import_changes;
create policy team_import_changes_admin on public.team_import_changes
  for select to authenticated using (exists (
    select 1 from public.team_import_jobs j where j.id = job_id and public.team_i_am_admin(j.team_id)
  ));

-- Explicit grants: read-only for authenticated, everything via service role.
do $$
declare t text;
begin
  foreach t in array array[
    'team_teams','team_memberships','team_settings','team_awardees','team_assignments',
    'team_followups','team_templates','team_email_logs','team_notifications','team_audit_logs',
    'team_commission_rules','team_commission_entries','team_withdrawal_requests',
    'team_withdrawal_payouts','team_import_jobs','team_import_changes'
  ] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end;
$$;

grant update (read_at) on public.team_notifications to authenticated;
grant usage, select on sequence public.team_import_changes_id_seq to service_role;
grant usage, select on sequence public.team_audit_logs_id_seq to service_role;

-- Function execution: only the service role may call financial/assignment
-- RPCs. Authenticated users read through RLS; mutations are server-mediated.
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'team\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

grant execute on function public.team_my_membership(uuid) to authenticated;
grant execute on function public.team_my_role(uuid) to authenticated;
grant execute on function public.team_i_am_admin(uuid) to authenticated;
grant execute on function public.team_i_am_staff(uuid) to authenticated;
grant execute on function public.team_i_have_awardee(uuid) to authenticated;

revoke all on public.team_awardee_directory from public, anon, authenticated;
grant select on public.team_awardee_directory to service_role;
grant select on public.team_awardee_directory to authenticated;
revoke all on public.team_payment_reconciliation from public, anon;
grant select on public.team_payment_reconciliation to service_role;

-- ---------------------------------------------------------------------------
-- 18. Seed: Sales & Award Follow-Up team
-- ---------------------------------------------------------------------------

insert into public.team_teams (name, slug, description)
values (
  'Sales & Award Follow-Up',
  'sales',
  'Awardee follow-up, verified award payments, commissions and payouts.'
)
on conflict (slug) do nothing;

insert into public.team_settings (team_id)
select id from public.team_teams where slug = 'sales'
on conflict (team_id) do nothing;

insert into public.team_commission_rules (
  team_id, name, payment_currency, commission_currency, commission_amount_minor,
  country_scope, priority, is_active
)
select t.id, r.name, r.payment_currency, 'NGN', r.amount_minor, r.country_scope, r.priority, true
from public.team_teams t
cross join (values
  ('Nigeria award commission — NGN 2,000', 'NGN', 200000::bigint, 'Nigeria'::text, 20),
  ('International award commission — NGN 2,000', 'USD', 200000::bigint, null::text, 10)
) as r(name, payment_currency, amount_minor, country_scope, priority)
where t.slug = 'sales'
  and not exists (
    select 1 from public.team_commission_rules x where x.team_id = t.id and x.name = r.name
  );

insert into public.team_templates (team_id, channel, name, subject, body)
select t.id, v.channel, v.name, v.subject, v.body
from public.team_teams t
cross join (values
  (
    'whatsapp'::text,
    'Award payment follow-up'::text,
    null::text,
    E'Hello {{first_name}},\n\nThis is {{agent_name}} from Top100 Africa Future Leaders. Congratulations again on your award.\n\nI am reaching out about your award payment and delivery arrangements. Kindly let me know a convenient time to talk, or reply to this message and I will send the secure payment link.\n\nThank you,\n{{agent_name}}\nTop100 Africa Future Leaders'::text
  ),
  (
    'whatsapp',
    'Payment reminder',
    null,
    E'Hello {{first_name}},\n\nA quick reminder about your Top100 Africa Future Leaders award payment.\n\nOnce payment is confirmed, your award delivery will be arranged. Reply here and I will assist you.\n\nBest regards,\n{{agent_name}}'::text
  ),
  (
    'email',
    'Award payment and delivery',
    'Your Top100 Africa Future Leaders award',
    E'Dear {{first_name}},\n\nCongratulations once again on being recognised as a Top100 Africa Future Leader.\n\nI am {{agent_name}}, your follow-up contact for the award. This email explains the next steps for confirming your award payment and arranging delivery.\n\nPayment can be completed through the secure link provided by the Top100 AFL team. Please reply to this email if you would like the link resent or if you have any questions.\n\nKind regards,\n{{agent_name}}\nTop100 Africa Future Leaders'::text
  )
) as v(channel, name, subject, body)
where t.slug = 'sales'
  and not exists (
    select 1 from public.team_templates x
    where x.team_id = t.id and x.channel = v.channel and lower(x.name) = lower(v.name)
  );

-- ---------------------------------------------------------------------------
-- 19. Comments
-- ---------------------------------------------------------------------------

comment on table public.team_awardees is
  'Sales campaign projection of an awardee. Payment status is written only by verified-payment RPCs or the award_orders sync trigger.';
comment on table public.team_commission_entries is
  'Append-only commission ledger. One earning per verified payment; reversals are negative entries linked to the earning.';
comment on function public.team_apply_verified_payment is
  'Idempotently records a verified award payment and creates at most one commission earning.';
comment on function public.team_request_withdrawal is
  'Concurrency-safe withdrawal request. Recomputes the balance under a per-agent advisory lock.';
