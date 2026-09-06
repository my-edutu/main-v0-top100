-- Repair legacy auth.users rows that were inserted directly and contain NULL
-- in token fields that Supabase Auth scans into non-nullable Go strings.
--
-- Scope is deliberately limited to users already linked to this app's
-- public.profiles table. NULL means "no pending token" here, so the canonical
-- Supabase representation is the empty string.

begin;

update auth.users as u
set
  confirmation_token = coalesce(u.confirmation_token, ''),
  recovery_token = coalesce(u.recovery_token, ''),
  email_change = coalesce(u.email_change, ''),
  email_change_token_current = coalesce(u.email_change_token_current, ''),
  email_change_token_new = coalesce(u.email_change_token_new, ''),
  phone_change = coalesce(u.phone_change, ''),
  phone_change_token = coalesce(u.phone_change_token, ''),
  reauthentication_token = coalesce(u.reauthentication_token, '')
where exists (
  select 1
  from public.profiles as p
  where p.id = u.id
)
and (
  u.confirmation_token is null
  or u.recovery_token is null
  or u.email_change is null
  or u.email_change_token_current is null
  or u.email_change_token_new is null
  or u.phone_change is null
  or u.phone_change_token is null
  or u.reauthentication_token is null
);

commit;
