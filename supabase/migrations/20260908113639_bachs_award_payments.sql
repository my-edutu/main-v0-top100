-- Bachs award-fee payment model.
--
-- This migration is deliberately additive.  The legacy award_orders status,
-- Paystack columns, address columns, and GIG columns remain the source of
-- historical delivery data.  New Bachs award-fee state lives in the columns
-- and tables below, so confirming the award fee cannot start delivery.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Provider-neutral payment summary on the existing member order.
-- ---------------------------------------------------------------------------

alter table public.award_orders
  add column if not exists award_payment_status text not null default 'unpaid',
  add column if not exists award_paid_at timestamptz,
  add column if not exists award_paid_attempt_id uuid,
  add column if not exists award_price_version text not null default 'afl-award-2026-v1';

-- Existing paid Paystack orders are already paid for the award.  This only
-- writes the new summary columns; it intentionally does not rewrite status,
-- paid_at, Paystack evidence, or any courier column.
update public.award_orders
set award_payment_status = 'paid',
    award_paid_at = coalesce(award_paid_at, paid_at, created_at, now())
where award_payment_status <> 'refunded'
  and (
    status in ('paid', 'dispatched', 'in_transit', 'delivered')
    or paid_at is not null
    or lower(coalesce(paystack_status, '')) in (
      'paid', 'success', 'successful', 'succeeded', 'complete', 'completed',
      'accepted'
    )
  );

do $$
begin
  alter table public.award_orders
    add constraint award_orders_award_payment_status_check
    check (award_payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
exception when duplicate_object then null;
end;
$$;

create index if not exists award_orders_award_payment_status_idx
  on public.award_orders (award_payment_status);

-- ---------------------------------------------------------------------------
-- 2. Immutable business record for each provider checkout attempt.
-- ---------------------------------------------------------------------------

create table if not exists public.award_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.award_orders(id) on delete restrict,
  provider text not null check (provider in ('bachs', 'paystack')),
  charge_scope text not null check (charge_scope in ('award_fee', 'legacy_award_plus_delivery')),
  status text not null check (status in (
    'creating', 'open', 'processing', 'succeeded', 'duplicate_succeeded',
    'failed', 'expired', 'cancelled', 'underpaid', 'overpaid', 'refunded',
    'exception'
  )),
  price_version text not null,
  requested_amount_minor bigint not null check (requested_amount_minor >= 0),
  captured_amount_minor bigint check (captured_amount_minor is null or captured_amount_minor >= 0),
  currency char(3) not null check (currency in ('NGN', 'USD')),
  provider_reference text not null,
  provider_checkout_id text,
  provider_charge_id text,
  provider_status text,
  idempotency_key text not null,
  checkout_expires_at timestamptz,
  confirmed_at timestamptz,
  failure_reason text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists award_payment_attempts_order_idx
  on public.award_payment_attempts (order_id, created_at desc);
create index if not exists award_payment_attempts_order_status_idx
  on public.award_payment_attempts (order_id, status);
create unique index if not exists award_payment_attempts_provider_reference_uidx
  on public.award_payment_attempts (provider, provider_reference);
create unique index if not exists award_payment_attempts_provider_checkout_uidx
  on public.award_payment_attempts (provider, provider_checkout_id)
  where provider_checkout_id is not null;
create unique index if not exists award_payment_attempts_idempotency_key_uidx
  on public.award_payment_attempts (idempotency_key);
create unique index if not exists award_payment_attempts_one_success_uidx
  on public.award_payment_attempts (order_id)
  where charge_scope = 'award_fee' and status = 'succeeded';

create or replace function public.touch_award_payment_attempts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists award_payment_attempts_set_updated_at
  on public.award_payment_attempts;
create trigger award_payment_attempts_set_updated_at
  before update on public.award_payment_attempts
  for each row execute function public.touch_award_payment_attempts_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Append-only (apart from processing metadata) webhook delivery ledger.
-- ---------------------------------------------------------------------------

create table if not exists public.payment_webhook_events (
  id text primary key,
  provider text not null check (provider = 'bachs'),
  event_type text not null,
  organization_id text,
  payment_attempt_id uuid references public.award_payment_attempts(id) on delete set null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'exception')),
  payload jsonb not null,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payment_webhook_events_attempt_idx
  on public.payment_webhook_events (payment_attempt_id);
create index if not exists payment_webhook_events_status_idx
  on public.payment_webhook_events (processing_status, received_at);
create index if not exists payment_webhook_events_received_idx
  on public.payment_webhook_events (received_at desc);

-- The new FK is added only after both tables exist. NOT VALID lets this
-- additive migration survive a pre-existing, manually populated summary value;
-- all future writes are still checked by Postgres.
do $$
begin
  alter table public.award_orders
    add constraint award_orders_award_paid_attempt_fk
    foreign key (award_paid_attempt_id)
    references public.award_payment_attempts(id)
    on delete restrict
    not valid;
exception when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Legacy Paystack evidence backfill.
-- ---------------------------------------------------------------------------

-- Keep enough historical evidence to explain why an order was already paid or
-- why a member must not be charged again while a Paystack checkout is pending.
-- A historical row is never used to create a new provider checkout.
insert into public.award_payment_attempts (
  order_id,
  provider,
  charge_scope,
  status,
  price_version,
  requested_amount_minor,
  captured_amount_minor,
  currency,
  provider_reference,
  provider_status,
  idempotency_key,
  confirmed_at,
  created_at,
  updated_at
)
select
  o.id,
  'paystack',
  'legacy_award_plus_delivery',
  case
    when o.status in ('paid', 'dispatched', 'in_transit', 'delivered')
      or o.paid_at is not null
      or lower(coalesce(o.paystack_status, '')) in (
        'paid', 'success', 'successful', 'succeeded', 'complete', 'completed',
        'accepted'
      )
    then 'succeeded'
    when lower(coalesce(o.paystack_status, '')) in ('failed', 'reversed')
      then 'failed'
    when lower(coalesce(o.paystack_status, '')) = 'expired'
      then 'expired'
    when lower(coalesce(o.paystack_status, '')) in ('cancelled', 'abandoned')
      or o.status = 'cancelled'
      then 'cancelled'
    else 'open'
  end,
  'legacy-paystack',
  greatest(coalesce(o.total_amount_kobo, o.award_amount_kobo, 0), 0),
  case
    when o.status in ('paid', 'dispatched', 'in_transit', 'delivered')
      or o.paid_at is not null
      or lower(coalesce(o.paystack_status, '')) in (
        'paid', 'success', 'successful', 'succeeded', 'complete', 'completed',
        'accepted'
      )
    then greatest(coalesce(o.total_amount_kobo, o.award_amount_kobo, 0), 0)
    else null
  end,
  case when upper(coalesce(o.currency, 'NGN')) = 'USD' then 'USD' else 'NGN' end,
  o.paystack_reference,
  o.paystack_status,
  'legacy-paystack:' || o.paystack_reference,
  case
    when o.status in ('paid', 'dispatched', 'in_transit', 'delivered')
      or o.paid_at is not null
      or lower(coalesce(o.paystack_status, '')) in (
        'paid', 'success', 'successful', 'succeeded', 'complete', 'completed',
        'accepted'
      )
    then coalesce(o.paid_at, o.created_at, now())
    else null
  end,
  coalesce(o.created_at, now()),
  coalesce(o.updated_at, now())
from public.award_orders o
where o.paystack_reference is not null
on conflict (provider, provider_reference) do nothing;

-- A previously run copy of this migration may have left every unpaid legacy
-- reference as `open`. Reclassify only those historical rows from the durable
-- Paystack evidence, while leaving unresolved references open for support.
update public.award_payment_attempts a
set status = case
  when lower(coalesce(o.paystack_status, '')) in ('failed', 'reversed') then 'failed'
  when lower(coalesce(o.paystack_status, '')) = 'expired' then 'expired'
  when lower(coalesce(o.paystack_status, '')) in ('cancelled', 'abandoned')
    or o.status = 'cancelled' then 'cancelled'
  else a.status
end
from public.award_orders o
where a.order_id = o.id
  and a.provider = 'paystack'
  and a.charge_scope = 'legacy_award_plus_delivery'
  and a.provider_reference = o.paystack_reference
  and a.status = 'open'
  and (
    lower(coalesce(o.paystack_status, '')) in ('failed', 'reversed', 'expired', 'cancelled', 'abandoned')
    or o.status = 'cancelled'
  );

-- Keep the provider-neutral summary useful to the member view while retaining
-- an explicit refunded decision forever.
update public.award_orders
set award_payment_status = 'failed'
where award_payment_status = 'unpaid'
  and paystack_reference is not null
  and (
    lower(coalesce(paystack_status, '')) in ('failed', 'reversed', 'expired', 'cancelled', 'abandoned')
    or status = 'cancelled'
  );

-- Link a backfilled paid order to its historical attempt when one exists.
-- This updates only the new summary FK.
update public.award_orders o
set award_paid_attempt_id = a.id
from public.award_payment_attempts a
where o.award_paid_attempt_id is null
  and o.award_payment_status = 'paid'
  and a.order_id = o.id
  and a.provider = 'paystack'
  and a.charge_scope = 'legacy_award_plus_delivery'
  and a.status = 'succeeded';

-- ---------------------------------------------------------------------------
-- 5. RLS and grants.
-- ---------------------------------------------------------------------------

alter table public.award_payment_attempts enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Do not expose payment payloads, provider responses, or attempts to members.
-- Member APIs use the service-role client and return a deliberately smaller
-- provider-neutral projection.
revoke all on table public.award_payment_attempts from public, anon, authenticated;
revoke all on table public.payment_webhook_events from public, anon, authenticated;
grant select, insert, update on table public.award_payment_attempts to service_role;
grant select, insert, update on table public.payment_webhook_events to service_role;

drop policy if exists "Service role manages award payment attempts"
  on public.award_payment_attempts;
create policy "Service role manages award payment attempts"
  on public.award_payment_attempts
  for all to service_role
  using (true)
  with check (true);

-- Admin routes read this table through their service-role server client. No
-- authenticated key receives direct access to provider evidence.
drop policy if exists "Admins read award payment attempts"
  on public.award_payment_attempts;
revoke select on table public.award_payment_attempts from authenticated;

drop policy if exists "Service role manages payment webhook events"
  on public.payment_webhook_events;
create policy "Service role manages payment webhook events"
  on public.payment_webhook_events
  for all to service_role
  using (true)
  with check (true);

-- Event payloads are operational audit data; admin APIs use service_role.
drop policy if exists "Admins read payment webhook events"
  on public.payment_webhook_events;
revoke select on table public.payment_webhook_events from authenticated;

-- ---------------------------------------------------------------------------
-- 6. Concurrency-safe checkout reservation.
--
-- The member API supplies only a currency selector and server-created UUID /
-- reference / idempotency values. The amount is checked against the fixed
-- phase-one contract here as a second line of defence. The transaction locks
-- a per-profile advisory key and then the order row, so two browser requests
-- cannot create two live Bachs attempts.
-- ---------------------------------------------------------------------------

create or replace function public.reserve_bachs_award_checkout(
  p_profile_id uuid,
  p_attempt_id uuid,
  p_provider_reference text,
  p_idempotency_key text,
  p_currency text,
  p_requested_amount_minor bigint,
  p_price_version text default 'afl-award-2026-v1',
  p_checkout_expires_at timestamptz default (now() + interval '60 minutes')
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.award_orders%rowtype;
  v_profile public.profiles%rowtype;
  v_attempt public.award_payment_attempts%rowtype;
  v_currency text := upper(trim(p_currency));
  v_now timestamptz := now();
  v_legacy_status text;
begin
  if p_profile_id is null or p_attempt_id is null then
    raise exception using errcode = '22023', message = 'profile and attempt IDs are required';
  end if;
  if v_currency not in ('NGN', 'USD') then
    raise exception using errcode = '22023', message = 'unsupported award payment currency';
  end if;
  if p_requested_amount_minor is null
     or p_requested_amount_minor <> (
       case v_currency when 'NGN' then 2500000 when 'USD' then 2000 end
     ) then
    raise exception using errcode = '22023', message = 'award amount does not match the configured price';
  end if;
  if nullif(trim(p_provider_reference), '') is null
     or length(p_provider_reference) >= 128 then
    raise exception using errcode = '22023', message = 'provider reference is invalid';
  end if;
  if nullif(trim(p_idempotency_key), '') is null then
    raise exception using errcode = '22023', message = 'idempotency key is required';
  end if;

  -- hashtextextended is stable for the duration of this database and gives us
  -- a transaction-scoped lock without creating a member-visible lock table.
  perform pg_advisory_xact_lock(hashtextextended(p_profile_id::text, 0));

  select * into v_order
  from public.award_orders
  where profile_id = p_profile_id
    and status <> 'cancelled'
  order by created_at desc, id desc
  limit 1
  for update;

  if not found then
    -- A cancelled legacy order can still contain a real paid_at/Paystack
    -- record. Inspect paid evidence before creating a fresh active order so a
    -- historical cancellation cannot become a second charge.
    select * into v_order
    from public.award_orders
    where profile_id = p_profile_id
      and (
        award_payment_status = 'paid'
        or status in ('paid', 'dispatched', 'in_transit', 'delivered')
        or paid_at is not null
        or lower(coalesce(paystack_status, '')) in (
          'paid', 'success', 'successful', 'succeeded', 'complete', 'completed',
          'accepted'
        )
      )
    order by created_at desc, id desc
    limit 1
    for update;
  end if;

  -- A refund is a final support-owned decision. It remains unchargeable even
  -- when the attempt ledger has no corresponding exception row.
  if v_order.award_payment_status = 'refunded' then
    return jsonb_build_object(
      'outcome', 'blocked',
      'order_id', v_order.id,
      'attempt_id', null,
      'status', 'refunded'
    );
  end if;

  if not found then
    select * into v_profile
    from public.profiles
    where id = p_profile_id;
    if not found then
      raise exception using errcode = '23503', message = 'member profile was not found';
    end if;

    insert into public.award_orders (
      profile_id,
      status,
      -- `currency` and `award_amount_kobo` are legacy delivery columns. Keep
      -- their NGN contract for a newly created order; the Bachs attempt below
      -- is the source of truth for a USD or NGN award-fee payment.
      currency,
      award_amount_kobo,
      recipient_name,
      email,
      phone,
      award_payment_status,
      award_price_version
    ) values (
      p_profile_id,
      'draft',
      'NGN',
      2500000,
      v_profile.full_name,
      v_profile.email,
      v_profile.phone,
      'unpaid',
      coalesce(nullif(trim(p_price_version), ''), 'afl-award-2026-v1')
    )
    returning * into v_order;
  end if;

  -- A lagging summary must not make a paid legacy order chargeable.
  if v_order.award_payment_status = 'paid'
     or v_order.status in ('paid', 'dispatched', 'in_transit', 'delivered')
     or v_order.paid_at is not null
     or lower(coalesce(v_order.paystack_status, '')) in (
       'paid', 'success', 'successful', 'succeeded', 'complete', 'completed',
       'accepted'
     ) then
    if v_order.award_payment_status <> 'paid' then
      update public.award_orders
      set award_payment_status = 'paid',
          award_paid_at = coalesce(award_paid_at, paid_at, created_at, v_now)
      where id = v_order.id
        and award_payment_status <> 'refunded';
    end if;
    return jsonb_build_object(
      'outcome', 'already_paid',
      'order_id', v_order.id,
      'attempt_id', null,
      'status', 'paid'
    );
  end if;

  -- Historical Paystack references are deliberately blocking. A caller may
  -- retry a clearly failed/expired Paystack checkout through a legacy admin
  -- path, but a new Bachs charge must never race an unresolved old charge.
  v_legacy_status := lower(coalesce(v_order.paystack_status, ''));
  if v_order.paystack_reference is not null
     and v_legacy_status not in ('failed', 'abandoned', 'cancelled', 'expired', 'reversed') then
    return jsonb_build_object(
      'outcome', 'legacy_pending',
      'order_id', v_order.id,
      'attempt_id', null,
      'status', 'legacy_pending',
      'provider', 'paystack',
      'provider_reference', v_order.paystack_reference
    );
  end if;

  -- If this exact reservation was retried, return it idempotently.
  select * into v_attempt
  from public.award_payment_attempts
  where idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_attempt.order_id <> v_order.id or v_attempt.provider <> 'bachs' then
      raise exception using errcode = '23505', message = 'idempotency key belongs to another payment';
    end if;
    return jsonb_build_object(
      'outcome', 'existing',
      'order_id', v_attempt.order_id,
      'attempt_id', v_attempt.id,
      'status', v_attempt.status,
      'provider', v_attempt.provider,
      'provider_reference', v_attempt.provider_reference,
      'idempotency_key', v_attempt.idempotency_key,
      'currency', v_attempt.currency,
      'requested_amount_minor', v_attempt.requested_amount_minor,
      'checkout_expires_at', v_attempt.checkout_expires_at
    );
  end if;

  -- A live attempt wins over a concurrent request even when the second
  -- request generated a different idempotency key.
  select * into v_attempt
  from public.award_payment_attempts
  where order_id = v_order.id
    and provider = 'bachs'
    and charge_scope = 'award_fee'
    and status in ('creating', 'open', 'processing')
  order by created_at desc, id desc
  limit 1
  for update;
  if found then
    return jsonb_build_object(
      'outcome', 'existing',
      'order_id', v_attempt.order_id,
      'attempt_id', v_attempt.id,
      'status', v_attempt.status,
      'provider', v_attempt.provider,
      'provider_reference', v_attempt.provider_reference,
      'idempotency_key', v_attempt.idempotency_key,
      'currency', v_attempt.currency,
      'requested_amount_minor', v_attempt.requested_amount_minor,
      'checkout_expires_at', v_attempt.checkout_expires_at
    );
  end if;

  -- Provider terminal failure/expiry evidence is required before a new charge
  -- may be reserved. A local timeout alone can race a late success webhook.
  select * into v_attempt
  from public.award_payment_attempts
  where order_id = v_order.id
    and provider = 'bachs'
    and charge_scope = 'award_fee'
    and status in ('underpaid', 'overpaid', 'refunded', 'exception')
  order by created_at desc, id desc
  limit 1
  for update;
  if found then
    return jsonb_build_object(
      'outcome', 'blocked',
      'order_id', v_attempt.order_id,
      'attempt_id', v_attempt.id,
      'status', v_attempt.status,
      'provider', v_attempt.provider,
      'provider_reference', v_attempt.provider_reference,
      'idempotency_key', v_attempt.idempotency_key,
      'currency', v_attempt.currency,
      'requested_amount_minor', v_attempt.requested_amount_minor,
      'checkout_expires_at', v_attempt.checkout_expires_at
    );
  end if;

  insert into public.award_payment_attempts (
    id,
    order_id,
    provider,
    charge_scope,
    status,
    price_version,
    requested_amount_minor,
    currency,
    provider_reference,
    idempotency_key,
    checkout_expires_at
  ) values (
    p_attempt_id,
    v_order.id,
    'bachs',
    'award_fee',
    'creating',
    coalesce(nullif(trim(p_price_version), ''), 'afl-award-2026-v1'),
    p_requested_amount_minor,
    v_currency,
    p_provider_reference,
    p_idempotency_key,
    coalesce(p_checkout_expires_at, v_now + interval '60 minutes')
  )
  returning * into v_attempt;

  update public.award_orders
  set award_payment_status = 'pending',
      award_price_version = coalesce(nullif(trim(p_price_version), ''), award_price_version)
  where id = v_order.id
    and award_payment_status not in ('paid', 'refunded');

  return jsonb_build_object(
    'outcome', 'created',
    'order_id', v_attempt.order_id,
    'attempt_id', v_attempt.id,
    'status', v_attempt.status,
    'provider', v_attempt.provider,
    'provider_reference', v_attempt.provider_reference,
    'idempotency_key', v_attempt.idempotency_key,
    'currency', v_attempt.currency,
    'requested_amount_minor', v_attempt.requested_amount_minor,
    'checkout_expires_at', v_attempt.checkout_expires_at
  );
end;
$$;

comment on function public.reserve_bachs_award_checkout(uuid, uuid, text, text, text, bigint, text, timestamptz)
  is 'Reserves one server-priced Bachs award-fee attempt under a per-profile/order lock.';

revoke all on function public.reserve_bachs_award_checkout(uuid, uuid, text, text, text, bigint, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reserve_bachs_award_checkout(uuid, uuid, text, text, text, bigint, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 7. Guarded creation failure.
--
-- This is called only for an explicit provider rejection that proves no
-- checkout session exists. The order and attempt are locked in the same order
-- as webhook processing, so a late success cannot be turned into a retryable
-- failure after it has already claimed the payment.
-- ---------------------------------------------------------------------------

create or replace function public.fail_bachs_award_checkout_creation(
  p_attempt_id uuid,
  p_order_id uuid,
  p_failure_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.award_payment_attempts%rowtype;
  v_order public.award_orders%rowtype;
  v_reason text := left(coalesce(nullif(trim(p_failure_reason), ''), 'Bachs rejected checkout creation.'), 500);
begin
  if p_attempt_id is null or p_order_id is null then
    raise exception using errcode = '22023', message = 'attempt and order IDs are required';
  end if;

  select * into v_order
  from public.award_orders
  where id = p_order_id
  for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found', 'attempt_id', p_attempt_id);
  end if;

  select * into v_attempt
  from public.award_payment_attempts
  where id = p_attempt_id
    and order_id = p_order_id
  for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found', 'attempt_id', p_attempt_id);
  end if;

  if v_attempt.status <> 'creating' then
    return jsonb_build_object(
      'outcome', 'unchanged',
      'attempt_id', v_attempt.id,
      'status', v_attempt.status
    );
  end if;

  update public.award_payment_attempts
  set status = 'failed',
      failure_reason = v_reason
  where id = v_attempt.id
    and order_id = p_order_id
    and status = 'creating';

  update public.award_orders
  set award_payment_status = 'failed'
  where id = p_order_id
    and award_payment_status = 'pending'
    and not exists (
      select 1
      from public.award_payment_attempts
      where order_id = p_order_id
        and status in ('creating', 'open', 'processing')
    );

  return jsonb_build_object('outcome', 'failed', 'attempt_id', v_attempt.id, 'status', 'failed');
end;
$$;

comment on function public.fail_bachs_award_checkout_creation(uuid, uuid, text)
  is 'Marks one explicitly rejected Bachs checkout reservation failed without racing a webhook success.';

revoke all on function public.fail_bachs_award_checkout_creation(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.fail_bachs_award_checkout_creation(uuid, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 8. Atomic award success claim.
-- ---------------------------------------------------------------------------

create or replace function public.claim_bachs_award_payment_success(
  p_attempt_id uuid,
  p_captured_amount_minor bigint,
  p_provider_status text,
  p_provider_charge_id text default null,
  p_confirmed_at timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.award_payment_attempts%rowtype;
  v_order public.award_orders%rowtype;
  v_confirmed_at timestamptz := coalesce(p_confirmed_at, now());
begin
  if p_attempt_id is null or p_captured_amount_minor is null or p_captured_amount_minor < 0 then
    raise exception using errcode = '22023', message = 'a valid Bachs attempt and amount are required';
  end if;
  if upper(coalesce(p_provider_status, '')) not in ('SUCCEEDED', 'ACCEPTED') then
    raise exception using errcode = '22023', message = 'provider status is not a terminal success';
  end if;

  -- Order first, then attempt: the reservation RPC takes the same lock order,
  -- preventing a webhook/reservation deadlock under concurrent delivery.
  select o.* into v_order
  from public.award_orders o
  join public.award_payment_attempts a on a.order_id = o.id
  where a.id = p_attempt_id
  for update of o;
  if not found then
    raise exception using errcode = '22023', message = 'Bachs payment attempt was not found';
  end if;

  select * into v_attempt
  from public.award_payment_attempts
  where id = p_attempt_id
  for update;
  if not found or v_attempt.provider <> 'bachs' or v_attempt.charge_scope <> 'award_fee' then
    raise exception using errcode = '22023', message = 'attempt is not a Bachs award-fee attempt';
  end if;
  if p_captured_amount_minor <> v_attempt.requested_amount_minor then
    raise exception using errcode = '22023', message = 'captured amount does not match the reserved amount';
  end if;

  if v_order.award_payment_status = 'refunded' then
    update public.award_payment_attempts
    set status = 'exception',
        captured_amount_minor = p_captured_amount_minor,
        provider_status = p_provider_status,
        provider_charge_id = p_provider_charge_id,
        confirmed_at = v_confirmed_at,
        failure_reason = 'Late success conflicted with a refunded award payment.'
    where id = p_attempt_id
      and status <> 'succeeded';
    return 'exception';
  end if;

  if v_order.award_payment_status = 'paid'
     or v_order.status in ('paid', 'dispatched', 'in_transit', 'delivered')
     or v_order.paid_at is not null
     or lower(coalesce(v_order.paystack_status, '')) in (
       'paid', 'success', 'successful', 'succeeded', 'complete', 'completed',
       'accepted'
     ) then
    -- A lagging summary must not let a late Bachs success charge a legacy
    -- paid order. Bring only the new summary column up to date when needed.
    if v_order.award_payment_status <> 'paid' then
      update public.award_orders
      set award_payment_status = 'paid',
          award_paid_at = coalesce(award_paid_at, paid_at, created_at, now())
      where id = v_order.id
        and award_payment_status <> 'refunded';
    end if;
    -- A duplicate delivery for the same attempt is harmless and must not turn
    -- the successful attempt itself into a duplicate exception.
    if v_order.award_paid_attempt_id = p_attempt_id then
      return 'succeeded';
    end if;
    update public.award_payment_attempts
    set status = 'duplicate_succeeded',
        captured_amount_minor = p_captured_amount_minor,
        provider_status = p_provider_status,
        provider_charge_id = p_provider_charge_id,
        confirmed_at = v_confirmed_at,
        failure_reason = 'Another award-fee attempt already claimed this order.'
    where id = p_attempt_id
      and status <> 'succeeded';
    return 'duplicate_succeeded';
  end if;

  if v_attempt.status not in ('open', 'processing', 'creating') then
    raise exception using errcode = '22023', message = 'Bachs attempt is not claimable';
  end if;
  update public.award_payment_attempts
  set status = 'succeeded',
      captured_amount_minor = p_captured_amount_minor,
      provider_status = p_provider_status,
      provider_charge_id = p_provider_charge_id,
      confirmed_at = v_confirmed_at,
      failure_reason = null
  where id = p_attempt_id
    and status in ('open', 'processing', 'creating');

  update public.award_orders
  set award_payment_status = 'paid',
      award_paid_at = v_confirmed_at,
      award_paid_attempt_id = p_attempt_id
  where id = v_order.id
    and award_payment_status not in ('paid', 'refunded');

  return 'succeeded';
end;
$$;

comment on function public.claim_bachs_award_payment_success(uuid, bigint, text, text, timestamptz)
  is 'Atomically claims one exact-match Bachs award-fee success; never changes delivery state.';

revoke all on function public.claim_bachs_award_payment_success(uuid, bigint, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_bachs_award_payment_success(uuid, bigint, text, text, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 8. Atomic event ledger + attempt processing.
--
-- The webhook adapter verifies the raw signature and provider payload before
-- calling this service-role-only function. This function owns durable event
-- dedupe and all state writes in one transaction. It returns
-- notification_needed=true only when this call made a fresh successful claim;
-- email delivery remains outside the transaction and is separately deduped by
-- the existing notification log.
-- ---------------------------------------------------------------------------

create or replace function public.process_bachs_webhook_event(
  p_event_id text,
  p_event_type text,
  p_organization_id text,
  p_attempt_id uuid,
  p_provider_checkout_id text,
  p_provider_reference text,
  p_provider_status text,
  p_captured_amount_minor bigint,
  p_currency text,
  p_provider_charge_id text,
  p_payload jsonb,
  p_received_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.payment_webhook_events%rowtype;
  v_attempt public.award_payment_attempts%rowtype;
  v_order public.award_orders%rowtype;
  v_currency text := upper(trim(p_currency));
  v_claim text;
  v_now timestamptz := now();
  v_error text;
begin
  if nullif(trim(p_event_id), '') is null or p_payload is null then
    raise exception using errcode = '22023', message = 'event ID and payload are required';
  end if;

  insert into public.payment_webhook_events (
    id, provider, event_type, organization_id, payment_attempt_id,
    processing_status, payload, received_at
  ) values (
    p_event_id, 'bachs', coalesce(nullif(trim(p_event_type), ''), 'unknown'),
    p_organization_id, p_attempt_id, 'received', p_payload,
    coalesce(p_received_at, v_now)
  )
  on conflict (id) do nothing;

  select * into v_event
  from public.payment_webhook_events
  where id = p_event_id
  for update;

  if v_event.processing_status in ('processed', 'ignored', 'exception') then
    return jsonb_build_object(
      'outcome', 'duplicate_event',
      'event_id', p_event_id,
      'attempt_id', v_event.payment_attempt_id,
      'processing_status', v_event.processing_status,
      'notification_needed', false
    );
  end if;

  if v_event.event_type is distinct from p_event_type
     or v_event.organization_id is distinct from p_organization_id
     or v_event.payment_attempt_id is distinct from p_attempt_id
     or v_event.payload is distinct from p_payload then
    update public.payment_webhook_events
    set processing_status = 'exception', processed_at = v_now,
        error = 'event ID was reused with different evidence'
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', 'exception', 'event_id', p_event_id,
      'attempt_id', v_event.payment_attempt_id, 'notification_needed', false
    );
  end if;

  if p_captured_amount_minor is not null and p_captured_amount_minor < 0 then
    update public.payment_webhook_events
    set processing_status = 'exception', processed_at = v_now,
        error = 'captured amount was negative'
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', 'exception', 'event_id', p_event_id,
      'attempt_id', p_attempt_id, 'notification_needed', false
    );
  end if;

  -- Event types outside the four subscribed phase-one events are durable but
  -- harmless. They are acknowledged as ignored so they cannot retry forever.
  if p_event_type not in (
    'collection.succeeded', 'collection.failed',
    'collection.underpaid', 'checkout.expired'
  ) then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = v_now,
        error = 'unsupported event type'
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', 'ignored', 'event_id', p_event_id,
      'attempt_id', p_attempt_id, 'notification_needed', false
    );
  end if;

  if p_attempt_id is null then
    update public.payment_webhook_events
    set processing_status = 'exception', processed_at = v_now,
        error = 'unmatched attempt'
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', 'exception', 'event_id', p_event_id,
      'attempt_id', null, 'notification_needed', false
    );
  end if;

  if nullif(trim(p_provider_checkout_id), '') is null
     and nullif(trim(p_provider_reference), '') is null then
    update public.payment_webhook_events
    set processing_status = 'exception', processed_at = v_now,
        error = 'provider checkout or reference was missing',
        payment_attempt_id = p_attempt_id
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', 'exception', 'event_id', p_event_id,
      'attempt_id', p_attempt_id, 'notification_needed', false
    );
  end if;

  -- Lock the order before the attempt, matching the claim function's lock
  -- order. Matching identifiers are checked again inside the transaction so a
  -- stale/incorrect adapter result cannot mutate another attempt.
  select o.* into v_order
  from public.award_orders o
  join public.award_payment_attempts a on a.order_id = o.id
  where a.id = p_attempt_id
  for update of o;
  if not found then
    update public.payment_webhook_events
    set processing_status = 'exception', processed_at = v_now,
        error = 'unmatched attempt'
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', 'exception', 'event_id', p_event_id,
      'attempt_id', p_attempt_id, 'notification_needed', false
    );
  end if;

  select * into v_attempt
  from public.award_payment_attempts
  where id = p_attempt_id
  for update;

  if v_attempt.provider <> 'bachs'
     or v_attempt.charge_scope <> 'award_fee'
     or (p_provider_reference is not null and p_provider_reference <> v_attempt.provider_reference)
     or (p_provider_checkout_id is not null and v_attempt.provider_checkout_id is not null
         and p_provider_checkout_id <> v_attempt.provider_checkout_id)
     or (v_currency is not null and v_currency <> v_attempt.currency) then
    v_error := 'provider evidence did not match the reserved attempt';
    update public.payment_webhook_events
    set processing_status = 'exception', processed_at = v_now, error = v_error,
        payment_attempt_id = p_attempt_id
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', 'exception', 'event_id', p_event_id,
      'attempt_id', p_attempt_id, 'notification_needed', false
    );
  end if;

  if p_event_type = 'collection.succeeded' then
    if v_currency is null
       or upper(coalesce(p_provider_status, '')) not in ('SUCCEEDED', 'ACCEPTED')
       or p_captured_amount_minor is null then
      update public.award_payment_attempts
      set status = 'exception', failure_reason = 'Missing or non-terminal success evidence.'
      where id = p_attempt_id and status in ('creating', 'open', 'processing');
      update public.award_orders
      set award_payment_status = 'failed'
      where id = v_order.id
        and award_payment_status not in ('paid', 'refunded');
      update public.payment_webhook_events
      set processing_status = 'exception', processed_at = v_now,
          error = 'missing or non-terminal success evidence',
          payment_attempt_id = p_attempt_id
      where id = p_event_id;
      return jsonb_build_object(
        'outcome', 'exception', 'event_id', p_event_id,
        'attempt_id', p_attempt_id, 'notification_needed', false
      );
    end if;

    if p_captured_amount_minor < v_attempt.requested_amount_minor then
      update public.award_payment_attempts
      set status = 'underpaid', captured_amount_minor = p_captured_amount_minor,
          provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
          failure_reason = 'Captured amount was below the reserved amount.'
      where id = p_attempt_id and status in ('creating', 'open', 'processing');
      update public.award_orders
      set award_payment_status = 'failed'
      where id = v_order.id
        and award_payment_status not in ('paid', 'refunded');
      update public.payment_webhook_events
      set processing_status = 'processed', processed_at = v_now,
          payment_attempt_id = p_attempt_id
      where id = p_event_id;
      return jsonb_build_object(
        'outcome', 'processed', 'event_id', p_event_id,
        'attempt_id', p_attempt_id, 'attempt_status', 'underpaid',
        'notification_needed', false
      );
    end if;

    if p_captured_amount_minor > v_attempt.requested_amount_minor then
      update public.award_payment_attempts
      set status = 'overpaid', captured_amount_minor = p_captured_amount_minor,
          provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
          failure_reason = 'Captured amount was above the reserved amount.'
      where id = p_attempt_id and status in ('creating', 'open', 'processing');
      update public.award_orders
      set award_payment_status = 'failed'
      where id = v_order.id
        and award_payment_status not in ('paid', 'refunded');
      update public.payment_webhook_events
      set processing_status = 'exception', processed_at = v_now,
          error = 'captured amount was above the reserved amount',
          payment_attempt_id = p_attempt_id
      where id = p_event_id;
      return jsonb_build_object(
        'outcome', 'exception', 'event_id', p_event_id,
        'attempt_id', p_attempt_id, 'attempt_status', 'overpaid',
        'notification_needed', false
      );
    end if;

    -- A provider-terminal failure/expiry or a reconciliation exception is
    -- deliberately sticky. A late exact success is recorded as an exception
    -- with its evidence instead of raising and retrying forever.
    if v_attempt.status not in ('open', 'processing', 'creating') then
      if v_order.award_payment_status = 'refunded'
         and v_attempt.status in ('succeeded', 'duplicate_succeeded') then
        -- A refund is a support-owned terminal decision. A replayed success
        -- event must remain processed without rewriting the successful attempt
        -- into an exception or restoring the order to paid.
        update public.payment_webhook_events
        set processing_status = 'processed', processed_at = v_now,
            payment_attempt_id = p_attempt_id
        where id = p_event_id;
        return jsonb_build_object(
          'outcome', v_attempt.status, 'event_id', p_event_id,
          'attempt_id', p_attempt_id, 'attempt_status', v_attempt.status,
          'notification_needed', false
        );
      elsif v_attempt.status = 'succeeded'
         and v_order.award_payment_status = 'paid'
         and v_order.award_paid_attempt_id = p_attempt_id then
        update public.payment_webhook_events
        set processing_status = 'processed', processed_at = v_now,
            payment_attempt_id = p_attempt_id
        where id = p_event_id;
        return jsonb_build_object(
          'outcome', 'succeeded', 'event_id', p_event_id,
          'attempt_id', p_attempt_id, 'attempt_status', 'succeeded',
          'notification_needed', false
        );
      elsif v_attempt.status = 'duplicate_succeeded' then
        update public.payment_webhook_events
        set processing_status = 'processed', processed_at = v_now,
            payment_attempt_id = p_attempt_id
        where id = p_event_id;
        return jsonb_build_object(
          'outcome', 'duplicate_succeeded', 'event_id', p_event_id,
          'attempt_id', p_attempt_id, 'attempt_status', 'duplicate_succeeded',
          'notification_needed', false
        );
      end if;

      update public.award_payment_attempts
      set status = 'exception',
          captured_amount_minor = p_captured_amount_minor,
          provider_status = p_provider_status,
          provider_charge_id = p_provider_charge_id,
          failure_reason = 'Late success conflicted with a terminal attempt state.'
      where id = p_attempt_id;
      update public.award_orders
      set award_payment_status = 'failed'
      where id = v_order.id
        and award_payment_status not in ('paid', 'refunded');
      update public.payment_webhook_events
      set processing_status = 'exception', processed_at = v_now,
          error = 'late success conflicted with a terminal attempt state',
          payment_attempt_id = p_attempt_id
      where id = p_event_id;
      return jsonb_build_object(
        'outcome', 'exception', 'event_id', p_event_id,
        'attempt_id', p_attempt_id, 'attempt_status', 'exception',
        'notification_needed', false
      );
    end if;

    v_claim := public.claim_bachs_award_payment_success(
      p_attempt_id,
      p_captured_amount_minor,
      p_provider_status,
      p_provider_charge_id,
      v_now
    );
    update public.payment_webhook_events
    set processing_status = 'processed', processed_at = v_now,
        payment_attempt_id = p_attempt_id
    where id = p_event_id;
    return jsonb_build_object(
      'outcome', v_claim, 'event_id', p_event_id,
      'attempt_id', p_attempt_id, 'attempt_status', v_claim,
      'notification_needed', (v_claim = 'succeeded' and v_order.award_payment_status <> 'paid')
    );
  end if;

  if p_event_type = 'collection.underpaid' then
    if p_captured_amount_minor is null then
      update public.award_payment_attempts
      set status = 'exception', failure_reason = 'Underpaid event omitted captured amount.'
      where id = p_attempt_id and status in ('creating', 'open', 'processing');
      update public.award_orders
      set award_payment_status = 'failed'
      where id = v_order.id
        and award_payment_status not in ('paid', 'refunded');
      update public.payment_webhook_events
      set processing_status = 'exception', processed_at = v_now,
          error = 'underpaid event omitted captured amount',
          payment_attempt_id = p_attempt_id
      where id = p_event_id;
      return jsonb_build_object(
        'outcome', 'exception', 'event_id', p_event_id,
        'attempt_id', p_attempt_id, 'notification_needed', false
      );
    end if;
    update public.award_payment_attempts
    set status = 'underpaid', captured_amount_minor = p_captured_amount_minor,
        provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
        failure_reason = 'Provider reported an underpaid collection.'
    where id = p_attempt_id and status in ('creating', 'open', 'processing');
    update public.award_orders
    set award_payment_status = 'failed'
    where id = v_order.id
      and award_payment_status not in ('paid', 'refunded');
  elsif p_event_type = 'collection.failed' then
    update public.award_payment_attempts
    set status = 'failed', provider_status = p_provider_status,
        provider_charge_id = p_provider_charge_id,
        failure_reason = 'Provider reported a failed collection.'
    where id = p_attempt_id and status in ('creating', 'open', 'processing');
    update public.award_orders
    set award_payment_status = 'failed'
    where id = v_order.id
      and award_payment_status not in ('paid', 'refunded');
  elsif p_event_type = 'checkout.expired' then
    update public.award_payment_attempts
    set status = 'expired', provider_status = p_provider_status,
        provider_charge_id = p_provider_charge_id,
        failure_reason = 'Provider checkout expired.'
    where id = p_attempt_id and status in ('creating', 'open', 'processing');
    update public.award_orders
    set award_payment_status = 'failed'
    where id = v_order.id
      and award_payment_status not in ('paid', 'refunded');
  end if;

  update public.payment_webhook_events
  set processing_status = 'processed', processed_at = v_now,
      payment_attempt_id = p_attempt_id
  where id = p_event_id;
  return jsonb_build_object(
    'outcome', 'processed', 'event_id', p_event_id,
    'attempt_id', p_attempt_id, 'attempt_status',
    (select status from public.award_payment_attempts where id = p_attempt_id),
    'notification_needed', false
  );
end;
$$;

comment on function public.process_bachs_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz)
  is 'Deduplicates and processes one verified Bachs webhook atomically with the award payment claim.';

revoke all on function public.process_bachs_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.process_bachs_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz)
  to service_role;

-- Keep function ACLs explicit even on projects with a broad default privilege
-- grant. No payment RPC is a public PostgREST endpoint.
revoke execute on function public.touch_award_payment_attempts_updated_at() from public, anon, authenticated;
grant execute on function public.touch_award_payment_attempts_updated_at() to service_role;
