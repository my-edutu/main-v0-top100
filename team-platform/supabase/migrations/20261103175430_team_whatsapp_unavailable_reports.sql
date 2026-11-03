begin;

-- A rep report is routing context only. It never creates a follow-up,
-- contact attempt/confirmation, payment, assignment change or ledger entry.
create or replace function public.team_set_whatsapp_unavailable(
  p_team_id uuid, p_actor uuid, p_awardee_id uuid,
  p_expected_phone text, p_unavailable boolean
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_awardee public.team_awardees%rowtype;
  v_member public.team_memberships%rowtype;
  v_assignment public.team_assignments%rowtype;
  v_phone text;
  v_report jsonb;
begin
  if p_team_id is null or p_actor is null or p_awardee_id is null
     or p_expected_phone is null or p_unavailable is null then
    raise exception using errcode = '22023', message = 'invalid WhatsApp report inputs';
  end if;
  -- Match reassignment's team-then-row lock order. Ownership must still be
  -- active when this report is saved, not only when the HTTP request began.
  perform pg_advisory_xact_lock(hashtextextended('team-assign:' || p_team_id::text, 0));
  select * into v_member from public.team_memberships
    where team_id = p_team_id and user_id = p_actor and status = 'active' and role = 'agent' for update;
  if not found then
    raise exception using errcode = '42501', message = 'active assigned rep required';
  end if;
  select * into v_awardee from public.team_awardees
    where id = p_awardee_id and team_id = p_team_id and is_active for update;
  if not found then
    raise exception using errcode = '42501', message = 'awardee unavailable';
  end if;
  select * into v_assignment from public.team_assignments
    where team_id = p_team_id and awardee_id = p_awardee_id
      and agent_id = v_member.id and status = 'active' for update;
  if not found then
    raise exception using errcode = '42501', message = 'active assigned rep required';
  end if;
  v_phone := public.team_contact_normalize_phone(v_awardee.phone, v_awardee.country);
  if v_phone is null or v_phone is distinct from p_expected_phone then
    raise exception using errcode = '22023', message = 'phone number changed or is unavailable';
  end if;
  if jsonb_typeof(coalesce(v_awardee.metadata, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'awardee metadata needs review';
  end if;
  if p_unavailable then
    v_report := v_awardee.metadata->'whatsapp_unavailable_report';
    if v_report->>'phone' = v_phone and v_report->>'source' = 'rep_reported' then
      begin
        if jsonb_typeof(v_report->'reported_at') = 'string'
           and jsonb_typeof(v_report->'reported_by') = 'string'
           and v_report->>'reported_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
          perform (v_report->>'reported_at')::timestamptz;
          perform (v_report->>'reported_by')::uuid;
          return jsonb_build_object('report', v_report);
        end if;
      exception when data_exception then
        null; -- Repair malformed old metadata with a fresh, server-owned report.
      end;
    end if;
    v_report := jsonb_build_object('phone', v_phone, 'source', 'rep_reported',
      'reported_at', clock_timestamp(), 'reported_by', v_member.id);
    update public.team_awardees set metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('whatsapp_unavailable_report', v_report) where id = p_awardee_id;
  else
    if not (coalesce(v_awardee.metadata, '{}'::jsonb) ? 'whatsapp_unavailable_report') then
      return jsonb_build_object('report', null);
    end if;
    update public.team_awardees set metadata = coalesce(metadata, '{}'::jsonb)
      - 'whatsapp_unavailable_report' where id = p_awardee_id;
    v_report := null;
  end if;
  perform public.team_audit(p_team_id, p_actor, v_member.id,
    case when p_unavailable then 'awardee.whatsapp_unavailable_reported' else 'awardee.whatsapp_report_cleared' end,
    'awardee', p_awardee_id::text, jsonb_build_object('phone', v_phone, 'source', 'rep_reported'));
  return jsonb_build_object('report', v_report);
end;
$$;
revoke all on function public.team_set_whatsapp_unavailable(uuid,uuid,uuid,text,boolean)
  from public, anon, authenticated;
grant execute on function public.team_set_whatsapp_unavailable(uuid,uuid,uuid,text,boolean) to service_role;
notify pgrst, 'reload schema';
commit;
