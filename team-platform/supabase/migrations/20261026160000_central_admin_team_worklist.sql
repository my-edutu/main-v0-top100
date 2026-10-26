-- Let authenticated Top100 platform admins operate team worklists from the
-- central Admin Panel, without requiring a duplicate team super-admin login.
-- Sensitive RPCs remain service-role only; the Admin Panel validates the
-- caller's profiles.role before invoking them.

create or replace function public.team_assert_admin(p_team_id uuid, p_actor uuid)
returns public.team_memberships
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_membership public.team_memberships%rowtype;
  v_platform_role text;
begin
  select * into v_membership from public.team_memberships
  where team_id = p_team_id and user_id = p_actor and status = 'active' and role = 'super_admin';
  if found then
    return v_membership;
  end if;

  select p.role into v_platform_role from public.profiles p where p.id = p_actor;
  if v_platform_role in ('admin', 'superadmin') then
    return null;
  end if;

  raise exception using errcode = '42501', message = 'administrator access required';
end;
$$;

-- Team rows are projections of the canonical Top100 awardee directory. Keep
-- every awardee eligible for a year even when email addresses are shared.
alter table public.team_awardees add column if not exists source_year integer;
drop index if exists public.team_awardees_email_uidx;
create index if not exists team_awardees_team_email_idx
  on public.team_awardees (team_id, lower(email)) where email is not null and email <> '';
create index if not exists team_awardees_team_source_year_idx
  on public.team_awardees (team_id, source_year, payment_status, is_active);

create or replace function public.team_awardee_year_options(p_team_id uuid, p_actor uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_options jsonb;
begin
  if p_actor is null then
    raise exception using errcode = '42501', message = 'administrator access required';
  end if;
  perform public.team_assert_admin(p_team_id, p_actor);

  select coalesce(jsonb_agg(jsonb_build_object(
    'year', y.award_year,
    'total', y.total,
    'unpaid', y.unpaid
  ) order by y.award_year desc), '[]'::jsonb)
  into v_options
  from (
    select a.year as award_year,
      count(*)::integer as total,
    count(*) filter (where
      not exists (select 1 from public.award_orders o where o.award_payment_status in ('paid', 'pending', 'refunded')
        and ((o.awardee_id = a.id) or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id)))
      and coalesce(ta.payment_status, 'unpaid') = 'unpaid')::integer as unpaid
    from public.awardees a
    left join lateral (
      select x.payment_status from public.team_awardees x
      where x.team_id = p_team_id and x.public_awardee_id = a.id and x.is_active
      order by x.created_at desc limit 1
    ) ta on true
    where a.year is not null
    group by a.year
  ) y;

  return v_options;
end;
$$;

revoke all on function public.team_awardee_year_options(uuid, uuid) from public, anon, authenticated;
grant execute on function public.team_awardee_year_options(uuid, uuid) to service_role;

create or replace function public.team_active_agent_workloads(p_team_id uuid, p_actor uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_workloads jsonb;
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  select coalesce(jsonb_object_agg(m.id::text, coalesce(c.total, 0)), '{}'::jsonb)
  into v_workloads
  from public.team_memberships m
  left join (
    select a.agent_id, count(*)::integer as total
    from public.team_assignments a
    where a.team_id = p_team_id and a.status = 'active'
    group by a.agent_id
  ) c on c.agent_id = m.id
  where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent';
  return v_workloads;
end;
$$;

revoke all on function public.team_active_agent_workloads(uuid, uuid) from public, anon, authenticated;
grant execute on function public.team_active_agent_workloads(uuid, uuid) to service_role;

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
  v_batch jsonb := '{}'::jsonb;
  v_agent_counts jsonb;
begin
  if p_year is null or p_year < 1900 or p_year > 2100 then
    raise exception using errcode = '22023', message = 'choose a valid award year';
  end if;
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));

  select * into v_settings from public.team_settings where team_id = p_team_id;
  if not found then
    raise exception using errcode = '22023', message = 'team settings are missing';
  end if;
  if not v_settings.auto_assign_enabled then
    raise exception using errcode = '22023', message = 'automatic assignment is paused';
  end if;

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
        nullif(concat_ws(', ',
          nullif(btrim(o.address_line1), ''), nullif(btrim(o.address_line2), ''),
          nullif(btrim(o.city), ''), nullif(btrim(o.state), ''),
          nullif(btrim(o.country), ''), nullif(btrim(o.postal_code), '')
        ), '') as address
      from public.award_orders o
      where o.awardee_id = a.id or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id)
      order by o.created_at desc
      limit 1
    ) latest_order on true
    where a.year = p_year
      and not exists (select 1 from public.award_orders o where o.award_payment_status in ('paid', 'pending', 'refunded')
        and ((o.awardee_id = a.id)
          or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id)))
    order by random()
  loop
    insert into public.team_awardees (
      team_id, public_awardee_id, profile_id, source_year, name, email, phone, country, address
    ) values (
      p_team_id, v_source.id, v_source.profile_id, p_year,
      v_source.name, v_source.contact_email, v_source.contact_phone, v_source.country, v_source.contact_address
    )
    on conflict do nothing;
    if found then
      v_loaded := v_loaded + 1;
    else
      update public.team_awardees set
        source_year = p_year,
        name = v_source.name,
        email = coalesce(v_source.contact_email, email),
        phone = coalesce(v_source.contact_phone, phone),
        country = coalesce(v_source.country, country),
        address = coalesce(v_source.contact_address, address)
      where team_id = p_team_id and public_awardee_id = v_source.id
        and is_active;
    end if;
  end loop;

  for v_awardee in
    select ta.id, ta.name
    from public.team_awardees ta
    where ta.team_id = p_team_id and ta.source_year = p_year and ta.is_active
      and ta.payment_status = 'unpaid'
      and not exists (select 1 from public.award_orders o where o.award_payment_status in ('paid', 'pending', 'refunded')
        and ((o.awardee_id = ta.public_awardee_id)
          or (o.awardee_id is null and ta.profile_id is not null and o.profile_id = ta.profile_id)))
      and not exists (select 1 from public.team_assignments a where a.awardee_id = ta.id and a.status = 'active')
    order by random()
  loop
    select m.* into v_agent
    from public.team_memberships m
    left join public.team_assignments a on a.agent_id = m.id and a.status = 'active'
    where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent'
    group by m.id
    having count(a.id) < 100
    order by count(a.id) asc, random()
    limit 1;

    if not found then
      if exists (select 1 from public.team_memberships m where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent') then
        v_capacity_skipped := v_capacity_skipped + 1;
      end if;
      continue;
    end if;

    insert into public.team_assignments (
      team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by
    ) values (
      p_team_id, v_awardee.id, v_agent.id, 'active', 'year_pool_shuffle', p_actor
    ) on conflict (awardee_id) where status = 'active' do nothing;

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
    jsonb_build_object('year', p_year, 'loaded', v_loaded, 'assigned', v_assigned,
      'capacity_skipped', v_capacity_skipped, 'limit_per_agent', 100));

  return jsonb_build_object('year', p_year, 'loaded', v_loaded,
    'assigned', v_assigned, 'capacity_skipped', v_capacity_skipped,
    'limit_per_agent', 100, 'agent_counts', v_agent_counts);
end;
$$;

revoke all on function public.team_assign_from_awardee_year(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.team_assign_from_awardee_year(uuid, integer, uuid) to service_role;
