-- Approve every pending awardee and create the same in-app notice as an
-- individual approval. Both writes happen in one database transaction.
create or replace function public.approve_all_pending_members(p_admin_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_approved integer;
begin
  if p_admin_id is null then
    raise exception 'An administrator id is required';
  end if;

  with approved as (
    update public.profiles
    set membership_status = 'approved'
    where role = 'user' and membership_status = 'pending'
    returning id
  ), notices as (
    insert into public.user_notifications (user_id, title, body, category, metadata)
    select id,
      'Your awardee account is approved',
      'Welcome to the network! Your account has full access — complete your BIO and connect with fellow awardees.',
      'account',
      jsonb_build_object('audience', 'all', 'source', 'membership-status', 'admin_id', p_admin_id)
    from approved
    returning user_id
  )
  select count(*)::integer into v_approved from notices;

  return v_approved;
end;
$$;

revoke all on function public.approve_all_pending_members(uuid) from public, anon, authenticated;
grant execute on function public.approve_all_pending_members(uuid) to service_role;
