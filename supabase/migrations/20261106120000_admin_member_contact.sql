-- A durable attempt is reserved before SMTP. Uncertain outcomes are never retried automatically.
create table if not exists public.admin_member_contact_attempts (
  id uuid primary key default gen_random_uuid(),
  awardee_id uuid references public.awardees(id) on delete set null,
  admin_id uuid not null,
  email text not null,
  contact_day date not null default ((now() at time zone 'UTC')::date),
  template text not null check (template in ('welcome', 'reminder')),
  status text not null default 'preparing' check (status in ('preparing', 'sending', 'accepted', 'not_sent', 'unknown')),
  created_at timestamptz not null default now(),
  unique(email, contact_day)
);
alter table public.admin_member_contact_attempts enable row level security;
revoke all on public.admin_member_contact_attempts from anon, authenticated;
grant all on public.admin_member_contact_attempts to service_role;
