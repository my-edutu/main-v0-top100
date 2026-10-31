-- Permanent geographic support pools. Old scholarship applications/grouping runs are preserved.
create table public.project100_support_groups (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null, country text not null, state text,
  active boolean not null default true, sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  check ((country = 'Nigeria' and state is not null) or (country <> 'Nigeria' and state is null))
);
create unique index project100_support_group_geography on public.project100_support_groups(country, coalesce(state, ''));

insert into public.project100_support_groups(slug,name,country,state,sort_order)
select 'ng-' || lower(replace(state,' ','-')), state || ' impact group', 'Nigeria', state, 100
from unnest(array['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Federal Capital Territory','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']) state;
insert into public.project100_support_groups(slug,name,country,sort_order) values
('et','Ethiopia impact group','Ethiopia',1), ('gh','Ghana impact group','Ghana',2),
('cm','Cameroon impact group','Cameroon',3), ('ke','Kenya impact group','Kenya',4),
('bj','Benin impact group','Benin',5), ('cd','DR Congo impact group','Democratic Republic of the Congo',6);

create table public.project100_support_memberships (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  group_id uuid not null references public.project100_support_groups(id) on delete restrict,
  residence_country text not null, residence_state text,
  joined_at timestamptz not null default now()
);
create index on public.project100_support_memberships(group_id);
create table public.project100_support_projects (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.project100_support_groups(id) on delete restrict,
  title text not null check(length(title) between 3 and 160), description text not null,
  plan text not null, target_minor bigint not null check(target_minor > 0 and target_minor <= 100000000000),
  currency text not null check(currency in ('NGN','USD')),
  status text not null default 'planned' check(status in ('planned','active','completed')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), unique(id,group_id)
);
create index on public.project100_support_projects(group_id);
create table public.project100_support_contributions (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.profiles(id) on delete restrict,
  group_id uuid not null references public.project100_support_groups(id) on delete restrict,
  amount_minor bigint not null check(amount_minor > 0 and amount_minor <= 100000000000),
  currency text not null check(currency in ('NGN','USD')),
  donor_name text not null, payer_email text not null, display_name text not null,
  attribution text not null check(attribution in ('personal','organisation')),
  organisation text, anonymous boolean not null default false,
  status text not null default 'pending' check(status in ('pending','paid','needs_review')),
  idempotency_key uuid not null, reference text not null unique,
  checkout_id text unique, checkout_url text, checkout_expires_at timestamptz, charge_id text unique,
  created_at timestamptz not null default now(), paid_at timestamptz,
  unique(member_id,idempotency_key),
  check(attribution <> 'organisation' or nullif(btrim(organisation),'') is not null)
);
create index on public.project100_support_contributions(group_id,status,currency);
create index on public.project100_support_contributions(member_id,created_at desc);
create table public.project100_support_events (
  event_id text primary key, contribution_id uuid not null references public.project100_support_contributions(id) on delete restrict,
  status text not null, charge_id text, created_at timestamptz not null default now()
);
create index on public.project100_support_events(contribution_id);
create table public.project100_support_spending (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.project100_support_groups(id) on delete restrict,
  project_id uuid, amount_minor bigint not null check(amount_minor > 0 and amount_minor <= 100000000000),
  currency text not null check(currency in ('NGN','USD')), description text not null, evidence text not null,
  created_by uuid not null references public.profiles(id) on delete restrict, idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  foreign key(project_id,group_id) references public.project100_support_projects(id,group_id) on delete restrict
);
create index on public.project100_support_spending(group_id,currency);
create table public.project100_support_updates (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.project100_support_groups(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict, author_name text not null,
  caption text not null check(length(caption) between 3 and 2000), image_path text, image_url text,
  created_at timestamptz not null default now()
);
create index on public.project100_support_updates(group_id,created_at desc);
create table public.project100_support_grouping_log (
  id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id) on delete restrict,
  report jsonb not null, created_at timestamptz not null default now()
);

-- All access is through authenticated application routes. No direct Data API writes,
-- and no SECURITY DEFINER entry points. Service-only functions are SECURITY INVOKER.
do $$ declare t text; begin
  foreach t in array array['groups','memberships','projects','contributions','events','spending','updates','grouping_log'] loop
    execute format('alter table public.project100_support_%I enable row level security',t);
    execute format('revoke all on public.project100_support_%I from anon,authenticated',t);
    execute format('grant all on public.project100_support_%I to service_role',t);
  end loop;
end $$;

create function public.project100_immutable_contribution() returns trigger language plpgsql set search_path = public as $$
begin
  if (new.member_id,new.group_id,new.amount_minor,new.currency,new.donor_name,new.payer_email,new.display_name,new.attribution,new.organisation,new.anonymous,new.idempotency_key,new.reference)
    is distinct from (old.member_id,old.group_id,old.amount_minor,old.currency,old.donor_name,old.payer_email,old.display_name,old.attribution,old.organisation,old.anonymous,old.idempotency_key,old.reference) then
    raise exception 'Contribution allocation is immutable';
  end if;
  return new;
end $$;
create trigger project100_immutable_contribution before update on public.project100_support_contributions for each row execute function public.project100_immutable_contribution();

create function public.reserve_project100_contribution(p_member uuid,p_input jsonb,p_name text,p_email text,p_allow_any_group boolean default false)
returns public.project100_support_contributions language plpgsql set search_path = public as $$
declare v public.project100_support_contributions; v_id uuid := gen_random_uuid(); begin
  perform pg_advisory_xact_lock(hashtextextended(p_member::text || (p_input->>'idempotencyKey'),0));
  select * into v from project100_support_contributions where member_id=p_member and idempotency_key=(p_input->>'idempotencyKey')::uuid;
  if found then
    if v.group_id<>(p_input->>'groupId')::uuid or v.amount_minor<>(p_input->>'amountMinor')::bigint or v.currency<>p_input->>'currency'
       or v.attribution<>p_input->>'attribution' or coalesce(v.organisation,'')<>coalesce(p_input->>'organisation','') or v.anonymous<>(p_input->>'anonymous')::boolean then
      raise exception 'This checkout is already reserved for different details';
    end if;
    return v;
  end if;
  if not p_allow_any_group and not exists(select 1 from project100_support_memberships where member_id=p_member and group_id=(p_input->>'groupId')::uuid) then raise exception 'New support must go to your joined group'; end if;
  if not exists(select 1 from project100_support_groups where id=(p_input->>'groupId')::uuid and active) then raise exception 'This group is not accepting support'; end if;
  insert into project100_support_contributions(id,member_id,group_id,amount_minor,currency,donor_name,payer_email,display_name,attribution,organisation,anonymous,idempotency_key,reference)
    values(v_id,p_member,(p_input->>'groupId')::uuid,(p_input->>'amountMinor')::bigint,p_input->>'currency',p_name,p_email,
      case when p_input->>'attribution'='organisation' then p_input->>'organisation' else p_name end,
      p_input->>'attribution',p_input->>'organisation',(p_input->>'anonymous')::boolean,(p_input->>'idempotencyKey')::uuid,'AFL-P100-'||v_id::text)
    returning * into v;
  return v;
end $$;

create function public.bind_project100_checkout(p_id uuid,p_checkout_id text)
returns void language plpgsql set search_path = public as $$
declare v_checkout text; begin
  if nullif(p_checkout_id,'') is null then raise exception 'Missing checkout identity'; end if;
  select checkout_id into v_checkout from project100_support_contributions where id=p_id for update;
  if not found then raise exception 'Contribution not found'; end if;
  if v_checkout is not null and v_checkout<>p_checkout_id then raise exception 'Contribution checkout is immutable'; end if;
  update project100_support_contributions set checkout_id=p_checkout_id where id=p_id;
end $$;
revoke all on function public.bind_project100_checkout(uuid,text) from public,anon,authenticated;
grant execute on function public.bind_project100_checkout(uuid,text) to service_role;

create function public.settle_project100_contribution(p_id uuid,p_event_id text,p_status text,p_charge_id text default null)
returns text language plpgsql set search_path = public as $$
declare v public.project100_support_contributions; v_group uuid; begin
  if p_status not in ('paid','needs_review') or nullif(p_event_id,'') is null then raise exception 'Invalid settlement evidence'; end if;
  select group_id into v_group from project100_support_contributions where id=p_id;
  if v_group is null then raise exception 'Contribution not found'; end if;
  perform 1 from project100_support_groups where id=v_group for update;
  select * into v from project100_support_contributions where id=p_id for update;
  if exists(select 1 from project100_support_events where event_id=p_event_id) then return v.status; end if;
  if p_status='paid' and nullif(p_charge_id,'') is null then raise exception 'Missing charge evidence'; end if;
  if v.charge_id is not null and p_charge_id is not null and v.charge_id<>p_charge_id then p_status:='needs_review'; end if;
  insert into project100_support_events(event_id,contribution_id,status,charge_id) values(p_event_id,p_id,p_status,p_charge_id);
  -- Review is terminal for automatic processing. Late/retried success never unfreezes it.
  if v.status='needs_review' then return v.status; end if;
  update project100_support_contributions set status=p_status,charge_id=coalesce(charge_id,p_charge_id),
    paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end where id=p_id;
  return p_status;
end $$;

create function public.record_project100_spending(p_actor uuid,p_input jsonb)
returns uuid language plpgsql set search_path = public as $$
declare v_id uuid; v_group uuid := (p_input->>'groupId')::uuid; v_currency text := p_input->>'currency'; v_amount bigint := (p_input->>'amountMinor')::bigint; v_available bigint; v_old public.project100_support_spending; begin
  perform 1 from project100_support_groups where id=v_group for update;
  select * into v_old from project100_support_spending where idempotency_key=(p_input->>'idempotencyKey')::uuid;
  if found then
    if v_old.created_by<>p_actor or v_old.group_id<>v_group or v_old.amount_minor<>v_amount or v_old.currency<>v_currency or v_old.description<>p_input->>'description' or v_old.evidence<>p_input->>'evidence' or v_old.project_id is distinct from (p_input->>'projectId')::uuid then raise exception 'Spending request already used'; end if;
    return v_old.id;
  end if;
  select coalesce((select sum(amount_minor) from project100_support_contributions where group_id=v_group and status='paid' and currency=v_currency),0)
    -coalesce((select sum(amount_minor) from project100_support_spending where group_id=v_group and currency=v_currency),0) into v_available;
  if v_amount<=0 or v_amount>v_available then raise exception 'Not enough confirmed support in this currency'; end if;
  insert into project100_support_spending(group_id,project_id,amount_minor,currency,description,evidence,created_by,idempotency_key)
    values(v_group,(p_input->>'projectId')::uuid,v_amount,v_currency,p_input->>'description',p_input->>'evidence',p_actor,(p_input->>'idempotencyKey')::uuid) returning id into v_id;
  return v_id;
end $$;

create function public.project100_impact_snapshot(p_member uuid,p_group uuid default null,p_admin boolean default false)
returns jsonb language sql stable set search_path = public as $$
with raised as (select group_id,currency,sum(amount_minor) amount from project100_support_contributions where status='paid' group by group_id,currency),
spent as (select group_id,currency,sum(amount_minor) amount from project100_support_spending group by group_id,currency)
select jsonb_build_object(
 'groups',coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object(
   'raised',jsonb_build_object('NGN',coalesce((select amount from raised where group_id=g.id and currency='NGN'),0),'USD',coalesce((select amount from raised where group_id=g.id and currency='USD'),0)),
   'spent',jsonb_build_object('NGN',coalesce((select amount from spent where group_id=g.id and currency='NGN'),0),'USD',coalesce((select amount from spent where group_id=g.id and currency='USD'),0)),
   'members',(select count(*) from project100_support_memberships where group_id=g.id)) order by sort_order,name) from project100_support_groups g),'[]'::jsonb),
 'membership',(select jsonb_build_object('group_id',group_id,'residence_country',residence_country,'residence_state',residence_state) from project100_support_memberships where member_id=p_member),
 'projects',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc) from project100_support_projects p where group_id=p_group),'[]'::jsonb),
 'supporters',coalesce((select jsonb_agg(to_jsonb(c) order by paid_at desc) from (select id,group_id,case when anonymous then 'Anonymous supporter' else display_name end display_name,amount_minor,currency,paid_at from project100_support_contributions where group_id=p_group and status='paid' order by paid_at desc limit 100) c),'[]'::jsonb),
 'updates',coalesce((select jsonb_agg(to_jsonb(u) order by created_at desc) from (select id,group_id,author_id,author_name,caption,image_path,created_at from project100_support_updates where group_id=p_group order by created_at desc limit 100) u),'[]'::jsonb),
 'spending',coalesce((select jsonb_agg(to_jsonb(s) order by created_at desc) from (select id,group_id,project_id,amount_minor,currency,description,case when p_admin then evidence else null end evidence,created_at from project100_support_spending where group_id=p_group order by created_at desc limit 100) s),'[]'::jsonb),
 'contributions',coalesce((select jsonb_agg(to_jsonb(c) order by created_at desc) from (select id,group_id,amount_minor,currency,status,display_name,case when p_admin then donor_name else null end donor_name,case when p_admin then reference else null end reference,case when p_admin then charge_id else null end charge_id,created_at,paid_at from project100_support_contributions where (p_admin and group_id=p_group) or (not p_admin and member_id=p_member) order by created_at desc limit 100) c),'[]'::jsonb),
 'totals',jsonb_build_object('raised',jsonb_build_object('NGN',coalesce((select sum(amount) from raised where currency='NGN'),0),'USD',coalesce((select sum(amount) from raised where currency='USD'),0)),
 'spent',jsonb_build_object('NGN',coalesce((select sum(amount) from spent where currency='NGN'),0),'USD',coalesce((select sum(amount) from spent where currency='USD'),0)))
);
$$;

create function public.configure_project100_countries(p_countries text[])
returns void language plpgsql set search_path = public as $$
declare v_country text; v_order integer := 0; begin
  if cardinality(p_countries)<>6 or (select count(distinct c) from unnest(p_countries) c)<>6 or 'Nigeria'=any(p_countries) then raise exception 'Choose six distinct country destinations'; end if;
  perform pg_advisory_xact_lock(hashtextextended('project100-country-configuration',0));
  foreach v_country in array p_countries loop
    v_order := v_order+1;
    insert into project100_support_groups(slug,name,country,sort_order)
    values('country-'||regexp_replace(lower(v_country),'[^a-z0-9]+','-','g'),case when v_country='Democratic Republic of the Congo' then 'DR Congo' else v_country end||' impact group',v_country,v_order)
    on conflict(country,(coalesce(state,''))) do update set active=true,sort_order=excluded.sort_order;
  end loop;
  update project100_support_groups set active=false where country<>'Nigeria' and not(country=any(p_countries));
end $$;
revoke all on function public.configure_project100_countries(text[]) from public,anon,authenticated;
grant execute on function public.configure_project100_countries(text[]) to service_role;

revoke all on function public.reserve_project100_contribution(uuid,jsonb,text,text,boolean) from public,anon,authenticated;
revoke all on function public.settle_project100_contribution(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.record_project100_spending(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.project100_impact_snapshot(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_project100_contribution(uuid,jsonb,text,text,boolean) to service_role;
grant execute on function public.settle_project100_contribution(uuid,text,text,text) to service_role;
grant execute on function public.record_project100_spending(uuid,jsonb) to service_role;
grant execute on function public.project100_impact_snapshot(uuid,uuid,boolean) to service_role;

-- Private images are served with short-lived signed URLs after member authentication.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
    values('project100-images','project100-images',false,5242880,array['image/webp']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/webp'];
  end if;
end $$;
