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
  commissionId
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
    create table public.award_payment_attempts (id uuid primary key default gen_random_uuid(), currency text, captured_amount_minor bigint, requested_amount_minor bigint);
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
  commissionId = (
    await db.query(
      "insert into team_commission_entries(team_id,awardee_id,agent_id,payment_id,payment_currency,amount_minor,currency) values ($1,$2,$3,gen_random_uuid(),'NGN',200000,'NGN') returning id",
      [team, paidRows.rows[1].id, firstAgent],
    )
  ).rows[0].id
  await db.query(
    sql('20261026190000_unique_active_public_awardee_per_team.sql'),
  )
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
  const result = (
    await db.query(
      "select team_worklist_summary($1,2026,'Nigeria',$2) result",
      [team, actor],
    )
  ).rows[0].result
  assert.equal(result.total, 16)
  const directory = (
    await db.query(
      'select source_year,agent_name from team_awardee_directory where is_active and source_year=2026',
    )
  ).rows
  assert.equal(directory.length, 16)
  assert.ok(directory.some((row) => row.agent_name === 'Rep A'))
  // Running the repair again must preserve the same active set and ledger.
  await db.query(sql(repair))
  assert.equal(
    (
      await db.query(
        'select count(*)::int n from team_awardees where is_active',
      )
    ).rows[0].n,
    16,
  )
  assert.equal(
    (await db.query('select count(*)::int n from team_commission_entries'))
      .rows[0].n,
    1,
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
