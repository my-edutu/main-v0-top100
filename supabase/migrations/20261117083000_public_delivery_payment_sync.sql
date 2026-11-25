-- Public-link delivery payments lack our per-order reference. Only the service
-- verifier may supply evidence obtained by retrieving BOTH Bachs objects.
create table if not exists public.award_delivery_payment_receipts (
  charge_id text primary key,
  checkout_id text not null unique,
  delivery_id uuid references public.award_delivery_orders(id),
  status text not null check (status in ('matched', 'review')),
  reason text,
  evidence jsonb not null,
  verified_at timestamptz not null default now()
);
alter table public.award_delivery_payment_receipts enable row level security;
revoke all on public.award_delivery_payment_receipts from public, anon, authenticated;
grant select, insert, update on public.award_delivery_payment_receipts to service_role;
create policy "Service manages verified delivery receipts" on public.award_delivery_payment_receipts
  for all to service_role using (true) with check (true);

create or replace function public.reconcile_public_award_delivery_payment(p_evidence jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_receipt public.award_delivery_payment_receipts%rowtype;
  v_delivery public.award_delivery_orders%rowtype;
  v_order public.award_orders%rowtype;
  v_ids uuid[];
  v_id uuid;
  v_charge text := p_evidence->>'charge_id';
  v_checkout text := p_evidence->>'checkout_id';
  v_email text := lower(trim(p_evidence->>'email'));
  v_amount bigint;
  v_paid timestamptz;
  v_reason text;
begin
  if jsonb_typeof(p_evidence) is distinct from 'object'
    or p_evidence->>'source' is distinct from 'bachs_public_delivery_link'
    or p_evidence->>'purpose' is distinct from 'afl_award_delivery_v1'
    or p_evidence->>'status' is distinct from 'paid'
    or p_evidence->>'payment_link_id' is distinct from 'pl_2d4914db4ed0'
    or p_evidence->>'product_id' is distinct from 'prod_595bb57045f149429614'
    or p_evidence->>'currency' is distinct from 'NGN'
    or coalesce(v_charge, '') !~ '^ch_[a-zA-Z0-9]+$'
    or coalesce(v_checkout, '') !~ '^chk_[a-zA-Z0-9]+$'
    or coalesce(v_email, '') not like '%@%'
    or coalesce(p_evidence->>'charge_currency', '') !~ '^[A-Z]{3}$'
    or coalesce(p_evidence->>'gross_amount', '') !~ '^[0-9]+\.[0-9]{2}$'
  then raise exception using errcode='22023', message='verified public delivery evidence is required'; end if;
  v_amount := (p_evidence->>'amount_minor')::bigint;
  v_paid := (p_evidence->>'paid_at')::timestamptz;
  if v_amount is null or v_amount <= 0 or v_paid is null or v_paid > now() + interval '5 minutes' then
    raise exception using errcode='22023', message='invalid verified payment amount or completion time';
  end if;
  -- Serialize replay before matching. Parent order locks below serialize this
  -- receipt with quote/reservation/dispatch changes and other payment receipts.
  perform pg_advisory_xact_lock(hashtextextended('public-delivery:' || v_charge, 0));
  select * into v_receipt from public.award_delivery_payment_receipts where charge_id=v_charge;
  if found and v_receipt.status='matched' then
    if v_receipt.checkout_id is distinct from v_checkout or v_receipt.evidence is distinct from p_evidence then
      raise exception using errcode='22023', message='verified receipt identity is immutable';
    end if;
    return jsonb_build_object('status','matched','delivery_id',v_receipt.delivery_id,'replayed',true);
  end if;
  select array_agg(id) into v_ids from public.award_delivery_orders d
    where d.status='creating' and d.checkout_id is null and d.charge_id is null
      and d.checkout_url='https://checkout.bachs.io/pay/pl_2d4914db4ed0'
      and d.checkout_request::jsonb->>'kind'='external_payment_link'
      and d.checkout_request::jsonb->>'purpose'='afl_award_delivery_v1'
      and lower(trim(d.quote_input->>'email'))=v_email
      and d.amount_minor=v_amount and d.currency='NGN' and d.created_at <= v_paid;
  if coalesce(cardinality(v_ids),0) <> 1 then
    v_reason := 'No unique reserved delivery matches the verified email and exact amount';
  else
    v_id := v_ids[1];
    select o.* into v_order from public.award_orders o join public.award_delivery_orders d on d.order_id=o.id where d.id=v_id for update of o;
    select * into v_delivery from public.award_delivery_orders where id=v_id for update;
    if v_delivery.status <> 'creating' or v_delivery.checkout_id is not null or v_delivery.charge_id is not null then
      v_reason := 'Delivery was already settled or changed during reconciliation';
    elsif not public.award_delivery_order_is_paid(v_order) then
      v_reason := 'Parent award payment is not confirmed';
    elsif exists(select 1 from public.award_delivery_orders where order_id=v_order.id and id<>v_id and status in ('creating','open','paid','booking','dispatched','needs_review')) then
      v_reason := 'Another active delivery exists for this award';
    elsif exists(select 1 from public.award_delivery_orders where charge_id=v_charge or checkout_id=v_checkout) then
      v_reason := 'Provider charge or checkout is already attached to a delivery';
    end if;
  end if;
  insert into public.award_delivery_payment_receipts(charge_id,checkout_id,delivery_id,status,reason,evidence)
    values(v_charge,v_checkout,case when v_reason is null then v_id end,case when v_reason is null then 'matched' else 'review' end,v_reason,p_evidence)
    on conflict(charge_id) do update set delivery_id=excluded.delivery_id,status=excluded.status,reason=excluded.reason,evidence=excluded.evidence,verified_at=now();
  if v_reason is not null then return jsonb_build_object('status','review','reason',v_reason); end if;
  update public.award_delivery_orders set checkout_id=v_checkout, charge_id=v_charge, paid_at=v_paid, status='paid',
    payment_evidence=p_evidence || jsonb_build_object('reference',v_delivery.reference,'automatic_dispatch',false)
    where id=v_id;
  return jsonb_build_object('status','matched','delivery_id',v_id,'replayed',false);
end;
$$;
revoke all on function public.reconcile_public_award_delivery_payment(jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_public_award_delivery_payment(jsonb) to service_role;
notify pgrst, 'reload schema';
