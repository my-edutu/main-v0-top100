create function public.test_evidence(p_charge text default 'ch_test',p_checkout text default 'chk_test',p_amount bigint default 823473) returns jsonb language sql as $$
select jsonb_build_object('source','bachs_public_delivery_link','purpose','afl_award_delivery_v1','status','paid','payment_link_id','pl_2d4914db4ed0','product_id','prod_595bb57045f149429614','currency','NGN','charge_id',p_charge,'checkout_id',p_checkout,'email','member@example.com','amount_minor',p_amount,'paid_at','2026-11-15T07:51:14Z','charge_currency','USD','gross_amount','6.04','provider_reference',null)
$$;
insert into award_orders values('00000000-0000-4000-8000-000000000001','draft','paid',now(),'00000000-0000-4000-8000-000000000002',null,null,null);
insert into award_payment_attempts values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','bachs','award_fee','succeeded',2000000,2000000,'NGN','00000000-0000-4000-8000-000000000003');
insert into award_delivery_orders(id,order_id,member_id,status,quote_input,amount_minor,currency,reference,checkout_url,checkout_request,created_at)
values('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005','creating','{"email":"Member@Example.com"}',823473,'NGN','original-local-reference','https://checkout.bachs.io/pay/pl_2d4914db4ed0','{"kind":"external_payment_link","purpose":"afl_award_delivery_v1"}','2026-11-14');
do $$
declare r jsonb; begin
 r:=reconcile_public_award_delivery_payment(test_evidence(p_amount=>1));
 if r->>'status'<>'review' then raise exception 'wrong amount was accepted'; end if;
 -- A valid payment keeps its original time, quote, local reference and FX currency.
 r:=reconcile_public_award_delivery_payment(test_evidence());
 if r->>'status'<>'matched' then raise exception 'exact paid delivery was not matched: %',r; end if;
 if not exists(select 1 from award_delivery_orders where status='paid' and amount_minor=823473 and paid_at='2026-11-15T07:51:14Z' and reference='original-local-reference' and payment_evidence->>'reference'=reference and payment_evidence->>'charge_currency'='USD' and payment_evidence->>'automatic_dispatch'='false' and booking_started_at is null) then raise exception 'incorrect settlement evidence'; end if;
 r:=reconcile_public_award_delivery_payment(test_evidence());
 if r->>'replayed'<>'true' or (select count(*) from award_delivery_payment_receipts where status='matched')<>1 then raise exception 'replay was not idempotent'; end if;
 r:=reconcile_public_award_delivery_payment(test_evidence('ch_second','chk_second'));
 if r->>'status'<>'review' or (select charge_id from award_delivery_orders)<>'ch_test' then raise exception 'duplicate payment replaced original'; end if;
 if has_function_privilege('anon','public.reconcile_public_award_delivery_payment(jsonb)','execute') or has_function_privilege('authenticated','public.reconcile_public_award_delivery_payment(jsonb)','execute') then raise exception 'browser can mutate payment'; end if;
 if has_table_privilege('anon','public.award_delivery_payment_receipts','select') or has_table_privilege('authenticated','public.award_delivery_payment_receipts','select') then raise exception 'receipt data is exposed'; end if;
 if not (select relrowsecurity from pg_class where oid='public.award_delivery_payment_receipts'::regclass) then raise exception 'RLS disabled'; end if;
end $$;
-- Reset just the isolated fixture for a concurrent two-charge test.
truncate award_delivery_payment_receipts;
alter table award_delivery_orders disable trigger user;
update award_delivery_orders set status='creating',checkout_id=null,charge_id=null,paid_at=null,payment_evidence=null;
alter table award_delivery_orders enable trigger user;
