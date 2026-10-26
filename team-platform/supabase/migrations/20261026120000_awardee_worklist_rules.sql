-- Capacity, verified payment attribution, and identity linking for the awardee worklist.
-- Existing assignment/payment history is preserved; only new assignments are capped.

create or replace function public.team_apply_verified_payment(
  p_team_id uuid,
  p_awardee_id uuid,
  p_payment_type text,
  p_payment_id uuid,
  p_payment_currency text,
  p_payment_amount_minor bigint,
  p_paid_at timestamptz,
  p_actor uuid default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_awardee public.team_awardees%rowtype;
  v_assignment public.team_assignments%rowtype;
  v_rule public.team_commission_rules%rowtype;
  v_entry public.team_commission_entries%rowtype;
  v_settings public.team_settings%rowtype;
  v_currency text := upper(coalesce(p_payment_currency, 'NGN'));
  v_paid_at timestamptz := coalesce(p_paid_at, now());
  v_available_at timestamptz;
  v_agent_user uuid;
begin
  if p_team_id is null or p_awardee_id is null or p_payment_id is null then
    raise exception using errcode = '22023', message = 'team, awardee and payment IDs are required';
  end if;
  if p_payment_type <> 'award_order' then
    raise exception using errcode = '22023', message = 'unsupported payment source';
  end if;
  if v_currency not in ('NGN', 'USD') then
    raise exception using errcode = '22023', message = 'unsupported payment currency';
  end if;

  select * into v_awardee from public.team_awardees
  where id = p_awardee_id and team_id = p_team_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'awardee not found in this team';
  end if;

  update public.team_awardees
  set payment_status = 'paid',
      payment_currency = v_currency,
      payment_amount_minor = greatest(coalesce(p_payment_amount_minor, 0), 0),
      paid_at = v_paid_at,
      payment_source_type = p_payment_type,
      payment_source_id = p_payment_id,
      payment_verified_at = now(),
      payment_note = null
  where id = p_awardee_id;

  -- Exactly one earning per verified payment, enforced by a partial unique
  -- index. Re-running reconciliation is therefore safe.
  select * into v_entry from public.team_commission_entries
  where team_id = p_team_id and payment_type = p_payment_type
    and payment_id = p_payment_id and entry_type = 'earning';

  if found then
    return jsonb_build_object('outcome', 'already_earned', 'commission_id', v_entry.id);
  end if;

  select * into v_assignment from public.team_assignments
  where awardee_id = p_awardee_id
    and assigned_at <= v_paid_at
    and (ended_at is null or ended_at > v_paid_at)
  order by assigned_at desc
  limit 1;
  if not found then
    perform public.team_audit(p_team_id, p_actor, null, 'payment.verified_unassigned', 'award_order', p_payment_id::text,
      jsonb_build_object('awardee_id', p_awardee_id, 'amount_minor', p_payment_amount_minor, 'currency', v_currency));
    return jsonb_build_object('outcome', 'paid_without_assignment', 'commission_id', null);
  end if;

  select * into v_rule from public.team_commission_rules r
  where r.team_id = p_team_id and r.is_active
    and r.payment_currency = v_currency
    and (r.country_scope is null or upper(r.country_scope) = upper(coalesce(v_awardee.country, '')))
  order by
    case when r.country_scope is null then 1 else 0 end,
    r.priority desc, r.created_at asc
  limit 1;

  if not found then
    perform public.team_audit(p_team_id, p_actor, null, 'payment.no_commission_rule', 'award_order', p_payment_id::text,
      jsonb_build_object('awardee_id', p_awardee_id, 'payment_currency', v_currency));
    return jsonb_build_object('outcome', 'paid_without_rule', 'commission_id', null);
  end if;

  select * into v_settings from public.team_settings where team_id = p_team_id;
  v_available_at := v_paid_at + make_interval(hours => coalesce(v_settings.commission_hold_hours, 0));

  insert into public.team_commission_entries (
    team_id, awardee_id, agent_id, rule_id, entry_type, payment_type, payment_id,
    payment_currency, amount_minor, currency, status, available_at, earned_at,
    rule_snapshot, created_by
  ) values (
    p_team_id, p_awardee_id, v_assignment.agent_id, v_rule.id, 'earning', p_payment_type, p_payment_id,
    v_currency, v_rule.commission_amount_minor, v_rule.commission_currency,
    case when v_available_at <= now() then 'confirmed' else 'pending' end,
    v_available_at, v_paid_at,
    jsonb_build_object(
      'rule_id', v_rule.id, 'rule_name', v_rule.name,
      'commission_amount_minor', v_rule.commission_amount_minor,
      'commission_currency', v_rule.commission_currency,
      'payment_currency', v_currency, 'payment_amount_minor', p_payment_amount_minor,
      'country_scope', v_rule.country_scope
    ),
    p_actor
  ) returning * into v_entry;

  select user_id into v_agent_user from public.team_memberships where id = v_assignment.agent_id;
  if v_agent_user is not null then
    perform public.team_notify(
      p_team_id, v_agent_user, v_assignment.agent_id, 'commission_earned',
      'Commission earned',
      'A verified award payment generated a commission.',
      '/earnings'
    );
  end if;

  perform public.team_audit(p_team_id, p_actor, null, 'commission.created', 'commission_entry', v_entry.id::text,
    jsonb_build_object(
      'awardee_id', p_awardee_id, 'agent_id', v_assignment.agent_id,
      'payment_id', p_payment_id, 'amount_minor', v_rule.commission_amount_minor,
      'currency', v_rule.commission_currency
    ));

  return jsonb_build_object(
    'outcome', 'commission_created', 'commission_id', v_entry.id,
    'agent_id', v_assignment.agent_id, 'amount_minor', v_rule.commission_amount_minor,
    'currency', v_rule.commission_currency
  );
end;
$$;

create or replace function public.team_auto_assign(
  p_team_id uuid,
  p_actor uuid,
  p_limit integer default 1000,
  p_country text default 'Nigeria',
  p_include_pending boolean default false
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_settings public.team_settings%rowtype;
  v_awardee record;
  v_agent public.team_memberships%rowtype;
  v_assigned integer := 0;
  v_skipped integer := 0;
  v_capacity_skipped integer := 0;
  v_capacity integer := 100;
  v_batch jsonb := '{}'::jsonb;
  v_agent_counts jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 5000);
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));

  select * into v_settings from public.team_settings where team_id = p_team_id;
  if not found then
    raise exception using errcode = '22023', message = 'team settings are missing';
  end if;
  if not v_settings.auto_assign_enabled then
    raise exception using errcode = '22023', message = 'automatic assignment is paused';
  end if;

  for v_awardee in
    select ta.id, ta.name
    from public.team_awardees ta
    where ta.team_id = p_team_id and ta.is_active
      and ta.payment_status in ('unpaid', case when p_include_pending then 'pending' else 'unpaid' end)
      and (p_country is null or upper(coalesce(ta.country, '')) = upper(p_country))
      and not exists (
        select 1 from public.team_assignments a where a.awardee_id = ta.id and a.status = 'active'
      )
    order by (upper(coalesce(ta.country, '')) = 'NIGERIA') desc, ta.created_at asc
    limit v_limit
  loop
    select m.* into v_agent
    from public.team_memberships m
    left join public.team_assignments a on a.agent_id = m.id and a.status = 'active'
    where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent'
    group by m.id
    having count(a.id) < v_capacity
    order by
      count(a.id) asc,
      case when v_settings.assignment_strategy = 'round_robin' then m.last_assigned_at end asc nulls first,
      m.created_at asc
    limit 1;

    if not found then
      v_skipped := v_skipped + 1;
      if exists (select 1 from public.team_memberships m where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent') then
        v_capacity_skipped := v_capacity_skipped + 1;
      end if;
      continue;
    end if;

    insert into public.team_assignments (
      team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by
    ) values (
      p_team_id, v_awardee.id, v_agent.id, 'active', v_settings.assignment_strategy, p_actor
    ) on conflict (awardee_id) where status = 'active' do nothing;

    if found then
      v_assigned := v_assigned + 1;
      update public.team_memberships set last_assigned_at = now() where id = v_agent.id;
      v_batch := jsonb_set(
        v_batch, array[v_agent.id::text],
        to_jsonb(coalesce((v_batch->>v_agent.id::text)::integer, 0) + 1)
      );
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  for v_agent in
    select * from public.team_memberships where team_id = p_team_id and role = 'agent' and status = 'active'
  loop
    if coalesce((v_batch->>v_agent.id::text)::integer, 0) > 0 then
      perform public.team_notify(
        p_team_id, v_agent.user_id, v_agent.id, 'awardees_assigned',
        (v_batch->>v_agent.id::text) || ' new awardees assigned',
        'Open My Awardees to begin follow-up.',
        '/awardees'
      );
    end if;
  end loop;

  select coalesce(jsonb_object_agg(m.id, c.cnt), '{}'::jsonb) into v_agent_counts
  from public.team_memberships m
  left join (
    select agent_id, count(*)::integer as cnt from public.team_assignments
    where team_id = p_team_id and status = 'active' group by agent_id
  ) c on c.agent_id = m.id
  where m.team_id = p_team_id and m.role = 'agent' and m.status = 'active';

  perform public.team_audit(p_team_id, p_actor, null, 'assignments.auto', 'team', p_team_id::text,
    jsonb_build_object('assigned', v_assigned, 'skipped', v_skipped, 'capacity_skipped', v_capacity_skipped, 'limit_per_agent', v_capacity, 'country', p_country));

  return jsonb_build_object(
    'assigned', v_assigned, 'skipped', v_skipped,
    'capacity_skipped', v_capacity_skipped, 'limit_per_agent', v_capacity,
    'country', p_country, 'agent_counts', v_agent_counts
  );
end;
$$;

create or replace function public.team_reassign_awardee(
  p_team_id uuid,
  p_actor uuid,
  p_awardee_id uuid,
  p_new_agent_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_old public.team_assignments%rowtype;
  v_new public.team_assignments%rowtype;
  v_new_agent public.team_memberships%rowtype;
  v_old_agent public.team_memberships%rowtype;
  v_target_load integer;
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));

  select * into v_new_agent from public.team_memberships
  where id = p_new_agent_id and team_id = p_team_id and status = 'active' and role = 'agent';
  if not found then
    raise exception using errcode = '22023', message = 'target agent is not active';
  end if;

  select * into v_old from public.team_assignments
  where awardee_id = p_awardee_id and team_id = p_team_id and status = 'active' for update;

  if found and v_old.agent_id = p_new_agent_id then
    return jsonb_build_object('outcome', 'unchanged', 'assignment_id', v_old.id);
  end if;

  select count(*)::integer into v_target_load from public.team_assignments
  where team_id = p_team_id and agent_id = p_new_agent_id and status = 'active';
  if v_target_load >= 100 then
    raise exception using errcode = '22023', message = 'target agent has reached the 100 active awardee limit';
  end if;

  if v_old.id is not null then
    select * into v_old_agent from public.team_memberships where id = v_old.agent_id;
    update public.team_assignments
    set status = 'reassigned', ended_at = now(), ended_by = p_actor, end_reason = left(coalesce(p_reason, 'Manual reassignment'), 500)
    where id = v_old.id;
  end if;

  insert into public.team_assignments (team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by)
  values (p_team_id, p_awardee_id, p_new_agent_id, 'active', 'manual', p_actor)
  returning * into v_new;

  perform public.team_notify(p_team_id, v_new_agent.user_id, v_new_agent.id, 'awardee_assigned',
    'New awardee assigned', 'An awardee was assigned to you.', '/awardees/' || p_awardee_id);
  if v_old.id is not null and v_old_agent.user_id is not null then
    perform public.team_notify(p_team_id, v_old_agent.user_id, v_old_agent.id, 'awardee_reassigned',
      'Awardee reassigned', 'One awardee was reassigned to another agent.', '/awardees');
  end if;

  perform public.team_audit(p_team_id, p_actor, null, 'assignment.reassigned', 'awardee', p_awardee_id::text,
    jsonb_build_object('from_agent', v_old.agent_id, 'to_agent', p_new_agent_id, 'reason', p_reason));

  return jsonb_build_object('outcome', 'reassigned', 'assignment_id', v_new.id);
end;
$$;

create or replace function public.team_link_awardee_payment_identity()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_match_id uuid;
  v_match_profile uuid;
  v_match_count integer;
begin
  if new.public_awardee_id is not null then
    select a.profile_id into new.profile_id from public.awardees a where a.id = new.public_awardee_id;
  elsif new.profile_id is null and nullif(btrim(new.email), '') is not null then
    select count(*), min(a.id::text)::uuid, min(a.profile_id::text)::uuid
      into v_match_count, v_match_id, v_match_profile
    from public.awardees a
    where lower(btrim(a.email)) = lower(btrim(new.email));
    if v_match_count = 1 then
      new.public_awardee_id := v_match_id;
      new.profile_id := v_match_profile;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists team_link_awardee_payment_identity_insert on public.team_awardees;
create trigger team_link_awardee_payment_identity_insert
  before insert on public.team_awardees
  for each row execute function public.team_link_awardee_payment_identity();
drop trigger if exists team_link_awardee_payment_identity_update on public.team_awardees;
create trigger team_link_awardee_payment_identity_update
  before update of public_awardee_id, profile_id, email on public.team_awardees
  for each row execute function public.team_link_awardee_payment_identity();

create or replace function public.team_sync_linked_paid_awardee()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_order record;
  v_currency text;
  v_amount bigint;
  v_paid_at timestamptz;
begin
  if new.public_awardee_id is null and new.profile_id is null then return new; end if;
  for v_order in
    select o.* from public.award_orders o
    where o.award_payment_status = 'paid'
      and ((new.public_awardee_id is not null and o.awardee_id = new.public_awardee_id)
        or (new.profile_id is not null and o.profile_id = new.profile_id))
    order by coalesce(o.award_paid_at, o.paid_at, o.created_at)
  loop
    v_currency := 'NGN';
    v_amount := coalesce(v_order.award_amount_kobo, 0);
    if v_order.award_paid_attempt_id is not null then
      select upper(a.currency), coalesce(a.captured_amount_minor, a.requested_amount_minor)
        into v_currency, v_amount
      from public.award_payment_attempts a where a.id = v_order.award_paid_attempt_id;
    end if;
    v_paid_at := coalesce(v_order.award_paid_at, v_order.paid_at, v_order.created_at, now());
    perform public.team_apply_verified_payment(
      new.team_id, new.id, 'award_order', v_order.id,
      coalesce(v_currency, 'NGN'), coalesce(v_amount, 0), v_paid_at, null
    );
  end loop;
  return new;
exception when others then
  raise warning 'team platform linked-payment sync skipped for awardee %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists team_sync_linked_paid_awardee_insert on public.team_awardees;
create trigger team_sync_linked_paid_awardee_insert
  after insert on public.team_awardees
  for each row execute function public.team_sync_linked_paid_awardee();
drop trigger if exists team_sync_linked_paid_awardee_update on public.team_awardees;
create trigger team_sync_linked_paid_awardee_update
  after update of public_awardee_id, profile_id on public.team_awardees
  for each row execute function public.team_sync_linked_paid_awardee();

revoke all on function public.team_link_awardee_payment_identity() from public, anon, authenticated;
revoke all on function public.team_sync_linked_paid_awardee() from public, anon, authenticated;

-- Prefer the order's exact awardee identity over the broader profile fallback.
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
