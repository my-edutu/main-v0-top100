begin;

-- The exclusion follows the settled coupon attempt. If a writer publishes the
-- paid summary before attaching its canonical attempt, an already-succeeded
-- coupon attempt still blocks attribution. Abandoned attempts do not count.
create function public.team_coupon_payment_excluded(p_order public.award_orders)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.award_payment_attempts a
    where a.order_id = (p_order).id
      and a.award_coupon_id is not null
      and (
        a.id = (p_order).award_paid_attempt_id
        or ((p_order).award_paid_attempt_id is null and a.status = 'succeeded')
      )
  );
$$;

revoke all on function public.team_coupon_payment_excluded(public.award_orders) from public, anon, authenticated;
grant execute on function public.team_coupon_payment_excluded(public.award_orders) to service_role;

create function public.team_close_coupon_worklist(p_order public.award_orders, p_team_id uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_row record;
begin
  -- Remove active follow-up without persisting the payment in the sales
  -- projection. Leave the contact and assignment history in place.
  for v_row in
    select ta.id, ta.team_id
    from public.team_awardees ta
    where ta.is_active
      and (p_team_id is null or ta.team_id = p_team_id)
      and (
        ((p_order).awardee_id is not null and ta.public_awardee_id = (p_order).awardee_id)
        or (ta.profile_id = (p_order).profile_id and ((p_order).awardee_id is null or ta.public_awardee_id is null))
        or ((p_order).awardee_id is null and exists (
          select 1 from public.awardees a where a.id = ta.public_awardee_id and a.profile_id = (p_order).profile_id
        ))
      )
    order by ta.id
    for update
  loop
    update public.team_awardees
    set is_active = false, next_followup_at = null, followup_status = 'none',
        payment_status = case when payment_status = 'pending' then 'unpaid' else payment_status end
    where id = v_row.id;

    update public.team_assignments
    set status = 'removed', ended_at = now(), ended_by = null,
        end_reason = 'Award settled outside the sales programme'
    where team_id = v_row.team_id and awardee_id = v_row.id and status = 'active';
  end loop;
end;
$$;

revoke all on function public.team_close_coupon_worklist(public.award_orders, uuid)
  from public, anon, authenticated, service_role;

-- Keep all existing full-price behaviour in the original routine. Direct RPC
-- calls, scheduled reconciliation, and delayed identity linking use the guard.
alter function public.team_apply_verified_payment(uuid, uuid, text, uuid, text, bigint, timestamptz, uuid)
  rename to team_apply_verified_payment_standard;
revoke all on function public.team_apply_verified_payment_standard(uuid, uuid, text, uuid, text, bigint, timestamptz, uuid)
  from public, anon, authenticated, service_role;

create function public.team_apply_verified_payment(
  p_team_id uuid, p_awardee_id uuid, p_payment_type text, p_payment_id uuid,
  p_payment_currency text, p_payment_amount_minor bigint, p_paid_at timestamptz, p_actor uuid default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_order public.award_orders%rowtype;
begin
  if p_payment_type = 'award_order' and p_team_id is not null then
    select * into v_order from public.award_orders where id = p_payment_id;
    if not found or v_order.award_payment_status is distinct from 'paid' then
      raise exception using errcode = '22023', message = 'paid award order source is required';
    end if;
    if public.team_coupon_payment_excluded(v_order) then
      perform public.team_close_coupon_worklist(v_order, p_team_id);
      return jsonb_build_object('outcome', 'coupon_excluded');
    end if;
  end if;
  return public.team_apply_verified_payment_standard(
    p_team_id, p_awardee_id, p_payment_type, p_payment_id,
    p_payment_currency, p_payment_amount_minor, p_paid_at, p_actor
  );
end;
$$;

revoke all on function public.team_apply_verified_payment(uuid, uuid, text, uuid, text, bigint, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.team_apply_verified_payment(uuid, uuid, text, uuid, text, bigint, timestamptz, uuid)
  to service_role;

create or replace function public.team_sync_award_order_payment()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_awardee public.team_awardees%rowtype;
  v_currency text := 'NGN';
  v_amount bigint;
  v_paid_at timestamptz;
begin
  if public.team_coupon_payment_excluded(new) then
    perform public.team_close_coupon_worklist(new);
    return new;
  end if;

  select ta.* into v_awardee
  from public.team_awardees ta
  where ta.is_active
    and (
      (new.awardee_id is not null and ta.public_awardee_id = new.awardee_id)
      or (ta.profile_id is not null and ta.profile_id = new.profile_id)
      or (ta.public_awardee_id is not null and ta.public_awardee_id in (
        select a.id from public.awardees a where a.profile_id = new.profile_id
      ))
    )
  order by case when new.awardee_id is not null and ta.public_awardee_id = new.awardee_id then 0 else 1 end,
    ta.created_at asc
  limit 1;

  if not found then return new; end if;

  if new.award_payment_status = 'paid' then
    if new.award_paid_attempt_id is not null then
      select upper(a.currency), coalesce(a.captured_amount_minor, a.requested_amount_minor)
      into v_currency, v_amount
      from public.award_payment_attempts a where a.id = new.award_paid_attempt_id;
    end if;
    v_amount := coalesce(v_amount, new.award_amount_kobo, 0);
    v_paid_at := coalesce(new.award_paid_at, new.paid_at, now());
    perform public.team_apply_verified_payment(
      v_awardee.team_id, v_awardee.id, 'award_order', new.id,
      v_currency, v_amount, v_paid_at, null
    );
  elsif new.award_payment_status = 'pending' then
    update public.team_awardees
    set payment_status = 'pending', payment_currency = coalesce(v_currency, payment_currency)
    where id = v_awardee.id and payment_status = 'unpaid';
  elsif new.award_payment_status = 'refunded' then
    perform public.team_reverse_verified_payment(
      v_awardee.team_id, v_awardee.id, 'award_order', new.id,
      'Award payment was refunded.', null
    );
  elsif new.award_payment_status = 'failed' then
    update public.team_awardees set payment_status = 'unpaid'
    where id = v_awardee.id and payment_status = 'pending';
  end if;

  return new;
exception when others then
  raise warning 'team platform award payment sync skipped for order %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger team_sync_award_order_payment on public.award_orders;
create trigger team_sync_award_order_payment
  after update of award_payment_status, award_paid_attempt_id on public.award_orders
  for each row execute function public.team_sync_award_order_payment();

-- Preserve the existing column contracts for staff readers while excluding
-- coupon payments before either strict or historical grace attribution.
create or replace view public.team_payment_attributions
with (security_invoker = true) as
with paid_projections as (
  select
    ta.team_id,
    ta.id as team_awardee_id,
    ta.public_awardee_id,
    ta.profile_id,
    ta.is_active as projection_is_active,
    ta.created_at as projection_created_at,
    o.id as payment_id,
    coalesce(o.award_paid_at, o.paid_at, o.created_at) as paid_at,
    upper(coalesce(pa.currency, 'NGN')) as payment_currency,
    coalesce(pa.captured_amount_minor, pa.requested_amount_minor, o.award_amount_kobo) as payment_amount_minor
  from public.team_awardees ta
  join public.award_orders o on (
    (o.awardee_id is not null and ta.public_awardee_id is not null and ta.public_awardee_id = o.awardee_id)
    or (
      ta.profile_id is not null
      and o.profile_id is not null
      and ta.profile_id = o.profile_id
      and (o.awardee_id is null or ta.public_awardee_id is null)
    )
  )
  left join public.award_payment_attempts pa on pa.id = o.award_paid_attempt_id
  where o.award_payment_status = 'paid'
    and not public.team_coupon_payment_excluded(o)
    and (
      o.award_paid_attempt_id is null
      or (
        pa.order_id = o.id
        and lower(btrim(coalesce(pa.provider, ''))) = 'bachs'
        and lower(btrim(coalesce(pa.charge_scope, ''))) = 'award_fee'
        and lower(btrim(coalesce(pa.status, ''))) = 'succeeded'
        and pa.confirmed_at is not null
        and pa.requested_amount_minor is not null
        and pa.captured_amount_minor is not null
        and pa.requested_amount_minor > 0
        and pa.captured_amount_minor > 0
        and pa.captured_amount_minor = pa.requested_amount_minor
      )
    )
), strict_contacts as (
  select
    p.team_awardee_id,
    p.public_awardee_id,
    p.profile_id,
    p.team_id,
    a.agent_id,
    a.id as assignment_id,
    p.payment_id,
    p.paid_at,
    p.payment_currency,
    p.payment_amount_minor,
    q.id as contact_id,
    q.kind as contact_kind,
    q.channel as contact_channel,
    q.contacted_at,
    q.recorded_at,
    q.provider_verified,
    q.source_id as provider_source_id,
    q.evidence,
    1::integer as policy_priority
  from paid_projections p
  join public.team_assignments a
    on a.team_id = p.team_id
   and a.awardee_id = p.team_awardee_id
   and a.assigned_at <= p.paid_at
   and (a.ended_at is null or a.ended_at > p.paid_at)
  cross join lateral public.team_qualifying_contacts(a.id, p.paid_at) q
), grace_contacts as (
  select
    p.team_awardee_id,
    p.public_awardee_id,
    p.profile_id,
    p.team_id,
    g.agent_id,
    case
      when not exists (
        select 1
        from public.team_assignments historical_assignment
        where historical_assignment.id = g.assignment_id
          and historical_assignment.team_id = g.team_id
          and historical_assignment.awardee_id = g.awardee_id
          and historical_assignment.agent_id = g.agent_id
          and historical_assignment.status = 'active'
      ) then null::uuid
      when exists (
        select 1
        from public.team_assignments current_assignment
        join public.team_awardees current_awardee
          on current_awardee.id = current_assignment.awardee_id
        where current_assignment.team_id = g.team_id
          and current_assignment.status = 'active'
          and current_assignment.id <> g.assignment_id
          and (
            current_assignment.awardee_id = g.awardee_id
            or (
              p.public_awardee_id is not null
              and current_awardee.public_awardee_id = p.public_awardee_id
            )
            or (
              p.profile_id is not null
              and current_awardee.profile_id = p.profile_id
            )
          )
      ) then null::uuid else g.assignment_id end as assignment_id,
    p.payment_id,
    p.paid_at,
    p.payment_currency,
    p.payment_amount_minor,
    null::uuid as contact_id,
    'legacy_grace'::text as contact_kind,
    null::text as contact_channel,
    null::timestamptz as contacted_at,
    null::timestamptz as recorded_at,
    false as provider_verified,
    null::uuid as provider_source_id,
    jsonb_build_object(
      'id', g.grace_adjustment_id,
      'kind', 'legacy_grace',
      'policy', 'legacy_grace',
      'ownerAuthorized', true,
      'reviewStatus', 'grace_until_affirmative_review',
      'providerVerified', false,
      'sourceEarningId', g.earning_id,
      'sourceReversalId', g.reversal_id,
      'graceAdjustmentId', g.grace_adjustment_id,
      'historicalAssignmentId', g.assignment_id,
      'assignmentRestoreState', g.assignment_restore_state,
      'contactProof', null
    ) as evidence,
    0::integer as policy_priority
  from paid_projections p
  join public.team_legacy_grace_cases g
    on g.team_id = p.team_id
   and g.awardee_id = p.team_awardee_id
   and g.payment_id = p.payment_id
  join public.team_commission_entries e
    on e.id = g.earning_id
   and e.entry_type = 'earning'
  join public.team_commission_entries r
    on r.id = g.reversal_id
   and r.parent_commission_id = e.id
   and r.entry_type = 'reversal'
  join public.team_commission_entries adj
    on adj.id = g.grace_adjustment_id
   and adj.parent_commission_id = r.id
   and adj.entry_type = 'adjustment'
   and adj.amount_minor > 0
   and adj.rule_snapshot->>'policy' = 'legacy_grace'
  where not exists (
    select 1
    from public.team_commission_entries refund
    where refund.parent_commission_id = adj.id
      and refund.entry_type = 'adjustment'
  )
), eligible as (
  select x.*,
    row_number() over (
      partition by x.team_id, x.payment_id
      order by x.policy_priority asc,
        x.contacted_at desc nulls last,
        x.recorded_at desc nulls last,
        x.assignment_id desc nulls last
    ) as winner_rank
  from (
    select * from grace_contacts
    union all
    select * from strict_contacts
  ) x
)
select
  e.team_awardee_id as id,
  e.team_awardee_id,
  e.team_awardee_id as awardee_id,
  e.team_id,
  e.public_awardee_id,
  e.profile_id,
  e.agent_id,
  e.assignment_id,
  e.payment_id,
  'award_order'::text as payment_type,
  e.paid_at,
  e.payment_currency,
  e.payment_amount_minor,
  e.contact_id,
  e.contact_kind,
  e.contact_channel,
  e.contacted_at,
  e.recorded_at,
  e.provider_verified,
  e.provider_source_id,
  e.evidence
from eligible e
where e.winner_rank = 1;

create or replace view public.team_payment_reconciliation
with (security_invoker = true) as
select
  ta.team_id,
  o.id as award_order_id,
  o.profile_id,
  ta.id as awardee_id,
  ta.name as awardee_name,
  o.award_payment_status,
  o.award_paid_at,
  o.award_paid_attempt_id,
  o.award_amount_kobo,
  a.currency as payment_currency,
  coalesce(a.captured_amount_minor, a.requested_amount_minor, o.award_amount_kobo) as payment_amount_minor,
  e.id as commission_id,
  e.amount_minor as commission_amount_minor,
  e.currency as commission_currency,
  case
    when o.award_payment_status = 'paid' and e.id is null and attr.payment_id is null then 'paid_without_qualifying_contact'
    when o.award_payment_status = 'paid' and e.id is null then 'missing_commission'
    when o.award_payment_status = 'paid' and e.id is not null and attr.payment_id is null
      and exists (select 1 from public.team_commission_entries r where r.parent_commission_id = e.id)
      then 'paid_without_qualifying_contact'
    when o.award_payment_status = 'paid' and e.id is not null and attr.payment_id is null then 'earning_without_qualifying_contact'
    when o.award_payment_status = 'paid' and e.id is not null then 'reconciled'
    when o.award_payment_status = 'refunded' and e.id is not null and not exists (
      select 1 from public.team_commission_entries r where r.parent_commission_id = e.id
    ) then 'missing_reversal'
    else 'informational'
  end as reconciliation_state,
  attr.agent_id as attribution_agent_id,
  attr.assignment_id as attribution_assignment_id,
  attr.contact_id as qualifying_contact_id,
  attr.contact_kind as qualifying_contact_kind,
  attr.contact_channel as qualifying_contact_channel,
  attr.contacted_at as qualifying_contacted_at,
  attr.recorded_at as qualifying_recorded_at,
  attr.provider_verified as qualifying_provider_verified
from public.team_awardees ta
join public.award_orders o on (
  (o.awardee_id is not null and ta.public_awardee_id is not null and ta.public_awardee_id = o.awardee_id)
  or (
    ta.profile_id is not null
    and o.profile_id is not null
    and ta.profile_id = o.profile_id
    and (o.awardee_id is null or ta.public_awardee_id is null)
  )
)
left join public.award_payment_attempts a on a.id = o.award_paid_attempt_id
left join lateral (
  select e.*
  from public.team_commission_entries e
  where e.team_id = ta.team_id
    and e.payment_type = 'award_order'
    and e.payment_id = o.id
    and e.entry_type = 'earning'
  order by (not exists (
    select 1 from public.team_commission_entries r
    where r.parent_commission_id = e.id and r.entry_type = 'reversal'
  )) desc, e.created_at desc, e.id desc
  limit 1
) e on true
left join public.team_payment_attributions attr
  on attr.team_id = ta.team_id and attr.payment_id = o.id
where not public.team_coupon_payment_excluded(o);

notify pgrst, 'reload schema';

commit;
