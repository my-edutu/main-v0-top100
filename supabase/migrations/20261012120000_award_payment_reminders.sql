-- Durable, idempotent reminders for unfinished Top100 award-fee payments.
-- A reminder is tied to a provider attempt, never to a browser return URL.

create table if not exists public.award_payment_reminder_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.award_orders(id) on delete restrict,
  payment_attempt_id uuid not null references public.award_payment_attempts(id) on delete restrict,
  reminder_kind text not null check (reminder_kind in ('incomplete', 'retry')),
  state text not null default 'processing'
    check (state in ('processing', 'sent', 'failed', 'cancelled')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  due_at timestamptz not null default now(),
  lease_until timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint award_payment_reminder_log_once_per_attempt_kind
    unique (payment_attempt_id, reminder_kind)
);

create index if not exists award_payment_reminder_log_retry_idx
  on public.award_payment_reminder_log (state, due_at, lease_until)
  where state in ('processing', 'failed');

create or replace function public.touch_award_payment_reminder_log_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists award_payment_reminder_log_set_updated_at
  on public.award_payment_reminder_log;
create trigger award_payment_reminder_log_set_updated_at
  before update on public.award_payment_reminder_log
  for each row execute function public.touch_award_payment_reminder_log_updated_at();

alter table public.award_payment_reminder_log enable row level security;

drop policy if exists "Admins read award payment reminders" on public.award_payment_reminder_log;
create policy "Admins read award payment reminders"
  on public.award_payment_reminder_log for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Service role manages award payment reminders" on public.award_payment_reminder_log;
create policy "Service role manages award payment reminders"
  on public.award_payment_reminder_log for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Atomically lease eligible reminders. Open checkouts qualify 15 minutes after
-- their provider expiry; definitive failure, expiry and cancellation events
-- qualify immediately. Only the latest attempt is eligible, and paid or
-- refunded orders (including legacy paid evidence) are excluded.
create or replace function public.claim_award_payment_reminders(
  p_limit integer default 30,
  p_attempt_id uuid default null
)
returns table (
  reminder_id uuid,
  order_id uuid,
  payment_attempt_id uuid,
  reminder_kind text,
  profile_id uuid,
  recipient_name text,
  email text,
  currency text,
  amount_minor bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with eligible as materialized (
    select
      a.id as attempt_id,
      a.order_id as eligible_order_id,
      case when a.status = 'open' then 'incomplete' else 'retry' end as kind
    from public.award_payment_attempts a
    join public.award_orders o on o.id = a.order_id
    where a.provider = 'bachs'
      and a.charge_scope = 'award_fee'
      and a.status in ('open', 'failed', 'expired', 'cancelled')
      and (p_attempt_id is null or a.id = p_attempt_id)
      and (
        a.status in ('failed', 'expired', 'cancelled')
        or (a.status = 'open' and a.checkout_expires_at <= now() - interval '15 minutes')
      )
      and coalesce(nullif(trim(o.email), ''), '') <> ''
      and o.award_payment_status not in ('paid', 'refunded')
      and o.status not in ('paid', 'dispatched', 'in_transit', 'delivered')
      and o.paid_at is null
      and lower(coalesce(o.paystack_status, '')) not in (
        'paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted'
      )
      and not exists (
        select 1 from public.award_payment_attempts newer
        where newer.order_id = a.order_id
          and (newer.created_at, newer.id) > (a.created_at, a.id)
      )
    order by coalesce(a.checkout_expires_at, a.created_at), a.id
    limit greatest(1, least(coalesce(p_limit, 30), 100))
    for update of a skip locked
  ), claimed as (
    insert into public.award_payment_reminder_log as existing (
      order_id, payment_attempt_id, reminder_kind, state, attempt_count,
      due_at, lease_until
    )
    select e.eligible_order_id, e.attempt_id, e.kind, 'processing', 1,
      now(), now() + interval '10 minutes'
    from eligible e
    on conflict on constraint award_payment_reminder_log_once_per_attempt_kind do update
      set state = 'processing',
          attempt_count = existing.attempt_count + 1,
          due_at = now(),
          lease_until = now() + interval '10 minutes',
          error = null
      where existing.attempt_count < 8
        and (
          (existing.state = 'failed' and existing.due_at <= now())
          or (existing.state = 'processing' and existing.lease_until < now())
        )
    returning existing.id, existing.order_id, existing.payment_attempt_id,
      existing.reminder_kind
  )
  select c.id, c.order_id, c.payment_attempt_id, c.reminder_kind,
    o.profile_id, o.recipient_name, o.email, a.currency::text,
    a.requested_amount_minor
  from claimed c
  join public.award_orders o on o.id = c.order_id
  join public.award_payment_attempts a on a.id = c.payment_attempt_id;
end;
$$;

revoke all on function public.claim_award_payment_reminders(integer, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_award_payment_reminders(integer, uuid)
  to service_role;

-- Recheck immediately before sending: an awardee may have completed payment
-- after the reminder was leased. Suppressed reminders are cancelled, not retried.
create or replace function public.prepare_award_payment_reminder_delivery(
  p_reminder_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sendable boolean := false;
begin
  select exists (
    select 1
    from public.award_payment_reminder_log r
    join public.award_payment_attempts a on a.id = r.payment_attempt_id
    join public.award_orders o on o.id = r.order_id
    where r.id = p_reminder_id
      and r.state = 'processing'
      and a.order_id = o.id
      and a.provider = 'bachs'
      and a.charge_scope = 'award_fee'
      and (
        (r.reminder_kind = 'incomplete' and a.status = 'open'
          and a.checkout_expires_at <= now() - interval '15 minutes')
        or (r.reminder_kind = 'retry' and a.status in ('failed', 'expired', 'cancelled'))
      )
      and o.award_payment_status not in ('paid', 'refunded')
      and o.status not in ('paid', 'dispatched', 'in_transit', 'delivered')
      and o.paid_at is null
      and lower(coalesce(o.paystack_status, '')) not in (
        'paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted'
      )
      and not exists (
        select 1 from public.award_payment_attempts newer
        where newer.order_id = a.order_id
          and (newer.created_at, newer.id) > (a.created_at, a.id)
      )
  ) into v_sendable;

  if not v_sendable then
    update public.award_payment_reminder_log
    set state = 'cancelled', lease_until = null, error = null
    where id = p_reminder_id and state = 'processing';
  end if;

  return v_sendable;
end;
$$;

revoke all on function public.prepare_award_payment_reminder_delivery(uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_award_payment_reminder_delivery(uuid)
  to service_role;

create or replace function public.finish_award_payment_reminder(
  p_reminder_id uuid,
  p_sent boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.award_payment_reminder_log
  set state = case when p_sent then 'sent' else 'failed' end,
      sent_at = case when p_sent then now() else null end,
      due_at = case when p_sent then due_at
        else now() + make_interval(mins => least(360, power(2, attempt_count)::integer)) end,
      lease_until = null,
      error = case when p_sent then null else left(coalesce(p_error, 'Email delivery failed.'), 1000) end
  where id = p_reminder_id and state = 'processing';
end;
$$;

revoke all on function public.finish_award_payment_reminder(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.finish_award_payment_reminder(uuid, boolean, text)
  to service_role;
