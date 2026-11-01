-- Separate delivery payments must never be collected for an order whose
-- historical Paystack charge already bundled the award and delivery.  The
-- original delivery migration is historical; this additive replacement keeps
-- the helper name/signature stable for all existing RPC callers.

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
            (a.currency = 'NGN' and a.requested_amount_minor = 2500000)
            or (a.currency = 'USD' and a.requested_amount_minor = 2000)
          )
      )
    );
$$;

comment on function public.award_delivery_order_is_paid(public.award_orders)
  is 'Returns true only for a current canonical Bachs award_fee payment; legacy Paystack award-plus-delivery payments are already fulfillment-funded and cannot start a separate delivery charge.';

revoke all on function public.award_delivery_order_is_paid(public.award_orders)
  from public, anon, authenticated;
grant execute on function public.award_delivery_order_is_paid(public.award_orders)
  to service_role;
