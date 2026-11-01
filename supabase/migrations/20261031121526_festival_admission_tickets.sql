-- Existing interest is not admission: only a fresh, payment-verified registration
-- receives registered_at. Keep the original service-role-only access and RLS.
alter table public.festival_attendance_interests
  add column registered_at timestamptz,
  add column ticket_id uuid not null default gen_random_uuid(),
  add column ticket_email_sent_at timestamptz,
  add column ticket_email_failed_at timestamptz,
  add column ticket_email_claimed_at timestamptz,
  add column ticket_email_claim_token uuid,
  add constraint festival_ticket_id_unique unique (ticket_id),
  add constraint festival_ticket_claim_pair check (
    (ticket_email_claimed_at is null) = (ticket_email_claim_token is null)
  );

comment on table public.festival_attendance_interests is
  'Private festival responses. registered_at identifies a payment-verified registration. Admission and downloads still require current confirmed payment; interest alone is not a ticket. SMTP acceptance is recorded separately from registration and never books award dispatch.';
