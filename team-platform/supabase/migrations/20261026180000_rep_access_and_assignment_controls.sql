-- Admin-generated one-time access codes and configurable awardee assignment rules.

alter table public.team_settings
  add column if not exists max_awardees_per_agent integer not null default 100;

alter table public.team_settings
  drop constraint if exists team_settings_max_awardees_per_agent_check;
alter table public.team_settings
  add constraint team_settings_max_awardees_per_agent_check
  check (max_awardees_per_agent between 1 and 5000);

create table if not exists public.team_signup_codes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_teams(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_email text,
  membership_id uuid references public.team_memberships(id) on delete set null,
  constraint team_signup_codes_hash_length check (length(code_hash) = 64)
);

create index if not exists team_signup_codes_team_created_idx
  on public.team_signup_codes (team_id, created_at desc);

alter table public.team_signup_codes enable row level security;
revoke all on public.team_signup_codes from public, anon, authenticated;
grant select, insert, update on public.team_signup_codes to service_role;

create or replace function public.team_awardee_country_options(p_year integer)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('country', country, 'total', total, 'unpaid', unpaid)
    order by (lower(country) = 'nigeria') desc, country), '[]'::jsonb)
  from (
    select btrim(a.country) as country,
      count(*)::integer as total,
      sum(case when payment_match.order_id is null then 1 else 0 end)::integer as unpaid
    from public.awardees a
    left join lateral (
      select o.id as order_id
      from public.award_orders o
      where o.award_payment_status in ('paid', 'pending', 'refunded')
        and (o.awardee_id = a.id or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id))
      limit 1
    ) payment_match on true
    where btrim(a.year) = p_year::text and nullif(btrim(a.country), '') is not null
    group by btrim(a.country)
  ) options;
$$;
revoke all on function public.team_awardee_country_options(integer) from public, anon, authenticated;
grant execute on function public.team_awardee_country_options(integer) to service_role;

create or replace function public.team_validate_signup_code(p_code_hash text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_signup_codes c
    join public.team_teams t on t.id = c.team_id and t.is_active
    where c.code_hash = p_code_hash and c.revoked_at is null
      and c.redeemed_at is null and c.expires_at > now()
  );
$$;
revoke all on function public.team_validate_signup_code(text) from public, anon, authenticated;
grant execute on function public.team_validate_signup_code(text) to service_role;

create or replace function public.team_redeem_signup_code(
  p_code_hash text,
  p_user_id uuid,
  p_email text,
  p_full_name text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_code public.team_signup_codes%rowtype;
  v_membership public.team_memberships%rowtype;
  v_email text := lower(btrim(p_email));
begin
  if p_user_id is null or v_email = '' or length(btrim(p_full_name)) < 2 then
    raise exception using errcode = '22023', message = 'Enter a valid name and email address';
  end if;

  select * into v_code from public.team_signup_codes
  where code_hash = p_code_hash and revoked_at is null
    and redeemed_at is null and expires_at > now()
  for update;
  if not found then
    raise exception using errcode = '22023', message = 'That access code is invalid, expired, or already used';
  end if;
  if not exists (
    select 1 from public.team_teams where id = v_code.team_id and is_active
  ) then
    raise exception using errcode = '22023', message = 'This team is not accepting new members';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = p_user_id and lower(u.email) = v_email
  ) then
    raise exception using errcode = '22023', message = 'The new account could not be verified';
  end if;

  insert into public.team_memberships (
    team_id, user_id, email, full_name, role, status, invited_by, invited_at
  ) values (
    v_code.team_id, p_user_id, v_email, btrim(p_full_name), 'agent', 'invited', v_code.created_by, now()
  ) returning * into v_membership;

  update public.team_signup_codes set
    redeemed_at = now(), redeemed_by = p_user_id,
    redeemed_email = v_email, membership_id = v_membership.id
  where id = v_code.id;

  insert into public.team_audit_logs (team_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_code.team_id, p_user_id, 'team.signup_code_redeemed', 'membership', v_membership.id,
    jsonb_build_object('email', v_email, 'code_id', v_code.id));

  return jsonb_build_object('membership_id', v_membership.id, 'team_id', v_code.team_id, 'status', 'invited');
end;
$$;
revoke all on function public.team_redeem_signup_code(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.team_redeem_signup_code(text, uuid, text, text) to service_role;

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
    where btrim(a.year) = p_year::text
      and (v_settings.default_country is null or lower(btrim(a.country)) = lower(btrim(v_settings.default_country)))
      and not exists (select 1 from public.award_orders o where o.award_payment_status in ('paid', 'pending', 'refunded')
        and (o.awardee_id = a.id or (o.awardee_id is null and a.profile_id is not null and o.profile_id = a.profile_id)))
    order by random()
  loop
    insert into public.team_awardees (
      team_id, public_awardee_id, profile_id, source_year, name, email, phone, country, address
    ) values (
      p_team_id, v_source.id, v_source.profile_id, p_year,
      v_source.name, v_source.contact_email, v_source.contact_phone, v_source.country, v_source.contact_address
    ) on conflict do nothing;
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
      where team_id = p_team_id and public_awardee_id = v_source.id and is_active;
    end if;
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
  v_capacity integer;
  v_batch jsonb := '{}'::jsonb;
  v_agent_counts jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 5000);
begin
  perform public.team_assert_admin(p_team_id, p_actor);
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));
  select * into v_settings from public.team_settings where team_id = p_team_id for update;
  if not found then raise exception using errcode = '22023', message = 'team settings are missing'; end if;
  if not v_settings.auto_assign_enabled then raise exception using errcode = '22023', message = 'automatic assignment is paused'; end if;
  v_capacity := greatest(v_settings.max_awardees_per_agent, 1);

  for v_awardee in
    select ta.id, ta.name from public.team_awardees ta
    where ta.team_id = p_team_id and ta.is_active
      and ta.payment_status in ('unpaid', case when p_include_pending then 'pending' else 'unpaid' end)
      and (coalesce(p_country, v_settings.default_country) is null
        or lower(btrim(coalesce(ta.country, ''))) = lower(btrim(coalesce(p_country, v_settings.default_country))))
      and not exists (select 1 from public.team_assignments a where a.awardee_id = ta.id and a.status = 'active')
    order by random() limit v_limit
  loop
    select m.* into v_agent from public.team_memberships m
    left join public.team_assignments a on a.agent_id = m.id and a.status = 'active'
    where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent'
    group by m.id having count(a.id) < v_capacity
    order by count(a.id) asc, m.last_assigned_at asc nulls first limit 1;
    if not found then
      v_skipped := v_skipped + 1;
      if exists (select 1 from public.team_memberships m where m.team_id = p_team_id and m.status = 'active' and m.role = 'agent') then
        v_capacity_skipped := v_capacity_skipped + 1;
      end if;
      continue;
    end if;
    insert into public.team_assignments (team_id, awardee_id, agent_id, status, assignment_strategy, assigned_by)
      values (p_team_id, v_awardee.id, v_agent.id, 'active', v_settings.assignment_strategy, p_actor)
      on conflict (awardee_id) where status = 'active' do nothing;
    if found then
      v_assigned := v_assigned + 1;
      v_batch := jsonb_set(v_batch, array[v_agent.id::text], to_jsonb(coalesce((v_batch->>v_agent.id::text)::integer, 0) + 1));
      update public.team_memberships set last_assigned_at = now() where id = v_agent.id;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  for v_agent in select * from public.team_memberships where team_id = p_team_id and role = 'agent' and status = 'active'
  loop
    if coalesce((v_batch->>v_agent.id::text)::integer, 0) > 0 then
      perform public.team_notify(p_team_id, v_agent.user_id, v_agent.id, 'awardees_assigned',
        (v_batch->>v_agent.id::text) || ' new awardees assigned', 'Open My Awardees to begin follow-up.', '/awardees');
    end if;
  end loop;
  select coalesce(jsonb_object_agg(m.id, c.cnt), '{}'::jsonb) into v_agent_counts
  from public.team_memberships m left join (
    select agent_id, count(*)::integer as cnt from public.team_assignments
    where team_id = p_team_id and status = 'active' group by agent_id
  ) c on c.agent_id = m.id where m.team_id = p_team_id and m.role = 'agent' and m.status = 'active';
  perform public.team_audit(p_team_id, p_actor, null, 'assignments.auto', 'team', p_team_id::text,
    jsonb_build_object('assigned', v_assigned, 'skipped', v_skipped, 'capacity_skipped', v_capacity_skipped,
      'country', coalesce(p_country, v_settings.default_country), 'limit_per_agent', v_capacity));
  return jsonb_build_object('assigned', v_assigned, 'skipped', v_skipped, 'capacity_skipped', v_capacity_skipped,
    'country', coalesce(p_country, v_settings.default_country), 'limit_per_agent', v_capacity, 'agent_counts', v_agent_counts);
end;
$$;
revoke all on function public.team_auto_assign(uuid, uuid, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.team_auto_assign(uuid, uuid, integer, text, boolean) to service_role;

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
