-- Webhooks and new-checkout reservations must serialize on the same member /
-- campaign lock and order row. Late failures must not erase a newer attempt.
create or replace function public.process_bachs_magazine_webhook_event(
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
  v_attempt public.magazine_feature_payment_attempts%rowtype;
  v_order public.magazine_feature_orders%rowtype;
  v_event_status text;
  v_expected_provider_status text := upper(coalesce(p_provider_status, ''));
begin
  if nullif(trim(p_event_id), '') is null then
    raise exception using errcode = '22023', message = 'webhook event ID is required';
  end if;

  insert into public.magazine_feature_webhook_events (
    id, event_type, organization_id, payment_attempt_id, payload, received_at
  ) values (
    p_event_id, coalesce(p_event_type, 'unknown'), p_organization_id, p_attempt_id,
    coalesce(p_payload, '{}'::jsonb), coalesce(p_received_at, now())
  ) on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('outcome', 'duplicate', 'notification_needed', false);
  end if;

  -- The attempt's order relationship is immutable. Read it to take the same
  -- advisory lock as reserve_bachs_magazine_checkout before locking the order.
  select * into v_attempt from public.magazine_feature_payment_attempts
  where id = p_attempt_id and provider = 'bachs' and charge_scope = 'magazine_feature';
  if not found then
    update public.magazine_feature_webhook_events set processing_status = 'ignored', processed_at = now(), error = 'Unmatched magazine payment reference.' where id = p_event_id;
    return jsonb_build_object('outcome', 'unmatched', 'notification_needed', false);
  end if;
  select * into v_order from public.magazine_feature_orders where id = v_attempt.order_id;
  if not found then
    update public.magazine_feature_webhook_events set processing_status = 'ignored', processed_at = now(), error = 'Magazine order was not found.' where id = p_event_id;
    return jsonb_build_object('outcome', 'unmatched', 'notification_needed', false);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_order.profile_id::text || ':' || v_order.campaign_id, 0));
  select * into v_order from public.magazine_feature_orders where id = v_attempt.order_id for update;
  select * into v_attempt from public.magazine_feature_payment_attempts
    where id = p_attempt_id and order_id = v_order.id and provider = 'bachs' and charge_scope = 'magazine_feature'
    for update;
  if not found
     or v_attempt.provider_reference is distinct from p_provider_reference
     or (v_attempt.provider_checkout_id is not null and v_attempt.provider_checkout_id is distinct from p_provider_checkout_id) then
    update public.magazine_feature_webhook_events
    set processing_status = 'ignored', processed_at = now(), error = 'Unmatched magazine payment reference.'
    where id = p_event_id;
    return jsonb_build_object('outcome', 'unmatched', 'notification_needed', false);
  end if;

  if upper(coalesce(p_currency, '')) is distinct from v_attempt.currency::text then
    v_event_status := 'exception';
  elsif p_event_type = 'collection.succeeded' and v_expected_provider_status in ('SUCCEEDED', 'ACCEPTED') then
    if p_captured_amount_minor is distinct from v_attempt.requested_amount_minor then
      v_event_status := case when coalesce(p_captured_amount_minor, 0) < v_attempt.requested_amount_minor then 'underpaid' else 'overpaid' end;
    else
      v_event_status := 'succeeded';
    end if;
  elsif p_event_type in ('collection.failed', 'checkout.expired') then
    v_event_status := case when p_event_type = 'checkout.expired' then 'expired' else 'failed' end;
  elsif p_event_type = 'collection.underpaid' then
    v_event_status := 'underpaid';
  else
    v_event_status := 'processing';
  end if;

  if v_event_status = 'succeeded' and v_order.status = 'paid' then
    -- A second successful checkout cannot replace the canonical paid attempt.
    -- Preserve the capture for support/refund handling instead of losing it.
    update public.magazine_feature_payment_attempts
    set status = 'duplicate_succeeded', captured_amount_minor = p_captured_amount_minor,
        provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
        confirmed_at = now(), failure_reason = 'A different attempt already paid this order.'
    where id = v_attempt.id and status in ('creating', 'open', 'processing', 'cancelled');
    v_event_status := 'duplicate_succeeded';
  elsif v_event_status = 'succeeded' then
    update public.magazine_feature_payment_attempts
    set status = 'succeeded', captured_amount_minor = p_captured_amount_minor,
        provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
        confirmed_at = now()
    where id = v_attempt.id and status in ('creating', 'open', 'processing');
    if found then
      update public.magazine_feature_orders
      set status = 'paid', paid_attempt_id = v_attempt.id, paid_at = now()
      where id = v_attempt.order_id and status <> 'paid';
      update public.magazine_feature_payment_attempts
      set status = 'cancelled', failure_reason = 'Another attempt paid this order.'
      where order_id = v_attempt.order_id and id <> v_attempt.id
        and status in ('creating', 'open', 'processing', 'exception');
    else
      v_event_status := case when v_attempt.status = 'succeeded' then 'duplicate_succeeded' else 'exception' end;
    end if;
  elsif v_event_status in ('failed', 'expired', 'underpaid', 'overpaid', 'exception') then
    update public.magazine_feature_payment_attempts
    set status = v_event_status, captured_amount_minor = p_captured_amount_minor,
        provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
        failure_reason = case when v_event_status = 'exception' then 'Payment currency did not match the reserved attempt.' else null end
    where id = v_attempt.id and status in ('creating', 'open', 'processing');
    if v_event_status = 'exception' then
      update public.magazine_feature_orders set status = 'exception' where id = v_attempt.order_id and status <> 'paid';
    elsif v_event_status in ('failed', 'expired') then
      update public.magazine_feature_orders orders set status = 'failed'
      where orders.id = v_attempt.order_id and orders.status <> 'paid'
        and not exists (
          select 1 from public.magazine_feature_payment_attempts active
          where active.order_id = orders.id and active.id <> v_attempt.id
            and active.status in ('creating', 'open', 'processing', 'exception')
        );
    end if;
  end if;

  update public.magazine_feature_webhook_events
  set processing_status = case when v_event_status in ('succeeded', 'duplicate_succeeded', 'failed', 'expired') then 'processed' else 'exception' end,
      processed_at = now(),
      error = case when v_event_status in ('underpaid', 'overpaid', 'exception', 'duplicate_succeeded') then 'Payment requires support review.' else null end
  where id = p_event_id;

  return jsonb_build_object('outcome', v_event_status, 'attempt_id', v_attempt.id, 'notification_needed', false);
end;
$$;

revoke all on function public.process_bachs_magazine_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.process_bachs_magazine_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz) to service_role;
