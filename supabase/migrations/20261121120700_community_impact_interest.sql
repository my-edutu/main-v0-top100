alter table public.programme_manager_interests
  add column community_details jsonb,
  drop constraint programme_manager_interests_kind_check,
  add constraint programme_manager_interests_kind_check
    check (kind in ('mentor', 'volunteer', 'programme', 'community')),
  add constraint programme_manager_community_details_check
    check ((kind = 'community') = (community_details is not null)
      and (community_details is null or jsonb_typeof(community_details) = 'object'));
