-- Add a nullable campaign key to the existing in-app notifications table.
-- NULL preserves existing notification behavior; non-NULL keys make a
-- campaign deliver at most once per member across retried requests.
alter table public.user_notifications
  add column if not exists campaign_id text;

create unique index if not exists user_notifications_user_campaign_unique
  on public.user_notifications (user_id, campaign_id);
