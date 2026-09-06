-- Throttle column for the "you have a new message" email. Set only after a
-- successful send, so a failed send retries on the next message rather than
-- being silently skipped for the rest of the notification window.
alter table public.dm_conversations
  add column if not exists last_notified_at timestamptz;
