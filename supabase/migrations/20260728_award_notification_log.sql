-- Award notification log: one row per (order, milestone), claimed BEFORE the
-- email/in-app notice is sent. The unique (order_id, status) constraint is the
-- exactly-once mechanism — Paystack retries the same webhook, and without it
-- the member gets "payment confirmed" over and over.
--
-- Prerequisite: supabase/migrations/20260726_award_orders.sql must already
-- have been run.
create extension if not exists "pgcrypto";

create table if not exists public.award_notification_log (
  id uuid primary key default gen_random_uuid(),
  -- cascade: the log is a delivery trail for an order, worthless without it.
  order_id uuid not null references public.award_orders(id) on delete cascade,
  -- Nullable and unconstrained by design: the log must survive even if the
  -- profile is later removed, and it is only ever read by admins.
  profile_id uuid,
  status text not null check (status in ('paid','dispatched','in_transit','delivered')),
  -- Which channels actually went out: 'in_app', 'email'.
  channels text[] not null default '{}',
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The exactly-once guarantee.
  constraint award_notification_log_once_per_status unique (order_id, status)
);

create index if not exists award_notification_log_order_idx
  on public.award_notification_log (order_id);
create index if not exists award_notification_log_profile_idx
  on public.award_notification_log (profile_id);
-- Rows that were claimed but never sent are the operational queue to inspect.
create index if not exists award_notification_log_unsent_idx
  on public.award_notification_log (created_at)
  where sent_at is null;

create or replace function public.touch_award_notification_log_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists award_notification_log_set_updated_at on public.award_notification_log;
create trigger award_notification_log_set_updated_at
  before update on public.award_notification_log
  for each row execute function public.touch_award_notification_log_updated_at();

alter table public.award_notification_log enable row level security;

-- Admin-only select. Members see their milestones through user_notifications
-- and email; this table is the operational trail behind /admin/awards.
drop policy if exists "Admins read the award notification log" on public.award_notification_log;
create policy "Admins read the award notification log" on public.award_notification_log
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Server routes use the service-role client and bypass RLS; this is defence in
-- depth so no anon/authenticated key can ever write here.
drop policy if exists "Service role manages the award notification log" on public.award_notification_log;
create policy "Service role manages the award notification log" on public.award_notification_log
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
