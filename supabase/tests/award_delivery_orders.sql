-- Disposable PostgreSQL contract tests for the separate paid award-delivery
-- lifecycle.  Run only against a throwaway database, for example:
--
--   psql -X -v ON_ERROR_STOP=1 \
--     -v migration_path="$PWD/supabase/migrations/20261101112414_award_delivery_orders.sql" \
--     -v followup_migration_path="$PWD/supabase/migrations/20261101121711_reject_legacy_combined_delivery_payment.sql" \
--     -f supabase/tests/award_delivery_orders.sql
--
-- Everything, including the minimal fixture schema and roles, is rolled back.

\set ON_ERROR_STOP on
begin;

do $$
begin
  create role anon;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  create role authenticated;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  create role service_role;
exception when duplicate_object then null;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key,
  email text
);

create table public.award_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  status text not null default 'draft',
  award_payment_status text not null default 'unpaid',
  award_paid_at timestamptz,
  award_paid_attempt_id uuid,
  award_amount_kobo bigint not null default 2500000,
  total_amount_kobo bigint not null default 2500000,
  currency text not null default 'NGN',
  gig_waybill text,
  gig_tracking_url text,
  paystack_reference text,
  paystack_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.award_payment_attempts (
  id uuid primary key,
  order_id uuid not null,
  provider text not null,
  charge_scope text not null,
  status text not null,
  requested_amount_minor bigint not null,
  captured_amount_minor bigint,
  currency text not null,
  confirmed_at timestamptz
);

grant select on public.profiles to service_role;
grant select, update on public.award_orders to service_role;
grant select on public.award_payment_attempts to service_role;

\i :migration_path
\i :followup_migration_path

-- Service-role RPCs need only the minimal fixture privileges.  The migration
-- deliberately grants no table/function access to anon or authenticated.
grant select on public.profiles to service_role;
grant select, insert, update on public.award_orders to service_role;
grant select on public.award_payment_attempts to service_role;

insert into public.profiles(id, email) values
  ('00000000-0000-0000-0000-000000000001', 'Member@One.Example'),
  ('00000000-0000-0000-0000-000000000002', 'member.two@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'member.three@example.test'),
  ('00000000-0000-0000-0000-000000000004', 'member.four@example.test'),
  ('00000000-0000-0000-0000-000000000005', 'member.five@example.test'),
  ('00000000-0000-0000-0000-000000000006', 'member.six@example.test');

insert into public.award_orders(
  id, profile_id, status, award_payment_status, award_paid_at,
  award_amount_kobo, total_amount_kobo, currency, gig_waybill,
  paystack_reference, paid_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'paid', 'paid', now(), 2500000, 3000000, 'NGN', null, null, null),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'paid', 'paid', now(), 2500000, 2500000, 'NGN', null, null, null),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'paid', 'paid', now(), 2500000, 2500000, 'NGN', null, null, null),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'paid', 'paid', now(), 2500000, 2500000, 'NGN', null, null, null),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'paid', 'paid', now(), 2500000, 2500000, 'NGN', null, null, null),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'paid', 'paid', now(), 2500000, 3000000, 'NGN', null, 'legacy-ref-6', now());

insert into public.award_payment_attempts(
  id, order_id, provider, charge_scope, status,
  requested_amount_minor, captured_amount_minor, currency, confirmed_at
) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'bachs', 'award_fee', 'succeeded', 2500000, 2500000, 'NGN', now()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'bachs', 'award_fee', 'succeeded', 2500000, 2500000, 'NGN', now()),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'bachs', 'award_fee', 'succeeded', 2500000, 2500000, 'NGN', now()),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'bachs', 'award_fee', 'succeeded', 2500000, 2500000, 'NGN', now()),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', 'bachs', 'award_fee', 'succeeded', 2500000, 2500000, 'NGN', now());

update public.award_orders
set paystack_status = 'success'
where id = '10000000-0000-0000-0000-000000000006';

update public.award_orders
set award_paid_attempt_id = case id
  when '10000000-0000-0000-0000-000000000001' then '30000000-0000-0000-0000-000000000001'::uuid
  when '10000000-0000-0000-0000-000000000002' then '30000000-0000-0000-0000-000000000002'::uuid
  when '10000000-0000-0000-0000-000000000004' then '30000000-0000-0000-0000-000000000004'::uuid
  when '10000000-0000-0000-0000-000000000005' then '30000000-0000-0000-0000-000000000005'::uuid
  when '10000000-0000-0000-0000-000000000006' then '30000000-0000-0000-0000-000000000006'::uuid
  else null
end;

create or replace function public.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'delivery SQL assertion failed: %', p_message;
  end if;
end;
$$;

create or replace function public.assert_raises(p_sql text, p_pattern text)
returns void
language plpgsql
as $$
declare
  v_failed boolean := false;
  v_message text;
begin
  begin
    execute p_sql;
  exception when others then
    v_failed := true;
    v_message := sqlerrm;
  end;
  if not v_failed then
    raise exception 'delivery SQL assertion failed: expected an error for %', p_sql;
  end if;
  if p_pattern is not null and position(lower(p_pattern) in lower(v_message)) = 0 then
    raise exception 'delivery SQL assertion failed: error % did not contain %', v_message, p_pattern;
  end if;
end;
$$;

-- All API-shaped assertions run as the only role granted the private table and
-- function privileges.
set local role service_role;
set local search_path = pg_temp, public;

do $$
declare
  v_quote jsonb;
  v_row jsonb;
  v_quote_id uuid;
  v_second_id uuid := '20000000-0000-0000-0000-000000000002';
  v_expired_id uuid := '20000000-0000-0000-0000-000000000003';
  v_late_id uuid := '20000000-0000-0000-0000-000000000004';
  v_missing_fee_id uuid := '20000000-0000-0000-0000-000000000005';
  v_delayed_id uuid := '20000000-0000-0000-0000-000000000006';
  v_cancel_id uuid := '20000000-0000-0000-0000-000000000007';
  v_provider_expired_id uuid := '20000000-0000-0000-0000-000000000008';
  v_finish_conflict_id uuid := '20000000-0000-0000-0000-000000000009';
  v_bind_conflict_id uuid := '20000000-0000-0000-0000-000000000010';
  v_competing_claim_id uuid := '20000000-0000-0000-0000-000000000011';
  v_before_award record;
  v_after_award record;
  v_rows integer;
begin
  -- Ownership and trusted-email derivation.
  v_quote := public.save_award_delivery_quote(
    '00000000-0000-0000-0000-000000000001',
    '{"email":"attacker@example.test","recipientName":"Ada"}'::jsonb,
    '{"recipientName":"Ada","phone":"08000000000","addressLine1":"1 Example Street","city":"Lagos","state":"Lagos","country":"Nigeria"}'::jsonb,
    125000,
    '{"provider":"gig","quoteId":"gig-1"}'::jsonb
  );
  v_quote_id := (v_quote->>'id')::uuid;
  perform assert_true(v_quote->>'status' = 'quoted', 'quote starts quoted');
  perform assert_true(v_quote->>'currency' = 'NGN', 'quote currency is NGN');
  perform assert_true((v_quote->'quote_input'->>'email') = 'member@one.example', 'quote email comes from the profile, not input');
  perform assert_true(((v_quote->>'expires_at')::timestamptz > now() + interval '14 minutes'), 'quote expiry defaults to fifteen minutes');

  -- Legacy Paystack charged award plus delivery together.  Even with a stray
  -- canonical Bachs award_fee attempt attached later, it must not become a
  -- separately chargeable delivery parent before a waybill exists.
  perform assert_true(
    not public.award_delivery_order_is_paid((select o from public.award_orders o where o.id = '10000000-0000-0000-0000-000000000006')),
    'paid legacy combined order is not eligible for a separate delivery charge'
  );
  perform assert_raises(
    $q$select public.save_award_delivery_quote('00000000-0000-0000-0000-000000000006','{"recipientName":"Legacy Member","phone":"08000000006"}'::jsonb,'{"recipientName":"Legacy Member","phone":"08000000006","addressLine1":"8 Example Street","city":"Lagos","state":"Lagos","country":"Nigeria"}'::jsonb,1000,'{"provider":"legacy-test"}'::jsonb)$q$,
    'confirmed'
  );

  perform assert_raises(
    format('select public.reserve_award_delivery_checkout(%L::uuid,%L::uuid)', '00000000-0000-0000-0000-000000000002', v_quote_id),
    'quote was not found'
  );

  -- The caller may reserve its row once and safely retry the same reservation.
  v_row := public.reserve_award_delivery_checkout(
    '00000000-0000-0000-0000-000000000001', v_quote_id
  );
  perform assert_true(v_row->>'status' = 'creating', 'reservation changes quoted to creating');
  perform assert_true((public.reserve_award_delivery_checkout(
    '00000000-0000-0000-0000-000000000001', v_quote_id
  ))->>'id' = v_quote_id::text, 'duplicate reservation returns the same row');

  -- checkout_request is first-write-only while creating, then immutable.
  update public.award_delivery_orders
  set checkout_request = 'delivery-request-1'
  where id = v_quote_id
    and status = 'creating'
    and checkout_request is null;
  get diagnostics v_rows = row_count;
  perform assert_true(v_rows = 1, 'first checkout request write succeeds');
  perform assert_raises(
    format('update public.award_delivery_orders set checkout_request = %L where id = %L::uuid', 'delivery-request-2', v_quote_id),
    'first-write-only'
  );

  v_row := public.bind_award_delivery_checkout(
    v_quote_id, 'checkout-1', 'https://checkout.example/1', now() + interval '10 minutes', 'open'
  );
  perform assert_true(v_row->>'status' = 'open', 'provider binding opens the checkout');
  perform assert_raises(
    format('select public.bind_award_delivery_checkout(%L::uuid,%L,%L,now() + interval ''10 minutes'',''open'')', v_quote_id, 'checkout-other', 'https://checkout.example/other'),
    'already bound'
  );

  -- Exact identity, purpose, currency, and principal are required.  None of
  -- these forged events may move the row out of open.
  perform assert_raises(
    format($sql$select public.settle_award_delivery_checkout(%L::uuid, %L::jsonb)$sql$,
      v_quote_id,
      jsonb_build_object('checkout_id','checkout-1','reference',v_quote->>'reference','purpose','wrong-purpose','status','paid','currency','NGN','amount_minor',125000,'charge_id','charge-forged')::text),
    'identity'
  );
  perform assert_raises(
    format($sql$select public.settle_award_delivery_checkout(%L::uuid, %L::jsonb)$sql$,
      v_quote_id,
      jsonb_build_object('checkout_id','checkout-other','reference',v_quote->>'reference','purpose','afl_award_delivery_v1','status','paid','currency','NGN','amount_minor',125000,'charge_id','charge-forged')::text),
    'identity'
  );
  perform assert_raises(
    format($sql$select public.settle_award_delivery_checkout(%L::uuid, %L::jsonb)$sql$,
      v_quote_id,
      jsonb_build_object('checkout_id','checkout-1','reference',v_quote->>'reference','purpose','afl_award_delivery_v1','status','paid','currency','NGN','amount_minor',125001,'charge_id','charge-forged')::text),
    'amount'
  );
  perform assert_raises(
    format($sql$select public.settle_award_delivery_checkout(%L::uuid, %L::jsonb)$sql$,
      v_quote_id,
      jsonb_build_object('checkout_id','checkout-1','reference',v_quote->>'reference','purpose','afl_award_delivery_v1','status','paid','currency','USD','amount_minor',125000,'charge_id','charge-forged')::text),
    'identity'
  );
  perform assert_raises(
    format($sql$select public.settle_award_delivery_checkout(%L::uuid, %L::jsonb)$sql$,
      v_quote_id,
      jsonb_build_object('checkout_id','checkout-1','reference',v_quote->>'reference','purpose','afl_award_delivery_v1','status','paid','currency','NGN','amount_minor',125000)::text),
    'charge ID'
  );
  perform assert_true((select status from public.award_delivery_orders where id = v_quote_id) = 'open', 'forged settlement leaves quote open');

  select award_payment_status, status, gig_waybill, total_amount_kobo
    into v_before_award
  from public.award_orders
  where id = '10000000-0000-0000-0000-000000000001';

  v_row := public.settle_award_delivery_checkout(
    v_quote_id,
    jsonb_build_object(
      'checkout_id','checkout-1',
      'reference',v_quote->>'reference',
      'purpose','afl_award_delivery_v1',
      'status','paid',
      'currency','NGN',
      'amount_minor',125000,
      'charge_id','charge-1',
      'charge_currency','NGN',
      'gross_amount','125000',
      'delivery_id',v_quote_id::text,
      'order_id','10000000-0000-0000-0000-000000000001',
      'member_id','00000000-0000-0000-0000-000000000001'
    )
  );
  perform assert_true(v_row->>'status' = 'paid', 'exact payment settles delivery');
  perform assert_true(v_row->>'charge_id' = 'charge-1', 'exact charge is recorded');
  perform assert_true((v_row->'payment_evidence'->>'charge_currency') = 'NGN', 'complete authenticated payment evidence is persisted');
  perform assert_true((v_row->'payment_evidence'->>'gross_amount') = '125000', 'provider gross amount is preserved for audit');

  select award_payment_status, status, gig_waybill, total_amount_kobo
    into v_after_award
  from public.award_orders
  where id = '10000000-0000-0000-0000-000000000001';
  perform assert_true(
    (v_before_award.award_payment_status, v_before_award.status, v_before_award.gig_waybill, v_before_award.total_amount_kobo)
      is not distinct from
    (v_after_award.award_payment_status, v_after_award.status, v_after_award.gig_waybill, v_after_award.total_amount_kobo),
    'settlement does not mutate legacy award payment/delivery fields'
  );

  -- The paid quote cannot be repriced or have its address/body edited, even by
  -- service_role direct table access.
  perform assert_raises(
    format('update public.award_delivery_orders set amount_minor = 1 where id = %L::uuid', v_quote_id),
    'immutable'
  );
  perform assert_raises(
    format('update public.award_delivery_orders set quote_input = ''{"recipientName":"forged"}''::jsonb where id = %L::uuid', v_quote_id),
    'immutable'
  );
  perform assert_raises(
    format('update public.award_delivery_orders set expires_at = now() + interval ''1 day'' where id = %L::uuid', v_quote_id),
    'immutable'
  );

  -- A second quote cannot be charged while the first row is paid.  Insert an
  -- explicitly quoted history row to prove reserve's duplicate-charge guard.
  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status
  ) values (
    v_second_id,
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"email":"member@one.example"}', '{"addressLine1":"2 Example Street"}', '{}',
    125000, now() + interval '15 minutes', 'quoted'
  );
  perform assert_raises(
    format('select public.reserve_award_delivery_checkout(%L::uuid,%L::uuid)', '00000000-0000-0000-0000-000000000001', v_second_id),
    'already active'
  );

  update public.award_delivery_orders
  set status = 'creating'
  where id = v_second_id;
  v_row := public.bind_award_delivery_checkout(
    v_second_id, 'checkout-2', 'https://checkout.example/2', now() + interval '10 minutes', 'completed'
  );
  perform assert_true(v_row->>'status' = 'creating', 'provider completed binding leaves settlement state creating');
  perform assert_true(v_row->>'checkout_id' = 'checkout-2', 'completed provider binding stores checkout identity');
  update public.award_delivery_orders set status = 'open' where id = v_second_id;

  -- One paid row may be claimed exactly once.  Completion writes only the new
  -- delivery row; the legacy award order remains byte-for-byte unchanged.
  v_row := public.claim_award_delivery_dispatch(v_quote_id);
  perform assert_true(v_row->>'status' = 'booking', 'paid delivery enters booking before external call');
  perform assert_true(public.claim_award_delivery_dispatch(v_quote_id) is null, 'booking row cannot be automatically reclaimed');
  v_row := public.finish_award_delivery_dispatch(v_quote_id, 'new-delivery-waybill', 'https://track.example/new-delivery-waybill', '{"accepted":true}'::jsonb);
  perform assert_true(v_row->>'status' = 'dispatched', 'booking completion dispatches delivery row');
  perform assert_true(v_row->>'waybill' = 'new-delivery-waybill', 'new waybill is stored on delivery row');
  perform assert_true(public.claim_award_delivery_dispatch(v_quote_id) is null, 'dispatched delivery cannot be claimed again');
  select award_payment_status, status, gig_waybill, total_amount_kobo
    into v_after_award
  from public.award_orders
  where id = '10000000-0000-0000-0000-000000000001';
  perform assert_true(
    (v_before_award.award_payment_status, v_before_award.status, v_before_award.gig_waybill, v_before_award.total_amount_kobo)
      is not distinct from
    (v_after_award.award_payment_status, v_after_award.status, v_after_award.gig_waybill, v_after_award.total_amount_kobo),
    'dispatch completion does not mutate legacy order totals/status/waybill'
  );

  -- Conflicting payment evidence for that second row is retained for review,
  -- never used to overwrite the first settled/dispatched row.
  v_row := public.settle_award_delivery_checkout(
    v_second_id,
    jsonb_build_object(
      'checkout_id','checkout-2',
      'reference',(select reference from public.award_delivery_orders where id = v_second_id),
      'purpose','afl_award_delivery_v1',
      'status','paid',
      'currency','NGN',
      'amount_minor',125000,
      'charge_id','charge-2'
    )
  );
  perform assert_true(v_row->>'status' = 'needs_review', 'conflicting payment goes to review');
  perform assert_true((select status from public.award_delivery_orders where id = v_quote_id) = 'dispatched', 'conflict never overwrites first dispatch');

  -- The member quote wall-clock may pass while its already-reserved provider
  -- checkout remains valid.  Authenticated paid evidence must still settle;
  -- only an explicit provider expiry or another active attempt is reviewable.
  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status, checkout_id, checkout_url, checkout_expires_at
  ) values (
    v_delayed_id,
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000004',
    '{"email":"member.four@example.test"}', '{"addressLine1":"6 Example Street"}', '{}',
    111000, now() - interval '1 hour', 'open', 'checkout-delayed', 'https://checkout.example/delayed', now() + interval '30 minutes'
  );
  v_row := public.settle_award_delivery_checkout(
    v_delayed_id,
    jsonb_build_object(
      'checkout_id','checkout-delayed',
      'reference',(select reference from public.award_delivery_orders where id = v_delayed_id),
      'purpose','afl_award_delivery_v1',
      'status','paid',
      'currency','NGN',
      'amount_minor',111000,
      'charge_id','charge-delayed',
      'charge_currency','NGN',
      'gross_amount','111000'
    )
  );
  perform assert_true(v_row->>'status' = 'paid', 'valid reserved checkout may settle after quote wall-clock expiry');

  update public.award_orders
  set award_payment_status = 'refunded'
  where id = '10000000-0000-0000-0000-000000000004';
  v_row := public.claim_award_delivery_dispatch(v_delayed_id);
  perform assert_true(v_row->>'status' = 'needs_review', 'refunded award transitions paid delivery to review');
  perform assert_true(v_row->'booking_response'->>'reason' = 'award fee was refunded', 'refund review reason is persisted');

  -- A quote explicitly terminalized as expired cannot be reused; a later paid
  -- event becomes needs_review even when the provider evidence arrives late.
  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status, checkout_id, checkout_url, checkout_expires_at
  ) values (
    v_expired_id,
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"email":"member.two@example.test"}', '{"addressLine1":"3 Example Street"}', '{}',
    99000, now() - interval '1 minute', 'quoted', 'checkout-expired', 'https://checkout.example/expired', now() - interval '30 seconds'
  );
  v_row := public.reserve_award_delivery_checkout('00000000-0000-0000-0000-000000000002', v_expired_id);
  perform assert_true(v_row->>'status' = 'expired', 'expired quote is terminal and cannot be reserved');
  perform assert_true((select status from public.award_delivery_orders where id = v_expired_id) = 'expired', 'expired quote remains in immutable history');

  -- Provider GET/reconcile is the canonical source for a bound checkout's
  -- expiry; this row is still within its local quote window.
  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status, checkout_id, checkout_url, checkout_expires_at
  ) values (
    v_provider_expired_id,
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"email":"member.two@example.test"}', '{"addressLine1":"3b Example Street"}', '{}',
    99000, now() + interval '10 minutes', 'creating', 'checkout-provider-expired', 'https://checkout.example/provider-expired', now() - interval '30 seconds'
  );
  v_row := public.settle_award_delivery_checkout(
    v_provider_expired_id,
    jsonb_build_object(
      'checkout_id','checkout-provider-expired',
      'reference',(select reference from public.award_delivery_orders where id = v_provider_expired_id),
      'purpose','afl_award_delivery_v1',
      'status','expired',
      'currency','NGN',
      'amount_minor',99000,
      'charge_id',null
    )
  );
  perform assert_true(v_row->>'status' = 'expired', 'authenticated provider expiry safely terminalizes a bound checkout');

  v_late_id := '20000000-0000-0000-0000-000000000004';
  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status, checkout_id, checkout_url, checkout_expires_at
  ) values (
    v_late_id,
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"email":"member.two@example.test"}', '{"addressLine1":"4 Example Street"}', '{}',
    99000, now() + interval '10 minutes', 'expired', 'checkout-late', 'https://checkout.example/late', now() - interval '30 seconds'
  );
  v_row := public.settle_award_delivery_checkout(
    v_late_id,
    jsonb_build_object(
      'checkout_id','checkout-late',
      'reference',(select reference from public.award_delivery_orders where id = v_late_id),
      'purpose','afl_award_delivery_v1',
      'status','paid',
      'currency','NGN',
      'amount_minor',99000,
      'charge_id','charge-late'
    )
  );
  perform assert_true(v_row->>'status' = 'needs_review', 'late paid checkout goes to review');

  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status
  ) values (
    v_competing_claim_id,
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"email":"member.two@example.test"}', '{"addressLine1":"4b Example Street"}', '{}',
    99000, now() + interval '10 minutes', 'paid'
  );
  v_row := public.claim_award_delivery_dispatch(v_competing_claim_id);
  perform assert_true(v_row->>'status' = 'needs_review', 'competing review delivery cannot remain paid');
  perform assert_true(v_row->'booking_response'->>'reason' like '%another delivery%', 'competing review reason is persisted');

  -- Finish rechecks the canonical award guard and preserves the uncertain
  -- carrier result even when the award was refunded after claim.
  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status
  ) values (
    v_finish_conflict_id,
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',
    '{"email":"member.five@example.test"}', '{"addressLine1":"9 Example Street"}', '{}',
    1000, now() + interval '10 minutes', 'paid'
  );
  v_row := public.claim_award_delivery_dispatch(v_finish_conflict_id);
  perform assert_true(v_row->>'status' = 'booking', 'canonical-paid delivery can be claimed before refund');
  update public.award_orders
  set award_payment_status = 'refunded'
  where id = '10000000-0000-0000-0000-000000000005';
  v_row := public.finish_award_delivery_dispatch(
    v_finish_conflict_id,
    'waybill-refunded',
    'https://track.example/waybill-refunded',
    '{"carrier":"timeout"}'::jsonb
  );
  perform assert_true(v_row->>'status' = 'needs_review', 'finish refund conflict transitions to review');
  perform assert_true(v_row->'booking_response'->>'carrier' = 'timeout', 'finish preserves carrier response');
  perform assert_true(v_row->'booking_response'->>'waybill' = 'waybill-refunded', 'finish preserves uncertain waybill');
  perform assert_true(v_row->'booking_response'->>'tracking_url' = 'https://track.example/waybill-refunded', 'finish preserves uncertain tracking URL');

  -- Even after an external checkout exists, binding retains its identifiers
  -- and routes an ineligible parent to review instead of losing the evidence.
  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status
  ) values (
    v_bind_conflict_id,
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',
    '{"email":"member.five@example.test"}', '{"addressLine1":"10 Example Street"}', '{}',
    1000, now() + interval '10 minutes', 'creating'
  );
  v_row := public.bind_award_delivery_checkout(
    v_bind_conflict_id, 'checkout-refunded-parent', 'https://checkout.example/refunded-parent', now() + interval '10 minutes', 'open'
  );
  perform assert_true(v_row->>'status' = 'needs_review', 'ineligible parent checkout bind routes to review');
  perform assert_true(v_row->>'checkout_id' = 'checkout-refunded-parent', 'ineligible bind preserves external checkout identifier');

  -- Missing/forged award-fee confirmation blocks quote creation.
  perform assert_raises(
    $q$select public.save_award_delivery_quote('00000000-0000-0000-0000-000000000003','{}'::jsonb,'{"city":"Lagos"}'::jsonb,1000,'{}'::jsonb)$q$,
    'confirmed'
  );

  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status, checkout_id, checkout_url, checkout_expires_at
  ) values (
    v_missing_fee_id,
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '{"email":"member.three@example.test"}', '{"addressLine1":"5 Example Street"}', '{}',
    1000, now() + interval '10 minutes', 'open', 'checkout-unpaid', 'https://checkout.example/unpaid', now() + interval '5 minutes'
  );
  v_row := public.settle_award_delivery_checkout(
    v_missing_fee_id,
    jsonb_build_object(
      'checkout_id','checkout-unpaid',
      'reference',(select reference from public.award_delivery_orders where id = v_missing_fee_id),
      'purpose','afl_award_delivery_v1',
      'status','paid',
      'currency','NGN',
      'amount_minor',1000,
      'charge_id','charge-unpaid'
    )
  );
  perform assert_true(v_row->>'status' = 'needs_review', 'missing award fee confirmation blocks delivery settlement');

  insert into public.award_delivery_orders(
    id, order_id, member_id, quote_input, resolved_delivery, carrier_quote,
    amount_minor, expires_at, status, checkout_id, checkout_url, checkout_expires_at
  ) values (
    v_cancel_id,
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '{"email":"member.three@example.test"}', '{"addressLine1":"7 Example Street"}', '{}',
    1000, now() + interval '10 minutes', 'open', 'checkout-cancelled', 'https://checkout.example/cancelled', now() + interval '5 minutes'
  );
  update public.award_orders
  set status = 'cancelled'
  where id = '10000000-0000-0000-0000-000000000003';
  perform assert_raises(
    format('select public.reserve_award_delivery_checkout(%L::uuid,%L::uuid)', '00000000-0000-0000-0000-000000000003', v_cancel_id),
    'confirmed'
  );
  v_row := public.settle_award_delivery_checkout(
    v_cancel_id,
    jsonb_build_object(
      'checkout_id','checkout-cancelled',
      'reference',(select reference from public.award_delivery_orders where id = v_cancel_id),
      'purpose','afl_award_delivery_v1',
      'status','paid',
      'currency','NGN',
      'amount_minor',1000,
      'charge_id','charge-cancelled'
    )
  );
  perform assert_true(v_row->>'status' = 'needs_review', 'cancelled parent payment goes to review');
  perform assert_true(public.claim_award_delivery_dispatch(v_cancel_id) is null, 'cancelled parent cannot be dispatched');

  -- RLS is enabled and neither member/anon role has a direct table or RPC
  -- grant.  These are checked by PostgreSQL's privilege catalog in addition
  -- to the revoked grants, so this remains a pure SQL test.
  perform assert_true((select relrowsecurity from pg_class where oid = 'public.award_delivery_orders'::regclass), 'delivery table has RLS enabled');
  perform assert_true(not has_table_privilege('anon', 'public.award_delivery_orders', 'select'), 'anon cannot read delivery rows');
  perform assert_true(not has_table_privilege('authenticated', 'public.award_delivery_orders', 'select'), 'member cannot read delivery rows directly');
  perform assert_true(not has_function_privilege('anon', 'public.save_award_delivery_quote(uuid,jsonb,jsonb,bigint,jsonb)', 'execute'), 'anon cannot execute quote RPC');
  perform assert_true(not has_function_privilege('authenticated', 'public.save_award_delivery_quote(uuid,jsonb,jsonb,bigint,jsonb)', 'execute'), 'member cannot execute quote RPC');
  perform assert_true(not (select prosecdef from pg_proc where oid = 'public.save_award_delivery_quote(uuid,jsonb,jsonb,bigint,jsonb)'::regprocedure), 'quote RPC is SECURITY INVOKER');
  perform assert_true(not (select prosecdef from pg_proc where oid = 'public.settle_award_delivery_checkout(uuid,jsonb)'::regprocedure), 'settlement RPC is SECURITY INVOKER');
end;
$$;

reset role;

set local role anon;
select public.assert_raises($q$select * from public.award_delivery_orders$q$, 'permission denied');
select public.assert_raises($q$select public.save_award_delivery_quote('00000000-0000-0000-0000-000000000001','{}'::jsonb,'{}'::jsonb,1,'{}'::jsonb)$q$, 'permission denied');
reset role;

set local role authenticated;
select public.assert_raises($q$select * from public.award_delivery_orders$q$, 'permission denied');
select public.assert_raises($q$select public.save_award_delivery_quote('00000000-0000-0000-0000-000000000001','{}'::jsonb,'{}'::jsonb,1,'{}'::jsonb)$q$, 'permission denied');
reset role;

rollback;

select 'award delivery SQL tests passed' as result;
