alter table public.festival_rsvps
  add column if not exists pickup_delegate jsonb,
  add column if not exists dispatch_email_claim uuid,
  add column if not exists dispatch_email_sent_at timestamptz,
  drop constraint if exists festival_rsvps_check;

-- Production already has this constraint from the festival fulfillment rollout.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.festival_rsvps'::regclass
      and conname = 'festival_rsvps_attendance_or_fulfillment'
  ) then
    alter table public.festival_rsvps
      add constraint festival_rsvps_attendance_or_fulfillment check (
        (attending is true or (guest_name is null and (pickup = 'dispatch' or pickup_delegate is not null)))
        and (pickup_delegate is null or (
          attending is null and pickup = 'festival' and dispatch is null and jsonb_typeof(pickup_delegate) = 'object'
        ))
      );
  end if;
end
$$;

notify pgrst, 'reload schema';
