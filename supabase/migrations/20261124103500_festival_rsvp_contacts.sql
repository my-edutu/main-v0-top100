alter table public.festival_rsvps
  add column awardee_name text,
  add column awardee_email text,
  add column awardee_phone text,
  add column guest_email text,
  add column guest_phone text,
  add constraint festival_rsvps_awardee_contact_complete check (
    num_nonnulls(awardee_name, awardee_email, awardee_phone) in (0, 3)
  ),
  add constraint festival_rsvps_guest_contact_complete check (
    (guest_email is null and guest_phone is null and (guest_name is null or awardee_name is null))
    or (guest_name is not null and guest_email is not null and guest_phone is not null)
  );

notify pgrst, 'reload schema';
