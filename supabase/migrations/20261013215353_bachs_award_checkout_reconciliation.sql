-- Only server-authenticated Bachs checkout evidence may recover a payment.
-- The original callback ledger stays intact; recovery gets its own audit event.
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
     or v_attempt.requested_amount_minor <> (case v_attempt.currency when 'NGN' then 2500000 when 'USD' then 2000 else -1 end)
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
    -- Recover only the known false-overpayment classification, inside the same
    -- order/attempt transaction as the normal exact-price payment claim.
    if v_attempt.status = 'overpaid' and v_attempt.failure_reason = 'Captured amount was above the reserved amount.' then
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
    'bachs-reconcile-v1:' || p_attempt_id::text || ':' || v_status,
    v_event_type, null, p_attempt_id, v_attempt.provider_checkout_id,
    v_attempt.provider_reference, case v_status when 'paid' then 'SUCCEEDED' else 'expired' end,
    case v_status when 'paid' then v_attempt.requested_amount_minor else null end,
    v_attempt.currency, p_checkout->>'charge_id',
    jsonb_build_object('source', 'authenticated_bachs_checkout', 'checkout', p_checkout), now()
  );
end;
$$;
revoke all on function public.reconcile_bachs_award_checkout(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_bachs_award_checkout(uuid, jsonb) to service_role;
comment on function public.reconcile_bachs_award_checkout(uuid, jsonb)
  is 'Atomically reconciles exact server-verified Bachs award checkout evidence; preserves original callbacks and delivery state.';
notify pgrst, 'reload schema';
