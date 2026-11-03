-- Commission attribution is based on traceable contact evidence, never on an
-- assignment by itself. This migration is additive: payment/source rows and
-- existing ledger rows are retained; an incorrect earning is corrected with a
-- linked negative reversal.

begin;

-- Payment currency may be NGN or USD, but commission payouts remain in NGN.
-- Refuse an existing non-NGN rule rather than inventing an FX conversion.
do $$
begin
  if exists (
    select 1 from public.team_commission_rules
    where commission_currency <> 'NGN'
  ) then
    raise exception using errcode = '22023',
      message = 'all commission rules must use NGN commission currency';
  end if;
end;
$$;

alter table public.team_commission_rules
  drop constraint if exists team_commission_rules_commission_currency_ngn_check;
alter table public.team_commission_rules
  add constraint team_commission_rules_commission_currency_ngn_check
  check (commission_currency = 'NGN');

-- Commission ledger amounts are always NGN. Payment/source currency may still
-- be USD, but silently relabelling an existing USD commission would corrupt
-- history, so fail the migration until that legacy ledger is explicitly
-- migrated outside this additive migration.
do $$
begin
  if exists (
    select 1 from public.team_commission_entries
    where currency <> 'NGN'
  ) then
    raise exception using errcode = '22023',
      message = 'existing non-NGN commission ledger entries must be migrated before enabling NGN-only commission ledger';
  end if;
end;
$$;

alter table public.team_commission_entries
  drop constraint if exists team_commission_entries_currency_check;
alter table public.team_commission_entries
  drop constraint if exists team_commission_entries_currency_ngn_check;
alter table public.team_commission_entries
  add constraint team_commission_entries_currency_ngn_check
  check (currency = 'NGN');

-- Release due ledger rows under the same per-agent/currency advisory lock used
-- by withdrawal solvency checks. Reversals are negative pending entries too;
-- leaving them pending resurrects the original earning when the hold expires.
create or replace function public.team_release_commissions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope record;
  v_released integer := 0;
  v_scope_released integer;
begin
  for v_scope in
    select distinct team_id, agent_id, upper(currency) as currency
    from public.team_commission_entries
    where status = 'pending' and available_at <= now()
    order by team_id, agent_id, upper(currency)
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'team-ledger:' || v_scope.team_id::text || ':' || v_scope.agent_id::text || ':' || v_scope.currency,
      0
    ));

    update public.team_commission_entries
    set status = 'confirmed'
    where team_id = v_scope.team_id
      and agent_id = v_scope.agent_id
      and upper(currency) = v_scope.currency
      and status = 'pending'
      and available_at <= now();
    get diagnostics v_scope_released = row_count;
    v_released := v_released + v_scope_released;
  end loop;

  return v_released;
end;
$$;

revoke all on function public.team_release_commissions() from public, anon, authenticated;
grant execute on function public.team_release_commissions() to service_role;

-- `created_at` is retained as historical metadata. `recorded_at` is the
-- immutable database-controlled evidence timestamp used for all new
-- attribution decisions, so a caller cannot insert a post-payment contact
-- with a forged earlier created_at.
alter table public.team_followups
  add column if not exists recorded_at timestamptz;
update public.team_followups
set recorded_at = created_at
where recorded_at is null;
alter table public.team_followups
  alter column recorded_at set default clock_timestamp(),
  alter column recorded_at set not null;

create or replace function public.team_seal_followup_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
    new.recorded_at := new.created_at;
    return new;
  end if;

  -- Contact evidence is append-only. Scheduling metadata may still be edited,
  -- but identity, channel, outcome, notes, timestamps, and provider linkage
  -- cannot be changed into a qualifying record after the fact.
  new.team_id := old.team_id;
  new.assignment_id := old.assignment_id;
  new.awardee_id := old.awardee_id;
  new.agent_id := old.agent_id;
  new.channel := old.channel;
  new.outcome := old.outcome;
  new.notes := old.notes;
  new.responded := old.responded;
  new.payment_expected := old.payment_expected;
  new.contacted_at := old.contacted_at;
  new.email_log_id := old.email_log_id;
  new.created_at := old.created_at;
  new.recorded_at := old.recorded_at;
  return new;
end;
$$;

drop trigger if exists team_seal_followup_evidence on public.team_followups;
create trigger team_seal_followup_evidence
  before insert or update on public.team_followups
  for each row execute function public.team_seal_followup_evidence();

revoke all on function public.team_seal_followup_evidence() from public, anon, authenticated;
grant execute on function public.team_seal_followup_evidence() to service_role;

-- ---------------------------------------------------------------------------
-- 1. Guard the only follow-up shape that can claim provider-backed email.
-- ---------------------------------------------------------------------------

create or replace function public.team_validate_followup_contact_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.team_email_logs%rowtype;
  v_awardee public.team_awardees%rowtype;
begin
  -- Calls and WhatsApp are staff-entered audit records. They are deliberately
  -- not treated as provider-verified by the attribution helper below.
  if new.channel <> 'email' or new.outcome <> 'email_sent' then
    return new;
  end if;

  if new.email_log_id is null then
    raise exception using errcode = '22023',
      message = 'successful email follow-ups require a provider email log';
  end if;

  select * into v_log
  from public.team_email_logs
  where id = new.email_log_id;
  if not found
     or v_log.team_id <> new.team_id
     or v_log.awardee_id <> new.awardee_id
     or v_log.agent_id <> new.agent_id then
    raise exception using errcode = '22023',
      message = 'email follow-up provider log does not match the recorded contact';
  end if;

  if v_log.status <> 'sent'
     or nullif(btrim(v_log.provider_message_id), '') is null
     or v_log.sent_at is null then
    raise exception using errcode = '22023',
      message = 'successful email follow-ups require a sent provider message';
  end if;

  select * into v_awardee from public.team_awardees where id = new.awardee_id;
  if not found or lower(btrim(v_log.to_email)) is distinct from lower(btrim(v_awardee.email)) then
    raise exception using errcode = '22023',
      message = 'email follow-up provider recipient does not match the awardee';
  end if;

  if new.contacted_at < v_log.sent_at then
    raise exception using errcode = '22023',
      message = 'email follow-up contact time cannot precede provider delivery';
  end if;

  return new;
end;
$$;

drop trigger if exists team_validate_followup_contact_evidence on public.team_followups;
create trigger team_validate_followup_contact_evidence
  before insert or update of channel, outcome, email_log_id, team_id, awardee_id, agent_id,
    contacted_at on public.team_followups
  for each row execute function public.team_validate_followup_contact_evidence();

revoke all on function public.team_validate_followup_contact_evidence() from public, anon, authenticated;
grant execute on function public.team_validate_followup_contact_evidence() to service_role;

-- ---------------------------------------------------------------------------
-- 2. Canonical qualifying-contact helper.
--
-- Assignment interval is start-inclusive/end-exclusive. Both the contact
-- timestamp and the database recording/provider timestamps must be strictly
-- before payment. A caller cannot qualify by backdating contacted_at after the
-- payment has already been recorded.
-- ---------------------------------------------------------------------------

create or replace function public.team_qualifying_contacts(
  p_assignment_id uuid,
  p_paid_at timestamptz
)
returns table (
  id uuid,
  kind text,
  channel text,
  team_id uuid,
  awardee_id uuid,
  agent_id uuid,
  assignment_id uuid,
  contacted_at timestamptz,
  recorded_at timestamptz,
  provider_verified boolean,
  source_id uuid,
  evidence jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with assignment_row as (
    select a.id, a.team_id, a.awardee_id, a.agent_id, a.assigned_at, a.ended_at,
      ta.email as awardee_email
    from public.team_assignments a
    join public.team_awardees ta on ta.id = a.awardee_id
    where a.id = p_assignment_id
  )
  select
    f.id,
    'staff_logged_contact'::text as kind,
    f.channel,
    a.team_id,
    a.awardee_id,
    a.agent_id,
    a.id as assignment_id,
    f.contacted_at,
    f.recorded_at,
    false as provider_verified,
    f.id as source_id,
    jsonb_build_object(
      'id', f.id,
      'kind', 'staff_logged_contact',
      'channel', f.channel,
      'contactedAt', f.contacted_at,
      'recordedAt', f.recorded_at,
      'providerVerified', false,
      'limitation', 'Call and WhatsApp entries are staff-recorded audit evidence; they are not independently provider verified.'
    ) as evidence
  from assignment_row a
  join public.team_followups f
    on f.team_id = a.team_id
   and f.awardee_id = a.awardee_id
   and f.agent_id = a.agent_id
   and (f.assignment_id = a.id or f.assignment_id is null)
   and f.contacted_at >= a.assigned_at
   and (a.ended_at is null or f.contacted_at < a.ended_at)
  where p_paid_at is not null
    and f.contacted_at < p_paid_at
    and f.recorded_at < p_paid_at
    and f.channel in ('call', 'whatsapp')
    -- A substantive record needs both an actionable outcome and a useful
    -- note. This intentionally excludes no-answer/unavailable/non-action.
    and length(btrim(coalesce(f.notes, ''))) >= 10
    and (
      (f.channel = 'call' and f.outcome in (
        'interested', 'payment_reported', 'payment_verified',
        'not_interested', 'followup_scheduled', 'other'
      ))
      or (f.channel = 'whatsapp' and f.outcome in (
        'message_sent', 'awaiting_response', 'interested',
        'payment_reported', 'payment_verified', 'not_interested',
        'followup_scheduled', 'other'
      ))
    )

  union all

  select
    f.id,
    'provider_email_sent'::text as kind,
    f.channel,
    a.team_id,
    a.awardee_id,
    a.agent_id,
    a.id as assignment_id,
    f.contacted_at,
    f.recorded_at,
    true as provider_verified,
    l.id as source_id,
    jsonb_build_object(
      'id', f.id,
      'kind', 'provider_email_sent',
      'channel', 'email',
      'contactedAt', f.contacted_at,
      'recordedAt', f.recorded_at,
      'providerVerified', true,
      'providerMessageId', l.provider_message_id,
      'providerSentAt', l.sent_at,
      'recipient', l.to_email
    ) as evidence
  from assignment_row a
  join public.team_followups f
    on f.team_id = a.team_id
   and f.awardee_id = a.awardee_id
   and f.agent_id = a.agent_id
   and (f.assignment_id = a.id or f.assignment_id is null)
   and f.contacted_at >= a.assigned_at
   and (a.ended_at is null or f.contacted_at < a.ended_at)
  join public.team_email_logs l
    on l.id = f.email_log_id
   and l.team_id = a.team_id
   and l.awardee_id = a.awardee_id
   and l.agent_id = a.agent_id
  where p_paid_at is not null
    and f.channel = 'email'
    and f.outcome = 'email_sent'
    and f.contacted_at < p_paid_at
    and f.recorded_at < p_paid_at
    and l.status = 'sent'
    and nullif(btrim(l.provider_message_id), '') is not null
    and l.sent_at is not null
    and l.sent_at <= f.contacted_at
    and l.attempted_at < p_paid_at
    and l.sent_at < p_paid_at
    and l.created_at < p_paid_at
    and lower(btrim(l.to_email)) = lower(btrim(a.awardee_email));
$$;

-- Exact scalar contract used by payment application and callers that only
-- need the winning evidence row. NULL means no qualifying contact exists.
create or replace function public.team_qualifying_contact(
  p_assignment_id uuid,
  p_paid_at timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select q.evidence
  from public.team_qualifying_contacts(p_assignment_id, p_paid_at) q
  order by q.contacted_at desc, q.recorded_at desc, q.id desc
  limit 1;
$$;

revoke all on function public.team_qualifying_contacts(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.team_qualifying_contacts(uuid, timestamptz) to service_role;
revoke all on function public.team_qualifying_contact(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.team_qualifying_contact(uuid, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 3. One paid projection per payment, only when the same assignment owner
-- has qualifying evidence at payment time.
-- ---------------------------------------------------------------------------

create or replace view public.team_payment_attributions
with (security_invoker = true) as
with paid_projections as (
  select
    ta.team_id,
    ta.id as team_awardee_id,
    ta.public_awardee_id,
    ta.profile_id,
    ta.is_active as projection_is_active,
    ta.created_at as projection_created_at,
    o.id as payment_id,
    coalesce(o.award_paid_at, o.paid_at, o.created_at) as paid_at,
    upper(coalesce(pa.currency, 'NGN')) as payment_currency,
    coalesce(pa.captured_amount_minor, pa.requested_amount_minor, o.award_amount_kobo) as payment_amount_minor
  from public.team_awardees ta
  join public.award_orders o on (
    (o.awardee_id is not null and ta.public_awardee_id is not null and ta.public_awardee_id = o.awardee_id)
    or (
      ta.profile_id is not null
      and o.profile_id is not null
      and ta.profile_id = o.profile_id
      and (o.awardee_id is null or ta.public_awardee_id is null)
    )
  )
  left join public.award_payment_attempts pa on pa.id = o.award_paid_attempt_id
  where o.award_payment_status = 'paid'
    and (
      o.award_paid_attempt_id is null
      or (
        pa.order_id = o.id
        and lower(btrim(coalesce(pa.provider, ''))) = 'bachs'
        and lower(btrim(coalesce(pa.charge_scope, ''))) = 'award_fee'
        and lower(btrim(coalesce(pa.status, ''))) = 'succeeded'
        and pa.confirmed_at is not null
        and pa.requested_amount_minor is not null
        and pa.captured_amount_minor is not null
        and pa.requested_amount_minor > 0
        and pa.captured_amount_minor > 0
        and pa.captured_amount_minor = pa.requested_amount_minor
      )
    )
), eligible as (
  select
    p.*,
    a.id as assignment_id,
    a.agent_id,
    a.assigned_at,
    q.id as contact_id,
    q.kind as contact_kind,
    q.channel as contact_channel,
    q.contacted_at,
    q.recorded_at,
    q.provider_verified,
    q.source_id as provider_source_id,
    q.evidence,
    row_number() over (
      partition by p.team_id, p.payment_id
      order by q.contacted_at desc, q.recorded_at desc,
        a.assigned_at desc, a.id desc
    ) as winner_rank
  from paid_projections p
  join public.team_assignments a
    on a.team_id = p.team_id
   and a.awardee_id = p.team_awardee_id
   and a.assigned_at <= p.paid_at
   and (a.ended_at is null or a.ended_at > p.paid_at)
  cross join lateral public.team_qualifying_contacts(a.id, p.paid_at) q
)
select
  e.team_awardee_id as id,
  e.team_awardee_id,
  e.team_awardee_id as awardee_id,
  e.team_id,
  e.public_awardee_id,
  e.profile_id,
  e.agent_id,
  e.assignment_id,
  e.payment_id,
  'award_order'::text as payment_type,
  e.paid_at,
  e.payment_currency,
  e.payment_amount_minor,
  e.contact_id,
  e.contact_kind,
  e.contact_channel,
  e.contacted_at,
  e.recorded_at,
  e.provider_verified,
  e.provider_source_id,
  e.evidence
from eligible e
where e.winner_rank = 1;

revoke all on public.team_payment_attributions from public, anon, authenticated;
grant select on public.team_payment_attributions to service_role;

-- ---------------------------------------------------------------------------
-- 4. Immutable commission correction primitive. It never edits/deletes an
-- earning and never notifies the original agent during reconciliation.
-- ---------------------------------------------------------------------------

create or replace function public.team_reverse_commission_entry(
  p_commission_id uuid,
  p_reason text,
  p_actor uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_earning public.team_commission_entries%rowtype;
  v_reversal public.team_commission_entries%rowtype;
begin
  select * into v_earning
  from public.team_commission_entries
  where id = p_commission_id and entry_type = 'earning'
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'commission earning not found';
  end if;

  select * into v_reversal
  from public.team_commission_entries
  where parent_commission_id = v_earning.id
  order by created_at
  limit 1;
  if found then
    return v_reversal.id;
  end if;

  insert into public.team_commission_entries (
    team_id, awardee_id, agent_id, rule_id, entry_type, parent_commission_id,
    payment_type, payment_id, payment_currency, amount_minor, currency, status,
    available_at, earned_at, reason, rule_snapshot, created_by
  ) values (
    v_earning.team_id, v_earning.awardee_id, v_earning.agent_id, v_earning.rule_id,
    'reversal', v_earning.id, v_earning.payment_type, v_earning.payment_id,
    v_earning.payment_currency, -v_earning.amount_minor, v_earning.currency,
    v_earning.status, v_earning.available_at, now(), left(coalesce(p_reason, 'Commission eligibility failed'), 500),
    v_earning.rule_snapshot || jsonb_build_object(
      'reversal_reason', left(coalesce(p_reason, 'Commission eligibility failed'), 500),
      'reversal_source', 'team_commission_attribution_reconciliation'
    ),
    p_actor
  ) returning * into v_reversal;

  perform public.team_audit(
    v_earning.team_id, p_actor, null, 'commission.reversed_without_qualifying_contact',
    'commission_entry', v_reversal.id::text,
    jsonb_build_object(
      'earning_id', v_earning.id,
      'awardee_id', v_earning.awardee_id,
      'agent_id', v_earning.agent_id,
      'payment_id', v_earning.payment_id,
      'amount_minor', v_reversal.amount_minor,
      'reason', left(coalesce(p_reason, 'Commission eligibility failed'), 500)
    )
  );
  return v_reversal.id;
end;
$$;

revoke all on function public.team_reverse_commission_entry(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.team_reverse_commission_entry(uuid, text, uuid) to service_role;

-- Refunds must reverse the latest still-open earning. A corrected payment can
-- legitimately have an older earning plus its reversal and a newer earning;
-- picking an arbitrary historical row would leave the newer credit open.
create or replace function public.team_reverse_verified_payment(
  p_team_id uuid,
  p_awardee_id uuid,
  p_payment_type text,
  p_payment_id uuid,
  p_reason text,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_earning public.team_commission_entries%rowtype;
  v_reversal public.team_commission_entries%rowtype;
  v_existing_reversal_id uuid;
  v_agent_user uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'team-payment:' || p_team_id::text || ':' || p_payment_type || ':' || p_payment_id::text,
    0
  ));

  update public.team_awardees
  set payment_status = 'refunded', payment_note = left(coalesce(p_reason, 'Payment reversed'), 500)
  where id = p_awardee_id and team_id = p_team_id;

  select e.* into v_earning
  from public.team_commission_entries e
  where e.team_id = p_team_id
    and e.payment_type = p_payment_type
    and e.payment_id = p_payment_id
    and e.entry_type = 'earning'
    and not exists (
      select 1 from public.team_commission_entries r
      where r.parent_commission_id = e.id and r.entry_type = 'reversal'
    )
  order by e.created_at desc, e.id desc
  limit 1
  for update;

  if not found then
    select r.id into v_existing_reversal_id
    from public.team_commission_entries e
    join public.team_commission_entries r on r.parent_commission_id = e.id
      and r.entry_type = 'reversal'
    where e.team_id = p_team_id
      and e.payment_type = p_payment_type
      and e.payment_id = p_payment_id
      and e.entry_type = 'earning'
    order by e.created_at desc, r.created_at desc, r.id desc
    limit 1;
    if v_existing_reversal_id is not null then
      return jsonb_build_object('outcome', 'already_reversed', 'reversal_id', v_existing_reversal_id);
    end if;

    perform public.team_audit(p_team_id, p_actor, null, 'payment.reversed_without_commission', 'award_order', p_payment_id::text,
      jsonb_build_object('awardee_id', p_awardee_id, 'reason', p_reason));
    return jsonb_build_object('outcome', 'reversed_without_commission');
  end if;

  insert into public.team_commission_entries (
    team_id, awardee_id, agent_id, rule_id, entry_type, parent_commission_id,
    payment_type, payment_id, payment_currency, amount_minor, currency, status,
    available_at, earned_at, reason, rule_snapshot, created_by
  ) values (
    v_earning.team_id, v_earning.awardee_id, v_earning.agent_id, v_earning.rule_id, 'reversal', v_earning.id,
    p_payment_type, p_payment_id, v_earning.payment_currency, -v_earning.amount_minor, v_earning.currency,
    v_earning.status, v_earning.available_at, now(), left(coalesce(p_reason, 'Payment reversed'), 500),
    v_earning.rule_snapshot || jsonb_build_object('reversal_source', 'team_verified_payment_refund'), p_actor
  ) returning * into v_reversal;

  select user_id into v_agent_user from public.team_memberships where id = v_earning.agent_id;
  if v_agent_user is not null and current_setting('team.reconciliation', true) <> 'on' then
    perform public.team_notify(
      p_team_id, v_agent_user, v_earning.agent_id, 'commission_reversed',
      'Commission reversed',
      coalesce(p_reason, 'A previously verified payment was reversed.'),
      '/earnings'
    );
  end if;

  perform public.team_audit(p_team_id, p_actor, null, 'commission.reversed', 'commission_entry', v_reversal.id::text,
    jsonb_build_object('earning_id', v_earning.id, 'amount_minor', v_reversal.amount_minor, 'reason', p_reason));

  return jsonb_build_object('outcome', 'reversed', 'reversal_id', v_reversal.id);
end;
$$;

revoke all on function public.team_reverse_verified_payment(uuid, uuid, text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.team_reverse_verified_payment(uuid, uuid, text, uuid, text, uuid) to service_role;

-- The old partial index allowed only one earning per payment. Corrections are
-- append-only, so a reversed earning may coexist with the corrected earning
-- for the rep whose evidence actually qualified.
drop index if exists public.team_commission_one_earning_uidx;
create unique index if not exists team_commission_one_earning_agent_uidx
  on public.team_commission_entries (team_id, payment_type, payment_id, agent_id)
  where entry_type = 'earning';

-- A per-agent unique index permits an append-only correction, but this trigger
-- plus the payment lock below still guarantees at most one un-reversed earning
-- for a payment. Direct ledger writes cannot create a second open credit.
create or replace function public.team_guard_one_open_commission_earning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entry_type <> 'earning' then
    -- Commission reversals and withdrawal transitions share one ledger lock.
    perform pg_advisory_xact_lock(hashtextextended(
      'team-ledger:' || new.team_id::text || ':' || new.agent_id::text || ':' || upper(new.currency),
      0
    ));
    return new;
  end if;

  -- Earnings use payment-then-ledger order, matching team_apply's payment
  -- lock. This avoids a direct-ledger insert deadlocking a payment application.
  perform pg_advisory_xact_lock(hashtextextended(
    'team-payment:' || new.team_id::text || ':' || new.payment_type || ':' || new.payment_id::text,
    0
  ));
  perform pg_advisory_xact_lock(hashtextextended(
    'team-ledger:' || new.team_id::text || ':' || new.agent_id::text || ':' || upper(new.currency),
    0
  ));

  if exists (
    select 1
    from public.team_commission_entries e
    where e.team_id = new.team_id
      and e.payment_type = new.payment_type
      and e.payment_id = new.payment_id
      and e.entry_type = 'earning'
      and not exists (
        select 1 from public.team_commission_entries r
        where r.parent_commission_id = e.id and r.entry_type = 'reversal'
      )
  ) then
    raise exception using errcode = '23505',
      message = 'a payment already has an unreversed commission earning';
  end if;

  -- A ledger insert is not an alternative payment-application path. Even
  -- service-role callers must point at the one canonical winning projection,
  -- agent, and qualifying contact for this paid payment.
  if not exists (
    select 1
    from public.team_payment_attributions a
    where a.id = new.awardee_id
      and a.team_id = new.team_id
      and a.payment_type = new.payment_type
      and a.payment_id = new.payment_id
      and a.agent_id = new.agent_id
  ) then
    raise exception using errcode = '42501',
      message = 'commission earning requires canonical qualifying contact attribution';
  end if;
  return new;
end;
$$;

drop trigger if exists team_guard_one_open_commission_earning on public.team_commission_entries;
create trigger team_guard_one_open_commission_earning
  before insert on public.team_commission_entries
  for each row execute function public.team_guard_one_open_commission_earning();

revoke all on function public.team_guard_one_open_commission_earning() from public, anon, authenticated;
grant execute on function public.team_guard_one_open_commission_earning() to service_role;

-- A withdrawal row can remain visible/requested after a commission reversal,
-- but it must not progress to approval/processing/payment while the confirmed
-- available ledger cannot cover its reservation. Exclude the row being
-- transitioned from the other-reservations sum so its amount is counted once.
create or replace function public.team_guard_withdrawal_ledger_solvency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available_earned bigint := 0;
  v_other_reserved bigint := 0;
begin
  if new.status not in ('approved', 'processing', 'paid') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'team-ledger:' || new.team_id::text || ':' || new.agent_id::text || ':' || upper(new.currency),
    0
  ));

  select coalesce(sum(e.amount_minor), 0)
  into v_available_earned
  from public.team_commission_entries e
  where e.team_id = new.team_id
    and e.agent_id = new.agent_id
    and e.currency = new.currency
    and e.status = 'confirmed'
    and e.available_at <= now();

  select coalesce(sum(
    case when w.status = 'paid'
      then coalesce(w.settled_amount_minor, w.amount_minor)
      else w.amount_minor
    end
  ), 0)
  into v_other_reserved
  from public.team_withdrawal_requests w
  where w.team_id = new.team_id
    and w.agent_id = new.agent_id
    and w.currency = new.currency
    and w.id <> new.id
    and w.status in ('requested', 'under_review', 'approved', 'processing', 'paid');

  if v_available_earned - v_other_reserved < new.amount_minor then
    raise exception using errcode = '22023',
      message = 'agent ledger no longer covers this withdrawal';
  end if;
  return new;
end;
$$;

drop trigger if exists team_guard_withdrawal_ledger_solvency on public.team_withdrawal_requests;
create trigger team_guard_withdrawal_ledger_solvency
  before insert or update of status, amount_minor, currency, agent_id
  on public.team_withdrawal_requests
  for each row execute function public.team_guard_withdrawal_ledger_solvency();

revoke all on function public.team_guard_withdrawal_ledger_solvency() from public, anon, authenticated;
grant execute on function public.team_guard_withdrawal_ledger_solvency() to service_role;

-- ---------------------------------------------------------------------------
-- 5. Verified payment application with evidence eligibility.
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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_awardee public.team_awardees%rowtype;
  v_order public.award_orders%rowtype;
  v_attempt public.award_payment_attempts%rowtype;
  v_entry public.team_commission_entries%rowtype;
  v_rule public.team_commission_rules%rowtype;
  v_settings public.team_settings%rowtype;
  v_eligible record;
  v_reversal_id uuid;
  v_reversed_commission_id uuid;
  v_currency text;
  v_payment_amount_minor bigint;
  v_paid_at timestamptz;
  v_available_at timestamptz;
  v_agent_user uuid;
  v_released integer := 0;
  v_existing_reversal boolean := false;
  v_has_eligible boolean := false;
  v_reconciliation boolean := current_setting('team.reconciliation', true) = 'on';
begin
  if p_team_id is null or p_awardee_id is null or p_payment_id is null then
    raise exception using errcode = '22023', message = 'team, awardee and payment IDs are required';
  end if;
  if p_payment_type <> 'award_order' then
    raise exception using errcode = '22023', message = 'unsupported payment source';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'team-payment:' || p_team_id::text || ':' || p_payment_type || ':' || p_payment_id::text,
    0
  ));

  select * into v_awardee
  from public.team_awardees
  where id = p_awardee_id and team_id = p_team_id
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'awardee not found in this team';
  end if;

  -- The payment source is the award order, not caller-supplied amount/time
  -- fields. A paid projection cannot be created for a missing, unpaid, wrong-
  -- identity, zero-value, or mismatched source payment.
  select * into v_order
  from public.award_orders
  where id = p_payment_id;
  if not found or v_order.award_payment_status <> 'paid' then
    raise exception using errcode = '22023', message = 'paid award order source is required';
  end if;
  if not (
    (v_order.awardee_id is not null and v_awardee.public_awardee_id is not null and v_awardee.public_awardee_id = v_order.awardee_id)
    or (
      v_order.profile_id is not null
      and v_awardee.profile_id is not null
      and v_awardee.profile_id = v_order.profile_id
      and (v_order.awardee_id is null or v_awardee.public_awardee_id is null)
    )
  ) then
    raise exception using errcode = '22023', message = 'paid award order does not belong to this team awardee';
  end if;

  if v_order.award_paid_attempt_id is not null then
    select * into v_attempt
    from public.award_payment_attempts
    where id = v_order.award_paid_attempt_id;
    if not found
       or v_attempt.order_id is distinct from v_order.id
       or lower(btrim(coalesce(v_attempt.provider, ''))) <> 'bachs'
       or lower(btrim(coalesce(v_attempt.charge_scope, ''))) <> 'award_fee'
       or lower(btrim(coalesce(v_attempt.status, ''))) <> 'succeeded'
       or v_attempt.confirmed_at is null
       or v_attempt.requested_amount_minor is null
       or v_attempt.captured_amount_minor is null
       or v_attempt.requested_amount_minor <= 0
       or v_attempt.captured_amount_minor <= 0
       or v_attempt.captured_amount_minor is distinct from v_attempt.requested_amount_minor then
      raise exception using errcode = '22023', message = 'paid award order payment attempt is not a canonical succeeded award-fee source';
    end if;
    v_currency := upper(coalesce(v_attempt.currency, 'NGN'));
    v_payment_amount_minor := coalesce(v_attempt.captured_amount_minor, v_attempt.requested_amount_minor);
  end if;
  v_currency := upper(coalesce(v_currency, 'NGN'));
  v_payment_amount_minor := coalesce(v_payment_amount_minor, v_order.award_amount_kobo);
  v_paid_at := coalesce(v_order.award_paid_at, v_order.paid_at, v_order.created_at);

  if v_currency not in ('NGN', 'USD') then
    raise exception using errcode = '22023', message = 'unsupported payment currency';
  end if;
  if v_payment_amount_minor is null or v_payment_amount_minor <= 0 then
    raise exception using errcode = '22023', message = 'paid award order amount must be positive';
  end if;
  if v_paid_at is null then
    raise exception using errcode = '22023', message = 'paid award order timestamp is missing';
  end if;
  if p_payment_currency is not null and upper(p_payment_currency) is distinct from v_currency then
    raise exception using errcode = '22023', message = 'payment currency does not match the paid award order';
  end if;
  if p_payment_amount_minor is not null and p_payment_amount_minor is distinct from v_payment_amount_minor then
    raise exception using errcode = '22023', message = 'payment amount does not match the paid award order';
  end if;
  if p_paid_at is not null
     and (v_order.award_paid_at is not null or v_order.paid_at is not null)
     and p_paid_at is distinct from v_paid_at then
    raise exception using errcode = '22023', message = 'payment timestamp does not match the paid award order';
  end if;

  -- Payment/source information remains the source of truth even when there is
  -- no commission attribution.
  update public.team_awardees
  set payment_status = 'paid',
      payment_currency = v_currency,
      payment_amount_minor = v_payment_amount_minor,
      paid_at = v_paid_at,
      payment_source_type = p_payment_type,
      payment_source_id = p_payment_id,
      payment_verified_at = now(),
      payment_note = null
  where id = p_awardee_id;

  select * into v_entry
  from public.team_commission_entries
  where team_id = p_team_id
    and payment_type = p_payment_type
    and payment_id = p_payment_id
    and entry_type = 'earning'
  order by (not exists (
    select 1 from public.team_commission_entries r
    where r.parent_commission_id = team_commission_entries.id
      and r.entry_type = 'reversal'
  )) desc, created_at desc, id desc
  limit 1;

  if found then
    select exists (
      select 1 from public.team_commission_entries r
      where r.parent_commission_id = v_entry.id and r.entry_type = 'reversal'
    ) into v_existing_reversal;
  end if;

  -- The service-only attribution view is the single winner-selection source
  -- for both the payment function and performance readers. This avoids a
  -- tie-break drift where a direct ledger insert could disagree with the view.
  select attr.*
  into v_eligible
  from public.team_payment_attributions attr
  where attr.team_id = p_team_id
    and attr.payment_id = p_payment_id
  limit 1;
  v_has_eligible := found;

  if v_has_eligible then
    -- A payment may have been attributed to an assignment that is now
    -- historical. End any later/current duplicate assignment that has no
    -- matching canonical attribution so the paid item cannot remain on a
    -- different rep's worklist. The winning assignment itself is preserved.
    update public.team_assignments a
    set status = 'removed',
        ended_at = coalesce(a.ended_at, now()),
        ended_by = null,
        end_reason = left('Verified payment attributed to another assignment', 500)
    where a.team_id = p_team_id
      and a.status = 'active'
      and a.id <> v_eligible.assignment_id
      and a.awardee_id in (
        select ta.id from public.team_awardees ta
        where ta.team_id = p_team_id
          and (
            ta.id = p_awardee_id
            or (v_awardee.public_awardee_id is not null and ta.public_awardee_id = v_awardee.public_awardee_id)
            or (v_awardee.profile_id is not null and ta.profile_id = v_awardee.profile_id)
          )
      );
    get diagnostics v_released = row_count;
  end if;

  if v_has_eligible and v_entry.id is not null and v_entry.agent_id = v_eligible.agent_id
     and not v_existing_reversal then
    return jsonb_build_object(
      'outcome', 'already_earned',
      'commission_id', v_entry.id,
      'agent_id', v_entry.agent_id,
      'assignment_id', v_eligible.assignment_id,
      'contact_id', v_eligible.contact_id,
      'contact_kind', v_eligible.contact_kind,
      'released_assignments', v_released,
      'provider_verified', v_eligible.provider_verified
    );
  end if;

  if v_entry.id is not null
     and (not v_has_eligible or v_entry.agent_id is distinct from v_eligible.agent_id or v_existing_reversal) then
    v_reversed_commission_id := v_entry.id;
    v_reversal_id := public.team_reverse_commission_entry(
      v_entry.id,
      case when not v_has_eligible
        then 'Verified payment had no qualifying pre-payment contact evidence.'
        else 'Verified payment attribution changed to the rep with qualifying pre-payment contact evidence.'
      end,
      p_actor
    );
  end if;

  if v_has_eligible and v_existing_reversal and v_entry.agent_id = v_eligible.agent_id then
    -- The old earning and its immutable reversal are the complete history for
    -- this same-agent replay. Do not attempt a second earning row (the
    -- per-agent unique index would reject it); return a stable idempotent
    -- outcome instead.
    return jsonb_build_object(
      'outcome', 'already_reversed',
      'commission_id', v_entry.id,
      'reversal_id', v_reversal_id,
      'agent_id', v_entry.agent_id,
      'assignment_id', v_eligible.assignment_id,
      'contact_id', v_eligible.contact_id,
      'contact_kind', v_eligible.contact_kind,
      'provider_verified', v_eligible.provider_verified,
      'released_assignments', v_released
    );
  end if;

  if not v_has_eligible then
    -- No qualifying contact means the payment remains visible to admins, but
    -- every active identity-linked assignment is ended so agents lose access
    -- to the paid worklist item. No notification is sent for this cleanup.
    update public.team_assignments a
    set status = 'removed',
        ended_at = coalesce(a.ended_at, now()),
        ended_by = null,
        end_reason = left('Verified payment without qualifying pre-payment contact evidence', 500)
    where a.team_id = p_team_id
      and a.status = 'active'
      and a.awardee_id in (
        select ta.id from public.team_awardees ta
        where ta.team_id = p_team_id
          and (
            ta.id = p_awardee_id
            or (v_awardee.public_awardee_id is not null and ta.public_awardee_id = v_awardee.public_awardee_id)
            or (v_awardee.profile_id is not null and ta.profile_id = v_awardee.profile_id)
          )
      );
    get diagnostics v_released = row_count;

    perform public.team_audit(
      p_team_id, p_actor, null, 'payment.verified_without_qualifying_contact',
      'award_order', p_payment_id::text,
      jsonb_build_object(
        'awardee_id', p_awardee_id,
        'payment_amount_minor', v_payment_amount_minor,
        'payment_currency', v_currency,
        'released_assignments', v_released,
        'reversed_commission_id', v_entry.id,
        'reversal_id', v_reversal_id
      )
    );

    return jsonb_build_object(
      'outcome', 'paid_without_qualifying_contact',
      'commission_id', null,
      'reversed_commission_id', v_entry.id,
      'reversal_id', v_reversal_id,
      'released_assignments', v_released,
      'eligible', false
    );
  end if;

  select * into v_rule
  from public.team_commission_rules r
  where r.team_id = p_team_id and r.is_active
    and r.payment_currency = v_currency
    and (r.country_scope is null or upper(r.country_scope) = upper(coalesce(v_awardee.country, '')))
  order by case when r.country_scope is null then 1 else 0 end,
    r.priority desc, r.created_at asc
  limit 1;

  if not found then
    perform public.team_audit(p_team_id, p_actor, null, 'payment.no_commission_rule', 'award_order', p_payment_id::text,
      jsonb_build_object('awardee_id', p_awardee_id, 'payment_currency', v_currency,
        'contact_id', v_eligible.contact_id, 'agent_id', v_eligible.agent_id));
    return jsonb_build_object('outcome', 'paid_without_rule', 'commission_id', null,
      'agent_id', v_eligible.agent_id, 'contact_id', v_eligible.contact_id,
      'released_assignments', v_released,
      'provider_verified', v_eligible.provider_verified);
  end if;

  select * into v_settings from public.team_settings where team_id = p_team_id;
  v_available_at := v_paid_at + make_interval(hours => coalesce(v_settings.commission_hold_hours, 0));

  -- The old earning, if any, remains immutable and is linked to a negative
  -- reversal above. The corrected rep receives a direct earning row.
  if v_entry.id is null or v_entry.agent_id is distinct from v_eligible.agent_id or v_existing_reversal then
    insert into public.team_commission_entries (
      team_id, awardee_id, agent_id, rule_id, entry_type, payment_type, payment_id,
      payment_currency, amount_minor, currency, status, available_at, earned_at,
      rule_snapshot, created_by
    ) values (
      p_team_id, v_eligible.team_awardee_id, v_eligible.agent_id, v_rule.id, 'earning',
      p_payment_type, p_payment_id, v_currency, v_rule.commission_amount_minor,
      v_rule.commission_currency,
      case when v_available_at <= now() then 'confirmed' else 'pending' end,
      v_available_at, v_paid_at,
      jsonb_build_object(
        'rule_id', v_rule.id,
        'rule_name', v_rule.name,
        'commission_amount_minor', v_rule.commission_amount_minor,
        'commission_currency', v_rule.commission_currency,
        'payment_currency', v_currency,
        'payment_amount_minor', v_payment_amount_minor,
        'country_scope', v_rule.country_scope,
        'attribution', jsonb_build_object(
        'assignment_id', v_eligible.assignment_id,
          'contact_id', v_eligible.contact_id,
          'contact_kind', v_eligible.contact_kind,
          'contact_channel', v_eligible.contact_channel,
          'contacted_at', v_eligible.contacted_at,
          'recorded_at', v_eligible.recorded_at,
          'provider_verified', v_eligible.provider_verified,
          'source_id', v_eligible.provider_source_id
        )
      ),
      p_actor
    ) returning * into v_entry;
  end if;

  select user_id into v_agent_user
  from public.team_memberships where id = v_eligible.agent_id;
  if v_agent_user is not null and not v_reconciliation then
    perform public.team_notify(
      p_team_id, v_agent_user, v_eligible.agent_id, 'commission_earned',
      'Commission earned',
      'A verified award payment generated a commission.',
      '/earnings'
    );
  end if;

  perform public.team_audit(p_team_id, p_actor, null, 'commission.created', 'commission_entry', v_entry.id::text,
    jsonb_build_object(
      'awardee_id', p_awardee_id,
      'agent_id', v_eligible.agent_id,
      'payment_id', p_payment_id,
      'amount_minor', v_rule.commission_amount_minor,
      'currency', v_rule.commission_currency,
      'assignment_id', v_eligible.assignment_id,
      'contact_id', v_eligible.contact_id,
      'provider_verified', v_eligible.provider_verified,
      'reversed_commission_id', v_reversed_commission_id,
      'released_assignments', v_released
    ));

  return jsonb_build_object(
    'outcome', case when v_reversal_id is null then 'commission_created' else 'commission_corrected' end,
    'commission_id', v_entry.id,
    'agent_id', v_eligible.agent_id,
    'assignment_id', v_eligible.assignment_id,
    'contact_id', v_eligible.contact_id,
    'contact_kind', v_eligible.contact_kind,
    'provider_verified', v_eligible.provider_verified,
    'amount_minor', v_rule.commission_amount_minor,
    'currency', v_rule.commission_currency,
    'released_assignments', v_released,
    'reversal_id', v_reversal_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Reconcile all paid orders, including already-created but now-invalid
-- earnings. The transaction-local marker suppresses agent notifications.
-- ---------------------------------------------------------------------------

create or replace function public.team_reconcile_payments(
  p_team_id uuid,
  p_actor uuid,
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_awardee public.team_awardees%rowtype;
  v_currency text;
  v_amount bigint;
  v_result jsonb;
  v_created integer := 0;
  v_corrected integer := 0;
  v_already integer := 0;
  v_no_rule integer := 0;
  v_uncredited integer := 0;
  v_scanned integer := 0;
  v_limit integer := case
    when p_limit is null or p_limit <= 0 then null
    else least(greatest(p_limit, 1), 2000)
  end;
begin
  if not (p_actor is null and current_setting('team.reconciliation_bootstrap', true) = 'on') then
    perform public.team_assert_admin(p_team_id, p_actor);
  end if;
  perform set_config('team.reconciliation', 'on', true);

  for v_order in
    select o.*
    from public.award_orders o
    left join lateral (
      select attr.agent_id, attr.assignment_id
      from public.team_payment_attributions attr
      where attr.team_id = p_team_id and attr.payment_id = o.id
      limit 1
    ) attr on true
    where o.award_payment_status = 'paid'
      and exists (
        select 1 from public.team_awardees ta
        where ta.team_id = p_team_id and (
          (o.awardee_id is not null and ta.public_awardee_id is not null and ta.public_awardee_id = o.awardee_id)
          or (
            ta.profile_id is not null
            and o.profile_id is not null
            and ta.profile_id = o.profile_id
            and (o.awardee_id is null or ta.public_awardee_id is null)
          )
        )
      )
    -- Process rows needing attribution/release/reversal first. A permanently
    -- oldest-first batch otherwise spends every run on already-reconciled
    -- history and can starve newly paid orders behind the 500-row cap.
    order by case when exists (
      select 1
      from public.team_awardees ta
      where ta.team_id = p_team_id and (
        (o.awardee_id is not null and ta.public_awardee_id is not null and ta.public_awardee_id = o.awardee_id)
        or (
          ta.profile_id is not null
          and o.profile_id is not null
          and ta.profile_id = o.profile_id
          and (o.awardee_id is null or ta.public_awardee_id is null)
        )
      )
      and (
        (attr.agent_id is null and (
          exists (select 1 from public.team_assignments aa where aa.team_id = p_team_id and aa.awardee_id = ta.id and aa.status = 'active')
          or exists (
            select 1 from public.team_commission_entries ee
            where ee.team_id = p_team_id and ee.payment_type = 'award_order' and ee.payment_id = o.id
              and ee.entry_type = 'earning'
              and not exists (select 1 from public.team_commission_entries rr where rr.parent_commission_id = ee.id and rr.entry_type = 'reversal')
          )
        ))
        or (attr.agent_id is not null and (
          not exists (
            select 1 from public.team_commission_entries ee
            where ee.team_id = p_team_id and ee.payment_type = 'award_order' and ee.payment_id = o.id
              and ee.entry_type = 'earning' and ee.agent_id = attr.agent_id
          )
          or exists (
            select 1 from public.team_commission_entries ee
            where ee.team_id = p_team_id and ee.payment_type = 'award_order' and ee.payment_id = o.id
              and ee.entry_type = 'earning'
              and ee.agent_id is distinct from attr.agent_id
              and not exists (select 1 from public.team_commission_entries rr where rr.parent_commission_id = ee.id and rr.entry_type = 'reversal')
          )
          or exists (
            select 1 from public.team_assignments aa
            where aa.team_id = p_team_id and aa.awardee_id = ta.id and aa.status = 'active'
              and aa.id is distinct from attr.assignment_id
          )
        ))
      )
    ) then 0 else 1 end,
    coalesce(o.award_paid_at, o.paid_at, o.created_at) asc, o.id
    limit v_limit
  loop
    v_scanned := v_scanned + 1;
    select ta.* into v_awardee
    from public.team_awardees ta
    where ta.team_id = p_team_id and (
      (v_order.awardee_id is not null and ta.public_awardee_id is not null and ta.public_awardee_id = v_order.awardee_id)
      or (
        ta.profile_id is not null
        and v_order.profile_id is not null
        and ta.profile_id = v_order.profile_id
        and (v_order.awardee_id is null or ta.public_awardee_id is null)
      )
    )
    order by ta.is_active desc, ta.created_at asc, ta.id
    limit 1;

    if found then
      v_currency := 'NGN';
      v_amount := coalesce(v_order.award_amount_kobo, 0);
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
        when 'commission_corrected' then v_corrected := v_corrected + 1;
        when 'already_earned' then v_already := v_already + 1;
        when 'already_reversed' then v_already := v_already + 1;
        when 'paid_without_rule' then v_no_rule := v_no_rule + 1;
        when 'paid_without_qualifying_contact' then
          v_uncredited := v_uncredited + 1;
          if v_result->>'reversal_id' is not null then
            v_corrected := v_corrected + 1;
          end if;
        else null;
      end case;
    end if;
  end loop;

  perform set_config('team.reconciliation', '', true);
  perform public.team_audit(p_team_id, p_actor, null, 'payments.reconciled', 'team', p_team_id::text,
    jsonb_build_object(
      'scanned', v_scanned,
      'created', v_created,
      'corrected', v_corrected,
      'already_reconciled', v_already,
      'paid_without_rule', v_no_rule,
      'paid_without_qualifying_contact', v_uncredited
    ));

  return jsonb_build_object(
    'scanned', v_scanned,
    'commissions_created', v_created,
    'commissions_corrected', v_corrected,
    'already_reconciled', v_already,
    'paid_without_rule', v_no_rule,
    'paid_without_qualifying_contact', v_uncredited
  );
end;
$$;

-- Migration/bootstrap reconciliation deliberately has no user actor and no
-- limit. It runs once under the same idempotent payment lock, so every paid
-- projection is checked without starving older rows behind the normal cron
-- batch size. Reconciliation notifications are suppressed by the transaction
-- marker set in team_reconcile_payments.
create or replace function public.team_reconcile_all_paid_attributions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team record;
  v_result jsonb;
  v_scanned bigint := 0;
  v_created bigint := 0;
  v_corrected bigint := 0;
  v_uncredited bigint := 0;
begin
  perform set_config('team.reconciliation_bootstrap', 'on', true);
  for v_team in select id from public.team_teams order by id loop
    v_result := public.team_reconcile_payments(v_team.id, null, null);
    v_scanned := v_scanned + coalesce((v_result->>'scanned')::bigint, 0);
    v_created := v_created + coalesce((v_result->>'commissions_created')::bigint, 0);
    v_corrected := v_corrected + coalesce((v_result->>'commissions_corrected')::bigint, 0);
    v_uncredited := v_uncredited + coalesce((v_result->>'paid_without_qualifying_contact')::bigint, 0);
  end loop;
  perform set_config('team.reconciliation_bootstrap', '', true);
  return jsonb_build_object(
    'teams', (select count(*) from public.team_teams),
    'scanned', v_scanned,
    'commissions_created', v_created,
    'commissions_corrected', v_corrected,
    'paid_without_qualifying_contact', v_uncredited
  );
end;
$$;

revoke all on function public.team_reconcile_all_paid_attributions() from public, anon, authenticated;
grant execute on function public.team_reconcile_all_paid_attributions() to service_role;

-- ---------------------------------------------------------------------------
-- 7. Preserve the existing admin reconciliation columns, then append the
-- attribution state/evidence columns for paid-uncredited visibility.
-- ---------------------------------------------------------------------------

create or replace view public.team_payment_reconciliation
with (security_invoker = true) as
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
    when o.award_payment_status = 'paid' and e.id is null and attr.payment_id is null then 'paid_without_qualifying_contact'
    when o.award_payment_status = 'paid' and e.id is null then 'missing_commission'
    when o.award_payment_status = 'paid' and e.id is not null and attr.payment_id is null
      and exists (select 1 from public.team_commission_entries r where r.parent_commission_id = e.id)
      then 'paid_without_qualifying_contact'
    when o.award_payment_status = 'paid' and e.id is not null and attr.payment_id is null then 'earning_without_qualifying_contact'
    when o.award_payment_status = 'paid' and e.id is not null then 'reconciled'
    when o.award_payment_status = 'refunded' and e.id is not null and not exists (
      select 1 from public.team_commission_entries r where r.parent_commission_id = e.id
    ) then 'missing_reversal'
    else 'informational'
  end as reconciliation_state,
  attr.agent_id as attribution_agent_id,
  attr.assignment_id as attribution_assignment_id,
  attr.contact_id as qualifying_contact_id,
  attr.contact_kind as qualifying_contact_kind,
  attr.contact_channel as qualifying_contact_channel,
  attr.contacted_at as qualifying_contacted_at,
  attr.recorded_at as qualifying_recorded_at,
  attr.provider_verified as qualifying_provider_verified
from public.team_awardees ta
join public.award_orders o on (
  (o.awardee_id is not null and ta.public_awardee_id is not null and ta.public_awardee_id = o.awardee_id)
  or (
    ta.profile_id is not null
    and o.profile_id is not null
    and ta.profile_id = o.profile_id
    and (o.awardee_id is null or ta.public_awardee_id is null)
  )
)
left join public.award_payment_attempts a on a.id = o.award_paid_attempt_id
left join lateral (
  select e.*
  from public.team_commission_entries e
  where e.team_id = ta.team_id
    and e.payment_type = 'award_order'
    and e.payment_id = o.id
    and e.entry_type = 'earning'
  order by (not exists (
    select 1 from public.team_commission_entries r
    where r.parent_commission_id = e.id and r.entry_type = 'reversal'
  )) desc, e.created_at desc, e.id desc
  limit 1
) e on true
left join public.team_payment_attributions attr
  on attr.team_id = ta.team_id and attr.payment_id = o.id;

revoke all on public.team_payment_reconciliation from public, anon, authenticated;
grant select on public.team_payment_reconciliation to service_role;

comment on function public.team_qualifying_contact(uuid, timestamptz) is
  'Returns provider-backed email or substantive staff-recorded call/WhatsApp evidence for one assignment, strictly before payment and within the assignment interval. Call/WhatsApp evidence is not independently provider verified.';
comment on view public.team_payment_attributions is
  'Service-role-only canonical paid-payment attribution. Rows exist only for a qualifying contact tied to the assignment owner at payment time.';
comment on table public.team_commission_entries is
  'Append-only commission ledger. Eligibility is proven by team_qualifying_contact; attribution corrections use immutable negative reversal rows.';

-- Repair existing paid projections/earnings in the same migration. The helper
-- is idempotent and emits no agent notifications; source payment rows and
-- settled withdrawal rows are never rewritten.
select public.team_reconcile_all_paid_attributions();

notify pgrst, 'reload schema';
commit;
