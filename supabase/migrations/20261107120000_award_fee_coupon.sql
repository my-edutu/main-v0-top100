begin;

create table public.award_coupons (
  id uuid primary key default gen_random_uuid(),
  code_digest text not null unique check (code_digest ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default false,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > starts_at)
);

create table public.award_coupon_eligibility (
  coupon_id uuid not null references public.award_coupons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (coupon_id, profile_id)
);

alter table public.award_coupons enable row level security;
alter table public.award_coupon_eligibility enable row level security;
revoke all on public.award_coupons, public.award_coupon_eligibility from public, anon, authenticated;
grant select, insert, update, delete on public.award_coupons, public.award_coupon_eligibility to service_role;

alter table public.award_payment_attempts
  add column award_coupon_id uuid references public.award_coupons(id),
  add column coupon_base_amount_minor bigint,
  add column coupon_discount_amount_minor bigint,
  add constraint award_payment_coupon_price check (
    case when award_coupon_id is null then
      coupon_base_amount_minor is null and coupon_discount_amount_minor is null
    else
      provider = 'bachs' and charge_scope = 'award_fee' and currency = 'NGN'
      and coupon_base_amount_minor is not distinct from 2500000
      and coupon_discount_amount_minor is not distinct from 500000
      and requested_amount_minor = 2000000
    end
  );

create function public.guard_award_coupon_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.award_coupon_id is null and new.award_coupon_id is not null and
     (old.status <> 'creating' or old.created_at <> transaction_timestamp()
      or old.provider_checkout_id is not null or old.provider_response is not null) then
    raise exception using errcode = '22023', message = 'coupon must be attached during reservation';
  end if;

  if old.award_coupon_id is not null and
     row(new.award_coupon_id, new.coupon_base_amount_minor, new.coupon_discount_amount_minor,
         new.requested_amount_minor, new.currency, new.order_id, new.provider, new.charge_scope)
     is distinct from
     row(old.award_coupon_id, old.coupon_base_amount_minor, old.coupon_discount_amount_minor,
         old.requested_amount_minor, old.currency, old.order_id, old.provider, old.charge_scope) then
    raise exception using errcode = '22023', message = 'reserved coupon price is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_award_coupon_price() from public, anon, authenticated;
create trigger award_coupon_price_immutable before update on public.award_payment_attempts
for each row execute function public.guard_award_coupon_price();

-- Preview is read-only. Reservation locks the same rows and checks again.
create function public.preview_award_coupon(p_profile_id uuid, p_code_digest text)
returns boolean
language sql stable
set search_path = ''
as $$
  select to_regprocedure('public.team_coupon_payment_excluded(public.award_orders)') is not null
    and exists (
      select 1
      from public.award_coupons c
      join public.award_coupon_eligibility e on e.coupon_id = c.id
      where e.profile_id = p_profile_id and c.code_digest = p_code_digest
        and c.enabled and now() >= c.starts_at and now() < c.expires_at
    );
$$;

create function public.reserve_bachs_award_coupon_checkout(
  p_profile_id uuid, p_attempt_id uuid, p_provider_reference text, p_idempotency_key text,
  p_price_version text, p_code_digest text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_coupon_id uuid;
  v_attempt public.award_payment_attempts%rowtype;
  v_reservation jsonb;
begin
  -- Both migrations must be live before any coupon attempt can be reserved.
  if to_regprocedure('public.team_coupon_payment_excluded(public.award_orders)') is null then
    return jsonb_build_object('outcome', 'coupon_unavailable');
  end if;

  select c.id into v_coupon_id
  from public.award_coupons c
  join public.award_coupon_eligibility e on e.coupon_id = c.id
  where e.profile_id = p_profile_id and c.code_digest = p_code_digest
    and c.enabled and now() >= c.starts_at and now() < c.expires_at
  for share of c, e;
  if not found then
    -- A paused campaign or revoked grant blocks new reservations. An issued
    -- attempt may still be resumed with its original code and account.
    select a.* into v_attempt
    from public.award_orders o
    join public.award_payment_attempts a on a.order_id = o.id
    join public.award_coupons c on c.id = a.award_coupon_id
    where o.id = (
      select latest.id from public.award_orders latest
      where latest.profile_id = p_profile_id and latest.status <> 'cancelled'
      order by latest.created_at desc, latest.id desc limit 1
    )
      and o.award_payment_status = 'pending'
      and a.status in ('creating', 'open', 'processing')
      and c.code_digest = p_code_digest
    order by a.created_at desc, a.id desc limit 1;
    if found then
      return jsonb_build_object(
        'outcome', 'existing', 'order_id', v_attempt.order_id, 'attempt_id', v_attempt.id,
        'provider_reference', v_attempt.provider_reference, 'idempotency_key', v_attempt.idempotency_key,
        'currency', v_attempt.currency, 'requested_amount_minor', v_attempt.requested_amount_minor
      );
    end if;
    return jsonb_build_object('outcome', 'coupon_unavailable');
  end if;

  -- Use the standard reservation's order locks, legacy checks and attempt reuse.
  -- Only a newly created attempt can change price, before this transaction commits
  -- and before a provider request can exist.
  v_reservation := public.reserve_bachs_award_checkout(
    p_profile_id, p_attempt_id, p_provider_reference, p_idempotency_key, 'NGN', 2500000, p_price_version
  );
  if v_reservation->>'outcome' = 'created' then
    update public.award_payment_attempts
    set award_coupon_id = v_coupon_id, coupon_base_amount_minor = 2500000,
        coupon_discount_amount_minor = 500000, requested_amount_minor = 2000000
    where id = p_attempt_id;
    return v_reservation || jsonb_build_object(
      'award_coupon_id', v_coupon_id, 'requested_amount_minor', 2000000
    );
  end if;

  if v_reservation->>'outcome' = 'existing' and not exists (
    select 1 from public.award_payment_attempts
    where id = (v_reservation->>'attempt_id')::uuid and award_coupon_id = v_coupon_id
  ) then
    return v_reservation || jsonb_build_object('outcome', 'existing_price');
  end if;
  return v_reservation;
end;
$$;

revoke all on function public.preview_award_coupon(uuid, text),
  public.reserve_bachs_award_coupon_checkout(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.preview_award_coupon(uuid, text),
  public.reserve_bachs_award_coupon_checkout(uuid, uuid, text, text, text, text)
  to service_role;

create or replace function public.reconcile_bachs_award_checkout(p_attempt_id uuid, p_checkout jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.award_payment_attempts%rowtype;
  v_order public.award_orders%rowtype;
  v_status text := p_checkout->>'status';
  v_event_type text;
begin
  select o.* into v_order from public.award_orders o
    join public.award_payment_attempts a on a.order_id = o.id
    where a.id = p_attempt_id for update of o;
  if not found then raise exception 'Award payment was not found'; end if;
  select * into v_attempt from public.award_payment_attempts where id = p_attempt_id for update;
  if v_attempt.provider <> 'bachs' or v_attempt.charge_scope <> 'award_fee'
     or p_checkout->>'checkout_id' is distinct from v_attempt.provider_checkout_id
     or p_checkout->>'reference' is distinct from v_attempt.provider_reference
     or p_checkout->>'order_id' is distinct from v_attempt.order_id::text
     or p_checkout->>'attempt_id' is distinct from v_attempt.id::text
     or p_checkout->>'currency' is distinct from v_attempt.currency
     or (p_checkout->>'amount_minor')::bigint is distinct from v_attempt.requested_amount_minor
     or not (
       (v_attempt.award_coupon_id is not null and v_attempt.currency = 'NGN' and v_attempt.requested_amount_minor = 2000000)
       or (v_attempt.award_coupon_id is null and v_attempt.requested_amount_minor = (
         case v_attempt.currency when 'NGN' then 2500000 when 'USD' then 2000 else -1 end
       ))
     )
     or (v_attempt.award_coupon_id is not null and v_status = 'paid'
         and p_checkout->>'charge_currency' is distinct from 'NGN')
     or v_status is null or v_status not in ('paid', 'expired', 'open') then
    raise exception 'Verified checkout did not match the reserved payment';
  end if;
  if v_order.award_payment_status = 'refunded' then
    return jsonb_build_object('outcome', 'refunded', 'notification_needed', false);
  end if;
  if v_status = 'open' then
    -- Touch the row to rotate unresolved checkouts through the scheduled worker.
    update public.award_payment_attempts set provider_status = 'open'
      where id = p_attempt_id and status in ('creating', 'open', 'processing');
    return jsonb_build_object('outcome', 'open', 'notification_needed', false);
  end if;
  if v_status = 'paid' then
    if nullif(p_checkout->>'charge_id', '') is null then raise exception 'Verified charge ID is required'; end if;
    -- Fresh authenticated provider evidence can recover a terminal attempt,
    -- under the same order lock as the normal exact-price payment claim.
    if v_attempt.status in ('overpaid', 'failed', 'expired', 'exception') then
      update public.award_payment_attempts set status = 'open' where id = p_attempt_id;
    end if;
    v_event_type := 'collection.succeeded';
  else
    if v_attempt.status not in ('creating', 'open', 'processing', 'expired') then
      return jsonb_build_object('outcome', 'review_required', 'notification_needed', false);
    end if;
    v_event_type := 'checkout.expired';
  end if;
  return public.process_bachs_webhook_event(
    'bachs-reconcile-v2:' || p_attempt_id::text || ':' || v_status,
    v_event_type, null, p_attempt_id, v_attempt.provider_checkout_id,
    v_attempt.provider_reference, case v_status when 'paid' then 'SUCCEEDED' else 'expired' end,
    case v_status when 'paid' then v_attempt.requested_amount_minor else null end,
    v_attempt.currency, p_checkout->>'charge_id',
    jsonb_build_object('source', 'authenticated_bachs_checkout', 'checkout', p_checkout), now()
  );
end;
$$;

create or replace function public.award_delivery_order_is_paid(p_order public.award_orders)
returns boolean
language sql
security invoker
set search_path = public
as $$
  select (p_order).status <> 'cancelled'
    and coalesce((p_order).award_payment_status, '') <> 'refunded'
    -- A legacy Paystack charge was `legacy_award_plus_delivery`, so it already
    -- funded fulfillment.  Reject it before considering any stray Bachs
    -- award_fee attempt that may have been attached later.
    and not (
      (p_order).paid_at is not null
      and (p_order).paystack_reference is not null
      and lower(coalesce((p_order).paystack_status, '')) in (
        'paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted'
      )
    )
    and (
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
            (a.currency = 'NGN' and (
              (a.award_coupon_id is null and a.requested_amount_minor = 2500000)
              or (a.award_coupon_id is not null and a.requested_amount_minor = 2000000)
            ))
            or (a.currency = 'USD' and a.requested_amount_minor = 2000)
          )
      )
    );
$$;

notify pgrst, 'reload schema';

commit;
