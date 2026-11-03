import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import pg from 'pg'

// Use an explicitly supplied disposable database. Setup resets its schemas; never production.
const url = process.env.TEAM_WHATSAPP_REPORT_TEST_DATABASE_URL
if (!url) {
  test('WhatsApp report integration requires TEAM_WHATSAPP_REPORT_TEST_DATABASE_URL', { skip: true }, () => {})
} else {
  const parsed = new URL(url)
  if (parsed.search || parsed.hash || !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) || !/^top100_team_whatsapp_report_test_[a-z0-9_-]+$/i.test(decodeURIComponent(parsed.pathname.slice(1)))) {
    throw new Error('WhatsApp report tests require a local disposable top100_team_whatsapp_report_test_* database')
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
      '20261103175430_team_whatsapp_unavailable_reports.sql',
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
    const team = (await db.query("insert into team_teams(name,slug) values ('WhatsApp report test',$1) returning id", ['payout-' + suffix])).rows[0].id
    await db.query('insert into team_settings(team_id) values ($1)', [team])
    const users = []
    const members = []
    for (const role of ['agent', 'super_admin']) {
      const email = role + '-' + suffix + '@test.invalid'
      const user = (await db.query('insert into auth.users(email,email_confirmed_at) values ($1,now()) returning id', [email])).rows[0].id
      const member = (await db.query("insert into team_memberships(team_id,user_id,email,full_name,role,status) values ($1,$2,$3,$4,$5,'active') returning id", [team, user, email, 'WhatsApp Report Test ' + role, role])).rows[0].id
      users.push(user); members.push(member)
    }
    const awardee = (await db.query("insert into team_awardees(team_id,name,email) values ($1,'Payout test awardee',$2) returning id", [team, 'awardee-' + suffix + '@test.invalid'])).rows[0].id
    await db.query("insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,entry_type,amount_minor,currency,status,available_at) values ($1,$2,$3,$4,'NGN','adjustment',600000,'NGN','confirmed',now()-interval '1 hour')", [team, awardee, members[0], randomUUID()])
    return { team, agent: users[0], admin: users[1], membership: members[0] }
  }

  async function reportCase() {
    const f = await fixture()
    const row = (await db.query("select id from team_awardees where team_id=$1", [f.team])).rows[0]
    f.awardee = row.id
    await db.query("update team_awardees set phone='08031234567',country='Nigeria',metadata='{\"keep\":true}' where id=$1", [f.awardee])
    await db.query("insert into team_assignments(team_id,awardee_id,agent_id,status) values ($1,$2,$3,'active')", [f.team, f.awardee, f.membership])
    return f
  }
  const mark = (f, value = true, expected = '+2348031234567', actor = f.agent, team = f.team) => service(client => rpc(client, 'team_set_whatsapp_unavailable', [team, actor, f.awardee, expected, value]))
  async function evidence(f) {
    const result = await db.query(`select
      (select count(*) from team_followups where team_id=$1) followups,
      (select count(*) from team_contact_attempts where team_id=$1) attempts,
      (select count(*) from team_commission_entries where team_id=$1) commissions,
      (select coalesce(sum(amount_minor),0) from team_commission_entries where team_id=$1) commission_amount,
      (select contact_status from team_awardees where id=$2) contact_status,
      (select payment_status from team_awardees where id=$2) payment_status,
      (select last_contacted_at from team_awardees where id=$2) last_contacted_at,
      (select count(*) from team_assignments where team_id=$1 and status='active') assignments,
      (select count(*) from public.team_qualifying_contacts((select id from team_assignments where awardee_id=$2 and status='active'), clock_timestamp())) qualifying_contacts`, [f.team, f.awardee])
    return result.rows[0]
  }
  test('mark and undo persist routing metadata while contact and commission evidence stays unchanged', async () => {
    const f = await reportCase(), before = await evidence(f)
    const saved = await mark(f)
    assert.equal(before.qualifying_contacts, '0')
    assert.equal(saved.report.source, 'rep_reported')
    assert.equal(saved.report.phone, '+2348031234567')
    assert.equal(saved.report.reported_by, f.membership)
    assert.ok(saved.report.reported_at)
    const stored = (await db.query('select metadata from team_awardee_directory where id=$1', [f.awardee])).rows[0].metadata
    assert.equal(stored.keep, true)
    assert.deepEqual(stored.whatsapp_unavailable_report, saved.report)
    assert.deepEqual(await evidence(f), before)
    assert.deepEqual(await mark(f), saved, 'retry is idempotent')
    assert.equal((await mark(f, false)).report, null)
    assert.deepEqual((await db.query('select metadata from team_awardees where id=$1', [f.awardee])).rows[0].metadata, { keep: true })
    assert.deepEqual(await evidence(f), before)
    assert.equal(Number((await db.query("select count(*) from team_audit_logs where team_id=$1 and action like 'awardee.whatsapp_%'", [f.team])).rows[0].count), 2)
  })
  test('another rep, a staff account, suspended membership and cross-team access cannot change reports', async () => {
    const f = await reportCase(), other = await reportCase()
    await assert.rejects(mark(f, true, '+2348031234567', f.admin), /active assigned rep/)
    await assert.rejects(mark(f, true, '+2348031234567', other.agent), /active assigned rep/)
    await assert.rejects(mark(f, true, '+2348031234567', f.agent, other.team), /active assigned rep/)
    await db.query("update team_memberships set status='suspended' where id=$1", [f.membership])
    await assert.rejects(mark(f), /active assigned rep/)
  })
  test('stale phone numbers and ended assignments cannot create or clear a report', async () => {
    const f = await reportCase()
    await mark(f)
    await db.query("update team_awardees set phone='08037654321' where id=$1", [f.awardee])
    await assert.rejects(mark(f, false), /phone number changed/)
    await db.query("update team_assignments set status='reassigned',ended_at=now() where team_id=$1 and agent_id=$2", [f.team, f.membership])
    await assert.rejects(mark(f, true, '+2348037654321'), /active assigned rep/)
  })
  test('public and authenticated clients cannot call the privileged RPC directly', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.query('set role ' + role)
      try {
        await assert.rejects(db.query("select team_set_whatsapp_unavailable(null,null,null,null,true)"), /permission denied/)
      } finally { await db.query('reset role') }
    }
  })
  test('malformed same-phone metadata can be repaired without adding contact proof', async () => {
    const f = await reportCase(), before = await evidence(f)
    for (const reported_at of [1234, 'not-a-date', '2026-99-99T00:00:00Z', '2026-11-03T17:00:00+99:99']) {
      const corrupt = { source: 'rep_reported', phone: '+2348031234567', reported_at, reported_by: f.membership }
      await db.query("update team_awardees set metadata=jsonb_build_object('keep',true,'whatsapp_unavailable_report',$2::jsonb) where id=$1", [f.awardee, JSON.stringify(corrupt)])
      const result = await mark(f)
      assert.ok(!Number.isNaN(Date.parse(result.report.reported_at)))
      assert.equal(result.report.reported_by, f.membership)
      assert.deepEqual(await evidence(f), before)
    }
  })
  test('a concurrent suspension takes effect before a waiting report can be saved', async () => {
    const f = await reportCase()
    const locker = new pg.Client({ connectionString: url }), waiter = new pg.Client({ connectionString: url })
    await locker.connect(); await waiter.connect()
    try {
      await locker.query('begin')
      await locker.query('select id from team_memberships where id=$1 for update', [f.membership])
      await waiter.query('set role service_role')
      const pending = rpc(waiter, 'team_set_whatsapp_unavailable', [f.team, f.agent, f.awardee, '+2348031234567', true]).then(result => ({ result }), error => ({ error }))
      let blocked = false
      for (let i = 0; i < 100; i++) {
        const wait = await db.query('select cardinality(pg_blocking_pids($1)) > 0 blocked', [waiter.processID])
        if (wait.rows[0].blocked) { blocked = true; break }
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      assert.equal(blocked, true)
      await locker.query("update team_memberships set status='suspended' where id=$1", [f.membership])
      await locker.query('commit')
      const outcome = await pending
      assert.match(outcome.error?.message || '', /active assigned rep/)
      assert.equal((await db.query("select metadata ? 'whatsapp_unavailable_report' has_report from team_awardees where id=$1", [f.awardee])).rows[0].has_report, false)
    } finally {
      await locker.query('rollback').catch(() => {})
      await locker.end(); await waiter.end()
    }
  })

}
