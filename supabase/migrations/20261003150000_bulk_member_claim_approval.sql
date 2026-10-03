-- Bulk approval performs the same ownership linking as individual approval.
-- Keep the original integer RPC available for older deployed clients.
create or replace function public.approve_all_pending_members_and_claims(p_admin_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_claim record;
  v_claims integer := 0;
  v_members integer := 0;
  v_skipped integer := 0;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_id and role in ('admin', 'superadmin')
  ) then
    raise exception using errcode = '42501', message = 'Administrator access is required';
  end if;

  -- Serialize bulk requests; each individual approval also takes the existing
  -- per-account lock and rechecks the awardee row before linking ownership.
  perform pg_advisory_xact_lock(hashtextextended('bulk-member-approval', 0));
  for v_claim in
    select c.user_id
    from public.pending_awardee_claims c
    join public.profiles p on p.id = c.user_id
    where p.role = 'user' and p.membership_status = 'pending'
    order by c.created_at, c.user_id
  loop
    begin
      perform public.approve_pending_awardee_claim(v_claim.user_id);
      insert into public.user_notifications (user_id, title, body, category, metadata)
      values (
        v_claim.user_id, 'Your awardee account is approved',
        'Welcome to the network! Your account has full access — complete your BIO and connect with fellow awardees.',
        'account', jsonb_build_object('audience', 'all', 'source', 'membership-status', 'admin_id', p_admin_id)
      );
      v_claims := v_claims + 1;
    exception when sqlstate 'P0001' then
      -- An unavailable record or changed email cannot block every other claim.
      -- This subtransaction rolls back that claim's changes and leaves it pending.
      v_skipped := v_skipped + 1;
    end;
  end loop;

  with approved as (
    update public.profiles p set membership_status = 'approved'
    where p.role = 'user' and p.membership_status = 'pending'
      and not exists (select 1 from public.pending_awardee_claims c where c.user_id = p.id)
    returning p.id
  ), notices as (
    insert into public.user_notifications (user_id, title, body, category, metadata)
    select id, 'Your awardee account is approved',
      'Welcome to the network! Your account has full access — complete your BIO and connect with fellow awardees.',
      'account', jsonb_build_object('audience', 'all', 'source', 'membership-status', 'admin_id', p_admin_id)
    from approved returning user_id
  ) select count(*)::integer into v_members from notices;

  return jsonb_build_object(
    'approved', v_claims + v_members,
    'approvedClaims', v_claims,
    'approvedMembers', v_members,
    'skippedClaims', v_skipped
  );
end;
$$;

revoke all on function public.approve_all_pending_members_and_claims(uuid) from public, anon, authenticated;
grant execute on function public.approve_all_pending_members_and_claims(uuid) to service_role;
