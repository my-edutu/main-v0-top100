-- Awardee onboarding checklist and isolated paid magazine-feature application.
-- Payment state here must never mutate award_orders or award payment records.

create extension if not exists "pgcrypto";

create table if not exists public.awardee_onboarding_progress (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  welcome_read_at timestamptz,
  external_share_confirmed_at timestamptz,
  external_share_platform text check (
    external_share_platform is null or external_share_platform in ('linkedin', 'facebook', 'instagram', 'other')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_share_timestamp_platform_pair check (
    (external_share_confirmed_at is null) = (external_share_platform is null)
  )
);

create table if not exists public.awardee_onboarding_settings (
  id boolean primary key default true check (id),
  founder_name text not null default 'Nwosu Paul Light',
  founder_title text not null default 'Founder, Africa Future Leaders',
  founder_linkedin_url text not null default 'https://www.linkedin.com/in/paul-light-/',
  welcome_title text not null default 'Welcome to Africa Future Leaders.',
  welcome_body text not null default '',
  signature_text text not null default 'PAULLIGHT',
  organization_linkedin_url text not null default 'https://www.linkedin.com/company/top100africa/',
  facebook_url text,
  instagram_url text,
  flyer_template_url text,
  magazine_campaign_id text not null default 'afl-magazine-2026',
  updated_at timestamptz not null default now(),
  constraint onboarding_founder_linkedin_https check (founder_linkedin_url ~ '^https://'),
  constraint onboarding_org_linkedin_https check (organization_linkedin_url ~ '^https://'),
  constraint onboarding_facebook_https check (facebook_url is null or facebook_url ~ '^https://'),
  constraint onboarding_instagram_https check (instagram_url is null or instagram_url ~ '^https://'),
  constraint onboarding_flyer_https check (flyer_template_url is null or flyer_template_url ~ '^https://')
);

create table if not exists public.magazine_feature_campaigns (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  title text not null,
  description text not null default '',
  ngn_amount_minor bigint not null default 1000000 check (ngn_amount_minor > 0),
  usd_amount_minor bigint not null default 1000 check (usd_amount_minor > 0),
  price_version text not null default 'afl-magazine-2026-v1',
  application_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.magazine_feature_campaigns (
  id, title, description, ngn_amount_minor, usd_amount_minor, price_version
) values (
  'afl-magazine-2026',
  'Africa Future Leaders Magazine Feature',
  'Apply to share the story and impact behind your leadership. Payment covers editorial consideration and does not guarantee selection or publication.',
  1000000,
  1000,
  'afl-magazine-2026-v1'
) on conflict (id) do nothing;

insert into public.awardee_onboarding_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.magazine_feature_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  campaign_id text not null references public.magazine_feature_campaigns(id) on delete restrict,
  status text not null default 'unpaid' check (status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'exception')),
  paid_attempt_id uuid,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint magazine_feature_order_member_campaign_unique unique (profile_id, campaign_id)
);

create table if not exists public.magazine_feature_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.magazine_feature_orders(id) on delete restrict,
  provider text not null default 'bachs' check (provider = 'bachs'),
  charge_scope text not null default 'magazine_feature' check (charge_scope = 'magazine_feature'),
  status text not null check (status in (
    'creating', 'open', 'processing', 'succeeded', 'duplicate_succeeded',
    'failed', 'expired', 'cancelled', 'underpaid', 'overpaid', 'refunded', 'exception'
  )),
  price_version text not null,
  requested_amount_minor bigint not null check (requested_amount_minor > 0),
  captured_amount_minor bigint check (captured_amount_minor is null or captured_amount_minor >= 0),
  currency char(3) not null check (currency in ('NGN', 'USD')),
  provider_reference text not null,
  provider_checkout_id text,
  provider_charge_id text,
  provider_status text,
  idempotency_key text not null unique,
  checkout_expires_at timestamptz,
  confirmed_at timestamptz,
  failure_reason text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create index if not exists magazine_feature_attempts_order_idx
  on public.magazine_feature_payment_attempts (order_id, created_at desc);
create unique index if not exists magazine_feature_attempts_checkout_uidx
  on public.magazine_feature_payment_attempts (provider, provider_checkout_id)
  where provider_checkout_id is not null;
create unique index if not exists magazine_feature_attempts_one_success_uidx
  on public.magazine_feature_payment_attempts (order_id)
  where status = 'succeeded';

alter table public.magazine_feature_orders
  add constraint magazine_feature_order_paid_attempt_fk
  foreign key (paid_attempt_id) references public.magazine_feature_payment_attempts(id)
  on delete restrict not valid;

create table if not exists public.magazine_feature_webhook_events (
  id text primary key,
  event_type text not null,
  organization_id text,
  payment_attempt_id uuid references public.magazine_feature_payment_attempts(id) on delete set null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'exception')),
  payload jsonb not null,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists magazine_feature_webhook_attempt_idx
  on public.magazine_feature_webhook_events (payment_attempt_id);

create table if not exists public.magazine_feature_applications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.magazine_feature_orders(id) on delete restrict,
  member_feature_id uuid unique references public.member_features(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  campaign_id text not null references public.magazine_feature_campaigns(id) on delete restrict,
  member_name text not null,
  title text not null check (char_length(title) between 3 and 160),
  category text not null default 'bio' check (category in ('bio', 'story', 'product', 'project')),
  summary text not null check (char_length(summary) between 20 and 10000),
  contact_email text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'published', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists magazine_feature_applications_member_idx
  on public.magazine_feature_applications (profile_id, created_at desc);

create or replace function public.submit_magazine_feature_application(
  p_profile_id uuid,
  p_campaign_id text,
  p_member_name text,
  p_title text,
  p_category text,
  p_summary text,
  p_contact_email text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order public.magazine_feature_orders%rowtype;
  v_application public.magazine_feature_applications%rowtype;
  v_feature public.member_features%rowtype;
begin
  select * into v_order from public.magazine_feature_orders
  where profile_id = p_profile_id and campaign_id = p_campaign_id and status = 'paid'
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'confirmed magazine feature payment is required';
  end if;

  select * into v_application from public.magazine_feature_applications where order_id = v_order.id;
  if found then
    select * into v_feature from public.member_features where id = v_application.member_feature_id;
    return jsonb_build_object('outcome', 'already_submitted', 'submission', to_jsonb(v_feature));
  end if;

  insert into public.member_features (member_id, member_name, title, category, summary, contact_email)
  values (p_profile_id, left(coalesce(nullif(trim(p_member_name), ''), 'Awardee'), 200), trim(p_title), p_category, trim(p_summary), trim(p_contact_email))
  returning * into v_feature;

  insert into public.magazine_feature_applications (
    order_id, member_feature_id, profile_id, campaign_id, member_name, title, category, summary, contact_email
  ) values (
    v_order.id, v_feature.id, p_profile_id, p_campaign_id, v_feature.member_name,
    v_feature.title, v_feature.category, v_feature.summary, v_feature.contact_email
  ) returning * into v_application;

  return jsonb_build_object('outcome', 'created', 'application_id', v_application.id, 'submission', to_jsonb(v_feature));
end;
$$;

create or replace function public.sync_magazine_feature_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.magazine_feature_applications
  set status = new.status, updated_at = now()
  where member_feature_id = new.id;
  return new;
end;
$$;

drop trigger if exists magazine_feature_application_status_sync on public.member_features;
create trigger magazine_feature_application_status_sync
  after update of status on public.member_features
  for each row execute function public.sync_magazine_feature_application_status();

create or replace function public.touch_awardee_onboarding_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists awardee_onboarding_progress_updated_at on public.awardee_onboarding_progress;
create trigger awardee_onboarding_progress_updated_at
  before update on public.awardee_onboarding_progress
  for each row execute function public.touch_awardee_onboarding_updated_at();

drop trigger if exists magazine_feature_campaigns_updated_at on public.magazine_feature_campaigns;
create trigger magazine_feature_campaigns_updated_at
  before update on public.magazine_feature_campaigns
  for each row execute function public.touch_awardee_onboarding_updated_at();

drop trigger if exists magazine_feature_orders_updated_at on public.magazine_feature_orders;
create trigger magazine_feature_orders_updated_at
  before update on public.magazine_feature_orders
  for each row execute function public.touch_awardee_onboarding_updated_at();

drop trigger if exists magazine_feature_attempts_updated_at on public.magazine_feature_payment_attempts;
create trigger magazine_feature_attempts_updated_at
  before update on public.magazine_feature_payment_attempts
  for each row execute function public.touch_awardee_onboarding_updated_at();

drop trigger if exists magazine_feature_applications_updated_at on public.magazine_feature_applications;
create trigger magazine_feature_applications_updated_at
  before update on public.magazine_feature_applications
  for each row execute function public.touch_awardee_onboarding_updated_at();

alter table public.awardee_onboarding_progress enable row level security;
alter table public.awardee_onboarding_settings enable row level security;
alter table public.magazine_feature_campaigns enable row level security;
alter table public.magazine_feature_orders enable row level security;
alter table public.magazine_feature_payment_attempts enable row level security;
alter table public.magazine_feature_webhook_events enable row level security;
alter table public.magazine_feature_applications enable row level security;

revoke all on table public.awardee_onboarding_progress from public, anon, authenticated;
revoke all on table public.awardee_onboarding_settings from public, anon, authenticated;
revoke all on table public.magazine_feature_campaigns from public, anon, authenticated;
revoke all on table public.magazine_feature_orders from public, anon, authenticated;
revoke all on table public.magazine_feature_payment_attempts from public, anon, authenticated;
revoke all on table public.magazine_feature_webhook_events from public, anon, authenticated;
revoke all on table public.magazine_feature_applications from public, anon, authenticated;

grant select, insert, update on table public.awardee_onboarding_progress to authenticated;
grant select, insert, update on table public.awardee_onboarding_progress to service_role;
grant select, insert, update, delete on table public.awardee_onboarding_settings to service_role;
grant select, insert, update, delete on table public.magazine_feature_campaigns to service_role;
grant select, insert, update on table public.magazine_feature_orders to service_role;
grant select, insert, update on table public.magazine_feature_payment_attempts to service_role;
grant select, insert, update on table public.magazine_feature_webhook_events to service_role;
grant select, insert, update on table public.magazine_feature_applications to service_role;

create policy "Awardees manage only their own onboarding progress"
  on public.awardee_onboarding_progress for all to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
create policy "Service role manages awardee onboarding progress"
  on public.awardee_onboarding_progress for all to service_role
  using (true) with check (true);

create policy "Service role manages awardee onboarding settings"
  on public.awardee_onboarding_settings for all to service_role
  using (true) with check (true);
create policy "Service role manages magazine feature campaigns"
  on public.magazine_feature_campaigns for all to service_role
  using (true) with check (true);
create policy "Service role manages magazine feature orders"
  on public.magazine_feature_orders for all to service_role
  using (true) with check (true);
create policy "Service role manages magazine feature attempts"
  on public.magazine_feature_payment_attempts for all to service_role
  using (true) with check (true);
create policy "Service role manages magazine feature webhook events"
  on public.magazine_feature_webhook_events for all to service_role
  using (true) with check (true);
create policy "Service role manages magazine feature applications"
  on public.magazine_feature_applications for all to service_role
  using (true) with check (true);

create or replace function public.reserve_bachs_magazine_checkout(
  p_profile_id uuid,
  p_campaign_id text,
  p_attempt_id uuid,
  p_provider_reference text,
  p_idempotency_key text,
  p_currency text,
  p_requested_amount_minor bigint,
  p_price_version text,
  p_checkout_expires_at timestamptz default (now() + interval '60 minutes')
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_campaign public.magazine_feature_campaigns%rowtype;
  v_order public.magazine_feature_orders%rowtype;
  v_attempt public.magazine_feature_payment_attempts%rowtype;
  v_currency text := upper(trim(p_currency));
  v_expected bigint;
begin
  if p_profile_id is null or p_attempt_id is null or nullif(trim(p_campaign_id), '') is null then
    raise exception using errcode = '22023', message = 'member, campaign, and attempt are required';
  end if;
  if v_currency not in ('NGN', 'USD') then
    raise exception using errcode = '22023', message = 'unsupported magazine feature currency';
  end if;
  if nullif(trim(p_provider_reference), '') is null or length(p_provider_reference) > 127
     or nullif(trim(p_idempotency_key), '') is null then
    raise exception using errcode = '22023', message = 'provider reference or idempotency key is invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_profile_id::text || ':' || p_campaign_id, 0));
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
  where profile_id = p_profile_id and campaign_id = p_campaign_id for update;
  if not found then
    if not exists (select 1 from public.profiles where id = p_profile_id) then
      raise exception using errcode = '23503', message = 'member profile was not found';
    end if;
    insert into public.magazine_feature_orders (profile_id, campaign_id, status)
    values (p_profile_id, p_campaign_id, 'unpaid') returning * into v_order;
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('outcome', 'already_paid', 'order_id', v_order.id);
  end if;
  if v_order.status = 'exception' then
    return jsonb_build_object('outcome', 'needs_review', 'order_id', v_order.id);
  end if;

  select * into v_attempt from public.magazine_feature_payment_attempts
  where order_id = v_order.id and status in ('creating', 'open', 'processing', 'exception')
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

create or replace function public.fail_bachs_magazine_checkout_creation(
  p_attempt_id uuid,
  p_order_id uuid,
  p_failure_reason text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_updated integer;
begin
  update public.magazine_feature_payment_attempts
  set status = 'failed', failure_reason = left(coalesce(p_failure_reason, 'Checkout creation failed.'), 500)
  where id = p_attempt_id and order_id = p_order_id and status = 'creating';
  get diagnostics v_updated = row_count;
  if v_updated > 0 then
    update public.magazine_feature_orders set status = 'failed'
    where id = p_order_id and status = 'pending';
    return true;
  end if;
  return false;
end;
$$;

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
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_attempt public.magazine_feature_payment_attempts%rowtype;
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

  select * into v_attempt from public.magazine_feature_payment_attempts
  where id = p_attempt_id and provider = 'bachs' and charge_scope = 'magazine_feature'
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

  if v_event_status = 'succeeded' then
    update public.magazine_feature_payment_attempts
    set status = 'succeeded', captured_amount_minor = p_captured_amount_minor,
        provider_status = p_provider_status, provider_charge_id = p_provider_charge_id,
        confirmed_at = now()
    where id = v_attempt.id and status in ('creating', 'open', 'processing');
    if found then
      update public.magazine_feature_orders
      set status = 'paid', paid_attempt_id = v_attempt.id, paid_at = now()
      where id = v_attempt.order_id and status <> 'paid';
    else
      -- Preserve the first confirmed attempt as the canonical paid record.
      -- Distinct signed event IDs may describe the same successful charge.
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
      update public.magazine_feature_orders set status = 'failed' where id = v_attempt.order_id and status <> 'paid';
    end if;
  end if;

  update public.magazine_feature_webhook_events
  set processing_status = case when v_event_status in ('succeeded', 'duplicate_succeeded', 'failed', 'expired') then 'processed' else 'exception' end,
      processed_at = now(),
      error = case when v_event_status in ('underpaid', 'overpaid', 'exception') then 'Payment requires support review.' else null end
  where id = p_event_id;

  return jsonb_build_object('outcome', v_event_status, 'attempt_id', v_attempt.id, 'notification_needed', false);
end;
$$;

revoke all on function public.touch_awardee_onboarding_updated_at() from public, anon, authenticated;
grant execute on function public.touch_awardee_onboarding_updated_at() to service_role;
revoke all on function public.reserve_bachs_magazine_checkout(uuid, text, uuid, text, text, text, bigint, text, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_bachs_magazine_checkout(uuid, text, uuid, text, text, text, bigint, text, timestamptz) to service_role;
revoke all on function public.fail_bachs_magazine_checkout_creation(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fail_bachs_magazine_checkout_creation(uuid, uuid, text) to service_role;
revoke all on function public.process_bachs_magazine_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.process_bachs_magazine_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz) to service_role;
revoke all on function public.submit_magazine_feature_application(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_magazine_feature_application(uuid, text, text, text, text, text, text) to service_role;
revoke all on function public.sync_magazine_feature_application_status() from public, anon, authenticated;
grant execute on function public.sync_magazine_feature_application_status() to service_role;

comment on table public.magazine_feature_payment_attempts is
  'Bachs checkout attempts for magazine-feature applications only; never used for award or delivery payments.';
comment on function public.process_bachs_magazine_webhook_event(text, text, text, uuid, text, text, text, bigint, text, text, jsonb, timestamptz) is
  'Idempotently processes a verified Bachs event only against magazine_feature payment attempts.';
