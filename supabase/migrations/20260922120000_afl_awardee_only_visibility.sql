-- Keep Africa Future Leaders programme sessions inside the authenticated
-- awardee dashboard. Public homepage feeds must not expose these rows.

alter table public.events
  drop constraint if exists events_visibility_check;

alter table public.events
  add constraint events_visibility_check
  check (visibility in ('public', 'awardee_only', 'private'));

update public.events
set visibility = 'awardee_only'
where programme_label = 'Africa Future Leaders October 2026';
