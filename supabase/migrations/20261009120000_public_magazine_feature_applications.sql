-- Allow non-member visitors to pay for and submit a 2026 magazine feature.
-- Guest order access is a random token whose SHA-256 digest is stored here;
-- public/anon/authenticated roles receive no direct table or RPC access.

alter table public.magazine_feature_orders
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists guest_access_token_hash text;

update public.magazine_feature_orders orders
set customer_name = coalesce(nullif(trim(orders.customer_name), ''), nullif(trim(profiles.full_name), ''), 'Awardee'),
    customer_email = coalesce(nullif(trim(orders.customer_email), ''), lower(trim(profiles.email)))
from public.profiles profiles
where profiles.id = orders.profile_id
  and (orders.customer_name is null or orders.customer_email is null);

alter table public.magazine_feature_orders
  alter column profile_id drop not null;

alter table public.magazine_feature_applications
  alter column profile_id drop not null;

alter table public.member_features
  alter column member_id drop not null;

do $$ begin
  alter table public.magazine_feature_orders
    add constraint magazine_feature_guest_order_identity_check
    check (
      profile_id is not null
      or (
        nullif(trim(customer_name), '') is not null
        and customer_email is not null
        and customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        and guest_access_token_hash is not null
        and guest_access_token_hash ~ '^[0-9a-f]{64}$'
      )
    ) not valid;
exception when duplicate_object then null; end $$;

create unique index if not exists magazine_feature_guest_email_campaign_uidx
  on public.magazine_feature_orders (lower(customer_email), campaign_id)
  where profile_id is null and customer_email is not null;

create unique index if not exists magazine_feature_guest_token_uidx
  on public.magazine_feature_orders (guest_access_token_hash)
  where profile_id is null and guest_access_token_hash is not null;

create or replace function public.reserve_bachs_public_magazine_checkout(
  p_campaign_id text,
  p_attempt_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_guest_access_token_hash text,
  p_provider_reference text,
  p_idempotency_key text,
  p_currency text,
  p_requested_amount_minor bigint,
  p_price_version text,
  p_checkout_expires_at timestamptz default (now() + interval '60 minutes')
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_campaign public.magazine_feature_campaigns%rowtype;
  v_order public.magazine_feature_orders%rowtype;
  v_attempt public.magazine_feature_payment_attempts%rowtype;
  v_email text := lower(trim(p_customer_email));
  v_currency text := upper(trim(p_currency));
  v_expected bigint;
begin
  if p_attempt_id is null or nullif(trim(p_campaign_id), '') is null
     or nullif(trim(p_customer_name), '') is null
     or v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_guest_access_token_hash is null or p_guest_access_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'guest, campaign, and access details are required';
  end if;
  if v_currency is null or v_currency not in ('NGN', 'USD') then
    raise exception using errcode = '22023', message = 'unsupported magazine feature currency';
  end if;
  if nullif(trim(p_provider_reference), '') is null or length(p_provider_reference) > 127
     or nullif(trim(p_idempotency_key), '') is null then
    raise exception using errcode = '22023', message = 'provider reference or idempotency key is invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email || ':' || p_campaign_id, 0));
  select * into v_campaign from public.magazine_feature_campaigns where id = p_campaign_id for share;
  if not found or not v_campaign.application_open then
    return jsonb_build_object('outcome', 'campaign_closed');
  end if;
  v_expected := case v_currency when 'NGN' then v_campaign.ngn_amount_minor else v_campaign.usd_amount_minor end;
  if p_requested_amount_minor is distinct from v_expected
     or p_price_version is distinct from v_campaign.price_version then
    raise exception using errcode = '22023', message = 'magazine amount does not match the active campaign';
  end if;

  select * into v_order from public.magazine_feature_orders
  where profile_id is null and campaign_id = p_campaign_id
    and guest_access_token_hash = p_guest_access_token_hash
  for update;
  if found and lower(v_order.customer_email) <> v_email then
    return jsonb_build_object('outcome', 'access_conflict');
  end if;
  if not found then
    select * into v_order from public.magazine_feature_orders
    where profile_id is null and campaign_id = p_campaign_id and lower(customer_email) = v_email
    for update;
  end if;
  if not found then
    insert into public.magazine_feature_orders (
      profile_id, campaign_id, status, customer_name, customer_email, guest_access_token_hash
    ) values (
      null, p_campaign_id, 'unpaid', left(trim(p_customer_name), 120), v_email, p_guest_access_token_hash
    ) returning * into v_order;
  elsif v_order.guest_access_token_hash is distinct from p_guest_access_token_hash then
    return jsonb_build_object('outcome', 'access_conflict');
  end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('outcome', 'already_paid', 'order_id', v_order.id);
  end if;
  if v_order.status in ('exception', 'refunded') then
    return jsonb_build_object('outcome', 'needs_review', 'order_id', v_order.id);
  end if;

  select * into v_attempt from public.magazine_feature_payment_attempts
  where order_id = v_order.id and status in ('creating', 'open', 'processing')
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object('outcome', 'existing', 'order_id', v_order.id, 'attempt_id', v_attempt.id);
  end if;

  insert into public.magazine_feature_payment_attempts (
    id, order_id, status, price_version, requested_amount_minor, currency,
    provider_reference, idempotency_key, checkout_expires_at
  ) values (
    p_attempt_id, v_order.id, 'creating', p_price_version, p_requested_amount_minor,
    v_currency, p_provider_reference, p_idempotency_key, p_checkout_expires_at
  );
  update public.magazine_feature_orders set status = 'pending' where id = v_order.id;
  return jsonb_build_object(
    'outcome', 'created', 'order_id', v_order.id, 'attempt_id', p_attempt_id,
    'provider_reference', p_provider_reference, 'idempotency_key', p_idempotency_key,
    'currency', v_currency, 'requested_amount_minor', p_requested_amount_minor,
    'price_version', p_price_version
  );
end;
$$;

create or replace function public.submit_public_magazine_feature_application(
  p_guest_access_token_hash text,
  p_title text,
  p_category text,
  p_summary text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.magazine_feature_orders%rowtype;
  v_application public.magazine_feature_applications%rowtype;
  v_feature public.member_features%rowtype;
begin
  if p_guest_access_token_hash is null or p_guest_access_token_hash !~ '^[0-9a-f]{64}$'
     or char_length(trim(coalesce(p_title, ''))) not between 3 and 160
     or p_category is null or p_category not in ('bio', 'story', 'product', 'project')
     or char_length(trim(coalesce(p_summary, ''))) not between 20 and 10000 then
    raise exception using errcode = '22023', message = 'magazine feature application details are invalid';
  end if;

  select * into v_order from public.magazine_feature_orders
  where profile_id is null and guest_access_token_hash = p_guest_access_token_hash
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'guest magazine application access was not found';
  end if;
  if v_order.status <> 'paid' then
    raise exception using errcode = '42501', message = 'confirmed magazine feature payment is required';
  end if;

  select * into v_application from public.magazine_feature_applications where order_id = v_order.id;
  if found then
    select * into v_feature from public.member_features where id = v_application.member_feature_id;
    return jsonb_build_object('outcome', 'already_submitted', 'submission', to_jsonb(v_feature));
  end if;

  insert into public.member_features (member_id, member_name, title, category, summary, contact_email)
  values (null, v_order.customer_name, trim(p_title), p_category, trim(p_summary), v_order.customer_email)
  returning * into v_feature;

  insert into public.magazine_feature_applications (
    order_id, member_feature_id, profile_id, campaign_id, member_name, title, category, summary, contact_email
  ) values (
    v_order.id, v_feature.id, null, v_order.campaign_id, v_feature.member_name,
    v_feature.title, v_feature.category, v_feature.summary, v_feature.contact_email
  ) returning * into v_application;

  return jsonb_build_object('outcome', 'created', 'application_id', v_application.id, 'submission', to_jsonb(v_feature));
end;
$$;

revoke all on function public.reserve_bachs_public_magazine_checkout(text, uuid, text, text, text, text, text, text, bigint, text, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_bachs_public_magazine_checkout(text, uuid, text, text, text, text, text, text, bigint, text, timestamptz) to service_role;
revoke all on function public.submit_public_magazine_feature_application(text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_public_magazine_feature_application(text, text, text, text) to service_role;
