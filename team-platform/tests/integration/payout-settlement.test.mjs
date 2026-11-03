import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

// Use an explicitly supplied disposable database. Setup resets its schemas; never production.
const url = process.env.TEAM_PAYOUT_TEST_DATABASE_URL
if (!url) {
  test('payout settlement integration requires TEAM_PAYOUT_TEST_DATABASE_URL', { skip: true }, () => {})
} else {
  const parsed = new URL(url)
  if (parsed.search || parsed.hash || !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) || !/^top100_team_payout_test_[a-z0-9_-]+$/i.test(decodeURIComponent(parsed.pathname.slice(1)))) {
    throw new Error('Payout tests require a local disposable top100_team_payout_test_* database')
  }
  const db = new pg.Client({ connectionString: url })
  before(async () => {
    await db.connect()
    await db.query('drop schema if exists public cascade; drop schema if exists auth cascade; create schema public; create schema auth')
    await db.query(
      "create table auth.users(id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);"
      + "create function auth.uid() returns uuid language sql as $$ select null::uuid $$;"
      + "do $$ begin create role anon; exception when duplicate_object then null; end $$;"
      + "do $$ begin create role authenticated; exception when duplicate_object then null; end $$;"
      + "do $$ begin create role service_role; exception when duplicate_object then null; end $$;"
      + "grant usage on schema public, auth to anon, authenticated, service_role;"
      + "create table public.profiles(id uuid primary key references auth.users, role text, email text, phone text);"
      + "create table public.awardees(id uuid primary key default gen_random_uuid(), profile_id uuid references profiles, name text, email text, country text, year text, phone text, metadata jsonb default '{}');"
      + "create table public.award_payment_attempts(id uuid primary key default gen_random_uuid(), order_id uuid, provider text, charge_scope text, status text, currency text, captured_amount_minor bigint, requested_amount_minor bigint, confirmed_at timestamptz);"
      + "create table public.award_orders(id uuid primary key default gen_random_uuid(), awardee_id uuid references awardees, profile_id uuid references profiles, email text, phone text, address_line1 text, address_line2 text, city text, state text, country text, postal_code text, award_payment_status text, award_paid_at timestamptz, paid_at timestamptz, created_at timestamptz default now(), award_amount_kobo bigint, award_paid_attempt_id uuid references award_payment_attempts);"
    )
    const migrations = [
      '20261026090000_team_platform.sql',
      '20261026120000_awardee_worklist_rules.sql',
      '20261026160000_central_admin_team_worklist.sql',
      '20261026180000_rep_access_and_assignment_controls.sql',
      '20261026190000_unique_active_public_awardee_per_team.sql',
      '20261030200349_repair_duplicate_worklist_ownership.sql',
      '20261103120000_team_commission_attribution.sql',
      '20261103120001_team_contact_confirmation_proof.sql',
      '20261103120002_team_legacy_contact_grace.sql',
    ]
    for (const file of migrations) await db.query(readFileSync(new URL('../../supabase/migrations/' + file, import.meta.url), 'utf8'))
  })
  after(async () => { await db.end() })
  async function rpc(client, name, args) {
    const params = args.map((_, i) => '$' + (i + 1)).join(',')
    return (await client.query('select public.' + name + '(' + params + ') result', args)).rows[0].result
  }
  async function service(fn) {
    const client = new pg.Client({ connectionString: url })
    await client.connect()
    try { await client.query('set role service_role'); return await fn(client) }
    finally { await client.end() }
  }
  async function fixture() {
    const suffix = randomUUID()
    const team = (await db.query("insert into team_teams(name,slug) values ('Payout test',$1) returning id", ['payout-' + suffix])).rows[0].id
    await db.query('insert into team_settings(team_id) values ($1)', [team])
    const users = []
    const members = []
    for (const role of ['agent', 'super_admin']) {
      const email = role + '-' + suffix + '@test.invalid'
      const user = (await db.query('insert into auth.users(email,email_confirmed_at) values ($1,now()) returning id', [email])).rows[0].id
      const member = (await db.query("insert into team_memberships(team_id,user_id,email,full_name,role,status) values ($1,$2,$3,$4,$5,'active') returning id", [team, user, email, 'Payout Test ' + role, role])).rows[0].id
      users.push(user); members.push(member)
    }
    const awardee = (await db.query("insert into team_awardees(team_id,name,email) values ($1,'Payout test awardee',$2) returning id", [team, 'awardee-' + suffix + '@test.invalid'])).rows[0].id
    await db.query("insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,entry_type,amount_minor,currency,status,available_at) values ($1,$2,$3,$4,'NGN','adjustment',600000,'NGN','confirmed',now()-interval '1 hour')", [team, awardee, members[0], randomUUID()])
    return { team, agent: users[0], admin: users[1], membership: members[0] }
  }
  const bank = { bankName: 'Test Bank', accountName: 'Test Agent', accountNumber: '0001234567' }
  const request = (f, amount = 400000, key = randomUUID()) => service(client => rpc(client, 'team_request_withdrawal', [f.team, f.agent, amount, 'NGN', 'bank_transfer', bank, key]))
  const transition = (f, id, action, reference = null, paidAmount = 400000) => service(client => rpc(client, 'team_transition_withdrawal', [id, f.admin, action, null, reference, action === 'pay' ? paidAmount : null]))
  const balance = f => rpc(db, 'team_agent_balance', [f.team, f.membership, 'NGN'])
  const dashboard = f => service(client => rpc(client, 'team_agent_dashboard', [f.team, f.agent, 'NGN']))

  test('request reserves funds, payment stays deducted and dashboard exposes Paid with reference', async () => {
    const f = await fixture()
    assert.equal((await balance(f)).withdrawable_minor, 600000)
    const created = await request(f)
    let b = await balance(f)
    assert.equal(b.withdrawable_minor, 200000)
    assert.equal(b.pending_withdrawal_minor, 400000)
    assert.equal(b.withdrawn_minor, 0)
    await transition(f, created.request_id, 'approve')
    await transition(f, created.request_id, 'pay', 'PAYOUT-TEST-001')
    b = await balance(f)
    assert.equal(b.withdrawable_minor, 200000, 'reserved money is not deducted twice')
    assert.equal(b.pending_withdrawal_minor, 0)
    assert.equal(b.withdrawn_minor, 400000)
    const page = await dashboard(f)
    assert.deepEqual(page.balance, b)
    assert.equal(page.recent_withdrawals[0].status, 'paid')
    assert.equal(page.recent_withdrawals[0].transaction_reference, 'PAYOUT-TEST-001')
    assert.ok(page.recent_withdrawals[0].paid_at)
    const notices = await db.query("select count(*) from team_notifications where user_id=$1 and type='withdrawal_paid'", [f.agent])
    assert.equal(Number(notices.rows[0].count), 1)
  })
  test('paid money cannot be requested again and repeat confirmation cannot create a second payout', async () => {
    const f = await fixture(), created = await request(f)
    await transition(f, created.request_id, 'approve')
    await transition(f, created.request_id, 'pay', 'PAYOUT-TEST-002')
    await assert.rejects(request(f, 400000), /exceeds available balance/)
    await assert.rejects(transition(f, created.request_id, 'pay', 'DUPLICATE'), /transition is not permitted/)
    const payouts = await db.query('select count(*) from team_withdrawal_payouts where request_id=$1', [created.request_id])
    assert.equal(Number(payouts.rows[0].count), 1)
    await request(f, 200000)
    assert.equal((await balance(f)).withdrawable_minor, 0)
    await assert.rejects(request(f, 1), /exceeds available balance/)
  })
  test('concurrent requests cannot reserve the same available commission twice', async () => {
    const f = await fixture()
    const results = await Promise.allSettled([request(f), request(f)])
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
    assert.match(results.find(r => r.status === 'rejected').reason.message, /exceeds available balance/)
    assert.equal((await balance(f)).withdrawable_minor, 200000)
  })
  test('concurrent confirmations produce one paid record and one deduction', async () => {
    const f = await fixture(), created = await request(f)
    await transition(f, created.request_id, 'approve')
    const results = await Promise.allSettled([transition(f, created.request_id, 'pay', 'CONCURRENT-A'), transition(f, created.request_id, 'pay', 'CONCURRENT-B')])
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
    const payouts = await db.query('select count(*) from team_withdrawal_payouts where request_id=$1', [created.request_id])
    assert.equal(Number(payouts.rows[0].count), 1)
    assert.equal((await balance(f)).withdrawn_minor, 400000)
    assert.equal((await balance(f)).withdrawable_minor, 200000)
  })
  test('partial settlement deducts the actual paid amount and releases only the unpaid remainder', async () => {
    const f = await fixture(), created = await request(f)
    await transition(f, created.request_id, 'approve')
    await transition(f, created.request_id, 'pay', 'PARTIAL-PAYOUT', 250000)
    const b = await balance(f)
    assert.equal(b.withdrawn_minor, 250000)
    assert.equal(b.withdrawable_minor, 350000)
    assert.equal(b.pending_withdrawal_minor, 0)
    const page = await dashboard(f)
    assert.equal(page.recent_withdrawals[0].amount_minor, 400000)
    assert.equal(page.recent_withdrawals[0].settled_amount_minor, 250000)
    assert.equal(page.recent_withdrawals[0].status, 'paid')
    await request(f, 300000)
    await assert.rejects(request(f, 50001), /exceeds available balance/)
  })
  test('refuses connection-string host and database overrides before attempting a connection', () => {
    for (const query of ['?host=invalid.example', '?database=another_database', '?dbname=another_database']) {
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
        env: { ...process.env, TEAM_PAYOUT_TEST_DATABASE_URL: 'postgresql://localhost/top100_team_payout_test_guard' + query },
        encoding: 'utf8', timeout: 5000,
      })
      assert.equal(child.status, 1)
      assert.match(child.stdout + child.stderr, /Payout tests require a local disposable/)
    }
  })

}
