-- Contact proof is deliberately ordered immediately after
-- 20261103120000_team_commission_attribution.sql. The Supabase CLI generated
-- a wall-clock timestamp earlier than that future-dated migration on this
-- checkout, so 120001 is the smallest deterministic timestamp that preserves
-- the intended dependency order without changing the existing migration.
--
-- A call/WhatsApp click is only the beginning of an attempt. Commission
-- attribution requires a fresh OTP completed by the awardee's own identity.
-- This migration is additive; it does not edit the previous migration.

begin;

-- ---------------------------------------------------------------------------
-- 1. Append-only contact attempts and one-time challenge records.
-- ---------------------------------------------------------------------------

create table if not exists public.team_contact_attempts (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  request_id uuid not null,
  team_id uuid not null references public.team_teams(id) on delete cascade,
  awardee_id uuid not null,
  assignment_id uuid not null,
  agent_id uuid not null,
  actor_user_id uuid not null,
  agent_user_id uuid not null,
  channel text not null check (channel in ('call', 'whatsapp')),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  recipient_public_awardee_id uuid,
  recipient_profile_id uuid,
  recipient_email text not null,
  rep_name text not null,
  status text not null default 'initiated'
    check (status in ('initiated', 'confirmed', 'declined')),
  initiated_at timestamptz not null default clock_timestamp(),
  confirmed_at timestamptz,
  confirmed_by uuid,
  declined_at timestamptz,
  declined_by uuid,
  proof_method text,
  created_at timestamptz not null default clock_timestamp(),
  constraint team_contact_attempts_decision_exclusive check (
    not (confirmed_at is not null and declined_at is not null)
  ),
  constraint team_contact_attempts_decision_after_start check (
    (confirmed_at is null or confirmed_at >= initiated_at)
    and (declined_at is null or declined_at >= initiated_at)
  ),
  constraint team_contact_attempts_terminal_shape check (
    (status = 'initiated' and confirmed_at is null and declined_at is null)
    or (status = 'confirmed' and confirmed_at is not null and declined_at is null)
    or (status = 'declined' and declined_at is not null and confirmed_at is null)
  ),
  constraint team_contact_attempts_proof_shape check (
    (status = 'initiated' and proof_method is null)
    or (status in ('confirmed', 'declined') and proof_method = 'email_otp')
  )
);

create unique index if not exists team_contact_attempts_request_uidx
  on public.team_contact_attempts (team_id, request_id);
create index if not exists team_contact_attempts_token_idx
  on public.team_contact_attempts (token);
create index if not exists team_contact_attempts_assignment_idx
  on public.team_contact_attempts (assignment_id, status, initiated_at desc);
create index if not exists team_contact_attempts_identity_idx
  on public.team_contact_attempts (team_id, awardee_id, agent_id, initiated_at desc);

create table if not exists public.team_contact_challenges (
  id uuid primary key,
  attempt_id uuid not null,
  user_id uuid not null,
  code_hash text not null check (code_hash ~ '^[0-9a-fA-F]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  -- The challenge is not usable until the API has explicitly confirmed that
  -- its transactional email was accepted for delivery. A prepared-but-never-
  -- sent or SMTP-uncertain code must not qualify by itself.
  server_ready_at timestamptz,
  verify_attempts smallint not null default 0
    check (verify_attempts between 0 and 5),
  invalidated_at timestamptz,
  verified_at timestamptz,
  constraint team_contact_challenges_terminal_exclusive check (
    not (invalidated_at is not null and verified_at is not null)
  )
);

alter table public.team_contact_challenges
  add column if not exists server_ready_at timestamptz;

create index if not exists team_contact_challenges_attempt_idx
  on public.team_contact_challenges (attempt_id, created_at desc);
create index if not exists team_contact_challenges_user_idx
  on public.team_contact_challenges (attempt_id, user_id, created_at desc);

alter table public.team_contact_attempts enable row level security;
alter table public.team_contact_challenges enable row level security;

-- Neither the team members nor the service-role API may write these tables
-- directly. The owner of the SECURITY DEFINER RPCs is the only writer; this
-- prevents a copied client from manufacturing a qualifying proof row.
revoke all on table public.team_contact_attempts from public, anon, authenticated, service_role;
revoke all on table public.team_contact_challenges from public, anon, authenticated, service_role;

create or replace function public.team_seal_contact_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.initiated_at := clock_timestamp();
    new.created_at := clock_timestamp();
    return new;
  end if;

  -- The actor, assignment, recipient snapshot, token and initiation clock can
  -- never be rewritten. Only the decision fields may move from initiated to a
  -- terminal state, and the RPC enforces that one-way transition.
  new.id := old.id;
  new.token := old.token;
  new.request_id := old.request_id;
  new.team_id := old.team_id;
  new.awardee_id := old.awardee_id;
  new.assignment_id := old.assignment_id;
  new.agent_id := old.agent_id;
  new.actor_user_id := old.actor_user_id;
  new.agent_user_id := old.agent_user_id;
  new.channel := old.channel;
  new.phone := old.phone;
  new.recipient_public_awardee_id := old.recipient_public_awardee_id;
  new.recipient_profile_id := old.recipient_profile_id;
  new.recipient_email := old.recipient_email;
  new.rep_name := old.rep_name;
  new.initiated_at := old.initiated_at;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists team_seal_contact_attempt on public.team_contact_attempts;
create trigger team_seal_contact_attempt
  before insert or update on public.team_contact_attempts
  for each row execute function public.team_seal_contact_attempt();

create or replace function public.team_seal_contact_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
    new.expires_at := new.created_at + interval '10 minutes';
    return new;
  end if;

  new.id := old.id;
  new.attempt_id := old.attempt_id;
  new.user_id := old.user_id;
  new.code_hash := old.code_hash;
  new.created_at := old.created_at;
  new.expires_at := old.expires_at;
  return new;
end;
$$;

drop trigger if exists team_seal_contact_challenge on public.team_contact_challenges;
create trigger team_seal_contact_challenge
  before insert or update on public.team_contact_challenges
  for each row execute function public.team_seal_contact_challenge();

revoke all on function public.team_seal_contact_attempt() from public, anon, authenticated, service_role;
revoke all on function public.team_seal_contact_challenge() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Private guards shared by the service-only RPCs.
-- ---------------------------------------------------------------------------

create or replace function public.team_contact_source_is_unpaid(
  p_team_id uuid,
  p_awardee_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_awardees ta
    where ta.id = p_awardee_id
      and ta.team_id = p_team_id
      and ta.is_active
      and ta.payment_status = 'unpaid'
      and not exists (
        select 1
        from public.team_awardees sibling
        where sibling.team_id = ta.team_id
          and sibling.id <> ta.id
          and sibling.is_active
          and (
            (ta.public_awardee_id is not null and sibling.public_awardee_id = ta.public_awardee_id)
            or (ta.profile_id is not null and sibling.profile_id = ta.profile_id)
          )
          and sibling.payment_status <> 'unpaid'
      )
      and not exists (
        select 1
        from public.award_orders o
        where o.award_payment_status = 'paid'
          and (
            (ta.public_awardee_id is not null and o.awardee_id = ta.public_awardee_id)
            or (ta.profile_id is not null and o.profile_id = ta.profile_id)
          )
      )
  );
$$;

create or replace function public.team_contact_attempt_for_recipient(
  p_token uuid,
  p_user_id uuid
)
returns public.team_contact_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.team_contact_attempts%rowtype;
  v_email text;
begin
  if p_token is null or p_user_id is null then
    raise exception using errcode = '42501',
      message = 'contact confirmation context unavailable';
  end if;

  select * into v_attempt
  from public.team_contact_attempts
  where token = p_token
  for update;
  if not found then
    raise exception using errcode = '42501',
      message = 'contact confirmation context unavailable';
  end if;

  -- A rep can never confirm their own outbound attempt. This check is
  -- intentionally independent of the recipient's profile/email branch.
  if p_user_id = v_attempt.actor_user_id then
    raise exception using errcode = '42501',
      message = 'contact confirmation context unavailable';
  end if;

  select lower(nullif(btrim(u.email), '')) into v_email
  from auth.users u
  where u.id = p_user_id;
  if not found or v_email is null then
    raise exception using errcode = '42501',
      message = 'contact confirmation context unavailable';
  end if;

  if v_attempt.recipient_profile_id is not null then
    if p_user_id <> v_attempt.recipient_profile_id
       or lower(btrim(v_attempt.recipient_email)) is distinct from v_email then
      raise exception using errcode = '42501',
        message = 'contact confirmation context unavailable';
    end if;
  else
    if lower(btrim(v_attempt.recipient_email)) is distinct from v_email then
      raise exception using errcode = '42501',
        message = 'contact confirmation context unavailable';
    end if;
  end if;

  return v_attempt;
end;
$$;

revoke all on function public.team_contact_source_is_unpaid(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.team_contact_attempt_for_recipient(uuid, uuid)
  from public, anon, authenticated, service_role;

-- Match team-platform/lib/phone.ts: accept Nigerian local forms, 234 forms,
-- international E.164 forms and strict 8-15 digit international numbers, then
-- store only the normalized E.164 value in the immutable attempt snapshot.
create or replace function public.team_contact_normalize_phone(
  p_phone text,
  p_country text
)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_local text;
  v_is_nigeria boolean;
begin
  v_digits := regexp_replace(coalesce(btrim(p_phone), ''), '[^0-9+]', '', 'g');
  if left(v_digits, 2) = '00' then
    v_digits := substr(v_digits, 3);
  elsif left(v_digits, 1) = '+' then
    v_digits := substr(v_digits, 2);
  end if;
  v_digits := regexp_replace(v_digits, '[^0-9]', '', 'g');
  if v_digits = '' then
    return null;
  end if;

  -- The application helper defaults an omitted country to Nigeria; preserve
  -- that default for legacy rows whose country column is null.
  v_is_nigeria := lower(btrim(coalesce(nullif(btrim(p_country), ''), 'Nigeria'))) in ('nigeria', 'ng');
  if v_is_nigeria then
    if length(v_digits) = 11 and left(v_digits, 1) = '0' then
      v_local := substr(v_digits, 2);
      if v_local ~ '^[789][0-9]{9}$' then
        return '+234' || v_local;
      end if;
      return null;
    end if;
    if length(v_digits) = 10 then
      if v_digits ~ '^[789][0-9]{9}$' then
        return '+234' || v_digits;
      end if;
      return null;
    end if;
    if length(v_digits) = 13 and left(v_digits, 3) = '234' then
      v_local := substr(v_digits, 4);
      if v_local ~ '^[789][0-9]{9}$' then
        return '+234' || v_local;
      end if;
      return null;
    end if;
    if length(v_digits) between 11 and 15 then
      return '+' || v_digits;
    end if;
    return null;
  end if;

  if length(v_digits) between 8 and 15 then
    return '+' || v_digits;
  end if;
  return null;
end;
$$;

revoke all on function public.team_contact_normalize_phone(text, text)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Begin a server-owned call/WhatsApp attempt.
-- ---------------------------------------------------------------------------

create or replace function public.team_begin_contact_attempt(
  p_team_id uuid,
  p_actor uuid,
  p_awardee_id uuid,
  p_channel text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.team_contact_attempts%rowtype;
  v_awardee public.team_awardees%rowtype;
  v_assignment record;
  v_recipient_email text;
  v_recipient_profile_id uuid;
  v_phone text;
  v_existing public.team_contact_attempts%rowtype;
  v_actor_exists boolean;
begin
  if p_team_id is null or p_actor is null or p_awardee_id is null
     or p_request_id is null or p_channel not in ('call', 'whatsapp') then
    raise exception using errcode = '22023', message = 'contact attempt inputs are invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'team-contact-request:' || p_team_id::text || ':' || p_request_id::text, 0
  ));

  select exists(select 1 from auth.users where id = p_actor)
  into v_actor_exists;
  if not v_actor_exists then
    raise exception using errcode = '42501', message = 'contact attempt is not authorized';
  end if;

  select * into v_awardee
  from public.team_awardees
  where id = p_awardee_id and team_id = p_team_id
  for update;
  if not found or not public.team_contact_source_is_unpaid(p_team_id, p_awardee_id) then
    raise exception using errcode = '42501', message = 'contact attempt is not available';
  end if;

  -- The active assignment and membership are looked up by the server. The
  -- caller cannot nominate a rep, assignment, phone or timestamp.
  select a.id as assignment_id, a.assigned_at, a.ended_at,
    a.agent_id, m.user_id as agent_user_id, m.full_name as rep_name
  into v_assignment
  from public.team_assignments a
  join public.team_memberships m on m.id = a.agent_id
  where a.team_id = p_team_id
    and a.awardee_id = p_awardee_id
    and a.status = 'active'
    and m.team_id = p_team_id
    and m.user_id = p_actor
    and m.role = 'agent'
    and m.status = 'active'
  order by a.assigned_at desc, a.id desc
  limit 1
  for update of a;
  if not found then
    raise exception using errcode = '42501', message = 'contact attempt is not authorized';
  end if;

  v_phone := public.team_contact_normalize_phone(v_awardee.phone, v_awardee.country);
  if v_phone is null then
    raise exception using errcode = '22023', message = 'recipient phone is unavailable';
  end if;

  -- A linked GoTrue email is the identity that can actually complete this
  -- page. Profile/public projection emails are fallbacks only; otherwise a
  -- stale profile or awardee import email could lock the rightful recipient
  -- out of their own OTP.
  select coalesce(
    case
      when coalesce(p.id, target.profile_id, source.profile_id) is not null
        then coalesce(nullif(btrim(u.email), ''), nullif(btrim(p.email), ''))
      else coalesce(nullif(btrim(source.email), ''), nullif(btrim(target.email), ''))
    end
  ), coalesce(p.id, target.profile_id, source.profile_id)
  into v_recipient_email, v_recipient_profile_id
  from public.team_awardees target
  left join public.awardees source on source.id = target.public_awardee_id
  left join public.profiles p on p.id = coalesce(target.profile_id, source.profile_id)
  left join auth.users u on u.id = p.id
  where target.id = p_awardee_id;
  if v_recipient_email is null then
    raise exception using errcode = '22023', message = 'recipient email is unavailable';
  end if;

  if (v_recipient_profile_id is not null and v_recipient_profile_id = p_actor)
     or exists (
       select 1 from auth.users u
       where u.id = p_actor
         and lower(nullif(btrim(u.email), '')) = lower(v_recipient_email)
     ) then
    raise exception using errcode = '42501', message = 'contact attempt is not authorized';
  end if;

  select * into v_existing
  from public.team_contact_attempts
  where team_id = p_team_id and request_id = p_request_id
  for update;
  if found then
    if v_existing.awardee_id is distinct from p_awardee_id
       or v_existing.actor_user_id is distinct from p_actor
       or v_existing.channel is distinct from p_channel then
      raise exception using errcode = '22023',
        message = 'contact request id is already bound to another scope';
    end if;
    v_attempt := v_existing;
  else
    insert into public.team_contact_attempts (
      request_id, team_id, awardee_id, assignment_id, agent_id,
      actor_user_id, agent_user_id, channel, phone,
      recipient_public_awardee_id, recipient_profile_id, recipient_email,
      rep_name, initiated_at
    ) values (
      p_request_id, p_team_id, p_awardee_id, v_assignment.assignment_id,
      v_assignment.agent_id, p_actor, v_assignment.agent_user_id, p_channel,
      v_phone, v_awardee.public_awardee_id, v_recipient_profile_id,
      lower(v_recipient_email), v_assignment.rep_name, clock_timestamp()
    ) returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'id', v_attempt.id,
    'token', v_attempt.token,
    'channel', v_attempt.channel,
    'phone', v_attempt.phone,
    'rep_name', v_attempt.rep_name,
    'status', v_attempt.status,
    'initiated_at', v_attempt.initiated_at
  );
end;
$$;

revoke all on function public.team_begin_contact_attempt(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.team_begin_contact_attempt(uuid, uuid, uuid, text, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. Recipient context and email challenge lifecycle.
-- ---------------------------------------------------------------------------

create or replace function public.team_contact_confirmation_context(
  p_token uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.team_contact_attempts%rowtype;
  v_challenge public.team_contact_challenges%rowtype;
  v_has_active_challenge boolean := false;
begin
  v_attempt := public.team_contact_attempt_for_recipient(p_token, p_user_id);

  -- A recipient link is only live while the unpaid source and the original
  -- agent assignment still exist. Once payment wins the race (or the
  -- assignment ends), do not reveal an active challenge or permit a stale
  -- recipient page to proceed.
  if v_attempt.status = 'initiated'
     and (
       not public.team_contact_source_is_unpaid(v_attempt.team_id, v_attempt.awardee_id)
       or not exists (
         select 1
         from public.team_assignments a
         join public.team_memberships m on m.id = a.agent_id
         where a.id = v_attempt.assignment_id
           and a.team_id = v_attempt.team_id
           and a.awardee_id = v_attempt.awardee_id
           and a.agent_id = v_attempt.agent_id
           and a.status = 'active'
           and m.team_id = v_attempt.team_id
           and m.user_id = v_attempt.actor_user_id
           and m.status = 'active'
           and m.role = 'agent'
       )
     ) then
    return jsonb_build_object('ok', false, 'reason', 'contact_attempt_unavailable');
  end if;

  select * into v_challenge
  from public.team_contact_challenges
  where attempt_id = v_attempt.id
  order by created_at desc, id desc
  limit 1;
  if found and v_challenge.invalidated_at is null and v_challenge.verified_at is null
     and v_challenge.server_ready_at is not null
     and v_challenge.expires_at > clock_timestamp() then
    v_has_active_challenge := true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_attempt.id,
    'rep_name', v_attempt.rep_name,
    'channel', v_attempt.channel,
    'initiated_at', v_attempt.initiated_at,
    'status', v_attempt.status,
    'email', v_attempt.recipient_email,
    'challenge_id', case when v_has_active_challenge then v_challenge.id else null end,
    'expires_at', case when v_has_active_challenge then v_challenge.expires_at else null end,
    'remaining', case when v_has_active_challenge then 5 - v_challenge.verify_attempts else null end
  );
end;
$$;

revoke all on function public.team_contact_confirmation_context(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.team_contact_confirmation_context(uuid, uuid)
  to service_role;

create or replace function public.team_prepare_contact_challenge(
  p_token uuid,
  p_user_id uuid,
  p_challenge_id uuid,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.team_contact_attempts%rowtype;
  v_existing public.team_contact_challenges%rowtype;
  v_latest public.team_contact_challenges%rowtype;
  v_send_count integer;
  v_now timestamptz;
begin
  v_attempt := public.team_contact_attempt_for_recipient(p_token, p_user_id);
  perform pg_advisory_xact_lock(hashtextextended(
    'team-contact-recipient:' || p_user_id::text || ':' || lower(v_attempt.recipient_email),
    0
  ));
  if v_attempt.status <> 'initiated'
     or not public.team_contact_source_is_unpaid(v_attempt.team_id, v_attempt.awardee_id)
     or not exists (
       select 1
       from public.team_assignments a
       join public.team_memberships m on m.id = a.agent_id
       where a.id = v_attempt.assignment_id
         and a.team_id = v_attempt.team_id
         and a.awardee_id = v_attempt.awardee_id
         and a.agent_id = v_attempt.agent_id
         and a.status = 'active'
         and m.team_id = v_attempt.team_id
         and m.user_id = v_attempt.actor_user_id
         and m.status = 'active'
         and m.role = 'agent'
     ) then
    return jsonb_build_object('ok', false, 'reason', 'contact_attempt_unavailable');
  end if;

  if p_challenge_id is null or p_code_hash is null
     or lower(btrim(p_code_hash)) !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_challenge_input');
  end if;

  v_now := clock_timestamp();

  select * into v_existing
  from public.team_contact_challenges
  where id = p_challenge_id
  for update;
  if found then
    if v_existing.attempt_id <> v_attempt.id or v_existing.user_id <> p_user_id then
      raise exception using errcode = '42501', message = 'contact confirmation context unavailable';
    end if;
    if lower(v_existing.code_hash) <> lower(btrim(p_code_hash)) then
      return jsonb_build_object('ok', false, 'reason', 'challenge_id_reused');
    end if;
    if v_existing.invalidated_at is not null or v_existing.verified_at is not null then
      return jsonb_build_object('ok', false, 'reason', 'challenge_invalid');
    end if;
    if v_existing.expires_at <= v_now then
      update public.team_contact_challenges
      set invalidated_at = v_now
      where id = v_existing.id;
      return jsonb_build_object('ok', false, 'reason', 'challenge_expired');
    end if;
    return jsonb_build_object(
      'ok', true,
      'email', v_attempt.recipient_email,
      'challenge_id', v_existing.id,
      'expires_at', v_existing.expires_at
    );
  end if;

  select * into v_latest
  from public.team_contact_challenges
  where attempt_id = v_attempt.id and user_id = p_user_id
  order by created_at desc, id desc
  limit 1
  for update;
  if found and v_latest.created_at > v_now - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'reason', 'resend_cooldown');
  end if;

  select count(*)::integer into v_send_count
  from public.team_contact_challenges c
  join public.team_contact_attempts a on a.id = c.attempt_id
  where c.user_id = p_user_id
    and lower(a.recipient_email) = lower(v_attempt.recipient_email)
    and c.created_at >= v_now - interval '1 hour';
  if v_send_count >= 3 then
    return jsonb_build_object('ok', false, 'reason', 'challenge_send_limit');
  end if;

  -- A new challenge invalidates all earlier challenges. It is the only code
  -- that can ever verify this attempt, even if an earlier email arrives late.
  update public.team_contact_challenges
  set invalidated_at = v_now
  where attempt_id = v_attempt.id
    and user_id = p_user_id
    and invalidated_at is null
    and verified_at is null;

  insert into public.team_contact_challenges (
    id, attempt_id, user_id, code_hash, created_at, expires_at
  ) values (
    p_challenge_id, v_attempt.id, p_user_id, lower(btrim(p_code_hash)),
    v_now, v_now + interval '10 minutes'
  ) returning * into v_existing;

  return jsonb_build_object(
    'ok', true,
    'email', v_attempt.recipient_email,
    'challenge_id', v_existing.id,
    'expires_at', v_existing.expires_at
  );
end;
$$;

revoke all on function public.team_prepare_contact_challenge(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.team_prepare_contact_challenge(uuid, uuid, uuid, text)
  to service_role;

-- The API calls this only after the transactional email provider has accepted
-- the message. Keeping preparation and delivery activation separate means an
-- SMTP failure, timeout, or uncertain response cannot leave a usable code in
-- the database; the API must invalidate that prepared challenge instead.
create or replace function public.team_activate_contact_challenge(
  p_token uuid,
  p_user_id uuid,
  p_challenge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.team_contact_attempts%rowtype;
  v_challenge public.team_contact_challenges%rowtype;
  v_latest_id uuid;
  v_now timestamptz;
begin
  v_attempt := public.team_contact_attempt_for_recipient(p_token, p_user_id);
  if v_attempt.status <> 'initiated'
     or not public.team_contact_source_is_unpaid(v_attempt.team_id, v_attempt.awardee_id)
     or not exists (
       select 1
       from public.team_assignments a
       join public.team_memberships m on m.id = a.agent_id
       where a.id = v_attempt.assignment_id
         and a.team_id = v_attempt.team_id
         and a.awardee_id = v_attempt.awardee_id
         and a.agent_id = v_attempt.agent_id
         and a.status = 'active'
         and m.team_id = v_attempt.team_id
         and m.user_id = v_attempt.actor_user_id
         and m.status = 'active'
         and m.role = 'agent'
     ) then
    return jsonb_build_object('ok', false, 'reason', 'contact_attempt_unavailable');
  end if;

  if p_challenge_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_challenge_input');
  end if;

  select * into v_challenge
  from public.team_contact_challenges
  where id = p_challenge_id
  for update;
  if not found or v_challenge.attempt_id <> v_attempt.id or v_challenge.user_id <> p_user_id then
    raise exception using errcode = '42501', message = 'contact confirmation context unavailable';
  end if;

  select c.id into v_latest_id
  from public.team_contact_challenges c
  where c.attempt_id = v_attempt.id and c.user_id = p_user_id
  order by c.created_at desc, c.id desc
  limit 1;
  if v_latest_id <> v_challenge.id then
    return jsonb_build_object('ok', false, 'reason', 'stale_challenge');
  end if;

  if v_challenge.invalidated_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'challenge_invalidated');
  end if;
  if v_challenge.verified_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'challenge_already_used');
  end if;

  v_now := clock_timestamp();
  if v_challenge.expires_at <= v_now then
    update public.team_contact_challenges
    set invalidated_at = v_now
    where id = v_challenge.id;
    return jsonb_build_object('ok', false, 'reason', 'challenge_expired');
  end if;

  if v_challenge.server_ready_at is null then
    update public.team_contact_challenges
    set server_ready_at = v_now
    where id = v_challenge.id;
    v_challenge.server_ready_at := v_now;
  end if;

  return jsonb_build_object(
    'ok', true,
    'challenge_id', v_challenge.id,
    'ready_at', v_challenge.server_ready_at
  );
end;
$$;

revoke all on function public.team_activate_contact_challenge(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.team_activate_contact_challenge(uuid, uuid, uuid)
  to service_role;

create or replace function public.team_invalidate_contact_challenge(
  p_token uuid,
  p_user_id uuid,
  p_challenge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.team_contact_attempts%rowtype;
  v_challenge public.team_contact_challenges%rowtype;
begin
  v_attempt := public.team_contact_attempt_for_recipient(p_token, p_user_id);

  select * into v_challenge
  from public.team_contact_challenges
  where id = p_challenge_id
  for update;
  if not found or v_challenge.attempt_id <> v_attempt.id or v_challenge.user_id <> p_user_id then
    raise exception using errcode = '42501', message = 'contact confirmation context unavailable';
  end if;

  if v_challenge.verified_at is null and v_challenge.invalidated_at is null then
    update public.team_contact_challenges
    set invalidated_at = clock_timestamp()
    where id = v_challenge.id;
  end if;

  return jsonb_build_object('ok', true, 'challenge_id', v_challenge.id);
end;
$$;

revoke all on function public.team_invalidate_contact_challenge(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.team_invalidate_contact_challenge(uuid, uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. Fresh recipient OTP decision; wrong codes persist their attempt count.
-- ---------------------------------------------------------------------------

create or replace function public.team_confirm_contact_attempt(
  p_token uuid,
  p_user_id uuid,
  p_challenge_id uuid,
  p_code_hash text,
  p_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.team_contact_attempts%rowtype;
  v_challenge public.team_contact_challenges%rowtype;
  v_latest_id uuid;
  v_now timestamptz;
  v_matches boolean;
begin
  v_attempt := public.team_contact_attempt_for_recipient(p_token, p_user_id);

  -- A valid repeat is idempotent and never consumes a new challenge or adds a
  -- second credit. Require the same already-verified challenge/hash so a
  -- terminal token cannot be used as a generic success oracle.
  if v_attempt.status <> 'initiated' then
    select * into v_challenge
    from public.team_contact_challenges
    where id = p_challenge_id
      and attempt_id = v_attempt.id
      and user_id = p_user_id
    for update;
    if not found
       or v_challenge.verified_at is null
       or p_code_hash is null
       or lower(btrim(p_code_hash)) !~ '^[0-9a-f]{64}$'
       or lower(btrim(p_code_hash)) <> lower(v_challenge.code_hash) then
      return jsonb_build_object('ok', false, 'reason', 'decision_already_recorded');
    end if;
    return jsonb_build_object(
      'ok', true,
      'id', v_attempt.id,
      'status', v_attempt.status,
      'confirmed_at', v_attempt.confirmed_at,
      'declined_at', v_attempt.declined_at,
      'proof_method', v_attempt.proof_method
    );
  end if;

  if p_confirmed is null or p_code_hash is null
     or lower(btrim(p_code_hash)) !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code', 'remaining', 5);
  end if;

  -- Both the attempt and its assignment must still be unpaid/live immediately
  -- before a decision. This closes the payment/confirmation race in favour of
  -- payment verification and prevents post-payment retroactive credit.
  if not public.team_contact_source_is_unpaid(v_attempt.team_id, v_attempt.awardee_id)
     or not exists (
       select 1
       from public.team_assignments a
       join public.team_memberships m on m.id = a.agent_id
       where a.id = v_attempt.assignment_id
         and a.team_id = v_attempt.team_id
         and a.awardee_id = v_attempt.awardee_id
         and a.agent_id = v_attempt.agent_id
         and a.status = 'active'
         and m.team_id = v_attempt.team_id
         and m.user_id = v_attempt.actor_user_id
         and m.status = 'active'
         and m.role = 'agent'
     ) then
    raise exception using errcode = '42501', message = 'contact attempt is no longer available';
  end if;

  select * into v_challenge
  from public.team_contact_challenges
  where id = p_challenge_id
  for update;
  if not found or v_challenge.attempt_id <> v_attempt.id or v_challenge.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'invalid_challenge');
  end if;

  select c.id into v_latest_id
  from public.team_contact_challenges c
  where c.attempt_id = v_attempt.id and c.user_id = p_user_id
  order by c.created_at desc, c.id desc
  limit 1;
  if v_latest_id <> v_challenge.id then
    return jsonb_build_object('ok', false, 'reason', 'stale_challenge');
  end if;

  v_now := clock_timestamp();
  if v_challenge.invalidated_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'challenge_invalidated');
  end if;
  if v_challenge.verified_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'challenge_already_used');
  end if;
  if v_challenge.expires_at <= v_now then
    update public.team_contact_challenges
    set invalidated_at = v_now
    where id = v_challenge.id;
    return jsonb_build_object('ok', false, 'reason', 'challenge_expired');
  end if;
  if v_challenge.server_ready_at is null then
    return jsonb_build_object('ok', false, 'reason', 'challenge_not_ready');
  end if;
  if v_challenge.verify_attempts >= 5 then
    update public.team_contact_challenges
    set invalidated_at = v_now
    where id = v_challenge.id;
    return jsonb_build_object('ok', false, 'reason', 'challenge_locked', 'remaining', 0);
  end if;

  v_matches := lower(btrim(p_code_hash)) = lower(v_challenge.code_hash);
  if not v_matches then
    update public.team_contact_challenges
    set verify_attempts = verify_attempts + 1,
        invalidated_at = case when verify_attempts + 1 >= 5 then v_now else invalidated_at end
    where id = v_challenge.id;
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid_code',
      'remaining', greatest(0, 4 - v_challenge.verify_attempts)
    );
  end if;

  update public.team_contact_challenges
  set verified_at = v_now
  where id = v_challenge.id;

  if p_confirmed then
    update public.team_contact_attempts
    set status = 'confirmed',
        confirmed_at = v_now,
        confirmed_by = p_user_id,
        proof_method = 'email_otp'
    where id = v_attempt.id and status = 'initiated';
    return jsonb_build_object(
      'ok', true,
      'id', v_attempt.id,
      'status', 'confirmed',
      'confirmed_at', v_now,
      'proof_method', 'email_otp'
    );
  end if;

  update public.team_contact_attempts
  set status = 'declined',
      declined_at = v_now,
      declined_by = p_user_id,
      proof_method = 'email_otp'
  where id = v_attempt.id and status = 'initiated';
  return jsonb_build_object(
    'ok', true,
    'id', v_attempt.id,
    'status', 'declined',
    'declined_at', v_now,
    'proof_method', 'email_otp'
  );
end;
$$;

revoke all on function public.team_confirm_contact_attempt(uuid, uuid, uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.team_confirm_contact_attempt(uuid, uuid, uuid, text, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- 6. Canonical attribution: recipient-confirmed calls/WhatsApp plus the
-- existing provider-accepted email branch. Manual notes/clicks alone remain
-- intentionally ineligible.
-- ---------------------------------------------------------------------------

create or replace function public.team_qualifying_contacts(
  p_assignment_id uuid,
  p_paid_at timestamptz
)
returns table (
  id uuid,
  kind text,
  channel text,
  team_id uuid,
  awardee_id uuid,
  agent_id uuid,
  assignment_id uuid,
  contacted_at timestamptz,
  recorded_at timestamptz,
  provider_verified boolean,
  source_id uuid,
  evidence jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with assignment_row as (
    select a.id, a.team_id, a.awardee_id, a.agent_id,
      a.assigned_at, a.ended_at, m.user_id as agent_user_id,
      ta.email as awardee_email
    from public.team_assignments a
    join public.team_memberships m on m.id = a.agent_id
    join public.team_awardees ta on ta.id = a.awardee_id
    where a.id = p_assignment_id
      and m.team_id = a.team_id
  )
  select
    c.id,
    'awardee_confirmed_contact'::text as kind,
    c.channel,
    a.team_id,
    a.awardee_id,
    a.agent_id,
    a.id as assignment_id,
    c.initiated_at as contacted_at,
    c.confirmed_at as recorded_at,
    false as provider_verified,
    c.id as source_id,
    jsonb_build_object(
      'id', c.id,
      'attemptId', c.id,
      'kind', 'awardee_confirmed_contact',
      'channel', c.channel,
      'providerVerified', false,
      'recipientVerifiedBy', 'email_otp',
      'confirmedBy', c.confirmed_by,
      'initiatedAt', c.initiated_at,
      'confirmedAt', c.confirmed_at
    ) as evidence
  from assignment_row a
  join public.team_contact_attempts c
    on c.team_id = a.team_id
   and c.awardee_id = a.awardee_id
   and c.assignment_id = a.id
   and c.agent_id = a.agent_id
   and c.agent_user_id = a.agent_user_id
  where p_paid_at is not null
    and c.status = 'confirmed'
    and c.initiated_at >= a.assigned_at
    and c.confirmed_at >= a.assigned_at
    and (a.ended_at is null or c.initiated_at < a.ended_at)
    and (a.ended_at is null or c.confirmed_at < a.ended_at)
    and c.initiated_at < p_paid_at
    and c.confirmed_at < p_paid_at

  union all

  select
    f.id,
    'provider_email_sent'::text as kind,
    f.channel,
    a.team_id,
    a.awardee_id,
    a.agent_id,
    a.id as assignment_id,
    f.contacted_at,
    f.recorded_at,
    true as provider_verified,
    l.id as source_id,
    jsonb_build_object(
      'id', f.id,
      'kind', 'provider_email_sent',
      'channel', 'email',
      'contactedAt', f.contacted_at,
      'recordedAt', f.recorded_at,
      'providerVerified', true,
      'providerMessageId', l.provider_message_id,
      'providerSentAt', l.sent_at,
      'recipient', l.to_email
    ) as evidence
  from assignment_row a
  join public.team_followups f
    on f.team_id = a.team_id
   and f.awardee_id = a.awardee_id
   and f.agent_id = a.agent_id
   and (f.assignment_id = a.id or f.assignment_id is null)
   and f.contacted_at >= a.assigned_at
   and (a.ended_at is null or f.contacted_at < a.ended_at)
  join public.team_email_logs l
    on l.id = f.email_log_id
   and l.team_id = a.team_id
   and l.awardee_id = a.awardee_id
   and l.agent_id = a.agent_id
  where p_paid_at is not null
    and f.channel = 'email'
    and f.outcome = 'email_sent'
    and f.contacted_at < p_paid_at
    and f.recorded_at < p_paid_at
    and l.status = 'sent'
    and nullif(btrim(l.provider_message_id), '') is not null
    and l.sent_at is not null
    and l.sent_at <= f.contacted_at
    and l.attempted_at < p_paid_at
    and l.sent_at < p_paid_at
    and l.created_at < p_paid_at
    and lower(btrim(l.to_email)) = lower(btrim(a.awardee_email));
$$;

revoke all on function public.team_qualifying_contacts(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.team_qualifying_contacts(uuid, timestamptz)
  to service_role;

comment on function public.team_qualifying_contacts(uuid, timestamptz) is
  'Returns recipient-OTP-confirmed call/WhatsApp proof or the existing provider-accepted email proof, strictly before payment and within the assignment interval. Manual notes/clicks alone never qualify.';
comment on function public.team_qualifying_contact(uuid, timestamptz) is
  'Returns recipient-OTP-confirmed call/WhatsApp proof or the existing provider-accepted email proof for one assignment, strictly before payment and within the assignment interval. Manual notes/clicks alone never qualify.';

-- Re-run the existing idempotent all-history reconciler after replacing the
-- qualifying-contact branch. This immediately removes any legacy
-- staff-recorded call/WhatsApp earnings that no longer satisfy the recipient
-- OTP policy, releases their active assignments, preserves immutable ledger
-- history/reversals, and suppresses notifications through the helper's
-- reconciliation marker. It is safe to run again on every migration retry.
select public.team_reconcile_all_paid_attributions();

notify pgrst, 'reload schema';

commit;
