-- Make the handbook an in-app notification for every member profile,
-- including pending accounts and cohorts outside 2026. This does not send
-- email or browser push notifications.
create or replace function public.notify_member_of_participant_handbook()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role = 'user' then
    insert into public.user_notifications (
      user_id, title, body, category, cta_label, cta_url,
      campaign_id, delivered_at, metadata
    ) values (
      new.id,
      'Your 2026 participant handbook is ready',
      'Find your first steps, programme information, and key dates in one guide.',
      'admin',
      'Open handbook',
      '/handbooks/2026-participant-handbook.pdf',
      'afl-2026-participant-handbook',
      now(),
      jsonb_build_object(
        'audience', 'all',
        'broadcast_id', 'afl-2026-participant-handbook',
        'campaign_id', 'afl-2026-participant-handbook'
      )
    ) on conflict (user_id, campaign_id) do update set
      cta_label = excluded.cta_label,
      cta_url = excluded.cta_url,
      metadata = excluded.metadata;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_member_of_participant_handbook() from public, anon, authenticated;

drop trigger if exists profiles_participant_handbook_notification on public.profiles;
create trigger profiles_participant_handbook_notification
  after insert on public.profiles
  for each row execute function public.notify_member_of_participant_handbook();

-- Backfill every current member idempotently. Existing profiles and awardee
-- records are preserved; only the notification row is added.
insert into public.user_notifications (
  user_id, title, body, category, cta_label, cta_url,
  campaign_id, delivered_at, metadata
)
select
  profile.id,
  'Your 2026 participant handbook is ready',
  'Find your first steps, programme information, and key dates in one guide.',
  'admin',
  'Open handbook',
  '/handbooks/2026-participant-handbook.pdf',
  'afl-2026-participant-handbook',
  now(),
  jsonb_build_object(
    'audience', 'all',
    'broadcast_id', 'afl-2026-participant-handbook',
    'campaign_id', 'afl-2026-participant-handbook'
  )
from public.profiles profile
where profile.role = 'user'
on conflict (user_id, campaign_id) do update set
  cta_label = excluded.cta_label,
  cta_url = excluded.cta_url,
  metadata = excluded.metadata;
