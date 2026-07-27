-- Award orders: one physical Africa Future Leaders award per member.
-- Prerequisite: supabase/SETUP-MEMBER-HUB.sql must already have been run.
create extension if not exists "pgcrypto";

create table if not exists public.award_orders (
  id uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: payment history (paystack_reference, paid_at,
  -- gig_waybill) must survive, so a profile cannot be deleted while it still
  -- has an award order. The order must be dealt with first.
  profile_id uuid not null references public.profiles(id) on delete restrict,
  awardee_id uuid,
  cohort_year integer,

  status text not null default 'draft' check (status in (
    'draft','quoted','quote_failed','awaiting_payment',
    'paid','dispatched','in_transit','delivered','cancelled'
  )),

  recipient_name text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  country text,
  postal_code text,

  -- Every amount is integer kobo. 2000000 = NGN 20,000.
  award_amount_kobo integer not null default 2000000 check (award_amount_kobo >= 0),
  shipping_amount_kobo integer check (shipping_amount_kobo >= 0),
  total_amount_kobo integer check (total_amount_kobo >= 0),
  currency text not null default 'NGN',

  gig_quote jsonb,
  gig_quote_expires_at timestamptz,
  gig_waybill text,
  gig_tracking_url text,
  gig_last_status text,
  gig_response jsonb,

  paystack_reference text unique,
  paystack_status text,
  paid_at timestamptz,

  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A total is required once the order has reached checkout: without this,
  -- `total_amount_kobo >= 0` alone would still pass with a NULL total, and a
  -- row could reach `paid` with no recorded amount.
  constraint award_orders_total_required_when_charging check (
    status not in ('awaiting_payment', 'paid', 'dispatched', 'in_transit', 'delivered')
    or total_amount_kobo is not null
  ),

  -- The total must equal award + shipping whenever it is set. Both NULL is the
  -- draft/quote_failed state and is allowed; exactly one NULL is inconsistent
  -- and must be rejected. IS NULL/IS NOT NULL keeps that case FALSE rather
  -- than NULL, since a CHECK constraint otherwise passes on a NULL result.
  constraint award_orders_total_is_award_plus_shipping check (
    (shipping_amount_kobo is null and total_amount_kobo is null)
    or (
      shipping_amount_kobo is not null
      and total_amount_kobo is not null
      and total_amount_kobo = award_amount_kobo + shipping_amount_kobo
    )
  )
);

-- One live award per member. Cancelled orders do not block a fresh attempt.
create unique index if not exists award_orders_one_active_per_profile
  on public.award_orders (profile_id)
  where status <> 'cancelled';

create index if not exists award_orders_status_idx on public.award_orders (status);
create index if not exists award_orders_reference_idx on public.award_orders (paystack_reference);

create or replace function public.touch_award_orders_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists award_orders_set_updated_at on public.award_orders;
create trigger award_orders_set_updated_at
  before update on public.award_orders
  for each row execute function public.touch_award_orders_updated_at();

alter table public.award_orders enable row level security;

do $$ begin
  create policy "Members read their own award order" on public.award_orders
    for select using (auth.uid() = profile_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role manages award orders" on public.award_orders
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;
