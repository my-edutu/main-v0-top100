import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const url = process.env.TEAM_LEGACY_GRACE_TEST_DATABASE_URL

if (!url) {
  test('legacy grace SQL integration suite requires TEAM_LEGACY_GRACE_TEST_DATABASE_URL', {
    skip: 'set an explicitly supplied disposable PostgreSQL database',
  }, () => {})
} else {
  const parsedUrl = new URL(url)
  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''))
  if (!/^top100_team_contact_proof_test_[a-z0-9_-]+$/i.test(databaseName)) {
    throw new Error('Refusing non-disposable database ' + databaseName)
  }
  if (parsedUrl.hostname && !['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
    throw new Error('Refusing non-local PostgreSQL host ' + parsedUrl.hostname)
  }

  const db = new pg.Client({ connectionString: url })
  const migrationDir = new URL('../../supabase/migrations/', import.meta.url)
  const migration = (file) => readFileSync(new URL(file, migrationDir), 'utf8')
  const baseMigrationFiles = [
    '20261026090000_team_platform.sql',
    '20261026120000_awardee_worklist_rules.sql',
    '20261026160000_central_admin_team_worklist.sql',
    '20261026180000_rep_access_and_assignment_controls.sql',
    '20261026190000_unique_active_public_awardee_per_team.sql',
    '20261103120000_team_commission_attribution.sql',
  ]
  const proofMigrationFile = '20261103120001_team_contact_confirmation_proof.sql'
  const graceMigrationFile = '20261103120002_team_legacy_contact_grace.sql'
  const query = (text, values = []) => db.query(text, values)
  const sourceTimestamp = '2026-11-03 05:14:12.088554+00'
  const sourceEndReason = 'Verified payment without qualifying pre-payment contact evidence'

  const manifest = [
    ['2fda73d1-d1fa-4749-96af-a52ab29a1352', '08051a52-7a1f-4faf-af0d-85478790f518', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '4d712795-b189-4170-a12b-b11e47b29923', 'cbba5158-d3d9-4c14-9485-09a655de1ad6', '5c1d99db-bdb7-4fbb-bde7-926aa070f8e7', '62e9bc89-e55c-49c1-a483-5610bbc71411'],
    ['e99a4b96-fd1b-4290-9872-e35a44c27b69', '2f6ea4c9-92e4-4289-a2d9-9ef659547fd0', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '015ea9c6-0f19-4dc8-a560-71ec05b5de44', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '41074992-0f6c-4c55-bf5c-abcd52e10dd4', 'b7098a32-d296-4362-8871-69f4f250de35'],
    ['ede74612-92fd-4b67-85c7-f6f74b917bda', '47fb13d5-63a4-4d63-a386-2f931ff337fe', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'b3768c54-5a01-40fd-b387-b46a79bda82b', '8cdf0e09-5e96-41e9-9dc1-a943b0c24f4d', '47176298-75e9-4169-b8cf-a9bfc0fb6e2f', '83771864-c94d-42dc-a576-c76c9812dbd1'],
    ['fc2f547e-e3be-45fd-b000-6fa289cec065', '73de9875-b7b6-41a6-8594-d79242769006', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '0e420455-fb89-4ce3-ac66-323dda9a4251', 'cbba5158-d3d9-4c14-9485-09a655de1ad6', 'c173e451-fd67-478b-9ed3-571d6dedefec', '653b4a01-9ee9-42a9-8587-4cd1f9f35431'],
    ['a92761c5-03a6-4679-9d1d-49b120cfcc9c', '8754298c-dc7f-42a0-a2df-fb3691bc5192', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '2fdb3458-7c80-45b7-b9b7-e8873bb39aa5', '7ec36e79-fc8f-4c18-bbed-6e24c004141e', '0ddcd0fb-68be-4555-9380-1534c4f3a539', 'd0d7fbaf-db31-418c-b3a3-027134d554fd'],
    ['27cc56fd-9710-4d89-8782-fe8806d0a909', 'a08c2bf7-e257-4af8-a7d6-d98d42eaca3d', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '45edb6da-61ea-4dff-832c-14fa2ce1ea63', 'f6858cd0-d495-4623-9583-acb7bfe8dee5', '5ce0dc11-40e1-4495-af7b-d5e11ddb69f7', 'aa01b752-6614-4aaf-a149-ee3cd3b5ea56'],
    ['0d867209-c56b-4e2a-b886-df33d165cff0', 'a6e78688-4fb8-470a-9dae-3605e98b0016', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '2f779249-1800-4631-8a62-b0b7816668d6', '062439e9-d072-4d2e-9bc2-52c6bab23f7b', '92660e16-bb0c-430b-bffb-f9f72a8bfe65', '83c04897-8bee-4041-b2c7-ee88fff17fb8'],
    ['fa399682-6090-4e5f-9b1d-8b01ce2ece2a', 'a8f6eae5-4c58-4721-97d9-86b82d30844a', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'da8d8f60-71d4-49fe-abab-4924efde2c7e', 'd44cd560-5893-4deb-9640-b67627fd6867', 'cfd650b1-8b51-4775-a299-540f98a416aa', '9f20bb94-b4a7-43ae-aa22-a6b3fc733a95'],
    ['2b087382-82b4-4bb6-9e18-d06b38d08e11', 'b17fa80f-efa3-4277-8ee9-6f8ad1dd93e5', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '3ec02ea3-30a0-4031-92f4-4a2a4b486f35', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', 'd5df8291-077e-4043-b470-0901d5cf442a', 'da9bbe2d-7334-40a3-aeed-4e26cc1495c6'],
    ['22a09f9a-df70-481e-bbef-9d949016f67f', 'de599ff6-444f-47ec-9582-ae322786eac6', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'd45dec81-4cc8-4963-8870-e637645f10be', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '56252fd7-90d9-44f5-8a24-4e3f71483671', 'c32d85bb-a2b1-47f0-935c-26d5ea40ba20'],
    ['707e3de1-cc97-4dfd-ba51-7d99b7501947', 'defba61d-540e-4868-818d-a335aae90f44', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'dfc51a60-3882-4a85-a524-b75b547eaeed', 'd44cd560-5893-4deb-9640-b67627fd6867', '14818a6b-c41f-4eac-8fc1-d967fe6d5412', 'ba5eaf89-72f8-4fc9-bca3-c74c4f9ccc2b'],
    ['0309ea34-ca29-4a61-9c2f-a6498dbb4f98', 'dfdf962f-4103-4df0-9985-354de205ec23', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'eacac91b-5196-4802-8585-722b05c96d46', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '7cb13262-637e-4e91-8b93-f525f685d25f', '205a4120-dd17-42ab-9809-0a2c475d287b'],
    ['b372b197-e684-4a70-91a6-fa047a516cf9', 'e700c97f-9e2d-47ff-83a5-3393767a3e9d', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', 'cfaa2f2c-6bf3-42ec-a16c-9b5ff7876a43', '8a90b2b5-3e7d-44f9-9987-b171e7cebdc6', '7d922959-cde3-4a74-b209-341113ad4e5e', '8fa28c22-86ae-4212-921f-5a02c516f34a'],
    ['ee9dfe33-154a-4a66-9526-99c08f0e2ac0', 'e82746f9-9250-458f-a447-6ccd04212ba3', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '7167d805-4e1a-4868-ac17-7718d3d20b6a', 'cbba5158-d3d9-4c14-9485-09a655de1ad6', 'dd2ca6e4-d924-4ee2-9b26-ee808d47a98f', '3295ec88-ddcb-43f4-a538-8e632e6f24ef'],
    ['4236d7c9-2907-4456-9131-2e66bb5106be', 'fcbbd25a-17c2-4648-96b3-8b0942897e9e', 'f7f475f8-57eb-493a-b0b2-51a2975b2115', '1354a6bb-9f16-4a96-a2ea-32a2a9dc2750', '062439e9-d072-4d2e-9bc2-52c6bab23f7b', '07c17af8-ddf1-4707-a86f-0638bffd339b', 'cf3531ca-c99d-4c7c-863f-7793b3a8f9b9'],
  ].map(([reversalId, earningId, teamId, awardeeId, agentId, paymentId, assignmentId]) => ({ reversalId, earningId, teamId, awardeeId, agentId, paymentId, assignmentId }))

  async function asRole(role, fn) {
    await query('set role ' + role)
    try { return await fn() } finally { await query('reset role') }
  }
  async function rpc(name, values) {
    return asRole('service_role', async () => {
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ')
      const result = await query('select public.' + name + '(' + placeholders + ') as result', values)
      return result.rows[0].result
    })
  }

  before(async () => {
    await db.connect()
    await query('drop schema if exists public cascade')
    await query('drop schema if exists auth cascade')
    await query('create schema public')
    await query('create schema auth')
    await query(
      "create table auth.users(id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);"
      + "create function auth.uid() returns uuid language sql as $$ select null::uuid $$;"
      + "do $$ begin create role anon; exception when duplicate_object then null; end $$;"
      + "do $$ begin create role authenticated; exception when duplicate_object then null; end $$;"
      + "do $$ begin create role service_role; exception when duplicate_object then null; end $$;"
      + "alter role service_role bypassrls;"
      + "grant usage on schema public, auth to anon, authenticated, service_role;"
      + "create table public.profiles(id uuid primary key references auth.users, role text, email text, phone text);"
      + "create table public.awardees(id uuid primary key default gen_random_uuid(), profile_id uuid references profiles, name text, email text, phone text, country text, year text, metadata jsonb default '{}');"
      + "create table public.award_payment_attempts(id uuid primary key default gen_random_uuid(), order_id uuid, provider text, charge_scope text, status text, currency text, captured_amount_minor bigint, requested_amount_minor bigint, confirmed_at timestamptz);"
      + "create table public.award_orders(id uuid primary key default gen_random_uuid(), awardee_id uuid references awardees, profile_id uuid references profiles, email text, phone text, address_line1 text, address_line2 text, city text, state text, country text, postal_code text, award_payment_status text, award_paid_at timestamptz, paid_at timestamptz, created_at timestamptz default now(), award_amount_kobo bigint, award_paid_attempt_id uuid references award_payment_attempts);",
    )
    for (const file of baseMigrationFiles) await query(migration(file))

    const seededTeamId = (await query("select id from team_teams where slug = 'sales'")).rows[0].id
    const teamId = manifest[0].teamId
    if (seededTeamId !== teamId) {
      await query('set session_replication_role = replica')
      const teamTables = (await query("select c.table_schema, c.table_name from information_schema.columns c join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name where c.table_schema = 'public' and c.column_name = 'team_id' and c.table_name <> 'team_teams' and t.table_type = 'BASE TABLE'")).rows
      for (const table of teamTables) {
        await query(`update \"${table.table_schema}\".\"${table.table_name}\" set team_id = $1 where team_id = $2`, [teamId, seededTeamId])
      }
      await query('update team_teams set id = $1 where id = $2', [teamId, seededTeamId])
      await query('set session_replication_role = origin')
    }
    const uniqueAgentIds = [...new Set(manifest.map((row) => row.agentId))]
    for (const [index, agentId] of uniqueAgentIds.entries()) {
      const userId = (await query("insert into auth.users(email, email_confirmed_at) values ($1, now()) returning id", [`grace-agent-${index}@test.invalid`])).rows[0].id
      await query("insert into team_memberships(id, team_id, user_id, email, full_name, role, status) values ($1, $2, $3, $4, $5, 'agent', 'active')", [agentId, teamId, userId, `grace-agent-${index}@test.invalid`, `Grace Agent ${index}`])
    }

    for (const [index, row] of manifest.entries()) {
      const publicAwardeeId = (await query("insert into awardees(name, email, phone, country, year) values ($1, $2, '+2348031234567', 'Nigeria', '2026') returning id", [`Grace Awardee ${index}`, `grace-${index}@test.invalid`])).rows[0].id
      await query("insert into team_awardees(id, team_id, public_awardee_id, name, email, phone, country, source_year) values ($1, $2, $3, $4, $5, '+2348031234567', 'Nigeria', 2026)", [row.awardeeId, teamId, publicAwardeeId, `Grace Awardee ${index}`, `grace-${index}@test.invalid`])
      await query("insert into team_assignments(id, team_id, awardee_id, agent_id, status, assigned_at) values ($1, $2, $3, $4, 'active', '2026-11-03 04:00:00+00')", [row.assignmentId, teamId, row.awardeeId, row.agentId])
      await query("insert into team_followups(team_id, assignment_id, awardee_id, agent_id, channel, outcome, notes, contacted_at) values ($1, $2, $3, $4, 'call', 'interested', 'Historical staff contact record', '2026-11-03 04:30:00+00')", [teamId, row.assignmentId, row.awardeeId, row.agentId])
      await query("insert into award_orders(id, awardee_id, email, phone, award_payment_status, award_paid_at, award_amount_kobo) values ($1, $2, $3, '+2348031234567', 'paid', clock_timestamp() + interval '1 hour', 2500000)", [row.paymentId, publicAwardeeId, `grace-${index}@test.invalid`])
      await query("insert into team_commission_entries(id, team_id, awardee_id, agent_id, entry_type, payment_type, payment_id, payment_currency, amount_minor, currency, status, available_at, earned_at, rule_snapshot) values ($1, $2, $3, $4, 'earning', 'award_order', $5, 'NGN', 200000, 'NGN', 'confirmed', '2026-11-03 05:10:00+00', '2026-11-03 05:10:00+00', '{}')", [row.earningId, teamId, row.awardeeId, row.agentId, row.paymentId])
      await query(`insert into team_commission_entries(id, team_id, awardee_id, agent_id, entry_type, parent_commission_id, payment_type, payment_id, payment_currency, amount_minor, currency, status, available_at, earned_at, rule_snapshot, created_at) values ($1, $2, $3, $4, 'reversal', $5, 'award_order', $6, 'NGN', -200000, 'NGN', 'confirmed', '2026-11-03 05:14:12.088554+00', '2026-11-03 05:14:12.088554+00', '{"reversal_source":"team_commission_attribution_reconciliation"}', '2026-11-03 05:14:12.088554+00')`, [row.reversalId, teamId, row.awardeeId, row.agentId, row.earningId, row.paymentId])
      await query("update team_assignments set status = 'removed', ended_at = $2, end_reason = $3 where id = $1", [row.assignmentId, sourceTimestamp, sourceEndReason])
    }

    await query(migration(proofMigrationFile))
    await query(migration(graceMigrationFile))
    // The local test role models Supabase's service role without its hosted
    // database-wide grants. Security-invoker views therefore need the same
    // read privileges the production service role already has.
    await query('grant select on public.award_orders, public.awardees, public.award_payment_attempts, public.team_awardees, public.team_assignments, public.team_commission_entries, public.team_followups to service_role')
  })

  after(async () => { await db.end() })

  test('restores only the explicit fifteen historical credits as legacy grace', { concurrency: false }, async () => {
    assert.equal((await query('select count(*)::int as count from team_legacy_grace_cases')).rows[0].count, 15)
    const adjustmentSummary = (await query("select count(*)::int as count, coalesce(sum(amount_minor), 0)::bigint as total from team_commission_entries where entry_type = 'adjustment' and rule_snapshot->>'policy' = 'legacy_grace'")).rows[0]
    assert.equal(adjustmentSummary.count, 15)
    assert.equal(adjustmentSummary.total, '3000000')
    assert.equal((await query("select count(*)::int as count from team_assignments where status = 'active' and id = any($1::uuid[])", [manifest.map((row) => row.assignmentId)])).rows[0].count, 15)
    assert.equal((await query("select count(*)::int as count from team_legacy_grace_cases where assignment_restore_state = 'restored'")).rows[0].count, 15)
    assert.equal((await query("select count(*)::int as count from team_commission_entries where id = any($1::uuid[]) and entry_type = 'reversal' and rule_snapshot->>'reversal_source' = 'team_commission_attribution_reconciliation'", [manifest.map((row) => row.reversalId)])).rows[0].count, 15)
    const attribution = await asRole('service_role', () => query("select * from team_payment_attributions where contact_kind = 'legacy_grace'"))
    assert.equal(attribution.rows.length, 15)
    for (const row of attribution.rows) {
      assert.equal(row.contact_kind, 'legacy_grace')
      assert.equal(row.provider_verified, false)
      assert.equal(row.contacted_at, null)
      assert.equal(row.recorded_at, null)
      assert.equal(row.evidence.policy, 'legacy_grace')
      assert.equal(row.evidence.ownerAuthorized, true)
    }
    assert.equal((await query('select count(*)::int as count from team_qualifying_contacts($1, $2)', [manifest[0].assignmentId, '2026-11-03 05:00:00+00'])).rows[0].count, 0)
  })

  test('reapplying grace is idempotent and does not create new reversals or adjustments', { concurrency: false }, async () => {
    const before = (await query("select count(*)::int as count, coalesce(sum(amount_minor), 0)::bigint as total from team_commission_entries where entry_type = 'adjustment' and rule_snapshot->>'policy' = 'legacy_grace'")).rows[0]
    const result = await rpc('team_restore_legacy_grace', [])
    assert.equal(result.adjustments_created, 0)
    await query(migration(graceMigrationFile))
    const after = (await query("select count(*)::int as count, coalesce(sum(amount_minor), 0)::bigint as total from team_commission_entries where entry_type = 'adjustment' and rule_snapshot->>'policy' = 'legacy_grace'")).rows[0]
    assert.deepEqual(after, before)
    assert.equal((await query("select count(*)::int as count from team_commission_entries where id = any($1::uuid[]) and entry_type = 'reversal' and rule_snapshot->>'reversal_source' = 'team_commission_attribution_reconciliation'", [manifest.map((row) => row.reversalId)])).rows[0].count, 15)
  })

  test('dormant allowlist rows are safe when a local database has none of the source UUIDs', { concurrency: false }, async () => {
    const dormant = {
      reversalId: randomUUID(),
      earningId: randomUUID(),
      awardeeId: randomUUID(),
      agentId: randomUUID(),
      paymentId: randomUUID(),
      assignmentId: randomUUID(),
    }
    await query(
      "insert into team_legacy_grace_cases(reversal_id, earning_id, team_id, awardee_id, agent_id, payment_id, assignment_id, amount_minor, source_reversal_created_at, source_reversal_source) values ($1, $2, $3, $4, $5, $6, $7, 200000, '2026-11-03 05:14:12.088554+00', 'team_commission_attribution_reconciliation')",
      [dormant.reversalId, dormant.earningId, manifest[0].teamId, dormant.awardeeId, dormant.agentId, dormant.paymentId, dormant.assignmentId],
    )
    const result = await rpc('team_restore_legacy_grace', [])
    assert.equal(result.adjustments_created, 0)
    assert.equal((await query("select assignment_restore_state from team_legacy_grace_cases where reversal_id = $1", [dormant.reversalId])).rows[0].assignment_restore_state, 'pending')
    assert.equal((await query("select count(*)::int as count from team_commission_entries where entry_type = 'adjustment' and rule_snapshot->>'policy' = 'legacy_grace'")).rows[0].count, 15)
    await query('delete from team_legacy_grace_cases where reversal_id = $1', [dormant.reversalId])
  })

  test('a complete but refunded source never receives a new grace balance', { concurrency: false }, async () => {
    const refunded = {
      reversalId: randomUUID(),
      earningId: randomUUID(),
      publicAwardeeId: randomUUID(),
      awardeeId: randomUUID(),
      assignmentId: randomUUID(),
      paymentId: randomUUID(),
      agentId: manifest[0].agentId,
    }
    await query('set session_replication_role = replica')
    await query("insert into awardees(id, name, email, phone, country, year) values ($1, 'Refunded grace source', $2, '+2348031234567', 'Nigeria', '2026')", [refunded.publicAwardeeId, `refunded-${refunded.awardeeId}@test.invalid`])
    await query("insert into team_awardees(id, team_id, public_awardee_id, name, email, phone, country, source_year, payment_status) values ($1, $2, $3, 'Refunded grace source', $4, '+2348031234567', 'Nigeria', 2026, 'refunded')", [refunded.awardeeId, manifest[0].teamId, refunded.publicAwardeeId, `refunded-${refunded.awardeeId}@test.invalid`])
    await query("insert into team_assignments(id, team_id, awardee_id, agent_id, status, assigned_at, ended_at, end_reason) values ($1, $2, $3, $4, 'removed', '2026-11-03 04:00:00+00', $5, $6)", [refunded.assignmentId, manifest[0].teamId, refunded.awardeeId, refunded.agentId, sourceTimestamp, sourceEndReason])
    await query("insert into award_orders(id, awardee_id, email, phone, award_payment_status, award_paid_at, award_amount_kobo) values ($1, $2, $3, '+2348031234567', 'refunded', $4, 2500000)", [refunded.paymentId, refunded.publicAwardeeId, `refunded-${refunded.awardeeId}@test.invalid`, sourceTimestamp])
    await query("insert into team_commission_entries(id, team_id, awardee_id, agent_id, entry_type, payment_type, payment_id, payment_currency, amount_minor, currency, status, available_at, earned_at, rule_snapshot) values ($1, $2, $3, $4, 'earning', 'award_order', $5, 'NGN', 200000, 'NGN', 'confirmed', $6, $6, '{}')", [refunded.earningId, manifest[0].teamId, refunded.awardeeId, refunded.agentId, refunded.paymentId, sourceTimestamp])
    await query("insert into team_commission_entries(id, team_id, awardee_id, agent_id, entry_type, parent_commission_id, payment_type, payment_id, payment_currency, amount_minor, currency, status, available_at, earned_at, rule_snapshot, created_at) values ($1, $2, $3, $4, 'reversal', $5, 'award_order', $6, 'NGN', -200000, 'NGN', 'confirmed', $7, $7, '{\"reversal_source\":\"team_commission_attribution_reconciliation\"}', $7)", [refunded.reversalId, manifest[0].teamId, refunded.awardeeId, refunded.agentId, refunded.earningId, refunded.paymentId, sourceTimestamp])
    await query("insert into team_legacy_grace_cases(reversal_id, earning_id, team_id, awardee_id, agent_id, payment_id, assignment_id, amount_minor, source_reversal_created_at, source_reversal_source) values ($1, $2, $3, $4, $5, $6, $7, 200000, $8, 'team_commission_attribution_reconciliation')", [refunded.reversalId, refunded.earningId, manifest[0].teamId, refunded.awardeeId, refunded.agentId, refunded.paymentId, refunded.assignmentId, sourceTimestamp])
    await query('set session_replication_role = origin')

    const result = await rpc('team_restore_legacy_grace', [])
    assert.equal(result.adjustments_created, 0)
    assert.equal((await query('select assignment_restore_state from team_legacy_grace_cases where reversal_id = $1', [refunded.reversalId])).rows[0].assignment_restore_state, 'not_restored')
    assert.equal((await query("select count(*)::int as count from team_commission_entries where parent_commission_id = $1 and entry_type = 'adjustment' and rule_snapshot->>'policy' = 'legacy_grace'", [refunded.reversalId])).rows[0].count, 0)

    await query('set session_replication_role = replica')
    await query('delete from team_legacy_grace_cases where reversal_id = $1', [refunded.reversalId])
    await query('delete from team_commission_entries where id in ($1, $2)', [refunded.earningId, refunded.reversalId])
    await query('delete from award_orders where id = $1', [refunded.paymentId])
    await query('delete from team_assignments where id = $1', [refunded.assignmentId])
    await query('delete from team_awardees where id = $1', [refunded.awardeeId])
    await query('delete from awardees where id = $1', [refunded.publicAwardeeId])
    await query('set session_replication_role = origin')
  })

  test('does not steal a conflicting current owner while retaining grace attribution', { concurrency: false }, async () => {
    const row = manifest[0]
    const authId = (await query("insert into auth.users(email, email_confirmed_at) values ('conflict-profile@test.invalid', now()) returning id")).rows[0].id
    await query("insert into profiles(id, email, role) values ($1, 'conflict-profile@test.invalid', 'member')", [authId])
    const publicId = (await query('select public_awardee_id from team_awardees where id = $1', [row.awardeeId])).rows[0].public_awardee_id
    await query('update awardees set profile_id = $1 where id = $2', [authId, publicId])
    await query('update team_awardees set profile_id = $1 where id = $2', [authId, row.awardeeId])
    const conflictAwardeeId = randomUUID()
    const conflictAssignmentId = randomUUID()
    const secondAgent = manifest.find((candidate) => candidate.agentId !== row.agentId).agentId
    await query("insert into team_awardees(id, team_id, profile_id, name, email, country, source_year) select $1, team_id, $2, 'Conflicting owner', 'conflicting-owner@test.invalid', 'Nigeria', 2026 from team_awardees where id = $3", [conflictAwardeeId, authId, row.awardeeId])
    await query("insert into team_assignments(id, team_id, awardee_id, agent_id, status, assigned_at) select $1, team_id, $2, $3, 'active', now() from team_awardees where id = $4", [conflictAssignmentId, conflictAwardeeId, secondAgent, row.awardeeId])
    await query("update team_assignments set status = 'removed', ended_at = $2, end_reason = $3 where id = $1", [row.assignmentId, sourceTimestamp, sourceEndReason])
    const result = await rpc('team_restore_legacy_grace', [])
    assert.equal(result.assignment_conflicts, 1)
    assert.equal((await query('select status from team_assignments where id = $1', [row.assignmentId])).rows[0].status, 'removed')
    assert.equal((await query('select status from team_assignments where id = $1', [conflictAssignmentId])).rows[0].status, 'active')
    const attribution = (await query("select assignment_id, evidence from team_payment_attributions where payment_id = $1 and contact_kind = 'legacy_grace'", [row.paymentId])).rows[0]
    assert.equal(attribution.assignment_id, null)
    assert.equal(attribution.evidence.historicalAssignmentId, row.assignmentId)
  })

  test('a concurrent assignment operation can lock its row while restoration waits for team ownership', { concurrency: false }, async () => {
    const row = (await query("select c.assignment_id, c.team_id from team_legacy_grace_cases c join award_orders o on o.id=c.payment_id where o.award_payment_status='paid' order by c.reversal_id limit 1")).rows[0]
    const owner = new pg.Client({ connectionString: url })
    const restorer = new pg.Client({ connectionString: url })
    await owner.connect(); await restorer.connect()
    let pending
    try {
      await owner.query('begin')
      await owner.query("select pg_advisory_xact_lock(hashtextextended('team-assign:' || $1::text,0))", [row.team_id])
      const pid = (await restorer.query('select pg_backend_pid() as pid')).rows[0].pid
      pending = restorer.query('select public.team_restore_legacy_grace()')
      let waiting = false
      for (let tries = 0; tries < 100; tries++) {
        waiting = (await query("select exists(select 1 from pg_locks where pid=$1 and locktype='advisory' and not granted) as waiting", [pid])).rows[0].waiting
        if (waiting) break
        await new Promise(resolve => setTimeout(resolve, 5))
      }
      assert.equal(waiting, true, 'restoration should wait for the existing team assignment operation')
      // Taking this row must remain possible while the other transaction waits
      // on our team lock; the reverse order would deadlock manual reassignment.
      await owner.query('select id from team_assignments where id=$1 for update nowait', [row.assignment_id])
    } finally {
      await owner.query('rollback')
      try { if (pending) await pending } finally { await owner.end(); await restorer.end() }
    }
  })

  test('refund neutralizes the restored positive adjustment exactly once', { concurrency: false }, async () => {
    const row = manifest[1]
    await query("update award_orders set award_payment_status = 'refunded' where id = $1", [row.paymentId])
    const refundRow = (await query("select id, amount_minor from team_commission_entries where parent_commission_id = (select grace_adjustment_id from team_legacy_grace_cases where reversal_id = $1) and rule_snapshot->>'policy' = 'legacy_grace_refund'", [row.reversalId])).rows[0]
    assert.equal(refundRow.amount_minor, '-200000')
    const first = await rpc('team_reverse_verified_payment', [row.teamId, row.awardeeId, 'award_order', row.paymentId, 'Grace test refund replay', null])
    assert.equal(first.outcome, 'already_reversed')
    assert.equal(first.grace_reversed, true)
    assert.equal(first.reversal_id, refundRow.id)
    const second = await rpc('team_reverse_verified_payment', [row.teamId, row.awardeeId, 'award_order', row.paymentId, 'Grace test refund replay', null])
    assert.equal(second.outcome, 'already_reversed')
    assert.equal(second.reversal_id, refundRow.id)
    assert.equal((await query("select count(*)::int as count from team_commission_entries where parent_commission_id = (select grace_adjustment_id from team_legacy_grace_cases where reversal_id = $1) and rule_snapshot->>'policy' = 'legacy_grace_refund'", [row.reversalId])).rows[0].count, 1)
    await query('update team_commission_entries set amount_minor = -199999 where id = $1', [refundRow.id])
    await assert.rejects(
      rpc('team_reverse_verified_payment', [row.teamId, row.awardeeId, 'award_order', row.paymentId, 'Malformed refund replay', null]),
      /does not match the source grace credit/i,
    )
    await query('update team_commission_entries set amount_minor = -200000 where id = $1', [refundRow.id])
    const restoreAfterRefund = await rpc('team_restore_legacy_grace', [])
    assert.equal(restoreAfterRefund.adjustments_created, 0)
    await query(migration(graceMigrationFile))
    assert.equal((await query("select count(*)::int as count from team_commission_entries where entry_type = 'adjustment' and rule_snapshot->>'policy' = 'legacy_grace' and amount_minor > 0")).rows[0].count, 15)
    assert.equal((await query("select count(*)::int as count from team_commission_entries where parent_commission_id = (select grace_adjustment_id from team_legacy_grace_cases where reversal_id = $1) and rule_snapshot->>'policy' = 'legacy_grace_refund'", [row.reversalId])).rows[0].count, 1)
  })

  test('strict fresh OTP attribution remains eligible after the grace view is installed', { concurrency: false }, async () => {
    const agentUserId = (await query('select user_id from team_memberships where id = $1', [manifest[0].agentId])).rows[0].user_id
    const recipientUserId = (await query("insert into auth.users(email, email_confirmed_at) values ('strict-after-grace@test.invalid', now()) returning id")).rows[0].id
    await query("insert into profiles(id, email, role) values ($1, 'strict-after-grace@test.invalid', 'member')", [recipientUserId])
    const strict = {
      publicAwardeeId: randomUUID(),
      awardeeId: randomUUID(),
      assignmentId: randomUUID(),
      paymentId: randomUUID(),
      attemptId: randomUUID(),
      token: randomUUID(),
      requestId: randomUUID(),
    }
    const paidAt = '2026-11-03 09:00:00+00'
    await query('set session_replication_role = replica')
    await query("insert into awardees(id, profile_id, name, email, phone, country, year) values ($1, $2, 'Strict after grace', 'strict-after-grace@test.invalid', '+2348031234567', 'Nigeria', '2026')", [strict.publicAwardeeId, recipientUserId])
    await query("insert into team_awardees(id, team_id, public_awardee_id, profile_id, name, email, phone, country, source_year) values ($1, $2, $3, $4, 'Strict after grace', 'strict-after-grace@test.invalid', '+2348031234567', 'Nigeria', 2026)", [strict.awardeeId, manifest[0].teamId, strict.publicAwardeeId, recipientUserId])
    await query("insert into team_assignments(id, team_id, awardee_id, agent_id, status, assigned_at) values ($1, $2, $3, $4, 'active', '2026-11-03 08:00:00+00')", [strict.assignmentId, manifest[0].teamId, strict.awardeeId, manifest[0].agentId])
    await query("insert into award_orders(id, awardee_id, profile_id, email, phone, award_payment_status, award_paid_at, award_amount_kobo) values ($1, $2, $3, 'strict-after-grace@test.invalid', '+2348031234567', 'paid', $4, 2500000)", [strict.paymentId, strict.publicAwardeeId, recipientUserId, paidAt])
    await query("insert into team_contact_attempts(id, token, request_id, team_id, awardee_id, assignment_id, agent_id, actor_user_id, agent_user_id, channel, phone, recipient_public_awardee_id, recipient_profile_id, recipient_email, rep_name, status, initiated_at, confirmed_at, confirmed_by, proof_method, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $8, 'call', '+2348031234567', $9, $10, 'strict-after-grace@test.invalid', 'Grace Agent', 'confirmed', '2026-11-03 08:10:00+00', '2026-11-03 08:20:00+00', $10, 'email_otp', '2026-11-03 08:10:00+00')", [strict.attemptId, strict.token, strict.requestId, manifest[0].teamId, strict.awardeeId, strict.assignmentId, manifest[0].agentId, agentUserId, strict.publicAwardeeId, recipientUserId])
    await query('set session_replication_role = origin')

    const applied = await rpc('team_apply_verified_payment', [manifest[0].teamId, strict.awardeeId, 'award_order', strict.paymentId, 'NGN', 2500000, paidAt, agentUserId])
    assert.equal(applied.outcome, 'commission_created')
    const attribution = (await query("select contact_kind, provider_verified, evidence from team_payment_attributions where payment_id = $1", [strict.paymentId])).rows[0]
    assert.equal(attribution.contact_kind, 'awardee_confirmed_contact')
    assert.equal(attribution.provider_verified, false)
    assert.equal(attribution.evidence.recipientVerifiedBy, 'email_otp')
    assert.equal((await query("select count(*)::int as count from team_payment_attributions where payment_id = $1 and contact_kind = 'legacy_grace'", [strict.paymentId])).rows[0].count, 0)
  })

  test('the allowlist and grace table remain service-only', { concurrency: false }, async () => {
    await assert.rejects(asRole('authenticated', () => query('select * from team_legacy_grace_cases')), /permission denied/i)
    await assert.rejects(asRole('authenticated', () => query('select public.team_restore_legacy_grace()')), /permission denied/i)
  })
}
