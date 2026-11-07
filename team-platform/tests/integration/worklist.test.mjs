import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'

// Dedicated disposable database only. Run with WORKLIST_TEST_DATABASE_URL.
const url = process.env.WORKLIST_TEST_DATABASE_URL
if (!url)
  throw new Error(
    'Set WORKLIST_TEST_DATABASE_URL to a disposable PostgreSQL database',
  )
const db = new pg.Client({ connectionString: url })
const fromNow = (milliseconds) => new Date(Date.now() + milliseconds).toISOString()
const sql = (file) =>
  readFileSync(
    new URL(`../../supabase/migrations/${file}`, import.meta.url),
    'utf8',
  )
const repair = readdirSync(
  new URL('../../supabase/migrations/', import.meta.url),
).find((x) => x.endsWith('_repair_duplicate_worklist_ownership.sql'))
let team,
  actor,
  firstAgent,
  secondAgent,
  publicId,
  keeper,
  duplicate,
  commissionId,
  legacyReconcile,
  legacyBootstrap
before(async () => {
  await db.connect()
  await db.query(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    do $$ begin create role anon; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
    do $$ begin create role service_role; exception when duplicate_object then null; end $$;
    create table public.profiles (id uuid primary key references auth.users, role text, email text, phone text);
    create table public.awardees (id uuid primary key default gen_random_uuid(), profile_id uuid references profiles, name text, email text, country text, year text, metadata jsonb default '{}');
    create table public.award_payment_attempts (id uuid primary key default gen_random_uuid(), order_id uuid, provider text, charge_scope text, status text, currency text, captured_amount_minor bigint, requested_amount_minor bigint, confirmed_at timestamptz);
    create table public.award_orders (id uuid primary key default gen_random_uuid(), awardee_id uuid references awardees, profile_id uuid references profiles, email text, phone text, address_line1 text, address_line2 text, city text, state text, country text, postal_code text, award_payment_status text, award_paid_at timestamptz, paid_at timestamptz, created_at timestamptz default now(), award_amount_kobo bigint, award_paid_attempt_id uuid references award_payment_attempts);
  `)
  for (const file of [
    '20261026090000_team_platform.sql',
    '20261026120000_awardee_worklist_rules.sql',
    '20261026160000_central_admin_team_worklist.sql',
    '20261026180000_rep_access_and_assignment_controls.sql',
  ])
    await db.query(sql(file))
  team = (await db.query('select id from team_teams limit 1')).rows[0].id
  actor = (
    await db.query(
      "insert into auth.users(email) values ('admin@test.invalid') returning id",
    )
  ).rows[0].id
  await db.query("insert into profiles(id,role) values ($1,'admin')", [actor])
  await db.query(
    "insert into team_memberships(team_id,user_id,email,full_name,role,status) values ($1,$2,'admin@test.invalid','Test Admin','super_admin','active')",
    [team, actor],
  )
  const agents = await db.query(
    "insert into team_memberships(team_id,email,full_name,role,status) values ($1,'a@test.invalid','Rep A','agent','active'),($1,'b@test.invalid','Rep B','agent','active') returning id",
    [team],
  )
  ;[firstAgent, secondAgent] = agents.rows.map((x) => x.id)
  publicId = (
    await db.query(
      "insert into awardees(name,country,year) values ('Awardee One','Nigeria','2026') returning id",
    )
  ).rows[0].id
  const rows = await db.query(
    "insert into team_awardees(team_id,public_awardee_id,name,country,source_year) values ($1,$2,'Awardee One','Nigeria',2026),($1,$2,'Awardee One','Nigeria',2026) returning id",
    [team, publicId],
  )
  ;[keeper, duplicate] = rows.rows.map((x) => x.id)
  await db.query(
    "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$4,'active',now()-interval '2 days'),($1,$3,$5,'active',now()-interval '1 day')",
    [team, keeper, duplicate, firstAgent, secondAgent],
  )
  await db.query(
    "insert into team_followups(team_id,awardee_id,agent_id,channel,outcome,notes) values ($1,$2,$3,'call','interested','Preserve this history')",
    [team, duplicate, secondAgent],
  )
  // A second duplicate identity has no active owner; its ledger row must win.
  const paidId = (
    await db.query(
      "insert into awardees(name,country,year) values ('Paid Awardee','Nigeria','2026') returning id",
    )
  ).rows[0].id
  const paidRows = await db.query(
    "insert into team_awardees(team_id,public_awardee_id,name,country,source_year) values ($1,$2,'Paid Awardee','Nigeria',2026),($1,$2,'Paid Awardee','Nigeria',2026) returning id",
    [team, paidId],
  )
  await db.query(
    "insert into team_followups(team_id,awardee_id,agent_id,channel,outcome,next_followup_at) values ($1,$2,$3,'call','followup_scheduled','2026-11-05')",
    [team, paidRows.rows[0].id, firstAgent],
  )
  // Seed this legacy ledger row before the attribution migration exists. The
  // migration must preserve it for the repair-history assertion below.
  commissionId = (
    await db.query(
      "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,gen_random_uuid(),'NGN',200000,'NGN') returning id",
      [team, paidRows.rows[1].id, firstAgent],
    )
  ).rows[0].id

  // These bad earnings are seeded while the legacy schema is still active.
  // Their payment-order rows are added by the tests after the attribution
  // migration, so bootstrap cannot silently repair them before assertions.
  const legacyReconcilePublicId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Legacy reconcile','Nigeria','2026','legacy-reconcile@test.invalid') returning id",
    )
  ).rows[0].id
  const legacyReconcileAwardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Legacy reconcile','legacy-reconcile@test.invalid','Nigeria',2026) returning id",
      [team, legacyReconcilePublicId],
    )
  ).rows[0].id
  const legacyReconcileAssignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active',now()-interval '2 days') returning id",
      [team, legacyReconcileAwardeeId, firstAgent],
    )
  ).rows[0].id
  const legacyReconcilePaymentId = (
    await db.query('select gen_random_uuid() payment_id')
  ).rows[0].payment_id
  const legacyReconcileEarningId = (
    await db.query(
      "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,$4,'NGN',200000,'NGN') returning id",
      [team, legacyReconcileAwardeeId, firstAgent, legacyReconcilePaymentId],
    )
  ).rows[0].id
  const legacyReconcileWithdrawalId = (
    await db.query(
      "insert into team_withdrawal_requests(team_id,agent_id,amount_minor,settled_amount_minor,currency,payout_method,payout_details,status,idempotency_key,paid_at) values ($1,$2,200000,200000,'NGN','other','{}','paid','legacy-reconcile-withdrawal',now()) returning id",
      [team, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_withdrawal_payouts(request_id,amount_minor,currency,transaction_reference,paid_at) values ($1,200000,'NGN','legacy-reconcile-settlement',now())",
    [legacyReconcileWithdrawalId],
  )
  legacyReconcile = {
    publicAwardeeId: legacyReconcilePublicId,
    awardeeId: legacyReconcileAwardeeId,
    assignmentId: legacyReconcileAssignmentId,
    paymentId: legacyReconcilePaymentId,
    earningId: legacyReconcileEarningId,
    withdrawalId: legacyReconcileWithdrawalId,
  }

  const legacyBootstrapPublicId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Legacy bootstrap','Nigeria','2026','legacy-bootstrap@test.invalid') returning id",
    )
  ).rows[0].id
  const legacyBootstrapAwardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Legacy bootstrap','legacy-bootstrap@test.invalid','Nigeria',2026) returning id",
      [team, legacyBootstrapPublicId],
    )
  ).rows[0].id
  const legacyBootstrapAssignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active',now()-interval '2 days') returning id",
      [team, legacyBootstrapAwardeeId, firstAgent],
    )
  ).rows[0].id
  const legacyBootstrapPaymentId = (
    await db.query('select gen_random_uuid() payment_id')
  ).rows[0].payment_id
  const legacyBootstrapEarningId = (
    await db.query(
      "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,$4,'NGN',200000,'NGN') returning id",
      [team, legacyBootstrapAwardeeId, firstAgent, legacyBootstrapPaymentId],
    )
  ).rows[0].id
  legacyBootstrap = {
    publicAwardeeId: legacyBootstrapPublicId,
    awardeeId: legacyBootstrapAwardeeId,
    assignmentId: legacyBootstrapAssignmentId,
    paymentId: legacyBootstrapPaymentId,
    earningId: legacyBootstrapEarningId,
  }
  await db.query(
    sql('20261026190000_unique_active_public_awardee_per_team.sql'),
  )
  await db.query(sql('20261103120000_team_commission_attribution.sql'))
})
after(async () => {
  await db.end()
})

test('repair closes competing ownership and archives projections without deleting contact history', async () => {
  await db.query(sql(repair))
  const { rows } = await db.query(
    'select id from team_awardees where public_awardee_id=$1 and is_active',
    [publicId],
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, duplicate, 'active owner with contact history wins')
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from team_assignments a join team_awardees t on t.id=a.awardee_id where t.public_awardee_id=$1 and a.status='active'",
        [publicId],
      )
    ).rows[0].n,
    1,
  )
  const ledger = (
    await db.query(
      'select e.amount_minor,e.agent_id,t.is_active from team_commission_entries e join team_awardees t on t.id=e.awardee_id where e.id=$1',
      [commissionId],
    )
  ).rows[0]
  const contact = (
    await db.query(
      'select t.contact_status,t.next_followup_at::text from team_awardees t join team_commission_entries e on e.awardee_id=t.id where e.id=$1',
      [commissionId],
    )
  ).rows[0]
  assert.deepEqual(contact, {
    contact_status: 'contacted',
    next_followup_at: '2026-11-05',
  })
  assert.deepEqual(ledger, {
    amount_minor: '200000',
    agent_id: firstAgent,
    is_active: true,
  })
  assert.equal(
    (
      await db.query('select notes from team_followups where awardee_id=$1', [
        duplicate,
      ])
    ).rows[0].notes,
    'Preserve this history',
  )
  assert.equal(
    (
      await db.query(
        "select metadata->>'duplicate_of' canonical from team_awardees where id=$1",
        [keeper],
      )
    ).rows[0].canonical,
    duplicate,
  )
})

test('repeated and concurrent year loads cannot grow the worklist or compete for ownership', async () => {
  await db.query(
    "insert into awardees(name,country,year) values ('No Email','Nigeria','2026'),('Same Email A','Nigeria','2026'),('Same Email B','Nigeria','2026')",
  )
  await db.query(
    "update awardees set email='shared@test.invalid' where name like 'Same Email%'",
  )
  const run = () =>
    db.query('select team_assign_from_awardee_year($1,2026,$2) result', [
      team,
      actor,
    ])
  await run()
  const before = (
    await db.query('select count(*)::int n from team_awardees where is_active')
  ).rows[0].n
  const again = (await run()).rows[0].result
  assert.equal(again.loaded, 0)
  assert.equal(again.assigned, 0)
  assert.equal(
    (
      await db.query(
        'select count(*)::int n from team_awardees where is_active',
      )
    ).rows[0].n,
    before,
  )
  const other = new pg.Client({ connectionString: url })
  await other.connect()
  try {
    await db.query(
      "insert into awardees(name,country,year) values ('Concurrent','Nigeria','2026')",
    )
    const results = await Promise.all([
      run(),
      other.query('select team_assign_from_awardee_year($1,2026,$2) result', [
        team,
        actor,
      ]),
    ])
    assert.equal(
      results.reduce((sum, x) => sum + x.rows[0].result.loaded, 0),
      1,
    )
    assert.equal(
      results.reduce((sum, x) => sum + x.rows[0].result.assigned, 0),
      1,
    )
  } finally {
    await other.end()
  }
  assert.equal(
    (
      await db.query(
        'select count(*)::int n from (select team_id,public_awardee_id from team_awardees where is_active group by 1,2 having count(*)>1) x',
      )
    ).rows[0].n,
    0,
  )
})

test('atomic scope validates capacity, rejects unauthorized actors and excludes verified orders', async () => {
  await assert.rejects(
    db.query("select team_distribute_awardee_year($1,2026,$2,'Nigeria',0)", [
      team,
      actor,
    ]),
  )
  await assert.rejects(
    db.query(
      "select team_distribute_awardee_year($1,2026,gen_random_uuid(),'Nigeria',100)",
      [team],
    ),
  )
  const paid = (
    await db.query(
      "insert into awardees(name,country,year) values ('Already Paid','Nigeria','2026') returning id",
    )
  ).rows[0].id
  await db.query(
    "insert into award_orders(awardee_id,award_payment_status,award_amount_kobo) values ($1,'paid',10000)",
    [paid],
  )
  await db.query(
    "insert into awardees(name,country,year) select 'New '||n,'Nigeria','2026' from generate_series(1,10) n",
  )
  await db.query(
    "select team_distribute_awardee_year($1,2026,$2,'Nigeria',4)",
    [team, actor],
  )
  assert.equal(
    (
      await db.query(
        'select count(*)::int n from team_awardees where public_awardee_id=$1',
        [paid],
      )
    ).rows[0].n,
    0,
  )
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from (select agent_id from team_assignments where status='active' group by agent_id having count(*)>4) x",
      )
    ).rows[0].n,
    0,
  )
})

test('manual reassignment validates team and active record, respects cap and keeps history', async () => {
  await assert.rejects(
    db.query("select team_reassign_awardee($1,$2,$3,$4,'test')", [
      team,
      actor,
      keeper,
      firstAgent,
    ]),
  )
  await assert.rejects(
    db.query(
      "select team_reassign_awardee($1,$2,gen_random_uuid(),$3,'test')",
      [team, actor, firstAgent],
    ),
  )
  await assert.rejects(
    db.query("select team_reassign_awardee($1,$2,$3,$4,'test')", [
      team,
      actor,
      duplicate,
      firstAgent,
    ]),
  )
  await db.query(
    'update team_settings set max_awardees_per_agent=10 where team_id=$1',
    [team],
  )
  const result = (
    await db.query(
      "select team_reassign_awardee($1,$2,$3,$4,'Rep on leave') result",
      [team, actor, duplicate, firstAgent],
    )
  ).rows[0].result
  assert.equal(result.outcome, 'reassigned')
  assert.equal(
    (
      await db.query(
        "select agent_id from team_assignments where awardee_id=$1 and status='active'",
        [duplicate],
      )
    ).rows[0].agent_id,
    firstAgent,
  )
  assert.equal(
    (
      await db.query(
        'select count(*)::int n from team_followups where awardee_id=$1',
        [duplicate],
      )
    ).rows[0].n,
    1,
  )
})

test('upgrades the legacy view so the admin year pool and ownership summary can load', async () => {
  const expectedActive = (
    await db.query('select count(*)::int n from team_awardees where is_active')
  ).rows[0].n
  const expectedLedgerRows = (
    await db.query('select count(*)::int n from team_commission_entries')
  ).rows[0].n
  const result = (
    await db.query(
      "select team_worklist_summary($1,2026,'Nigeria',$2) result",
      [team, actor],
    )
  ).rows[0].result
  assert.equal(result.total, expectedActive)
  const directory = (
    await db.query(
      'select source_year,agent_name from team_awardee_directory where is_active and source_year=2026',
    )
  ).rows
  assert.equal(directory.length, expectedActive)
  assert.ok(directory.some((row) => row.agent_name === 'Rep A'))
  // Running the repair again must preserve the same active set and ledger.
  await db.query(sql(repair))
  assert.equal(
    (
      await db.query(
        'select count(*)::int n from team_awardees where is_active',
      )
    ).rows[0].n,
    expectedActive,
  )
  assert.equal(
    (await db.query('select count(*)::int n from team_commission_entries'))
      .rows[0].n,
    expectedLedgerRows,
  )
})


test('supports integer award years and one country scope across casing and whitespace', async () => {
  await db.query('alter table public.awardees alter column year type integer using btrim(year)::integer')
  await db.query("insert into awardees(name,country,year) values ('Mixed country',' NIGERIA ',2028),('Mixed country two','nigeria',2028)")
  const options = (await db.query('select team_awardee_country_options(2028) options')).rows[0].options
  assert.deepEqual(options,[{country:'Nigeria',total:2,unpaid:2}])
  const run = (await db.query("select team_distribute_awardee_year($1,2028,$2,'Nigeria',100) result",[team,actor])).rows[0].result
  assert.equal(run.loaded,2)
  assert.equal(run.assigned,2)
  const summary = (await db.query("select team_worklist_summary($1,2028,'Nigeria',$2) result",[team,actor])).rows[0].result
  const rows = (await db.query("select id from team_awardee_directory where source_year=2028 and country ilike 'Nigeria' and is_active")).rows
  assert.equal(summary.total,2)
  assert.equal(rows.length,2)
})

test('does not credit assignment alone and releases the assigned rep after an independent payment', async () => {
  const paidAt = '2026-09-01T12:00:00.000Z'
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Independent payer','Nigeria','2026','independent@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Independent payer','independent@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id

  const result = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result

  assert.equal(result.outcome, 'paid_without_qualifying_contact')
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from team_commission_entries where payment_id=$1 and entry_type='earning'",
        [paymentId],
      )
    ).rows[0].n,
    0,
  )
  assert.deepEqual(
    (
      await db.query(
        'select status,ended_at is not null as ended from team_assignments where id=$1',
        [assignmentId],
      )
    ).rows[0],
    { status: 'removed', ended: true },
  )
})

test('rejects a backdated contact recorded after payment', async () => {
  const paidAt = '2026-09-10T12:00:00.000Z'
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Late logger','Nigeria','2026','late@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Late logger','late@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  const followupId = (
    await db.query(
      "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at,created_at) values ($1,$2,$3,$4,'call','interested','Discussed payment timing and next steps','2026-09-01T12:00:00Z','2026-09-11T12:00:00Z') returning id",
      [team, assignmentId, awardeeId, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "update team_followups set outcome='payment_verified',notes='Forged post-payment upgrade',contacted_at='2026-09-09T12:00:00Z',created_at='2026-09-01T12:00:00Z' where id=$1",
    [followupId],
  )
  const frozen = (
    await db.query('select outcome,notes,contacted_at,created_at,recorded_at from team_followups where id=$1', [followupId])
  ).rows[0]
  assert.equal(frozen.outcome, 'interested')
  assert.equal(frozen.notes, 'Discussed payment timing and next steps')
  assert.equal(new Date(frozen.contacted_at).toISOString(), '2026-09-01T12:00:00.000Z')
  assert.equal(new Date(frozen.recorded_at).toISOString(), new Date(frozen.created_at).toISOString())
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id

  const result = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result

  assert.equal(result.outcome, 'paid_without_qualifying_contact')
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from team_commission_entries where payment_id=$1 and entry_type='earning'",
        [paymentId],
      )
    ).rows[0].n,
    0,
  )
  assert.ok(
    new Date(
      (
        await db.query('select recorded_at from team_followups where awardee_id=$1', [awardeeId])
      ).rows[0].recorded_at,
    ) > new Date(paidAt),
    'the database-controlled recorded_at must remain after the payment',
  )
})

test('requires the actual paid award order and source values', async () => {
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year) values ('Source validation','Nigeria','2026') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,country,source_year) values ($1,$2,'Source validation','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const missingPaymentId = (
    await db.query('select gen_random_uuid() payment_id')
  ).rows[0].payment_id
  await assert.rejects(
    db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',0,$4,$5)",
      [team, awardeeId, missingPaymentId, fromNow(60 * 60 * 1000), actor],
    ),
    /paid award order source/i,
  )

  const paidAt = fromNow(60 * 60 * 1000)
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id
  const mismatchedOrderAttemptId = (
    await db.query(
      "insert into award_payment_attempts(order_id,provider,charge_scope,status,currency,requested_amount_minor,captured_amount_minor,confirmed_at) values (gen_random_uuid(),'bachs','award_fee','succeeded','NGN',2500000,2500000,now()) returning id",
    )
  ).rows[0].id
  await db.query('update award_orders set award_paid_attempt_id=$1 where id=$2', [mismatchedOrderAttemptId, paymentId])
  await assert.rejects(
    db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5)",
      [team, awardeeId, paymentId, paidAt, actor],
    ),
    /canonical succeeded award-fee source/i,
  )

  const failedAttemptId = (
    await db.query(
      "insert into award_payment_attempts(order_id,provider,charge_scope,status,currency,requested_amount_minor,captured_amount_minor,confirmed_at) values ($1,'bachs','award_fee','failed','NGN',2500000,2500000,now()) returning id",
      [paymentId],
    )
  ).rows[0].id
  await db.query('update award_orders set award_paid_attempt_id=$1 where id=$2', [failedAttemptId, paymentId])
  await assert.rejects(
    db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5)",
      [team, awardeeId, paymentId, paidAt, actor],
    ),
    /canonical succeeded award-fee source/i,
  )

  const nonCanonicalProviderAttemptId = (
    await db.query(
      "insert into award_payment_attempts(order_id,provider,charge_scope,status,currency,requested_amount_minor,captured_amount_minor,confirmed_at) values ($1,'paystack','legacy_award_plus_delivery','succeeded','NGN',2500000,2500000,now()) returning id",
      [paymentId],
    )
  ).rows[0].id
  await db.query('update award_orders set award_paid_attempt_id=$1 where id=$2', [nonCanonicalProviderAttemptId, paymentId])
  await assert.rejects(
    db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5)",
      [team, awardeeId, paymentId, paidAt, actor],
    ),
    /canonical succeeded award-fee source/i,
  )

  await db.query('update award_orders set award_paid_attempt_id=null where id=$1', [paymentId])
  await assert.rejects(
    db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',0,$4,$5)",
      [team, awardeeId, paymentId, paidAt, actor],
    ),
    /amount does not match/i,
  )
  await assert.rejects(
    db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5)",
      [team, awardeeId, paymentId, fromNow(2 * 60 * 60 * 1000), actor],
    ),
    /timestamp does not match/i,
  )
})

test('does not let a conflicting explicit public awardee fall through to profile matching', async () => {
  const profileId = (
    await db.query("insert into auth.users(email) values ('conflicting-source@test.invalid') returning id")
  ).rows[0].id
  await db.query("insert into profiles(id,role,email) values ($1,'member','conflicting-source@test.invalid')", [profileId])
  const linkedPublicAwardeeId = (
    await db.query("insert into awardees(name,country,year) values ('Profile-linked source','Nigeria','2026') returning id")
  ).rows[0].id
  const conflictingPublicAwardeeId = (
    await db.query("insert into awardees(name,country,year) values ('Conflicting source','Nigeria','2026') returning id")
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,profile_id,name,country,source_year) values ($1,$2,$3,'Profile-linked source','Nigeria',2026) returning id",
      [team, linkedPublicAwardeeId, profileId],
    )
  ).rows[0].id
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,profile_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,$2,'paid',$3,2500000) returning id",
      [conflictingPublicAwardeeId, profileId, fromNow(60 * 60 * 1000)],
    )
  ).rows[0].id
  assert.equal(
    (
      await db.query('select count(*)::int n from team_payment_attributions where payment_id=$1', [paymentId])
    ).rows[0].n,
    0,
  )
  await assert.rejects(
    db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5)",
      [team, awardeeId, paymentId, fromNow(60 * 60 * 1000), actor],
    ),
    /does not belong to this team awardee/i,
  )
})

test('credits a substantive call recorded before payment and exposes the canonical attribution', async () => {
  const paidAt = fromNow(60 * 60 * 1000)
  const endedAt = fromNow(2 * 60 * 60 * 1000)
  const laterAssignedAt = fromNow(90 * 60 * 1000)
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Qualified caller','Nigeria','2026','caller@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Qualified caller','caller@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, secondAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at,created_at) values ($1,$2,$3,$4,'call','interested','Discussed payment timing and confirmed the secure checkout link','2026-09-10T12:00:00Z','2026-09-10T12:01:00Z')",
    [team, assignmentId, awardeeId, secondAgent],
  )
  await db.query(
    "update team_assignments set status='reassigned', ended_at=$2 where id=$1",
    [assignmentId, endedAt],
  )
  const laterAssignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active',$4) returning id",
      [team, awardeeId, firstAgent, laterAssignedAt],
    )
  ).rows[0].id
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id

  const result = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result

  assert.equal(result.outcome, 'commission_created')
  assert.equal(result.agent_id, secondAgent)
  assert.equal(result.released_assignments, 1)
  assert.equal(
    (
      await db.query('select status from team_assignments where id=$1', [laterAssignmentId])
    ).rows[0].status,
    'removed',
  )
  const attribution = (
    await db.query(
      'select id,team_awardee_id,awardee_id,agent_id,assignment_id,payment_id,contact_channel,provider_verified from team_payment_attributions where payment_id=$1',
      [paymentId],
    )
  ).rows[0]
  assert.deepEqual(attribution, {
    id: awardeeId,
    team_awardee_id: awardeeId,
    awardee_id: awardeeId,
    agent_id: secondAgent,
    assignment_id: assignmentId,
    payment_id: paymentId,
    contact_channel: 'call',
    provider_verified: false,
  })
})

test('requires provider evidence for a successful email follow-up', async () => {
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Email proof','Nigeria','2026','email-proof@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Email proof','email-proof@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id

  await assert.rejects(
    db.query(
      "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at) values ($1,$2,$3,$4,'email','email_sent','Manual claim of delivery','2026-09-10T12:00:00Z')",
      [team, assignmentId, awardeeId, firstAgent],
    ),
    /provider|email/i,
  )

  const paidAt = fromNow(60 * 60 * 1000)
  const emailLogId = (
    await db.query(
      "insert into team_email_logs(team_id,awardee_id,agent_id,to_email,subject,body,status,provider_message_id,idempotency_key,attempted_at,sent_at,created_at) values ($1,$2,$3,'email-proof@test.invalid','Payment','Payment details','sent','provider-123','email-proof-key','2026-09-10T12:00:00Z','2026-09-10T12:01:00Z','2026-09-10T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,email_log_id,contacted_at,created_at) values ($1,$2,$3,$4,'email','email_sent','Provider confirmed delivery',$5,'2026-09-10T12:01:00Z','2026-09-10T12:02:00Z')",
    [team, assignmentId, awardeeId, firstAgent, emailLogId],
  )
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id
  const result = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result
  assert.equal(result.outcome, 'commission_created')
  assert.equal(result.agent_id, firstAgent)
})

test('returns a stable already-reversed result on same-agent payment replay', async () => {
  const paidAt = fromNow(2 * 60 * 60 * 1000)
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Replay awardee','Nigeria','2026','replay@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Replay awardee','replay@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at) values ($1,$2,$3,$4,'call','interested','Confirmed the payment timeline and secure link','2026-09-10T12:00:00Z')",
    [team, assignmentId, awardeeId, firstAgent],
  )
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id
  const first = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result
  assert.equal(first.outcome, 'commission_created')
  const refunded = (
    await db.query(
      "select team_reverse_verified_payment($1,$2,'award_order',$3,'Replay refund',$4) result",
      [team, awardeeId, paymentId, actor],
    )
  ).rows[0].result
  assert.equal(refunded.outcome, 'reversed')
  const replay = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result
  assert.equal(replay.outcome, 'already_reversed')
  assert.equal(
    (
      await db.query("select count(*)::int n from team_commission_entries where payment_id=$1 and entry_type='earning'", [paymentId])
    ).rows[0].n,
    1,
  )
})

test('refund reverses the latest corrected earning and reconciliation view stays one row', async () => {
  const paidAt = fromNow(4 * 60 * 60 * 1000)
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Corrected refund','Nigeria','2026','corrected-refund@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Corrected refund','corrected-refund@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const firstAssignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at) values ($1,$2,$3,$4,'call','interested','Rep A confirmed the payment timeline','2026-09-10T12:00:00Z')",
    [team, firstAssignmentId, awardeeId, firstAgent],
  )
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id
  const first = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result
  assert.equal(first.agent_id, firstAgent)
  await db.query(
    "update team_assignments set status='reassigned', ended_at=$2 where id=$1",
    [firstAssignmentId, fromNow(5 * 60 * 60 * 1000)],
  )
  const secondAssignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-02T12:00:00Z') returning id",
      [team, awardeeId, secondAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at) values ($1,$2,$3,$4,'call','interested','Rep B later confirmed the payment timeline','2026-09-11T12:00:00Z')",
    [team, secondAssignmentId, awardeeId, secondAgent],
  )
  const corrected = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result
  assert.equal(corrected.outcome, 'commission_corrected')
  assert.equal(corrected.agent_id, secondAgent)
  const refunded = (
    await db.query(
      "select team_reverse_verified_payment($1,$2,'award_order',$3,'Corrected refund',$4) result",
      [team, awardeeId, paymentId, actor],
    )
  ).rows[0].result
  assert.equal(refunded.outcome, 'reversed')
  const latest = (
    await db.query(
      "select e.agent_id from team_commission_entries e where e.payment_id=$1 and e.entry_type='earning' and exists (select 1 from team_commission_entries r where r.parent_commission_id=e.id and r.entry_type='reversal') order by e.created_at desc limit 1",
      [paymentId],
    )
  ).rows[0]
  assert.equal(latest.agent_id, secondAgent)
  assert.equal(
    (
      await db.query('select count(*)::int n from team_payment_reconciliation where team_id=$1 and award_order_id=$2', [team, paymentId])
    ).rows[0].n,
    1,
  )
})

test('reversing a pending earning preserves pending availability buckets', async () => {
  await db.query("update team_settings set commission_hold_hours=24 where team_id=$1", [team])
  const paidAt = fromNow(60 * 60 * 1000)
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Pending reversal','Nigeria','2026','pending-reversal@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Pending reversal','pending-reversal@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at) values ($1,$2,$3,$4,'call','interested','Confirmed the payment timeline and secure link','2026-09-10T12:00:00Z')",
    [team, assignmentId, awardeeId, firstAgent],
  )
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id
  const earning = (
    await db.query(
      "select (team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5)->>'commission_id')::uuid id",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].id
  const before = (
    await db.query('select status,available_at from team_commission_entries where id=$1', [earning])
  ).rows[0]
  assert.equal(before.status, 'pending')
  const reversalId = (
    await db.query(
      "select team_reverse_commission_entry($1,'Pending reversal',$2) id",
      [earning, actor],
    )
  ).rows[0].id
  const after = (
    await db.query('select status,available_at,amount_minor from team_commission_entries where id=$1', [reversalId])
  ).rows[0]
  assert.deepEqual(after, { status: 'pending', available_at: before.available_at, amount_minor: '-200000' })

  // The hold worker must release both sides of an append-only correction. The
  // legacy worker filtered on amount_minor > 0, which resurrected the earning
  // while leaving its negative reversal pending.
  await db.query(
    "update team_commission_entries set available_at=now()-interval '1 minute' where id = any($1::uuid[])",
    [[earning, reversalId]],
  )
  const released = (
    await db.query('select team_release_commissions() released')
  ).rows[0].released
  assert.equal(released, 2)
  const pair = (
    await db.query(
      "select status, count(*)::int n, coalesce(sum(amount_minor),0)::text net from team_commission_entries where id = any($1::uuid[]) group by status order by status",
      [[earning, reversalId]],
    )
  ).rows
  assert.deepEqual(pair, [{ status: 'confirmed', n: 2, net: '0' }])
})

test('reconciliation reverses an old unqualified earning once and preserves paid withdrawal history', async () => {
  const paidAt = fromNow(60 * 60 * 1000)
  const { publicAwardeeId, awardeeId, assignmentId, paymentId, earningId, withdrawalId } = legacyReconcile
  await db.query(
    "insert into award_orders(id,awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,$2,'paid',$3,2500000)",
    [paymentId, publicAwardeeId, paidAt],
  )

  const firstRun = (
    await db.query('select team_reconcile_payments($1,$2,500) result', [team, actor])
  ).rows[0].result
  assert.ok(firstRun.commissions_corrected >= 1)
  const reversal = (
    await db.query(
      "select id,amount_minor,parent_commission_id from team_commission_entries where parent_commission_id=$1 and entry_type='reversal'",
      [earningId],
    )
  ).rows
  assert.equal(reversal.length, 1)
  assert.equal(reversal[0].amount_minor, '-200000')
  assert.equal(
    (
      await db.query('select status,settled_amount_minor from team_withdrawal_requests where id=$1', [withdrawalId])
    ).rows[0].status,
    'paid',
  )
  assert.equal(
    (
      await db.query('select count(*)::int n from team_assignments where id=$1 and status=\'active\'', [assignmentId])
    ).rows[0].n,
    0,
  )

  await db.query('select team_reconcile_payments($1,$2,500) result', [team, actor])
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from team_commission_entries where parent_commission_id=$1 and entry_type='reversal'",
        [earningId],
      )
    ).rows[0].n,
    1,
  )

  const blockedWithdrawalId = (
    await db.query(
      "insert into team_withdrawal_requests(team_id,agent_id,amount_minor,currency,payout_method,payout_details,status,idempotency_key) values ($1,$2,500000,'NGN','other','{}','requested','underfunded-after-reversal') returning id",
      [team, firstAgent],
    )
  ).rows[0].id
  await assert.rejects(
    db.query(
      "select team_transition_withdrawal($1,$2,'approve') result",
      [blockedWithdrawalId, actor],
    ),
    /ledger no longer covers/i,
  )
  await assert.rejects(
    db.query(
      "update team_withdrawal_requests set status='approved' where id=$1",
      [blockedWithdrawalId],
    ),
    /ledger no longer covers/i,
  )
  assert.equal(
    (
      await db.query('select status from team_withdrawal_requests where id=$1', [blockedWithdrawalId])
    ).rows[0].status,
    'requested',
  )
})

test('releases every active assignment for a profile-linked duplicate identity', async () => {
  const paidAt = '2026-09-28T12:00:00.000Z'
  const profileId = (
    await db.query("insert into auth.users(email) values ('profile-duplicate@test.invalid') returning id")
  ).rows[0].id
  await db.query("insert into profiles(id,role,email) values ($1,'member','profile-duplicate@test.invalid')", [profileId])
  const awardeeOne = (
    await db.query(
      "insert into team_awardees(team_id,profile_id,name,email,country,source_year) values ($1,$2,'Profile duplicate A','profile-duplicate@test.invalid','Nigeria',2026) returning id",
      [team, profileId],
    )
  ).rows[0].id
  const awardeeTwo = (
    await db.query(
      "insert into team_awardees(team_id,profile_id,name,email,country,source_year) values ($1,$2,'Profile duplicate B','profile-duplicate@test.invalid','Nigeria',2026) returning id",
      [team, profileId],
    )
  ).rows[0].id
  await db.query(
    "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z'),($1,$4,$5,'active','2026-08-02T12:00:00Z')",
    [team, awardeeOne, firstAgent, awardeeTwo, secondAgent],
  )
  const paymentId = (
    await db.query(
      "insert into award_orders(profile_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [profileId, paidAt],
    )
  ).rows[0].id
  const result = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeOne, paymentId, paidAt, actor],
    )
  ).rows[0].result
  assert.equal(result.outcome, 'paid_without_qualifying_contact')
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from team_assignments where awardee_id in ($1,$2) and status='active'",
        [awardeeOne, awardeeTwo],
      )
    ).rows[0].n,
    0,
  )
})

test('does not qualify a non-action WhatsApp log with a non-substantive note', async () => {
  const paidAt = '2026-09-30T12:00:00.000Z'
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('WhatsApp no action','Nigeria','2026','whatsapp-noaction@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'WhatsApp no action','whatsapp-noaction@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id
  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at,created_at) values ($1,$2,$3,$4,'whatsapp','message_sent','ok','2026-09-10T12:00:00Z','2026-09-10T12:01:00Z')",
    [team, assignmentId, awardeeId, firstAgent],
  )
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, paidAt],
    )
  ).rows[0].id
  const result = (
    await db.query(
      "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2500000,$4,$5) result",
      [team, awardeeId, paymentId, paidAt, actor],
    )
  ).rows[0].result
  assert.equal(result.outcome, 'paid_without_qualifying_contact')
})

test('rejects unqualified direct earnings and blocks a second unreversed earning', async () => {
  const publicAwardeeId = (
    await db.query(
      "insert into awardees(name,country,year,email) values ('Open earning guard','Nigeria','2026','earning-guard@test.invalid') returning id",
    )
  ).rows[0].id
  const awardeeId = (
    await db.query(
      "insert into team_awardees(team_id,public_awardee_id,name,email,country,source_year) values ($1,$2,'Open earning guard','earning-guard@test.invalid','Nigeria',2026) returning id",
      [team, publicAwardeeId],
    )
  ).rows[0].id

  const unqualifiedPaymentId = (
    await db.query('select gen_random_uuid() payment_id')
  ).rows[0].payment_id
  await assert.rejects(
    db.query(
      "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,$4,'NGN',200000,'NGN')",
      [team, awardeeId, firstAgent, unqualifiedPaymentId],
    ),
    /canonical qualifying contact attribution/i,
  )

  const assignmentId = (
    await db.query(
      "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active','2026-08-01T12:00:00Z') returning id",
      [team, awardeeId, firstAgent],
    )
  ).rows[0].id
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at,created_at) values ($1,$2,$3,$4,'call','interested','Confirmed the payment timeline and resent the secure link','2026-09-01T12:00:00Z','2026-09-01T12:01:00Z')",
    [team, assignmentId, awardeeId, firstAgent],
  )
  const paymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, fromNow(60 * 60 * 1000)],
    )
  ).rows[0].id
  await db.query(
    "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,$4,'NGN',200000,'NGN')",
    [team, awardeeId, firstAgent, paymentId],
  )
  await assert.rejects(
    db.query(
      "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,$4,'NGN',200000,'NGN')",
      [team, awardeeId, secondAgent, paymentId],
    ),
    /unreversed commission earning/i,
  )

  const usdPaymentId = (
    await db.query(
      "insert into award_orders(awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,'paid',$2,2500000) returning id",
      [publicAwardeeId, fromNow(2 * 60 * 60 * 1000)],
    )
  ).rows[0].id
  await assert.rejects(
    db.query(
      "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,$4,'USD',200000,'USD')",
      [team, awardeeId, firstAgent, usdPaymentId],
    ),
    /team_commission_entries_currency_ngn_check|NGN-only commission ledger/i,
  )
})

test('rerunning the migration performs an all-history idempotent bootstrap repair without notifications', async () => {
  const paidAt = fromNow(60 * 60 * 1000)
  const { publicAwardeeId, awardeeId, assignmentId, paymentId, earningId } = legacyBootstrap
  await db.query(
    "insert into award_orders(id,awardee_id,award_payment_status,award_paid_at,award_amount_kobo) values ($1,$2,'paid',$3,2500000)",
    [paymentId, publicAwardeeId, paidAt],
  )
  const beforeNotifications = (
    await db.query('select count(*)::int n from team_notifications')
  ).rows[0].n

  await db.query(sql('20261103120000_team_commission_attribution.sql'))

  assert.equal(
    (
      await db.query(
        "select count(*)::int n from team_commission_entries where parent_commission_id=$1 and entry_type='reversal'",
        [earningId],
      )
    ).rows[0].n,
    1,
  )
  assert.equal(
    (
      await db.query('select count(*)::int n from team_notifications')
    ).rows[0].n,
    beforeNotifications,
  )
  assert.equal(
    (
      await db.query('select count(*)::int n from team_assignments where id=$1 and status=\'active\'', [assignmentId])
    ).rows[0].n,
    0,
  )
})

test('excludes a settled coupon from attribution, the ledger, and sales reports', async () => {
  // The main payment migration owns this column. This suite uses a minimal
  // payment fixture and exercises the real production sales migration.
  await db.query('alter table award_payment_attempts add column award_coupon_id uuid')
  await db.query(sql('20261103120002_team_legacy_contact_grace.sql'))
  await db.query(sql('20261107120001_team_exclude_award_coupon_payments.sql'))

  const { rows: [person] } = await db.query(
    "insert into awardees(name,country,year) values ('Coupon customer','Nigeria','2026') returning id",
  )
  const { rows: [projection] } = await db.query(
    "insert into team_awardees(team_id,public_awardee_id,name,country,source_year) values ($1,$2,'Coupon customer','Nigeria',2026) returning id",
    [team, person.id],
  )
  const { rows: [assignment] } = await db.query(
    "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active',now()-interval '2 days') returning id",
    [team, projection.id, firstAgent],
  )
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at,created_at) values ($1,$2,$3,$4,'call','interested','Discussed payment timing and confirmed the secure checkout link',now()-interval '1 day',now()-interval '1 day')",
    [team, assignment.id, projection.id, firstAgent],
  )
  const { rows: [order] } = await db.query(
    "insert into award_orders(awardee_id,award_payment_status,award_amount_kobo) values ($1,'pending',2500000) returning id",
    [person.id],
  )
  const { rows: [attempt] } = await db.query(
    "insert into award_payment_attempts(order_id,provider,charge_scope,status,currency,requested_amount_minor,captured_amount_minor,confirmed_at,award_coupon_id) values ($1,'bachs','award_fee','succeeded','NGN',2000000,2000000,now(),gen_random_uuid()) returning id",
    [order.id],
  )
  const { rows: [eligible] } = await db.query('select kind from team_qualifying_contacts($1,now())', [assignment.id])
  assert.ok(eligible, 'the rep has contact evidence that would otherwise qualify')
  await db.query("update award_orders set award_payment_status='paid', award_paid_at=now() where id=$1", [order.id])
  const assertExcluded = async () => {
    const { rows: [actual] } = await db.query(
      `select
        (select count(*)::int from team_commission_entries where payment_id=$1) as earnings,
        (select count(*)::int from team_payment_attributions where payment_id=$1) as attributions,
        (select count(*)::int from team_payment_reconciliation where award_order_id=$1) as sales,
        (select count(*)::int from team_awardee_directory where public_awardee_id=$2 and payment_status='paid') as report_paid,
        (select count(*)::int from team_awardees where public_awardee_id=$2 and (is_active or payment_source_id is not null or payment_amount_minor is not null)) as active_or_recorded`,
      [order.id, person.id],
    )
    assert.deepEqual(actual, { earnings: 0, attributions: 0, sales: 0, report_paid: 0, active_or_recorded: 0 })
  }
  await assertExcluded()
  await db.query('update award_orders set award_paid_attempt_id=$2 where id=$1', [order.id, attempt.id])
  await assertExcluded()
  assert.equal((await db.query('select status from team_assignments where id=$1', [assignment.id])).rows[0].status, 'removed')
  const { rows: [replay] } = await db.query(
    "select team_apply_verified_payment($1,$2,'award_order',$3,'NGN',2000000,null,$4) as result",
    [team, projection.id, order.id, actor],
  )
  assert.equal(replay.result.outcome, 'coupon_excluded')
  await db.query('select team_reconcile_payments($1,$2,0)', [team, actor])

  // A projection linked after settlement should close without copying payment evidence.
  await db.query("insert into team_awardees(team_id,public_awardee_id,name) values ($1,$2,'Coupon customer linked later')", [team, person.id])
  await db.query("update award_orders set award_payment_status='refunded' where id=$1", [order.id])
  await assertExcluded()
})

test('still credits the full-price settlement when an earlier coupon attempt was abandoned', async () => {
  const { rows: [person] } = await db.query(
    "insert into awardees(name,country,year) values ('Full-price customer','Nigeria','2026') returning id",
  )
  const { rows: [projection] } = await db.query(
    "insert into team_awardees(team_id,public_awardee_id,name,country,source_year) values ($1,$2,'Full-price customer','Nigeria',2026) returning id",
    [team, person.id],
  )
  const { rows: [assignment] } = await db.query(
    "insert into team_assignments(team_id,awardee_id,agent_id,status,assigned_at) values ($1,$2,$3,'active',now()-interval '2 days') returning id",
    [team, projection.id, firstAgent],
  )
  await db.query(
    "insert into team_followups(team_id,assignment_id,awardee_id,agent_id,channel,outcome,notes,contacted_at,created_at) values ($1,$2,$3,$4,'call','interested','Discussed payment timing and confirmed the secure checkout link',now()-interval '1 day',now()-interval '1 day')",
    [team, assignment.id, projection.id, firstAgent],
  )
  const { rows: [order] } = await db.query(
    "insert into award_orders(awardee_id,award_payment_status,award_amount_kobo) values ($1,'pending',2500000) returning id",
    [person.id],
  )
  await db.query(
    "insert into award_payment_attempts(order_id,provider,charge_scope,status,currency,requested_amount_minor,award_coupon_id) values ($1,'bachs','award_fee','expired','NGN',2000000,gen_random_uuid())",
    [order.id],
  )
  const { rows: [attempt] } = await db.query(
    "insert into award_payment_attempts(order_id,provider,charge_scope,status,currency,requested_amount_minor,captured_amount_minor,confirmed_at) values ($1,'bachs','award_fee','succeeded','NGN',2500000,2500000,now()) returning id",
    [order.id],
  )
  await db.query("update award_orders set award_payment_status='paid', award_paid_at=now(), award_paid_attempt_id=$2 where id=$1", [order.id, attempt.id])
  assert.equal((await db.query("select count(*)::int as count from team_commission_entries where payment_id=$1 and entry_type='earning'", [order.id])).rows[0].count, 1)
  assert.equal((await db.query("select reconciliation_state from team_payment_reconciliation where award_order_id=$1", [order.id])).rows[0].reconciliation_state, 'reconciled')
})
