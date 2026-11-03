-- Historical grace is intentionally ordered immediately after
-- 20261103120001_team_contact_confirmation_proof.sql. The CLI generated an
-- earlier wall-clock timestamp on this checkout, so 120002 is the smallest
-- deterministic timestamp that preserves the dependency order.
--
-- This is a closed, explicit allowlist. It restores only the fifteen
-- migration-created commission credits that were reversed by the first
-- recipient-proof reconciliation. It does not infer grace from dates,
-- amounts, notes, assignments, or any other global pattern.

begin;

create table if not exists public.team_legacy_grace_cases (
  reversal_id uuid primary key,
  earning_id uuid not null,
  team_id uuid not null,
  awardee_id uuid not null,
  agent_id uuid not null,
  payment_id uuid not null,
  assignment_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0),
  source_reversal_created_at timestamptz not null,
  source_reversal_source text not null,
  grace_adjustment_id uuid,
  assignment_restore_state text not null default 'pending'
    check (assignment_restore_state in ('pending', 'restored', 'conflict', 'missing', 'not_restored')),
  assignment_restored_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.team_legacy_grace_cases enable row level security;
revoke all on table public.team_legacy_grace_cases from public, anon, authenticated, service_role;
grant select on table public.team_legacy_grace_cases to service_role;
drop policy if exists team_legacy_grace_service_read on public.team_legacy_grace_cases;
create policy team_legacy_grace_service_read
  on public.team_legacy_grace_cases
  for select to service_role using (true);

create unique index if not exists team_legacy_grace_earning_uidx
  on public.team_legacy_grace_cases (earning_id);
create unique index if not exists team_legacy_grace_payment_uidx
  on public.team_legacy_grace_cases (team_id, payment_id);

-- The source reversal timestamp and source marker are part of the allowlist
-- identity. They prevent a reused UUID or unrelated future reversal from
-- being silently treated as historical grace.
insert into public.team_legacy_grace_cases (
  reversal_id, earning_id, team_id, awardee_id, agent_id, payment_id,
  assignment_id, amount_minor, source_reversal_created_at, source_reversal_source
) values
  ('2fda73d1-d1fa-4749-96af-a52ab29a1352', '08051a52-7a1f-4faf-af0d-85478790f518', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '4d712795-b189-4170-a12b-b11e47b29923', 'cbba5158-d3d9-4c14-9485-09a655de1ad6', '5c1d99db-bdb7-4fbb-bde7-926aa070f8e7', '62e9bc89-e55c-49c1-a483-5610bbc71411', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('e99a4b96-fd1b-4290-9872-e35a44c27b69', '2f6ea4c9-92e4-4289-a2d9-9ef659547fd0', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '015ea9c6-0f19-4dc8-a560-71ec05b5de44', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '41074992-0f6c-4c55-bf5c-abcd52e10dd4', 'b7098a32-d296-4362-8871-69f4f250de35', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('ede74612-92fd-4b67-85c7-f6f74b917bda', '47fb13d5-63a4-4d63-a386-2f931ff337fe', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'b3768c54-5a01-40fd-b387-b46a79bda82b', '8cdf0e09-5e96-41e9-9dc1-a943b0c24f4d', '47176298-75e9-4169-b8cf-a9bfc0fb6e2f', '83771864-c94d-42dc-a576-c76c9812dbd1', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('fc2f547e-e3be-45fd-b000-6fa289cec065', '73de9875-b7b6-41a6-8594-d79242769006', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '0e420455-fb89-4ce3-ac66-323dda9a4251', 'cbba5158-d3d9-4c14-9485-09a655de1ad6', 'c173e451-fd67-478b-9ed3-571d6dedefec', '653b4a01-9ee9-42a9-8587-4cd1f9f35431', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('a92761c5-03a6-4679-9d1d-49b120cfcc9c', '8754298c-dc7f-42a0-a2df-fb3691bc5192', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '2fdb3458-7c80-45b7-b9b7-e8873bb39aa5', '7ec36e79-fc8f-4c18-bbed-6e24c004141e', '0ddcd0fb-68be-4555-9380-1534c4f3a539', 'd0d7fbaf-db31-418c-b3a3-027134d554fd', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('27cc56fd-9710-4d89-8782-fe8806d0a909', 'a08c2bf7-e257-4af8-a7d6-d98d42eaca3d', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '45edb6da-61ea-4dff-832c-14fa2ce1ea63', 'f6858cd0-d495-4623-9583-acb7bfe8dee5', '5ce0dc11-40e1-4495-af7b-d5e11ddb69f7', 'aa01b752-6614-4aaf-a149-ee3cd3b5ea56', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('0d867209-c56b-4e2a-b886-df33d165cff0', 'a6e78688-4fb8-470a-9dae-3605e98b0016', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '2f779249-1800-4631-8a62-b0b7816668d6', '062439e9-d072-4d2e-9bc2-52c6bab23f7b', '92660e16-bb0c-430b-bffb-f9f72a8bfe65', '83c04897-8bee-4041-b2c7-ee88fff17fb8', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('fa399682-6090-4e5f-9b1d-8b01ce2ece2a', 'a8f6eae5-4c58-4721-97d9-86b82d30844a', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'da8d8f60-71d4-49fe-abab-4924efde2c7e', 'd44cd560-5893-4deb-9640-b67627fd6867', 'cfd650b1-8b51-4775-a299-540f98a416aa', '9f20bb94-b4a7-43ae-aa22-a6b3fc733a95', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('2b087382-82b4-4bb6-9e18-d06b38d08e11', 'b17fa80f-efa3-4277-8ee9-6f8ad1dd93e5', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '3ec02ea3-30a0-4031-92f4-4a2a4b486f35', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', 'd5df8291-077e-4043-b470-0901d5cf442a', 'da9bbe2d-7334-40a3-aeed-4e26cc1495c6', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('22a09f9a-df70-481e-bbef-9d949016f67f', 'de599ff6-444f-47ec-9582-ae322786eac6', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'd45dec81-4cc8-4963-8870-e637645f10be', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '56252fd7-90d9-44f5-8a24-4e3f71483671', 'c32d85bb-a2b1-47f0-935c-26d5ea40ba20', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('707e3de1-cc97-4dfd-ba51-7d99b7501947', 'defba61d-540e-4868-818d-a335aae90f44', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'dfc51a60-3882-4a85-a524-b75b547eaeed', 'd44cd560-5893-4deb-9640-b67627fd6867', '14818a6b-c41f-4eac-8fc1-d967fe6d5412', 'ba5eaf89-72f8-4fc9-bca3-c74c4f9ccc2b', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('0309ea34-ca29-4a61-9c2f-a6498dbb4f98', 'dfdf962f-4103-4df0-9985-354de205ec23', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'eacac91b-5196-4802-8585-722b05c96d46', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '7cb13262-637e-4e91-8b93-f525f685d25f', '205a4120-dd17-42ab-9809-0a2c475d287b', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('b372b197-e684-4a70-91a6-fa047a516cf9', 'e700c97f-9e2d-47ff-83a5-3393767a3e9d', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'cfaa2f2c-6bf3-42ec-a16c-9b5ff7876a43', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '7d922959-cde3-4a74-b209-341113ad4e5e', '8fa28c22-86ae-4212-921f-5a02c516f34a', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('ee9dfe33-154a-4a66-9526-99c08f0e2ac0', 'e82746f9-9250-458f-a447-6ccd04212ba3', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '7167d805-4e1a-4868-ac17-7718d3d20b6a', 'cbba5158-d3d9-4c14-9485-09a655de1ad6', 'dd2ca6e4-d924-4ee2-9b26-ee808d47a98f', '3295ec88-ddcb-43f4-a538-8e632e6f24ef', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation'),
  ('4236d7c9-2907-4456-9131-2e66bb5106be', 'fcbbd25a-17c2-4648-96b3-8b0942897e9e', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '1354a6bb-9f16-4a96-a2ea-32a2a9dc2750', '062439e9-d072-4d2e-9bc2-52c6bab23f7b', '07c17af8-ddf1-4707-a86f-0638bffd339b', 'cf3531ca-c99d-4c7c-863f-7793b3a8f9b9', 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation')
on conflict (reversal_id) do nothing;

-- Validate the immutable source lineage before adding any positive adjustment.
-- A missing or mismatched source row is never guessed into grace; the fixed
-- manifest must match the historical earning, reversal and assignment shape.
create or replace function public.team_restore_legacy_grace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.team_legacy_grace_cases%rowtype;
  v_earning public.team_commission_entries%rowtype;
  v_reversal public.team_commission_entries%rowtype;
  v_adjustment public.team_commission_entries%rowtype;
  v_refund public.team_commission_entries%rowtype;
  v_awardee public.team_awardees%rowtype;
  v_order public.award_orders%rowtype;
  v_payment_attempt public.award_payment_attempts%rowtype;
  v_assignment public.team_assignments%rowtype;
  v_source_any boolean;
  v_source_order_found boolean;
  v_source_identity_matches boolean;
  v_source_assignment_found boolean;
  v_source_paid boolean;
  v_adjustment_found boolean;
  v_grace_refund_exists boolean;
  v_refund_count integer;
  v_conflict boolean;
  v_adjustments integer := 0;
  v_restored integer := 0;
  v_conflicts integer := 0;
  v_missing integer := 0;
begin
  for v_case in
    select * from public.team_legacy_grace_cases
    order by reversal_id
  loop
    -- The allowlist is shipped to every environment, including a fresh local
    -- database that has none of the production source UUIDs. Such a database
    -- remains dormant. Any partial lineage is treated as corruption instead
    -- of being guessed into a positive balance.
    select exists (
      select 1 from public.team_commission_entries e
      where e.id in (v_case.earning_id, v_case.reversal_id)
    ) or exists (
      select 1 from public.team_awardees ta
      where ta.id = v_case.awardee_id
    ) or exists (
      select 1 from public.team_assignments a
      where a.id = v_case.assignment_id
    ) or exists (
      select 1 from public.award_orders o
      where o.id = v_case.payment_id
    ) into v_source_any;
    if not v_source_any then
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'pending', updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
      continue;
    end if;

    -- Lock the source payment before taking the payment advisory lock, case,
    -- and ledger locks. The source row is the first lock in both this helper
    -- and the refund wrapper, so a concurrent status transition cannot commit
    -- after the paid check but before the positive insert.
    select * into v_order
    from public.award_orders o
    where o.id = v_case.payment_id
    for update;
    v_source_order_found := found;
    if not v_source_order_found then
      raise exception using errcode = '22023',
        message = 'legacy grace payment source is missing from the explicit manifest';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(
      'team-payment:' || v_case.team_id::text || ':award_order:' || v_case.payment_id::text,
      0
    ));

    select * into v_awardee
    from public.team_awardees ta
    where ta.id = v_case.awardee_id
      and ta.team_id = v_case.team_id
    for update;
    if v_awardee.id is null then
      raise exception using errcode = '22023',
        message = 'legacy grace awardee is missing from the explicit manifest';
    end if;

    select c.* into v_case
    from public.team_legacy_grace_cases c
    where c.reversal_id = v_case.reversal_id
    for update;
    if not found then
      continue;
    end if;

    select * into v_earning
    from public.team_commission_entries e
    where e.id = v_case.earning_id;
    if not found
       or v_earning.entry_type <> 'earning'
       or v_earning.team_id <> v_case.team_id
       or v_earning.awardee_id <> v_case.awardee_id
       or v_earning.agent_id <> v_case.agent_id
       or v_earning.payment_type <> 'award_order'
       or v_earning.payment_id <> v_case.payment_id
       or v_earning.amount_minor <> v_case.amount_minor
       or v_earning.currency <> 'NGN' then
      raise exception using errcode = '22023',
        message = 'legacy grace earning does not match the explicit manifest';
    end if;

    select * into v_reversal
    from public.team_commission_entries r
    where r.id = v_case.reversal_id;
    if not found
       or v_reversal.entry_type <> 'reversal'
       or v_reversal.parent_commission_id <> v_earning.id
       or v_reversal.team_id <> v_case.team_id
       or v_reversal.awardee_id <> v_case.awardee_id
       or v_reversal.agent_id <> v_case.agent_id
       or v_reversal.payment_type <> 'award_order'
       or v_reversal.payment_id <> v_case.payment_id
       or v_reversal.amount_minor <> -v_case.amount_minor
       or v_reversal.rule_snapshot->>'reversal_source' <> v_case.source_reversal_source
       or v_reversal.created_at <> v_case.source_reversal_created_at then
      raise exception using errcode = '22023',
        message = 'legacy grace reversal does not match the explicit manifest';
    end if;

    v_source_identity_matches := (
      (
        v_order.awardee_id is not null
        and v_awardee.public_awardee_id is not null
        and v_order.awardee_id = v_awardee.public_awardee_id
      )
      or (
        v_order.profile_id is not null
        and v_awardee.profile_id is not null
        and v_order.profile_id = v_awardee.profile_id
        and (v_order.awardee_id is null or v_awardee.public_awardee_id is null)
      )
    );
    if not v_source_identity_matches then
      raise exception using errcode = '22023',
        message = 'legacy grace payment source identity does not match the explicit manifest';
    end if;
    v_source_paid := v_order.award_payment_status = 'paid'
      and v_awardee.payment_status <> 'refunded';
    if v_source_paid and v_order.award_paid_attempt_id is not null then
      select * into v_payment_attempt
      from public.award_payment_attempts pa
      where pa.id = v_order.award_paid_attempt_id;
      v_source_paid := found
        and v_payment_attempt.order_id = v_order.id
        and lower(btrim(coalesce(v_payment_attempt.provider, ''))) = 'bachs'
        and lower(btrim(coalesce(v_payment_attempt.charge_scope, ''))) = 'award_fee'
        and lower(btrim(coalesce(v_payment_attempt.status, ''))) = 'succeeded'
        and v_payment_attempt.confirmed_at is not null
        and v_payment_attempt.requested_amount_minor is not null
        and v_payment_attempt.captured_amount_minor is not null
        and v_payment_attempt.requested_amount_minor > 0
        and v_payment_attempt.captured_amount_minor > 0
        and v_payment_attempt.captured_amount_minor = v_payment_attempt.requested_amount_minor;
    end if;

    -- Assignment-management functions acquire this lock before locking an
    -- assignment row. Match that order, then keep conflict detection and
    -- activation within the same protected interval.
    perform pg_advisory_xact_lock(hashtextextended(
      'team-assign:' || v_case.team_id::text,
      0
    ));

    select * into v_assignment
    from public.team_assignments a
    where a.id = v_case.assignment_id
      and a.team_id = v_case.team_id
      and a.awardee_id = v_case.awardee_id
      and a.agent_id = v_case.agent_id
    for update;
    v_source_assignment_found := found;

    if not v_source_assignment_found then
      raise exception using errcode = '22023',
        message = 'legacy grace assignment is missing from the explicit manifest';
    end if;
    if v_case.grace_adjustment_id is null
       and (v_assignment.status <> 'removed'
         or v_assignment.ended_at is distinct from v_case.source_reversal_created_at
         or v_assignment.end_reason is distinct from 'Verified payment without qualifying pre-payment contact evidence') then
      raise exception using errcode = '22023',
        message = 'legacy grace assignment is not the historical released assignment';
    end if;

    if v_case.grace_adjustment_id is not null then
      select * into v_adjustment
      from public.team_commission_entries
      where id = v_case.grace_adjustment_id
        and entry_type = 'adjustment'
      for update;
    else
      select * into v_adjustment
      from public.team_commission_entries
      where parent_commission_id = v_reversal.id
        and entry_type = 'adjustment'
        and rule_snapshot->>'policy' = 'legacy_grace'
      order by created_at, id
      limit 1
      for update;
    end if;
    v_adjustment_found := found;

    if not v_source_paid then
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'not_restored', updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
      continue;
    end if;

    if not v_adjustment_found then
      insert into public.team_commission_entries (
        team_id, awardee_id, agent_id, rule_id, entry_type, parent_commission_id,
        payment_type, payment_id, payment_currency, amount_minor, currency,
        status, available_at, earned_at, reason, rule_snapshot, created_by
      ) values (
        v_earning.team_id, v_earning.awardee_id, v_earning.agent_id,
        v_earning.rule_id, 'adjustment', v_reversal.id,
        v_earning.payment_type, v_earning.payment_id, v_earning.payment_currency,
        v_case.amount_minor, v_earning.currency, v_earning.status,
        v_earning.available_at, clock_timestamp(),
        'Legacy grace: historical commission preserved pending affirmative review.',
        v_earning.rule_snapshot || jsonb_build_object(
          'policy', 'legacy_grace',
          'legacyGrace', true,
          'reviewStatus', 'grace_until_affirmative_review',
          'providerVerified', false,
          'sourceEarningId', v_earning.id,
          'sourceReversalId', v_reversal.id,
          'historicalAssignmentId', v_case.assignment_id,
          'contactProof', null
        ),
        null
      ) returning * into v_adjustment;
      v_adjustments := v_adjustments + 1;
    elsif v_adjustment.amount_minor <> v_case.amount_minor
       or v_adjustment.parent_commission_id <> v_reversal.id
       or v_adjustment.rule_snapshot->>'policy' <> 'legacy_grace' then
      raise exception using errcode = '22023',
        message = 'legacy grace adjustment does not match the explicit manifest';
    end if;

    select count(*)::integer into v_refund_count
    from public.team_commission_entries refund
    where refund.parent_commission_id = v_adjustment.id
      and refund.entry_type = 'adjustment';
    if v_refund_count > 1 then
      raise exception using errcode = '22023',
        message = 'legacy grace has duplicate refund adjustments';
    end if;
    v_grace_refund_exists := v_refund_count = 1;
    if v_grace_refund_exists then
      select * into v_refund
      from public.team_commission_entries refund
      where refund.parent_commission_id = v_adjustment.id
        and refund.entry_type = 'adjustment'
      for update;
      if v_refund.team_id is distinct from v_adjustment.team_id
         or v_refund.awardee_id is distinct from v_adjustment.awardee_id
         or v_refund.agent_id is distinct from v_adjustment.agent_id
         or v_refund.parent_commission_id is distinct from v_adjustment.id
         or v_refund.payment_type is distinct from v_adjustment.payment_type
         or v_refund.payment_id is distinct from v_adjustment.payment_id
         or v_refund.payment_currency is distinct from v_adjustment.payment_currency
         or v_refund.amount_minor is distinct from -v_adjustment.amount_minor
         or v_refund.currency is distinct from v_adjustment.currency
         or v_refund.rule_snapshot->>'policy' is distinct from 'legacy_grace_refund'
         or v_refund.rule_snapshot->>'sourceGraceAdjustmentId' is distinct from v_adjustment.id::text then
        raise exception using errcode = '22023',
          message = 'legacy grace refund adjustment does not match the source grace credit';
      end if;
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'not_restored', updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
      continue;
    end if;

    update public.team_legacy_grace_cases
    set grace_adjustment_id = v_adjustment.id,
        updated_at = clock_timestamp()
    where reversal_id = v_case.reversal_id;

    if not v_source_assignment_found then
      v_missing := v_missing + 1;
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'missing', updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
      continue;
    end if;

    select exists (
      select 1
      from public.team_assignments current_assignment
      join public.team_awardees current_awardee
        on current_awardee.id = current_assignment.awardee_id
      where current_assignment.team_id = v_case.team_id
        and current_assignment.status = 'active'
        and current_assignment.id <> v_case.assignment_id
        and (
          current_assignment.awardee_id = v_case.awardee_id
          or (
            v_awardee.public_awardee_id is not null
            and current_awardee.public_awardee_id = v_awardee.public_awardee_id
          )
          or (
            v_awardee.profile_id is not null
            and current_awardee.profile_id = v_awardee.profile_id
          )
        )
    ) into v_conflict;

    if v_conflict then
      v_conflicts := v_conflicts + 1;
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'conflict',
          assignment_restored_at = null,
          updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
    elsif v_assignment.status = 'removed'
      and v_assignment.end_reason = 'Verified payment without qualifying pre-payment contact evidence' then
      update public.team_assignments
      set status = 'active', ended_at = null, ended_by = null,
          end_reason = 'Legacy grace restored; affirmative review pending'
      where id = v_assignment.id and status = 'removed';
      v_restored := v_restored + 1;
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'restored',
          assignment_restored_at = coalesce(assignment_restored_at, clock_timestamp()),
          updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
    elsif v_assignment.status = 'active' then
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'restored',
          assignment_restored_at = coalesce(assignment_restored_at, clock_timestamp()),
          updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
    else
      update public.team_legacy_grace_cases
      set assignment_restore_state = 'not_restored', updated_at = clock_timestamp()
      where reversal_id = v_case.reversal_id;
    end if;
  end loop;

  return jsonb_build_object(
    'allowlisted_cases', (select count(*) from public.team_legacy_grace_cases),
    'adjustments_created', v_adjustments,
    'assignments_restored', v_restored,
    'assignment_conflicts', v_conflicts,
    'assignments_missing', v_missing
  );
end;
$$;

revoke all on function public.team_restore_legacy_grace() from public, anon, authenticated;
grant execute on function public.team_restore_legacy_grace() to service_role;

-- Preserve the historical owner as a separate policy attribution. This is not
-- a qualifying contact and deliberately has NULL contact timestamps. Grace
-- wins over any later strict evidence for the same allowlisted payment until
-- an affirmative owner review changes the policy state.
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

revoke all on public.team_payment_attributions from public, anon, authenticated;
grant select on public.team_payment_attributions to service_role;

-- The original earning is already reversed, so the existing refund helper's
-- "already_reversed" path would leave the restored positive adjustment alive.
-- Keep that helper as a private base and wrap it with a one-time grace
-- adjustment reversal. Source payment rows and withdrawal rows are untouched.
do $$
begin
  if to_regprocedure('public.team_reverse_verified_payment(uuid,uuid,text,uuid,text,uuid)') is not null
     and to_regprocedure('public.team_reverse_verified_payment_base(uuid,uuid,text,uuid,text,uuid)') is null then
    execute 'alter function public.team_reverse_verified_payment(uuid,uuid,text,uuid,text,uuid) rename to team_reverse_verified_payment_base';
  end if;
end;
$$;

revoke all on function public.team_reverse_verified_payment_base(uuid, uuid, text, uuid, text, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.team_reverse_verified_payment(
  p_team_id uuid,
  p_awardee_id uuid,
  p_payment_type text,
  p_payment_id uuid,
  p_reason text,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.team_legacy_grace_cases%rowtype;
  v_grace public.team_commission_entries%rowtype;
  v_refund public.team_commission_entries%rowtype;
  v_order public.award_orders%rowtype;
  v_refund_count integer;
begin
  -- Serialize the source payment transition with grace restoration even when
  -- a caller reaches the pre-wrapper refund helper during deployment.
  select o.* into v_order
  from public.award_orders o
  where o.id = p_payment_id
  for update;

  perform pg_advisory_xact_lock(hashtextextended(
    'team-payment:' || p_team_id::text || ':' || p_payment_type || ':' || p_payment_id::text,
    0
  ));

  update public.team_awardees
  set payment_status = 'refunded',
      payment_note = left(coalesce(p_reason, 'Payment reversed'), 500)
  where id = p_awardee_id and team_id = p_team_id;

  select c.* into v_case
  from public.team_legacy_grace_cases c
  where c.team_id = p_team_id
    and c.awardee_id = p_awardee_id
    and c.payment_id = p_payment_id
    and c.grace_adjustment_id is not null
  order by c.reversal_id
  limit 1
  for update;

  if found then
    select * into v_grace
    from public.team_commission_entries e
    where e.id = v_case.grace_adjustment_id
      and e.entry_type = 'adjustment'
      and e.amount_minor > 0
      and e.rule_snapshot->>'policy' = 'legacy_grace'
    for update;

    if found then
      select count(*)::integer into v_refund_count
      from public.team_commission_entries e
      where e.parent_commission_id = v_grace.id
        and e.entry_type = 'adjustment';
      if v_refund_count > 1 then
        raise exception using errcode = '22023',
          message = 'legacy grace has duplicate refund adjustments';
      end if;
      if v_refund_count = 1 then
        select * into v_refund
        from public.team_commission_entries e
        where e.parent_commission_id = v_grace.id
          and e.entry_type = 'adjustment'
        for update;
        if v_refund.team_id is distinct from v_grace.team_id
           or v_refund.awardee_id is distinct from v_grace.awardee_id
           or v_refund.agent_id is distinct from v_grace.agent_id
           or v_refund.parent_commission_id is distinct from v_grace.id
           or v_refund.payment_type is distinct from v_grace.payment_type
           or v_refund.payment_id is distinct from v_grace.payment_id
           or v_refund.payment_currency is distinct from v_grace.payment_currency
           or v_refund.amount_minor is distinct from -v_grace.amount_minor
           or v_refund.currency is distinct from v_grace.currency
           or v_refund.rule_snapshot->>'policy' is distinct from 'legacy_grace_refund'
           or v_refund.rule_snapshot->>'sourceGraceAdjustmentId' is distinct from v_grace.id::text then
          raise exception using errcode = '22023',
            message = 'legacy grace refund adjustment does not match the source grace credit';
        end if;
        return jsonb_build_object(
          'outcome', 'already_reversed',
          'reversal_id', v_refund.id,
          'grace_reversed', true
        );
      end if;

      insert into public.team_commission_entries (
        team_id, awardee_id, agent_id, rule_id, entry_type, parent_commission_id,
        payment_type, payment_id, payment_currency, amount_minor, currency,
        status, available_at, earned_at, reason, rule_snapshot, created_by
      ) values (
        v_grace.team_id, v_grace.awardee_id, v_grace.agent_id, v_grace.rule_id,
        'adjustment', v_grace.id, v_grace.payment_type, v_grace.payment_id,
        v_grace.payment_currency, -v_grace.amount_minor, v_grace.currency,
        v_grace.status, v_grace.available_at, clock_timestamp(),
        left(coalesce(p_reason, 'Legacy grace payment reversed'), 500),
        v_grace.rule_snapshot || jsonb_build_object(
          'policy', 'legacy_grace_refund',
          'legacyGraceRefund', true,
          'sourceGraceAdjustmentId', v_grace.id,
          'refundReason', left(coalesce(p_reason, 'Legacy grace payment reversed'), 500)
        ),
        p_actor
      ) returning * into v_refund;

      perform public.team_audit(
        p_team_id, p_actor, null, 'commission.legacy_grace_reversed',
        'commission_entry', v_refund.id::text,
        jsonb_build_object(
          'grace_adjustment_id', v_grace.id,
          'payment_id', p_payment_id,
          'amount_minor', v_refund.amount_minor,
          'reason', p_reason
        )
      );

      return jsonb_build_object(
        'outcome', 'reversed',
        'reversal_id', v_refund.id,
        'grace_reversed', true
      );
    end if;
  end if;

  return public.team_reverse_verified_payment_base(
    p_team_id, p_awardee_id, p_payment_type, p_payment_id, p_reason, p_actor
  );
end;
$$;

revoke all on function public.team_reverse_verified_payment(uuid, uuid, text, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.team_reverse_verified_payment(uuid, uuid, text, uuid, text, uuid)
  to service_role;

-- The pre-existing award-order trigger intentionally catches team-platform
-- errors so a payment webhook cannot be blocked. For these fifteen legacy
-- cases, a refund must not be allowed to commit while a positive grace
-- adjustment remains. This second, legacy-only trigger deliberately has no
-- exception handler: an error rolls back the source status update and lets the
-- webhook retry, without generating any new outreach.
create or replace function public.team_sync_legacy_grace_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
begin
  if new.award_payment_status <> 'refunded' then
    return new;
  end if;

  for v_case in
    select c.team_id, c.awardee_id
    from public.team_legacy_grace_cases c
    where c.payment_id = new.id
    order by c.team_id, c.reversal_id
  loop
    perform public.team_reverse_verified_payment(
      v_case.team_id, v_case.awardee_id, 'award_order', new.id,
      'Award payment was refunded.', null
    );
  end loop;
  return new;
end;
$$;

revoke all on function public.team_sync_legacy_grace_refund() from public, anon, authenticated, service_role;
drop trigger if exists team_sync_legacy_grace_refund on public.award_orders;
create trigger team_sync_legacy_grace_refund
  after update of award_payment_status on public.award_orders
  for each row execute function public.team_sync_legacy_grace_refund();

-- Restore exactly the manifest rows. The helper is idempotent and has no
-- expiry/clawback path: grace remains until affirmative review.
select public.team_restore_legacy_grace();

comment on table public.team_legacy_grace_cases is
  'Closed allowlist of fifteen historical commission reversals preserved under legacy grace pending affirmative review. It is not contact proof.';
comment on view public.team_payment_attributions is
  'Canonical paid attribution view. Legacy grace rows are policy-labelled owner credits, not qualifying contact evidence.';

notify pgrst, 'reload schema';

commit;
