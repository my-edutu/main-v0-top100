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

    -- A failed collection can later succeed on the same hosted checkout.
    -- Identity and exact normalized price were checked above; order locking,
    -- refund guards and the one-success index still govern the payment claim.
    if v_attempt.status in ('failed', 'expired', 'exception')
       and v_order.award_payment_status <> 'refunded'
       and p_provider_checkout_id = v_attempt.provider_checkout_id
       and p_provider_reference = v_attempt.provider_reference
       and nullif(p_provider_charge_id, '') is not null
       and (v_attempt.status <> 'exception' or v_attempt.failure_reason =
            'Late success conflicted with a terminal attempt state.') then
      update public.award_payment_attempts set status = 'open' where id = p_attempt_id;
      v_attempt.status := 'open';
    end if;

    -- Preserve other ambiguous states, refunds and duplicate claim protection.
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
revoke all on function public.reconcile_bachs_award_checkout(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_bachs_award_checkout(uuid, jsonb) to service_role;
comment on function public.reconcile_bachs_award_checkout(uuid, jsonb)
  is 'Atomically reconciles exact server-verified Bachs award checkout evidence; preserves original callbacks and delivery state.';
notify pgrst, 'reload schema';
