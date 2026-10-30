-- Run as one transaction. Retain every row and financial/activity reference.
begin;

-- Use the same locks as all assignment RPCs, in deterministic team order.
do $$
declare v_team uuid;
begin
  for v_team in select id from public.team_teams order by id loop
    perform pg_advisory_xact_lock(hashtextextended('team-assign:' || v_team::text, 0));
  end loop;
end;
$$;
lock table public.team_awardees, public.team_assignments in share row exclusive mode;

create temporary table team_worklist_duplicate_repair on commit drop as
with ranked as (
  select ta.id, ta.team_id,
    first_value(ta.id) over identity_order as keeper_id,
    row_number() over identity_order as position
  from public.team_awardees ta
  left join public.team_assignments a on a.awardee_id = ta.id and a.status = 'active'
  where ta.is_active and ta.public_awardee_id is not null
  window identity_order as (
    partition by ta.team_id, ta.public_awardee_id
    order by exists(select 1 from public.team_commission_entries e where e.awardee_id = ta.id) desc,
      (ta.payment_source_id is not null and ta.payment_verified_at is not null) desc,
      (a.id is not null) desc,
      exists(select 1 from public.team_followups f where f.awardee_id = ta.id) desc,
      a.assigned_at asc nulls last, ta.created_at asc, ta.id
  )
)
select id, team_id, keeper_id from ranked where position > 1;

-- Keep the current contact projection useful when the financial-history row
-- wins over a more recently contacted duplicate. Original history stays put.
with contact_state as (
  select keeper.id, latest.contact_status, latest.last_contacted_at,
    latest.last_contact_channel, latest.next_followup_at, latest.followup_status,
    exists(select 1 from public.team_awardees r
      where r.team_id = keeper.team_id and r.public_awardee_id = keeper.public_awardee_id
        and r.is_active and r.contact_status = 'responded') as has_response
  from public.team_awardees keeper
  join (select distinct keeper_id from team_worklist_duplicate_repair) d on d.keeper_id = keeper.id
  join lateral (
    select r.* from public.team_awardees r
    where r.team_id = keeper.team_id and r.public_awardee_id = keeper.public_awardee_id and r.is_active
    order by r.last_contacted_at desc nulls last, r.updated_at desc, r.id
    limit 1
  ) latest on true
)
update public.team_awardees keeper set
  contact_status = case when c.has_response then 'responded' else c.contact_status end,
  last_contacted_at = c.last_contacted_at, last_contact_channel = c.last_contact_channel,
  next_followup_at = c.next_followup_at, followup_status = c.followup_status
from contact_state c where keeper.id = c.id;

-- Do not move ledger entries, follow-ups or historical assignment references.
-- The canonical pointer makes the archived record and its history traceable.
update public.team_assignments a set
  status = 'removed', ended_at = now(),
  end_reason = case when d.keeper_id is not null
    then 'Duplicate worklist record; canonical awardee ' || d.keeper_id::text
    else 'Archived worklist record' end
from public.team_awardees ta
left join team_worklist_duplicate_repair d on d.id = ta.id
where a.awardee_id = ta.id and a.status = 'active'
  and (not ta.is_active or d.id is not null);

update public.team_awardees ta set is_active = false,
  metadata = coalesce(ta.metadata, '{}'::jsonb) || jsonb_build_object(
    'duplicate_of', d.keeper_id, 'duplicate_archived_at', now(),
    'duplicate_repair', '20261030_worklist_ownership')
from team_worklist_duplicate_repair d where ta.id = d.id;

insert into public.team_audit_logs(team_id,action,entity_type,metadata)
select team_id, 'awardees.duplicates_archived', 'team_awardees',
  jsonb_build_object('archived_count',count(*),'repair','20261030_worklist_ownership')
from team_worklist_duplicate_repair group by team_id;

update public.team_awardees set country = btrim(country)
where is_active and country is distinct from btrim(country);

create unique index if not exists team_awardees_active_public_id_uidx
  on public.team_awardees (team_id, public_awardee_id)
  where is_active and public_awardee_id is not null;

create or replace function public.team_assign_from_awardee_year(
  p_team_id uuid,
  p_year integer,
  p_actor uuid
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_settings public.team_settings%rowtype;
  v_source record;
  v_awardee record;
  v_agent public.team_memberships%rowtype;
  v_loaded integer := 0;
  v_assigned integer := 0;
  v_capacity_skipped integer := 0;
  v_capacity integer;
  v_batch jsonb := '{}'::jsonb;
  v_agent_counts jsonb;
begin
  if p_year is null or p_year < 1900 or p_year > 2100 then
    raise exception using errcode = '22023', message = 'choose a valid award year';
  end if;
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));

  select * into v_settings from public.team_settings where team_id = p_team_id for update;
  if not found then raise exception using errcode = '22023', message = 'team settings are missing'; end if;
  if not v_settings.auto_assign_enabled then raise exception using errcode = '22023', message = 'automatic assignment is paused'; end if;
  v_capacity := greatest(v_settings.max_awardees_per_agent, 1);

  for v_source in
    select a.id, a.profile_id, a.name, a.email, a.country, a.year,
      coalesce(p.email, a.email, nullif(btrim(a.metadata->>'email'), ''), latest_order.email) as contact_email,
      coalesce(p.phone, nullif(btrim(a.metadata->>'phone'), ''), latest_order.phone) as contact_phone,
      coalesce(
        nullif(btrim(a.metadata->>'address'), ''),
        nullif(concat_ws(', ', nullif(btrim(a.metadata->>'address_line1'), ''),
          nullif(btrim(a.metadata->>'address_line2'), ''), nullif(btrim(a.metadata->>'city'), ''),
          nullif(btrim(a.metadata->>'state'), ''), nullif(btrim(a.metadata->>'country'), '')), ''),
        latest_order.address
      ) as contact_address
    from public.awardees a
    left join public.profiles p on p.id = a.profile_id
    left join lateral (
      select o.email, o.phone,
        nullif(concat_ws(', ', nullif(btrim(o.address_line1), ''), nullif(btrim(o.address_line2), ''),
          nullif(btrim(o.city), ''), nullif(btrim(o.state), ''), nullif(btrim(o.country), ''),
          nullif(btrim(o.postal_code), '')), '') as address
      from public.award_orders o
      where o.awardee_id = a.id or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id)
      order by o.created_at desc limit 1
    ) latest_order on true
    where btrim(a.year::text) = p_year::text
      and (v_settings.default_country is null or lower(btrim(a.country)) = lower(btrim(v_settings.default_country)))
      and not exists (select 1 from public.award_orders o where o.award_payment_status in ('paid', 'pending', 'refunded')
        and (o.awardee_id = a.id or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id)))
    order by random()
  loop
    -- Update the canonical active projection first. The explicit conflict target
    -- also fails closed on deployments missing the identity constraint.
    update public.team_awardees set
      source_year = p_year, name = v_source.name,
      email = coalesce(v_source.contact_email, email),
      phone = coalesce(v_source.contact_phone, phone),
      country = coalesce(btrim(v_source.country), country),
      address = coalesce(v_source.contact_address, address)
    where team_id = p_team_id and public_awardee_id = v_source.id and is_active;
    if found then continue; end if;

    insert into public.team_awardees (
      team_id, public_awardee_id, profile_id, source_year, name, email, phone, country, address
    ) values (
      p_team_id, v_source.id, v_source.profile_id, p_year,
      v_source.name, v_source.contact_email, v_source.contact_phone, btrim(v_source.country), v_source.contact_address
    ) on conflict (team_id, public_awardee_id)
      where is_active and public_awardee_id is not null do nothing;
    if found then v_loaded := v_loaded + 1; end if;
  end loop;

  for v_awardee in
    select ta.id, ta.name
    from public.team_awardees ta
    where ta.team_id = p_team_id and ta.source_year = p_year and ta.is_active
      and ta.payment_status = 'unpaid'
      and lower(btrim(coalesce(ta.country, ''))) = lower(btrim(v_settings.default_country))
      and not exists (select 1 from public.award_orders o where o.award_payment_status in ('paid', 'pending', 'refunded')
        and (o.awardee_id = ta.public_awardee_id
          or (o.awardee_id is null and ta.profile_id is not null and o.profile_id = ta.profile_id)))
      and not exists (select 1 from public.team_assignments a where a.awardee_id = ta.id and a.status = 'active')
    order by random()
  loop
    select m.* into v_agent
    from public.team_memberships m
    left join public.team_assignments a on a.agent_id = m.id and a.status = 'active'
    where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent'
    group by m.id
    having count(a.id) < v_capacity
    order by count(a.id) asc, random()
    limit 1;

    if not found then
      if exists (select 1 from public.team_memberships m where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent') then
        v_capacity_skipped := v_capacity_skipped + 1;
      end if;
      continue;
    end if;

    insert into public.team_assignments (team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by)
    values (p_team_id, v_awardee.id, v_agent.id, 'active', 'year_pool_shuffle', p_actor)
    on conflict (awardee_id) where status = 'active' do nothing;

    if found then
      v_assigned := v_assigned + 1;
      v_batch := jsonb_set(v_batch, array[v_agent.id::text],
        to_jsonb(coalesce((v_batch->>v_agent.id::text)::integer, 0) + 1));
      update public.team_memberships set last_assigned_at = now() where id = v_agent.id;
    end if;
  end loop;

  for v_agent in
    select * from public.team_memberships where team_id = p_team_id and role = 'agent' and status = 'active'
  loop
    if coalesce((v_batch->>v_agent.id::text)::integer, 0) > 0 then
      perform public.team_notify(p_team_id, v_agent.user_id, v_agent.id, 'awardees_assigned',
        (v_batch->>v_agent.id::text) || ' new awardees assigned',
        'Open My Awardees to begin follow-up.', '/awardees');
    end if;
  end loop;

  select coalesce(jsonb_object_agg(m.id, c.cnt), '{}'::jsonb) into v_agent_counts
  from public.team_memberships m
  left join (
    select agent_id, count(*)::integer as cnt from public.team_assignments
    where team_id = p_team_id and status = 'active' group by agent_id
  ) c on c.agent_id = m.id
  where m.team_id = p_team_id and m.role = 'agent' and m.status = 'active';

  perform public.team_audit(p_team_id, p_actor, null, 'assignments.year_pool_shuffle', 'award_year', p_year::text,
    jsonb_build_object('year', p_year, 'country', v_settings.default_country, 'loaded', v_loaded,
      'assigned', v_assigned, 'capacity_skipped', v_capacity_skipped, 'limit_per_agent', v_capacity));

  return jsonb_build_object('year', p_year, 'country', v_settings.default_country,
    'loaded', v_loaded, 'assigned', v_assigned, 'capacity_skipped', v_capacity_skipped,
    'limit_per_agent', v_capacity, 'agent_counts', v_agent_counts);
end;
$$;

revoke all on function public.team_assign_from_awardee_year(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.team_assign_from_awardee_year(uuid, integer, uuid) to service_role;


-- Save the selected scope and distribute under ONE lock/transaction. Separate
-- PATCH and POST requests can otherwise distribute another admin's country.
create or replace function public.team_distribute_awardee_year(
  p_team_id uuid, p_year integer, p_actor uuid,
  p_country text, p_capacity integer
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  if p_country is null or length(btrim(p_country)) < 2 or length(btrim(p_country)) > 80
    or p_capacity is null or p_capacity < 1 or p_capacity > 5000 then
    raise exception using errcode = '22023', message = 'choose a country and capacity from 1 to 5000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));
  update public.team_settings set default_country = btrim(p_country),
    max_awardees_per_agent = p_capacity, updated_by = p_actor, updated_at = now()
  where team_id = p_team_id;
  return public.team_assign_from_awardee_year(p_team_id, p_year, p_actor);
end;
$$;
revoke all on function public.team_distribute_awardee_year(uuid, integer, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.team_distribute_awardee_year(uuid, integer, uuid, text, integer) to service_role;

-- SELECT ta.* in a view captures columns at creation time. Older installations
-- created this view before source_year existed; append it without renaming any
-- of the view's existing columns or changing its grants/security behaviour.
do $$
declare v_definition text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'team_awardee_directory' and column_name = 'source_year'
  ) then
    v_definition := rtrim(pg_get_viewdef('public.team_awardee_directory'::regclass, true), E'; \n');
    execute 'create or replace view public.team_awardee_directory with (security_invoker = true) as '
      || 'select existing.*, source.source_year from (' || v_definition || ') existing '
      || 'join public.team_awardees source on source.id = existing.id';
  end if;
end;
$$;

-- Canonical years can be integer or text in supported Top100 installations.
-- Country labels share one case-insensitive, trimmed scope with distribution.
create or replace function public.team_awardee_country_options(p_year integer)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'country', country, 'total', total, 'unpaid', unpaid
  ) order by (lower(country) = 'nigeria') desc, country), '[]'::jsonb)
  from (
    select case when lower(btrim(a.country)) = 'nigeria' then 'Nigeria'
      else initcap(lower(btrim(a.country))) end as country,
      count(*)::integer as total,
      count(*) filter (where not exists (
        select 1 from public.award_orders o
        where o.award_payment_status in ('paid', 'pending', 'refunded')
          and (o.awardee_id = a.id or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id))
      ))::integer as unpaid
    from public.awardees a
    where btrim(a.year::text) = p_year::text and nullif(btrim(a.country), '') is not null
    group by lower(btrim(a.country))
  ) options;
$$;
revoke all on function public.team_awardee_country_options(integer) from public, anon, authenticated;
grant execute on function public.team_awardee_country_options(integer) to service_role;

-- Counts describe the selected pool, independently of search and table filters.
create or replace function public.team_worklist_summary(
  p_team_id uuid, p_year integer, p_country text, p_actor uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  select jsonb_build_object(
    'total', count(*),
    'assigned', count(*) filter (where agent_id is not null),
    'unassigned', count(*) filter (where agent_id is null),
    'unpaid_unassigned', count(*) filter (where agent_id is null and payment_status = 'unpaid'),
    'paid', count(*) filter (where payment_status = 'paid' and payment_source_id is not null and payment_verified_at is not null)
  ) into v_result
  from public.team_awardee_directory
  where team_id = p_team_id and source_year = p_year and is_active
    and lower(btrim(country)) = lower(btrim(p_country));
  return v_result;
end;
$$;
revoke all on function public.team_worklist_summary(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.team_worklist_summary(uuid, integer, text, uuid) to service_role;

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
  v_settings public.team_settings%rowtype;
  v_old public.team_assignments%rowtype;
  v_new public.team_assignments%rowtype;
  v_new_agent public.team_memberships%rowtype;
  v_old_agent public.team_memberships%rowtype;
  v_target_load integer;
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));
  select * into v_settings from public.team_settings where team_id = p_team_id for update;
  if not found then raise exception using errcode = '22023', message = 'team settings are missing'; end if;
  perform 1 from public.team_awardees where id = p_awardee_id and team_id = p_team_id and is_active for update;
  if not found then raise exception using errcode = '22023', message = 'active awardee not found in this team'; end if;
  select * into v_new_agent from public.team_memberships
  where id = p_new_agent_id and team_id = p_team_id and status = 'active' and role = 'agent';
  if not found then raise exception using errcode = '22023', message = 'target agent is not active'; end if;
  select * into v_old from public.team_assignments
  where awardee_id = p_awardee_id and team_id = p_team_id and status = 'active' for update;
  if found and v_old.agent_id = p_new_agent_id then return jsonb_build_object('outcome', 'unchanged', 'assignment_id', v_old.id); end if;
  select count(*)::integer into v_target_load from public.team_assignments
  where team_id = p_team_id and agent_id = p_new_agent_id and status = 'active';
  if v_target_load >= v_settings.max_awardees_per_agent then
    raise exception using errcode = '22023', message = 'target agent has reached the configured active awardee limit';
  end if;
  if v_old.id is not null then
    select * into v_old_agent from public.team_memberships where id = v_old.agent_id;
    update public.team_assignments set status = 'reassigned', ended_at = now(), ended_by = p_actor,
      end_reason = left(coalesce(p_reason, 'Manual reassignment'), 500) where id = v_old.id;
  end if;
  insert into public.team_assignments (team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by)
    values (p_team_id, p_awardee_id, p_new_agent_id, 'active', 'manual', p_actor) returning * into v_new;
  perform public.team_notify(p_team_id, v_new_agent.user_id, v_new_agent.id, 'awardee_assigned',
    'New awardee assigned', 'An awardee was assigned to you.', '/awardees/' || p_awardee_id);
  if v_old.id is not null and v_old_agent.user_id is not null then
    perform public.team_notify(p_team_id, v_old_agent.user_id, v_old_agent.id, 'awardee_reassigned',
      'Awardee reassigned', 'One awardee was reassigned to another agent.', '/awardees');
  end if;
  perform public.team_audit(p_team_id, p_actor, null, 'assignment.reassigned', 'awardee', p_awardee_id::text,
    jsonb_build_object('from_agent', v_old.agent_id, 'to_agent', p_new_agent_id, 'reason', p_reason,
      'limit_per_agent', v_settings.max_awardees_per_agent));
  return jsonb_build_object('outcome', 'reassigned', 'assignment_id', v_new.id);
end;
$$;
revoke all on function public.team_reassign_awardee(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.team_reassign_awardee(uuid, uuid, uuid, uuid, text) to service_role;

create or replace function public.team_agent_dashboard(
  p_team_id uuid,
  p_actor uuid,
  p_currency text default 'NGN'
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_member public.team_memberships%rowtype;
  v_balance jsonb;
  v_assigned bigint := 0;
  v_contacted bigint := 0;
  v_first_contact bigint := 0;
  v_paid bigint := 0;
  v_pending bigint := 0;
  v_due bigint := 0;
  v_overdue bigint := 0;
  v_activity jsonb;
  v_commissions jsonb;
  v_withdrawals jsonb;
begin
  select * into v_member from public.team_memberships
  where team_id = p_team_id and user_id = p_actor and status = 'active';
  if not found then
    raise exception using errcode = '42501', message = 'active team membership required';
  end if;
  perform public.team_refresh_followup_states(p_team_id);
  v_balance := public.team_agent_balance(p_team_id, v_member.id, p_currency);

  select
    count(*),
    count(*) filter (where ta.contact_status <> 'not_contacted'),
    count(*) filter (where ta.contact_status = 'not_contacted' and ta.payment_status = 'unpaid'),
    count(*) filter (where ta.payment_status = 'paid' and ta.payment_source_id is not null and ta.payment_verified_at is not null),
    count(*) filter (where ta.payment_status = 'pending'),
    count(*) filter (where ta.next_followup_at = (now() at time zone 'Africa/Lagos')::date and ta.payment_status in ('unpaid', 'pending')),
    count(*) filter (where ta.next_followup_at < (now() at time zone 'Africa/Lagos')::date and ta.payment_status in ('unpaid', 'pending'))
  into v_assigned, v_contacted, v_first_contact, v_paid, v_pending, v_due, v_overdue
  from public.team_assignments a
  join public.team_awardees ta on ta.id = a.awardee_id
  where a.team_id = p_team_id and a.agent_id = v_member.id and a.status = 'active' and ta.is_active;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_activity from (
    select f.id, f.channel, f.outcome, f.notes, f.contacted_at, ta.name as awardee_name, ta.id as awardee_id
    from public.team_followups f
    join public.team_awardees ta on ta.id = f.awardee_id
    where f.team_id = p_team_id and f.agent_id = v_member.id
    order by f.contacted_at desc limit 6
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_commissions from (
    select e.id, e.amount_minor, e.currency, e.entry_type, e.status, e.earned_at, e.available_at,
           ta.name as awardee_name
    from public.team_commission_entries e
    join public.team_awardees ta on ta.id = e.awardee_id
    where e.team_id = p_team_id and e.agent_id = v_member.id
    order by e.created_at desc limit 6
  ) x;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_withdrawals from (
    select w.id, w.amount_minor, w.settled_amount_minor, w.currency, w.status, w.created_at, w.paid_at,
           p.transaction_reference
    from public.team_withdrawal_requests w
    left join public.team_withdrawal_payouts p on p.request_id = w.id
    where w.team_id = p_team_id and w.agent_id = v_member.id
    order by w.created_at desc limit 4
  ) x;

  return jsonb_build_object(
    'role', v_member.role,
    'assigned', v_assigned,
    'contacted', v_contacted,
    'not_contacted', v_first_contact,
    'paid', v_paid,
    'unpaid', greatest(v_assigned - v_paid, 0),
    'pending_verification', v_pending,
    'due_today', v_due,
    'overdue', v_overdue,
    'conversion_rate', case when v_assigned = 0 then 0 else round((v_paid::numeric / v_assigned::numeric) * 100, 1) end,
    'balance', v_balance,
    'recent_activity', v_activity,
    'recent_commissions', v_commissions,
    'recent_withdrawals', v_withdrawals
  );
end;
$$;


-- Refresh PostgREST's RPC/view metadata on self-hosted deployments.
notify pgrst, 'reload schema';
commit;
