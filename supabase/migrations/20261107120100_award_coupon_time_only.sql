begin;

-- Each campaign can opt out of the account allowlist. The code and
-- active window are still required for every new reservation.
alter table public.award_coupons
  add column allow_all_awardees boolean not null default false;

-- Preview is read-only. Reservation locks the same rows and checks again.
create or replace function public.preview_award_coupon(p_profile_id uuid, p_code_digest text)
returns boolean
language sql stable
set search_path = ''
as $$
  select to_regprocedure('public.team_coupon_payment_excluded(public.award_orders)') is not null
    and exists (
      select 1
      from public.award_coupons c
      where c.code_digest = p_code_digest
        and c.enabled and now() >= c.starts_at and now() < c.expires_at
        and (c.allow_all_awardees or exists (
          select 1 from public.award_coupon_eligibility e
          where e.coupon_id = c.id and e.profile_id = p_profile_id
        ))
    );
$$;

create or replace function public.reserve_bachs_award_coupon_checkout(
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
  where c.code_digest = p_code_digest
    and c.enabled and clock_timestamp() >= c.starts_at and clock_timestamp() < c.expires_at
    and (c.allow_all_awardees or exists (
      select 1 from public.award_coupon_eligibility e
      where e.coupon_id = c.id and e.profile_id = p_profile_id
      for share
    ))
  for share of c;
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

notify pgrst, 'reload schema';

commit;
