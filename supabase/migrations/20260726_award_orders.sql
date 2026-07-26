-- Award orders: one physical Africa Future Leaders award per member.
-- Prerequisite: supabase/SETUP-MEMBER-HUB.sql must already have been run.
create extension if not exists "pgcrypto";

create table if not exists public.award_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
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
  updated_at timestamptz not null default now()
);

-- One live award per member. Cancelled orders do not block a fresh attempt.
create unique index if not exists award_orders_one_active_per_profile
  on public.award_orders (profile_id)
  where status <> 'cancelled';

create index if not exists award_orders_status_idx on public.award_orders (status);
create index if not exists award_orders_reference_idx on public.award_orders (paystack_reference);

create or replace function public.touch_award_orders_updated_at()
returns trigger language plpgsql as $$
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
