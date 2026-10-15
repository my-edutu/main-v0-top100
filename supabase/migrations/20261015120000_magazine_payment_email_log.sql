-- A durable per-payment lifecycle email log lets signed Bachs webhook retries
-- retry a failed email without sending duplicate receipts or failure notices.
create table if not exists public.magazine_feature_payment_email_log (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.magazine_feature_payment_attempts(id) on delete cascade,
  event_type text not null check (event_type in ('paid', 'failed', 'expired', 'review')),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint magazine_feature_payment_email_once unique (attempt_id, event_type)
);

alter table public.magazine_feature_payment_email_log enable row level security;
revoke all on table public.magazine_feature_payment_email_log from public, anon, authenticated;
grant select, insert, update on table public.magazine_feature_payment_email_log to service_role;

create or replace function public.touch_magazine_feature_payment_email_log_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists magazine_feature_payment_email_log_set_updated_at on public.magazine_feature_payment_email_log;
create trigger magazine_feature_payment_email_log_set_updated_at
  before update on public.magazine_feature_payment_email_log
  for each row execute function public.touch_magazine_feature_payment_email_log_updated_at();
