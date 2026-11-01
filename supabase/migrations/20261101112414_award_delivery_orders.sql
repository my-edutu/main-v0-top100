-- Separate paid delivery attempts for confirmed Africa Future Leaders awards.
--
-- This migration is intentionally additive.  `award_orders` remains the
-- historical award-fee/legacy-delivery record; this table owns only the
-- separately paid delivery quote, checkout, and GIG booking lifecycle.

create extension if not exists "pgcrypto";

create table if not exists public.award_delivery_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.award_orders(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,

  -- These three values are the server-priced delivery contract.  They may not
  -- be edited once inserted; a fresh quote is a fresh row.
  quote_input jsonb not null default '{}'::jsonb,
  resolved_delivery jsonb not null default '{}'::jsonb,
  carrier_quote jsonb not null default '{}'::jsonb,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  expires_at timestamptz not null default (now() + interval '15 minutes'),

  status text not null default 'quoted' check (status in (
    'quoted', 'creating', 'open', 'paid', 'booking', 'dispatched',
    'expired', 'needs_review'
  )),
  reference text not null unique
    default ('afl-delivery-' || gen_random_uuid()::text),

  -- Provider checkout binding and payment evidence.  Checkout identity is
  -- first-write-only; settlement evidence may advance from open to terminal
  -- paid/expired/review evidence, while terminal paid evidence is immutable.
  checkout_id text unique,
  checkout_url text,
  checkout_expires_at timestamptz,
  checkout_request text,
  charge_id text unique,
  paid_at timestamptz,

  -- Dispatch is explicitly claimed before the external GIG call.  A timeout
  -- leaves status=booking and is never automatically reclaimed.
  booking_started_at timestamptz,
  waybill text unique,
  tracking_url text,
  booking_response jsonb,
  payment_evidence jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists award_delivery_orders_order_idx
  on public.award_delivery_orders (order_id, created_at desc);
create index if not exists award_delivery_orders_member_idx
  on public.award_delivery_orders (member_id, created_at desc);
create index if not exists award_delivery_orders_status_idx
  on public.award_delivery_orders (status, created_at desc);

-- Keep operational metadata fresh without touching immutable quote fields.
create or replace function public.touch_award_delivery_orders_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists award_delivery_orders_set_updated_at
  on public.award_delivery_orders;
create trigger award_delivery_orders_set_updated_at
  before update on public.award_delivery_orders
  for each row execute function public.touch_award_delivery_orders_updated_at();

-- A delivery row is an immutable quote/attempt history record.  The only
-- quote-side exception is the server-generated checkout_request idempotency
-- key: it may be written exactly once while the row is still `creating`.
create or replace function public.guard_award_delivery_order_immutability()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if row(
    new.id,
    new.order_id,
    new.member_id,
    new.quote_input,
    new.resolved_delivery,
    new.carrier_quote,
    new.amount_minor,
    new.currency,
    new.expires_at,
    new.reference
  ) is distinct from row(
    old.id,
    old.order_id,
    old.member_id,
    old.quote_input,
    old.resolved_delivery,
    old.carrier_quote,
    old.amount_minor,
    old.currency,
    old.expires_at,
    old.reference
  ) then
    raise exception using
      errcode = '55000',
      message = 'award delivery quote fields are immutable; create a fresh quote';
  end if;

  if new.checkout_request is distinct from old.checkout_request
     and (
       old.status <> 'creating'
       or new.status <> 'creating'
       or old.checkout_request is not null
       or new.checkout_request is null
     ) then
    raise exception using
      errcode = '55000',
      message = 'checkout_request is first-write-only while the delivery is creating';
  end if;

  if old.checkout_id is not null
     and new.checkout_id is distinct from old.checkout_id then
    raise exception using errcode = '55000', message = 'checkout_id is immutable once bound';
  end if;
  if old.checkout_url is not null
     and new.checkout_url is distinct from old.checkout_url then
    raise exception using errcode = '55000', message = 'checkout_url is immutable once bound';
  end if;
  if old.checkout_expires_at is not null
     and new.checkout_expires_at is distinct from old.checkout_expires_at then
    raise exception using errcode = '55000', message = 'checkout expiry is immutable once bound';
  end if;
  if old.charge_id is not null
     and new.charge_id is distinct from old.charge_id then
    raise exception using errcode = '55000', message = 'charge_id is immutable once settled';
  end if;
  if old.paid_at is not null
     and new.paid_at is distinct from old.paid_at then
    raise exception using errcode = '55000', message = 'paid_at is immutable once settled';
  end if;
  if old.booking_started_at is not null
     and new.booking_started_at is distinct from old.booking_started_at then
    raise exception using errcode = '55000', message = 'booking_started_at is immutable once claimed';
  end if;
  if old.waybill is not null
     and new.waybill is distinct from old.waybill then
    raise exception using errcode = '55000', message = 'waybill is immutable once dispatched';
  end if;
  if old.status in ('paid', 'dispatched')
     and new.payment_evidence is distinct from old.payment_evidence then
    raise exception using errcode = '55000', message = 'paid payment evidence is immutable';
  end if;
  if old.status = 'dispatched' and new.status <> 'dispatched' then
    raise exception using errcode = '55000', message = 'a dispatched delivery cannot move backwards';
  end if;
  if old.status = 'creating'
     and new.status = 'expired'
     and old.checkout_id is not null
     and new.payment_evidence is null then
    raise exception using
      errcode = '55000',
      message = 'a bound checkout may expire only through authenticated settlement';
  end if;

  return new;
end;
$$;

drop trigger if exists award_delivery_orders_guard_immutability
  on public.award_delivery_orders;
create trigger award_delivery_orders_guard_immutability
  before update on public.award_delivery_orders
  for each row execute function public.guard_award_delivery_order_immutability();

-- Never expose delivery addresses, email, phone numbers, provider checkout
-- URLs, or payment evidence through direct member/anonymous Data API access.
alter table public.award_delivery_orders enable row level security;
revoke all on table public.award_delivery_orders from public, anon, authenticated;
grant select, insert, update on table public.award_delivery_orders to service_role;
-- The paid guard reads the canonical award-fee attempt; this grant remains
-- service-only and does not expose payment evidence to member roles.
grant select on table public.award_payment_attempts to service_role;

drop policy if exists "Service role manages award delivery orders"
  on public.award_delivery_orders;
create policy "Service role manages award delivery orders"
  on public.award_delivery_orders
  for all to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.award_delivery_order_is_paid(p_order public.award_orders)
returns boolean
language sql
security invoker
set search_path = public
as $$
  select (p_order).status <> 'cancelled'
    and coalesce((p_order).award_payment_status, '') <> 'refunded'
    and (
      (
        (p_order).award_payment_status = 'paid'
        and (p_order).award_paid_at is not null
        and (p_order).award_paid_attempt_id is not null
        and exists (
          select 1
          from public.award_payment_attempts a
          where a.id = (p_order).award_paid_attempt_id
            and a.order_id = (p_order).id
            and a.provider = 'bachs'
            and a.charge_scope = 'award_fee'
            and a.status = 'succeeded'
            and a.captured_amount_minor is not null
            and a.captured_amount_minor = a.requested_amount_minor
            and (
              (a.currency = 'NGN' and a.requested_amount_minor = 2500000)
              or (a.currency = 'USD' and a.requested_amount_minor = 2000)
            )
        )
      )
      or (
        (p_order).paid_at is not null
        and (p_order).paystack_reference is not null
        and lower(coalesce((p_order).paystack_status, '')) in (
          'paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted'
        )
      )
    );
$$;

create or replace function public.award_delivery_order_has_legacy_dispatch(p_order public.award_orders)
returns boolean
language sql
security invoker
set search_path = public
as $$
  select p_order.gig_waybill is not null
    or p_order.status in ('dispatched', 'in_transit', 'delivered');
$$;

-- ---------------------------------------------------------------------------
-- Quote creation
-- ---------------------------------------------------------------------------

create or replace function public.save_award_delivery_quote(
  p_member uuid,
  p_input jsonb,
  p_delivery jsonb,
  p_amount bigint,
  p_carrier jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.award_orders%rowtype;
  v_profile public.profiles%rowtype;
  v_delivery public.award_delivery_orders%rowtype;
  v_email text;
begin
  if p_member is null then
    raise exception using errcode = '22023', message = 'member is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'delivery amount must be positive';
  end if;
  if p_input is not null and jsonb_typeof(p_input) <> 'object' then
    raise exception using errcode = '22023', message = 'quote input must be an object';
  end if;
  if p_delivery is null or jsonb_typeof(p_delivery) <> 'object' then
    raise exception using errcode = '22023', message = 'resolved delivery is required';
  end if;
  if p_carrier is null or jsonb_typeof(p_carrier) <> 'object' then
    raise exception using errcode = '22023', message = 'carrier quote is required';
  end if;

  -- The parent order is always locked before any delivery row.  This is the
  -- same lock order used by reserve, settlement, and dispatch claim paths.
  select o.*
    into v_order
  from public.award_orders o
  where o.profile_id = p_member
    and o.status <> 'cancelled'
  order by o.created_at desc, o.id desc
  limit 1
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'active award order was not found';
  end if;

  if not public.award_delivery_order_is_paid(v_order) then
    raise exception using errcode = 'P0001', message = 'award fee must be confirmed before delivery';
  end if;
  if public.award_delivery_order_has_legacy_dispatch(v_order) then
    raise exception using errcode = 'P0001', message = 'award delivery has already been dispatched';
  end if;

  -- A live charge or completed/ambiguous delivery blocks a second quote.  A
  -- plain quoted row is history only and can be superseded by a fresh quote.
  if exists (
    select 1
    from public.award_delivery_orders d
    where d.order_id = v_order.id
      and d.status in ('creating', 'open', 'paid', 'booking', 'dispatched', 'needs_review')
  ) then
    raise exception using errcode = 'P0001', message = 'another delivery attempt is already active';
  end if;

  select * into v_profile from public.profiles where id = p_member;
  if not found then
    raise exception using errcode = '23503', message = 'member profile was not found';
  end if;
  v_email := nullif(lower(trim(v_profile.email)), '');
  if v_email is null then
    raise exception using errcode = '22023', message = 'member email is required for delivery checkout';
  end if;

  insert into public.award_delivery_orders (
    order_id,
    member_id,
    quote_input,
    resolved_delivery,
    carrier_quote,
    amount_minor,
    currency,
    expires_at,
    status
  ) values (
    v_order.id,
    p_member,
    coalesce(p_input, '{}'::jsonb) || jsonb_build_object('email', v_email),
    p_delivery,
    p_carrier,
    p_amount,
    'NGN',
    now() + interval '15 minutes',
    'quoted'
  )
  returning * into v_delivery;

  return to_jsonb(v_delivery);
end;
$$;

comment on function public.save_award_delivery_quote(uuid, jsonb, jsonb, bigint, jsonb)
  is 'Creates one immutable, server-priced delivery quote for a member with a confirmed award fee.';

revoke all on function public.save_award_delivery_quote(uuid, jsonb, jsonb, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_award_delivery_quote(uuid, jsonb, jsonb, bigint, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Checkout reservation
-- ---------------------------------------------------------------------------

create or replace function public.reserve_award_delivery_checkout(
  p_member uuid,
  p_delivery_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.award_orders%rowtype;
  v_delivery public.award_delivery_orders%rowtype;
begin
  if p_member is null or p_delivery_id is null then
    raise exception using errcode = '22023', message = 'member and delivery IDs are required';
  end if;

  select o.* into v_order
  from public.award_orders o
  join public.award_delivery_orders d on d.order_id = o.id
  where d.id = p_delivery_id
    and d.member_id = p_member
    and o.profile_id = p_member
  for update of o;
  if not found then
    raise exception using errcode = 'P0001', message = 'delivery quote was not found';
  end if;

  select * into v_delivery
  from public.award_delivery_orders
  where id = p_delivery_id
  for update;

  if not public.award_delivery_order_is_paid(v_order) then
    raise exception using errcode = 'P0001', message = 'award fee must remain confirmed before delivery checkout';
  end if;
  if public.award_delivery_order_has_legacy_dispatch(v_order) then
    raise exception using errcode = 'P0001', message = 'award delivery has already been dispatched';
  end if;

  -- Retrying the same row is safe.  The caller may recover an open checkout;
  -- it may not create a second charge for the same order.
  if v_delivery.status in ('creating', 'open', 'paid', 'booking', 'dispatched', 'needs_review') then
    return to_jsonb(v_delivery);
  end if;
  if v_delivery.status <> 'quoted' then
    raise exception using errcode = 'P0001', message = 'delivery quote is no longer chargeable';
  end if;
  if v_delivery.expires_at <= now() then
    update public.award_delivery_orders
    set status = 'expired'
    where id = v_delivery.id and status = 'quoted'
    returning * into v_delivery;
    return to_jsonb(v_delivery);
  end if;

  if exists (
    select 1
    from public.award_delivery_orders d
    where d.order_id = v_order.id
      and d.id <> v_delivery.id
      and d.status in ('creating', 'open', 'paid', 'booking', 'dispatched', 'needs_review')
  ) then
    raise exception using errcode = 'P0001', message = 'another delivery attempt is already active';
  end if;

  update public.award_delivery_orders
  set status = 'creating'
  where id = v_delivery.id
    and status = 'quoted'
    and expires_at > now()
  returning * into v_delivery;
  if not found then
    raise exception using errcode = 'P0001', message = 'delivery quote could not be reserved';
  end if;
  return to_jsonb(v_delivery);
end;
$$;

comment on function public.reserve_award_delivery_checkout(uuid, uuid)
  is 'Locks the confirmed award order and reserves one quoted delivery row for provider checkout.';

revoke all on function public.reserve_award_delivery_checkout(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_award_delivery_checkout(uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Provider checkout binding
-- ---------------------------------------------------------------------------

create or replace function public.bind_award_delivery_checkout(
  p_id uuid,
  p_checkout_id text,
  p_url text,
  p_expires timestamptz,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.award_orders%rowtype;
  v_delivery public.award_delivery_orders%rowtype;
  v_bound public.award_delivery_orders%rowtype;
  v_provider_status text := lower(trim(coalesce(p_status, '')));
  v_status text;
  v_parent_eligible boolean;
  v_parent_reason text;
begin
  if p_id is null or nullif(trim(p_checkout_id), '') is null then
    raise exception using errcode = '22023', message = 'delivery and checkout IDs are required';
  end if;
  if v_provider_status not in ('creating', 'open', 'completed', 'expired') then
    raise exception using errcode = '22023', message = 'provider checkout status must be creating, open, completed, or expired';
  end if;
  if p_expires is null then
    raise exception using errcode = '22023', message = 'provider checkout expiry is required';
  end if;

  -- Keep the parent-first lock order used by reserve, settlement, and claim.
  select o.* into v_order
  from public.award_orders o
  join public.award_delivery_orders d on d.order_id = o.id
  where d.id = p_id
  for update of o;
  if not found then
    raise exception using errcode = 'P0001', message = 'delivery quote was not found';
  end if;
  select * into v_delivery
  from public.award_delivery_orders
  where id = p_id
  for update;
  v_parent_eligible := public.award_delivery_order_is_paid(v_order)
    and not public.award_delivery_order_has_legacy_dispatch(v_order);
  v_parent_reason := case
    when v_order.status = 'cancelled' then 'parent award order is cancelled'
    when public.award_delivery_order_has_legacy_dispatch(v_order) then 'legacy award order was dispatched'
    else 'award fee is no longer confirmed'
  end;

  if v_delivery.checkout_id is not null then
    if v_delivery.checkout_id <> p_checkout_id
       or v_delivery.checkout_url is distinct from nullif(trim(p_url), '')
       or v_delivery.checkout_expires_at is distinct from p_expires then
      raise exception using errcode = '23505', message = 'delivery checkout is already bound to another provider checkout';
    end if;
    if not v_parent_eligible and v_delivery.status <> 'dispatched' then
      update public.award_delivery_orders
      set status = 'needs_review',
          booking_response = coalesce(v_delivery.booking_response, '{}'::jsonb)
            || jsonb_build_object('reason', v_parent_reason)
      where id = v_delivery.id
        and status <> 'dispatched';
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    end if;
    return to_jsonb(v_delivery);
  end if;

  -- Provider completion/expiry is only binding metadata.  The authenticated
  -- settlement RPC is the sole writer of paid/expired delivery state.
  v_status := case when v_provider_status = 'open' then 'open' else v_delivery.status end;

  select * into v_bound
  from public.award_delivery_orders
  where checkout_id = p_checkout_id
    and id <> p_id
  for update;
  if found then
    raise exception using errcode = '23505', message = 'provider checkout is already bound to another delivery';
  end if;

  if v_delivery.status <> 'creating' then
    raise exception using errcode = 'P0001', message = 'delivery is not waiting for checkout binding';
  end if;
  update public.award_delivery_orders
  set checkout_id = p_checkout_id,
      checkout_url = nullif(trim(p_url), ''),
      checkout_expires_at = p_expires,
      status = case when v_parent_eligible then v_status else 'needs_review' end,
      booking_response = case when v_parent_eligible then booking_response
        else jsonb_build_object('reason', v_parent_reason) end
  where id = p_id
    and checkout_id is null
    and status = 'creating'
  returning * into v_delivery;
  if not found then
    raise exception using errcode = 'P0001', message = 'delivery checkout binding lost a concurrent race';
  end if;
  return to_jsonb(v_delivery);
end;
$$;

comment on function public.bind_award_delivery_checkout(uuid, text, text, timestamptz, text)
  is 'Binds one provider checkout to one reserved delivery row without permitting rebinding.';

revoke all on function public.bind_award_delivery_checkout(uuid, text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.bind_award_delivery_checkout(uuid, text, text, timestamptz, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Authenticated provider settlement
-- ---------------------------------------------------------------------------

create or replace function public.settle_award_delivery_checkout(
  p_id uuid,
  p_checkout jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.award_orders%rowtype;
  v_delivery public.award_delivery_orders%rowtype;
  v_status text;
  v_amount bigint;
  v_charge_id text;
  v_other_active boolean;
begin
  if p_id is null or p_checkout is null or jsonb_typeof(p_checkout) <> 'object' then
    raise exception using errcode = '22023', message = 'authenticated checkout evidence is required';
  end if;

  -- Parent order first: settlement must serialize with quote, reservation, and
  -- dispatch claim operations for the same award.
  select o.* into v_order
  from public.award_orders o
  join public.award_delivery_orders d on d.order_id = o.id
  where d.id = p_id
  for update of o;
  if not found then
    raise exception using errcode = 'P0001', message = 'delivery quote was not found';
  end if;
  select * into v_delivery
  from public.award_delivery_orders
  where id = p_id
  for update;

  v_status := lower(trim(coalesce(p_checkout->>'status', '')));
  if v_status not in ('paid', 'expired', 'open') then
    raise exception using errcode = '22023', message = 'checkout status must be paid, expired, or open';
  end if;
  if nullif(trim(p_checkout->>'checkout_id'), '') is null
     or p_checkout->>'checkout_id' is distinct from v_delivery.checkout_id
     or p_checkout->>'reference' is distinct from v_delivery.reference
     or p_checkout->>'purpose' is distinct from 'afl_award_delivery_v1'
     or p_checkout->>'currency' is distinct from v_delivery.currency
     or p_checkout->>'delivery_id' is not null and p_checkout->>'delivery_id' is distinct from v_delivery.id::text
     or p_checkout->>'order_id' is not null and p_checkout->>'order_id' is distinct from v_delivery.order_id::text
     or p_checkout->>'member_id' is not null and p_checkout->>'member_id' is distinct from v_delivery.member_id::text then
    raise exception using errcode = '22023', message = 'authenticated checkout identity does not match the delivery';
  end if;

  begin
    v_amount := (p_checkout->>'amount_minor')::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'authenticated checkout amount is invalid';
  end;
  if v_amount is distinct from v_delivery.amount_minor then
    raise exception using errcode = '22023', message = 'authenticated checkout amount does not match the delivery quote';
  end if;
  if p_checkout->>'charge_currency' is not null
     and p_checkout->>'charge_currency' is distinct from v_delivery.currency then
    raise exception using errcode = '22023', message = 'authenticated charge currency does not match the delivery currency';
  end if;

  v_charge_id := nullif(trim(p_checkout->>'charge_id'), '');
  if v_status = 'paid' and v_charge_id is null then
    raise exception using errcode = '22023', message = 'paid checkout evidence requires a charge ID';
  end if;
  if v_status <> 'paid' and v_charge_id is not null then
    raise exception using errcode = '22023', message = 'non-paid checkout evidence cannot include a charge ID';
  end if;

  if v_order.status = 'cancelled' then
    if v_delivery.status in ('quoted', 'creating', 'open', 'paid', 'expired') then
      update public.award_delivery_orders
      set status = 'needs_review',
          payment_evidence = case when v_delivery.status = 'paid'
            then v_delivery.payment_evidence else p_checkout end,
          booking_response = jsonb_build_object(
            'settlement_conflict', p_checkout,
            'reason', 'parent award order is cancelled'
          )
      where id = v_delivery.id
        and status in ('quoted', 'creating', 'open', 'paid', 'expired');
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    end if;
    return to_jsonb(v_delivery);
  end if;

  if v_status = 'paid' and not public.award_delivery_order_is_paid(v_order) then
    if v_delivery.status in ('quoted', 'creating', 'open', 'expired') then
      update public.award_delivery_orders
      set status = 'needs_review',
          payment_evidence = p_checkout,
          booking_response = jsonb_build_object(
            'settlement_conflict', p_checkout,
            'reason', 'award fee is no longer confirmed'
          )
      where id = v_delivery.id
        and status in ('quoted', 'creating', 'open', 'expired');
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    end if;
    return to_jsonb(v_delivery);
  end if;

  if v_status = 'open' then
    if v_delivery.status = 'creating' then
      update public.award_delivery_orders
      set status = 'open',
          payment_evidence = p_checkout
      where id = v_delivery.id and status = 'creating';
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    elsif v_delivery.status = 'open' then
      update public.award_delivery_orders
      set payment_evidence = p_checkout
      where id = v_delivery.id
        and payment_evidence is distinct from p_checkout;
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    end if;
    return to_jsonb(v_delivery);
  end if;

  if v_status = 'expired' then
    -- A late expiry may not regress a paid or dispatched row.  All other
    -- chargeable/open rows are safely made terminal and remain in history.
    if v_delivery.status in ('creating', 'open', 'quoted') then
      update public.award_delivery_orders
      set status = 'expired',
          payment_evidence = p_checkout
      where id = v_delivery.id
        and status in ('creating', 'open', 'quoted');
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    elsif v_delivery.status = 'expired' then
      update public.award_delivery_orders
      set payment_evidence = p_checkout
      where id = v_delivery.id
        and payment_evidence is distinct from p_checkout;
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    end if;
    return to_jsonb(v_delivery);
  end if;

  -- A paid provider event after an explicit provider/local expiry transition
  -- or after another delivery has already become chargeable/dispatchable is a
  -- manual-review conflict, not a reason to overwrite the active delivery.
  v_other_active := v_delivery.status = 'expired'
    or exists (
      select 1
      from public.award_delivery_orders d
      where d.order_id = v_delivery.order_id
        and d.id <> v_delivery.id
        and d.status in ('creating', 'open', 'paid', 'booking', 'dispatched', 'needs_review')
    );
  if v_other_active then
    if v_delivery.status in ('creating', 'open', 'quoted', 'expired') then
      update public.award_delivery_orders
      set status = 'needs_review',
          payment_evidence = p_checkout,
          booking_response = jsonb_build_object(
            'settlement_conflict', p_checkout,
            'reason', case when v_delivery.status = 'expired'
              then 'late payment after explicit quote/provider expiry'
              else 'payment conflicts with another active delivery' end
          )
      where id = v_delivery.id
        and status in ('creating', 'open', 'quoted', 'expired');
      select * into v_delivery from public.award_delivery_orders where id = p_id;
    end if;
    return to_jsonb(v_delivery);
  end if;

  if v_delivery.status = 'paid' then
    if v_delivery.charge_id is distinct from v_charge_id then
      raise exception using errcode = '23505', message = 'delivery is already settled with a different charge';
    end if;
    return to_jsonb(v_delivery);
  end if;
  if v_delivery.status not in ('creating', 'open') then
    return to_jsonb(v_delivery);
  end if;

  if exists (
    select 1
    from public.award_delivery_orders d
    where d.charge_id = v_charge_id
      and d.id <> v_delivery.id
  ) then
    update public.award_delivery_orders
    set status = 'needs_review',
        payment_evidence = p_checkout,
        booking_response = jsonb_build_object(
          'settlement_conflict', p_checkout,
          'reason', 'charge ID is already attached to another delivery'
        )
    where id = v_delivery.id;
    select * into v_delivery from public.award_delivery_orders where id = p_id;
    return to_jsonb(v_delivery);
  end if;

  update public.award_delivery_orders
  set status = 'paid',
      charge_id = v_charge_id,
      paid_at = now(),
      payment_evidence = p_checkout
  where id = v_delivery.id
    and status in ('creating', 'open')
    and charge_id is null
    and paid_at is null;
  select * into v_delivery from public.award_delivery_orders where id = p_id;
  return to_jsonb(v_delivery);
end;
$$;

comment on function public.settle_award_delivery_checkout(uuid, jsonb)
  is 'Settles only authenticated exact-match Bachs delivery evidence; it never mutates award-fee or legacy order totals/status.';

revoke all on function public.settle_award_delivery_checkout(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.settle_award_delivery_checkout(uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Dispatch claim and completion
-- ---------------------------------------------------------------------------

create or replace function public.claim_award_delivery_dispatch(p_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.award_orders%rowtype;
  v_delivery public.award_delivery_orders%rowtype;
  v_reason text;
begin
  if p_id is null then
    return null;
  end if;

  select o.* into v_order
  from public.award_orders o
  join public.award_delivery_orders d on d.order_id = o.id
  where d.id = p_id
  for update of o;
  if not found then
    return null;
  end if;
  select * into v_delivery
  from public.award_delivery_orders
  where id = p_id
  for update;

  -- Only the confirmed, separately paid delivery row can enter booking.  A
  -- paid row that became ineligible is made explicit review work rather than
  -- being left in an indefinitely retryable paid state.
  if v_delivery.status <> 'paid' then
    return null;
  end if;
  if not public.award_delivery_order_is_paid(v_order) then
    v_reason := case
      when v_order.status = 'cancelled' then 'parent award order is cancelled'
      when coalesce(v_order.award_payment_status, '') = 'refunded' then 'award fee was refunded'
      when public.award_delivery_order_has_legacy_dispatch(v_order) then 'legacy award order was dispatched'
      else 'award fee is no longer confirmed'
    end;
  elsif public.award_delivery_order_has_legacy_dispatch(v_order) then
    v_reason := 'legacy award order was dispatched';
  elsif v_delivery.waybill is not null then
    v_reason := 'delivery already has a waybill';
  elsif v_delivery.booking_started_at is not null then
    v_reason := 'delivery booking was already claimed';
  end if;
  if exists (
    select 1
    from public.award_delivery_orders d
    where d.order_id = v_delivery.order_id
      and d.id <> v_delivery.id
      and d.status in ('booking', 'dispatched', 'needs_review')
  ) then
    v_reason := coalesce(v_reason, 'another delivery attempt requires review or has claimed dispatch');
  end if;
  if v_reason is not null then
    update public.award_delivery_orders
    set status = 'needs_review',
        booking_response = coalesce(v_delivery.booking_response, '{}'::jsonb)
          || jsonb_build_object('reason', v_reason)
    where id = p_id
      and status = 'paid'
    returning * into v_delivery;
    if not found then
      return null;
    end if;
    return to_jsonb(v_delivery);
  end if;

  update public.award_delivery_orders
  set status = 'booking',
      booking_started_at = now()
  where id = p_id
    and status = 'paid'
    and booking_started_at is null
    and waybill is null
  returning * into v_delivery;
  if not found then
    return null;
  end if;
  return to_jsonb(v_delivery);
end;
$$;

comment on function public.claim_award_delivery_dispatch(uuid)
  is 'Atomically claims one paid delivery for GIG booking; a booking claim is never automatically reclaimed.';

revoke all on function public.claim_award_delivery_dispatch(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_award_delivery_dispatch(uuid)
  to service_role;

create or replace function public.finish_award_delivery_dispatch(
  p_id uuid,
  p_waybill text,
  p_url text,
  p_response jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.award_orders%rowtype;
  v_delivery public.award_delivery_orders%rowtype;
  v_existing_waybill uuid;
  v_waybill text;
  v_tracking_url text;
begin
  if p_id is null or nullif(trim(p_waybill), '') is null then
    raise exception using errcode = '22023', message = 'waybill is required';
  end if;
  v_waybill := trim(p_waybill);
  v_tracking_url := nullif(trim(p_url), '');

  select o.* into v_order
  from public.award_orders o
  join public.award_delivery_orders d on d.order_id = o.id
  where d.id = p_id
  for update of o;
  if not found then
    raise exception using errcode = 'P0001', message = 'delivery booking was not found';
  end if;
  select * into v_delivery
  from public.award_delivery_orders
  where id = p_id
  for update;

  if v_delivery.status = 'dispatched' then
    if v_delivery.waybill = trim(p_waybill)
       and v_delivery.tracking_url is not distinct from nullif(trim(p_url), '') then
      return to_jsonb(v_delivery);
    end if;
    raise exception using errcode = '23505', message = 'delivery already has a different waybill';
  end if;
  if v_delivery.status <> 'booking' then
    raise exception using errcode = 'P0001', message = 'delivery is not claimed for booking';
  end if;

  if v_order.status = 'cancelled' then
    update public.award_delivery_orders
    set status = 'needs_review',
        booking_response = coalesce(p_response, '{}'::jsonb) || jsonb_build_object(
          'reason', 'parent award order was cancelled before dispatch completion',
          'waybill', v_waybill,
          'tracking_url', v_tracking_url
        )
    where id = p_id and status = 'booking';
    select * into v_delivery from public.award_delivery_orders where id = p_id;
    return to_jsonb(v_delivery);
  end if;

  if not public.award_delivery_order_is_paid(v_order) then
    update public.award_delivery_orders
    set status = 'needs_review',
        booking_response = coalesce(p_response, '{}'::jsonb) || jsonb_build_object(
          'reason', case when coalesce(v_order.award_payment_status, '') = 'refunded'
            then 'award fee was refunded'
            else 'award fee is no longer confirmed' end,
          'waybill', v_waybill,
          'tracking_url', v_tracking_url
        )
    where id = p_id and status = 'booking';
    select * into v_delivery from public.award_delivery_orders where id = p_id;
    return to_jsonb(v_delivery);
  end if;

  if public.award_delivery_order_has_legacy_dispatch(v_order) then
    update public.award_delivery_orders
    set status = 'needs_review',
        booking_response = coalesce(p_response, '{}'::jsonb) || jsonb_build_object(
          'reason', 'legacy award order was dispatched before delivery completion',
          'waybill', v_waybill,
          'tracking_url', v_tracking_url
        )
    where id = p_id and status = 'booking';
    select * into v_delivery from public.award_delivery_orders where id = p_id;
    return to_jsonb(v_delivery);
  end if;

  select d.id into v_existing_waybill
  from public.award_delivery_orders d
  where d.waybill = v_waybill
    and d.id <> p_id
  for update;
  if found then
    update public.award_delivery_orders
    set status = 'needs_review',
        booking_response = coalesce(p_response, '{}'::jsonb) || jsonb_build_object(
          'reason', 'waybill is already attached to another delivery',
          'waybill', v_waybill,
          'tracking_url', v_tracking_url
        )
    where id = p_id and status = 'booking';
    select * into v_delivery from public.award_delivery_orders where id = p_id;
    return to_jsonb(v_delivery);
  end if;

  update public.award_delivery_orders
  set status = 'dispatched',
      waybill = v_waybill,
      tracking_url = v_tracking_url,
      booking_response = coalesce(p_response, '{}'::jsonb)
  where id = p_id
    and status = 'booking'
    and waybill is null
  returning * into v_delivery;
  if not found then
    raise exception using errcode = 'P0001', message = 'delivery booking completion lost a concurrent race';
  end if;
  return to_jsonb(v_delivery);
end;
$$;

comment on function public.finish_award_delivery_dispatch(uuid, text, text, jsonb)
  is 'Completes a previously claimed delivery booking on the delivery row only; legacy award totals/status stay untouched.';

revoke all on function public.finish_award_delivery_dispatch(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.finish_award_delivery_dispatch(uuid, text, text, jsonb)
  to service_role;

-- Trigger-only helpers are not an API surface.
revoke all on function public.touch_award_delivery_orders_updated_at() from public, anon, authenticated;
grant execute on function public.touch_award_delivery_orders_updated_at() to service_role;
revoke all on function public.guard_award_delivery_order_immutability() from public, anon, authenticated;
grant execute on function public.guard_award_delivery_order_immutability() to service_role;
revoke all on function public.award_delivery_order_is_paid(public.award_orders) from public, anon, authenticated;
grant execute on function public.award_delivery_order_is_paid(public.award_orders) to service_role;
revoke all on function public.award_delivery_order_has_legacy_dispatch(public.award_orders) from public, anon, authenticated;
grant execute on function public.award_delivery_order_has_legacy_dispatch(public.award_orders) to service_role;

notify pgrst, 'reload schema';
