import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHmac, randomUUID } from 'node:crypto'
import pg from 'pg'

const url = process.env.TEAM_CONTACT_PROOF_TEST_DATABASE_URL

if (!url) {
  test('contact proof SQL integration suite requires TEAM_CONTACT_PROOF_TEST_DATABASE_URL', {
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
  const baseMigrationFiles = [
    '20261026090000_team_platform.sql',
    '20261026120000_awardee_worklist_rules.sql',
    '20261026160000_central_admin_team_worklist.sql',
    '20261026180000_rep_access_and_assignment_controls.sql',
    '20261026190000_unique_active_public_awardee_per_team.sql',
    '20261103120000_team_commission_attribution.sql',
  ]
  const proofMigrationFile = '20261103120001_team_contact_confirmation_proof.sql'
  const migration = (file) => readFileSync(new URL(file, migrationDir), 'utf8')
  const query = (text, values = []) => db.query(text, values)

  let teamId
  let repId
  let secondRepId
  let repMembershipId
  let legacyBackfill

  async function asRole(role, fn) {
    await query('set role ' + role)
    try {
      return await fn()
    } finally {
      await query('reset role')
    }
  }

  async function rpc(name, values) {
    return asRole('service_role', async () => {
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ')
      const result = await query('select public.' + name + '(' + placeholders + ') as result', values)
      return result.rows[0].result
    })
  }

  async function rpcWithClient(client, name, values) {
    await client.query('set role service_role')
    try {
      const placeholders = values.map((_, index) => '$' + (index + 1)).join(', ')
      const result = await client.query('select public.' + name + '(' + placeholders + ') as result', values)
      return result.rows[0].result
    } finally {
      await client.query('reset role')
      await client.end()
    }
  }

  async function createCase(label, options = {}) {
    const suffix = label + '-' + randomUUID().slice(0, 8)
    const requestedEmail = options.email || 'recipient-' + suffix + '@test.invalid'
    const authEmail = options.authEmail || requestedEmail
    const userId = options.userId || (
      await query(
        'insert into auth.users(email, email_confirmed_at) values ($1, now()) returning id',
        [authEmail],
      )
    ).rows[0].id
    const profileId = options.profile === false ? null : (options.profileId || userId)
    if (profileId && !options.profileId) {
      await query('insert into profiles(id, email, role) values ($1, $2, $3)', [
        profileId, options.profileEmail || authEmail, 'member',
      ])
    }
    const phone = options.phone || '+2348031234567'
    const country = options.country === undefined ? 'Nigeria' : options.country
    const sourceEmail = options.sourceEmail || authEmail
    const publicAwardeeId = (
      await query(
        'insert into awardees(profile_id, name, email, phone, country, year) values ($1, $2, $3, $4, $5, $6) returning id',
        [profileId, 'Recipient ' + suffix, sourceEmail, phone, country, '2026'],
      )
    ).rows[0].id
    const awardeeId = (
      await query(
        'insert into team_awardees(team_id, public_awardee_id, profile_id, name, email, phone, country, source_year) values ($1, $2, $3, $4, $5, $6, $7, 2026) returning id',
        [teamId, publicAwardeeId, profileId, 'Recipient ' + suffix, options.projectionEmail || authEmail, phone, country],
      )
    ).rows[0].id
    const assignmentId = (
      await query(
        "insert into team_assignments(team_id, awardee_id, agent_id, status, assigned_at) values ($1, $2, $3, 'active', clock_timestamp() - interval '2 hours') returning id",
        [teamId, awardeeId, repMembershipId],
      )
    ).rows[0].id
    return { label, email: authEmail, userId, profileId, publicAwardeeId, awardeeId, assignmentId }
  }

  async function begin(c, channel = 'call', requestId = randomUUID()) {
    return rpc('team_begin_contact_attempt', [teamId, repId, c.awardeeId, channel, requestId])
  }

  function digest(attempt, c, challengeId, code) {
    return createHmac('sha256', 'isolated-contact-proof-test-secret')
      .update(attempt.token + ':' + c.userId + ':' + challengeId + ':' + code)
      .digest('hex')
  }

  async function prepare(attempt, c, challengeId = randomUUID(), code = '123456') {
    return rpc('team_prepare_contact_challenge', [
      attempt.token, c.userId, challengeId, digest(attempt, c, challengeId, code),
    ])
  }

  async function activate(attempt, c, challengeId) {
    return rpc('team_activate_contact_challenge', [attempt.token, c.userId, challengeId])
  }

  async function confirm(attempt, c, challengeId, code = '123456', confirmed = true) {
    return rpc('team_confirm_contact_attempt', [
      attempt.token, c.userId, challengeId, digest(attempt, c, challengeId, code), confirmed,
    ])
  }

  async function insertPaidOrder(c, paidAt) {
    return (
      await query(
        "insert into award_orders(awardee_id, profile_id, email, phone, award_payment_status, award_paid_at, award_amount_kobo) values ($1, $2, $3, '+2348031234567', 'paid', $4, 2500000) returning id",
        [c.publicAwardeeId, c.profileId, c.email, paidAt],
      )
    ).rows[0].id
  }

  async function applyPayment(c, paymentId, paidAt) {
    return rpc('team_apply_verified_payment', [
      teamId, c.awardeeId, 'award_order', paymentId, 'NGN', 2500000, paidAt, repId,
    ])
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
      + "grant usage on schema public, auth to anon, authenticated, service_role;"
      + "create table public.profiles(id uuid primary key references auth.users, role text, email text, phone text);"
      + "create table public.awardees(id uuid primary key default gen_random_uuid(), profile_id uuid references profiles, name text, email text, country text, year text, phone text, metadata jsonb default '{}');"
      + "create table public.award_payment_attempts(id uuid primary key default gen_random_uuid(), order_id uuid, provider text, charge_scope text, status text, currency text, captured_amount_minor bigint, requested_amount_minor bigint, confirmed_at timestamptz);"
      + "create table public.award_orders(id uuid primary key default gen_random_uuid(), awardee_id uuid references awardees, profile_id uuid references profiles, email text, phone text, address_line1 text, address_line2 text, city text, state text, country text, postal_code text, award_payment_status text, award_paid_at timestamptz, paid_at timestamptz, created_at timestamptz default now(), award_amount_kobo bigint, award_paid_attempt_id uuid references award_payment_attempts);",
    )
    for (const file of baseMigrationFiles) await query(migration(file))
    teamId = (await query("select id from team_teams where slug = 'sales'")).rows[0].id
    repId = (
      await query("insert into auth.users(email, email_confirmed_at) values ('rep@test.invalid', now()) returning id")
    ).rows[0].id
    secondRepId = (
      await query("insert into auth.users(email, email_confirmed_at) values ('second-rep@test.invalid', now()) returning id")
    ).rows[0].id
    repMembershipId = (
      await query(
        "insert into team_memberships(team_id, user_id, email, full_name, role, status) values ($1, $2, 'rep@test.invalid', 'Test Rep', 'agent', 'active') returning id",
        [teamId, repId],
      )
    ).rows[0].id
    await query(
      "insert into team_memberships(team_id, user_id, email, full_name, role, status) values ($1, $2, 'second-rep@test.invalid', 'Second Rep', 'agent', 'active')",
      [teamId, secondRepId],
    )

    const legacyPublicAwardeeId = (
      await query(
        "insert into awardees(name, email, phone, country, year) values ('Legacy manual proof', 'legacy-manual@test.invalid', '+2348031234567', 'Nigeria', '2026') returning id",
      )
    ).rows[0].id
    const legacyAwardeeId = (
      await query(
        "insert into team_awardees(team_id, public_awardee_id, name, email, phone, country, source_year) values ($1, $2, 'Legacy manual proof', 'legacy-manual@test.invalid', '+2348031234567', 'Nigeria', 2026) returning id",
        [teamId, legacyPublicAwardeeId],
      )
    ).rows[0].id
    const legacyAssignmentId = (
      await query(
        "insert into team_assignments(team_id, awardee_id, agent_id, status, assigned_at) values ($1, $2, $3, 'active', clock_timestamp() - interval '2 hours') returning id",
        [teamId, legacyAwardeeId, repMembershipId],
      )
    ).rows[0].id
    await query(
      "insert into team_followups(team_id, assignment_id, awardee_id, agent_id, channel, outcome, notes, contacted_at) values ($1, $2, $3, $4, 'call', 'interested', 'Legacy manual notes looked qualifying under the previous policy', clock_timestamp() - interval '1 minute')",
      [teamId, legacyAssignmentId, legacyAwardeeId, repMembershipId],
    )
    const legacyPaymentId = (
      await query(
        "insert into award_orders(awardee_id, email, phone, award_payment_status, award_paid_at, award_amount_kobo) values ($1, 'legacy-manual@test.invalid', '+2348031234567', 'paid', clock_timestamp() + interval '30 seconds', 2500000) returning id, award_paid_at",
        [legacyPublicAwardeeId],
      )
    ).rows[0]
    const legacyEarningId = (
      await query(
        "insert into team_commission_entries(team_id, awardee_id, agent_id, payment_id, payment_currency, amount_minor, currency, earned_at, created_by) values ($1, $2, $3, $4, 'NGN', 200000, 'NGN', clock_timestamp(), $5) returning id",
        [teamId, legacyAwardeeId, repMembershipId, legacyPaymentId.id, repId],
      )
    ).rows[0].id
    legacyBackfill = {
      awardeeId: legacyAwardeeId,
      assignmentId: legacyAssignmentId,
      paymentId: legacyPaymentId.id,
      paidAt: legacyPaymentId.award_paid_at,
      earningId: legacyEarningId,
    }

    // The policy migration must repair this old manual-proof earning in the
    // same transaction that installs the new canonical helper.
    await query(migration(proofMigrationFile))
    // Historical grace must leave all new-payment proof requirements intact.
    await query(migration('20261103120002_team_legacy_contact_grace.sql'))
  })

  after(async () => {
    await db.end()
  })

  test('migration backfill reverses legacy manual earnings/releases while staying idempotent', async () => {
    const history = (
      await query(
        'select e.entry_type, e.amount_minor, a.status as assignment_status, a.ended_at is not null as assignment_ended from team_commission_entries e join team_assignments a on a.id = $2 where e.id = $1',
        [legacyBackfill.earningId, legacyBackfill.assignmentId],
      )
    ).rows[0]
    assert.deepEqual(history, {
      entry_type: 'earning',
      amount_minor: '200000',
      assignment_status: 'removed',
      assignment_ended: true,
    })
    assert.equal(
      (await query(
        "select count(*)::int as count from team_commission_entries where parent_commission_id = $1 and entry_type = 'reversal'",
        [legacyBackfill.earningId],
      )).rows[0].count,
      1,
    )
    assert.equal(
      (await query(
        'select count(*)::int as count from team_qualifying_contacts($1, $2)',
        [legacyBackfill.assignmentId, legacyBackfill.paidAt],
      )).rows[0].count,
      0,
    )
    await rpc('team_reconcile_all_paid_attributions', [])
    assert.equal(
      (await query(
        "select count(*)::int as count from team_commission_entries where parent_commission_id = $1 and entry_type = 'reversal'",
        [legacyBackfill.earningId],
      )).rows[0].count,
      1,
    )
    assert.equal((await query('select status from team_assignments where id = $1', [legacyBackfill.assignmentId])).rows[0].status, 'removed')
  })

  test('manual call/WhatsApp notes and clicks alone never earn commission', async () => {
    const c = await createCase('manual')
    await query(
      "insert into team_followups(team_id, assignment_id, awardee_id, agent_id, channel, outcome, notes, contacted_at) values ($1, $2, $3, $4, 'call', 'interested', 'Discussed payment timing and next steps', clock_timestamp() - interval '1 minute')",
      [teamId, c.assignmentId, c.awardeeId, repMembershipId],
    )
    const paidAt = new Date(Date.now() + 1000).toISOString()
    const paymentId = await insertPaidOrder(c, paidAt)
    const result = await applyPayment(c, paymentId, paidAt)
    assert.equal(result.outcome, 'paid_without_qualifying_contact')
    assert.equal(
      (await query("select count(*)::int as count from team_commission_entries where payment_id = $1 and entry_type = 'earning'", [paymentId])).rows[0].count,
      0,
    )
    assert.equal(
      (await query('select count(*)::int as count from team_contact_attempts where awardee_id = $1', [c.awardeeId])).rows[0].count,
      0,
    )
  })

  test('the matching recipient must complete a fresh OTP before an attempt can earn', async () => {
    const c = await createCase('valid')
    const attempt = await begin(c, 'whatsapp')
    assert.equal(attempt.channel, 'whatsapp')
    assert.equal(attempt.phone, '+2348031234567')
    const context = await rpc('team_contact_confirmation_context', [attempt.token, c.userId])
    assert.equal(context.ok, true)
    assert.equal(context.status, 'initiated')
    assert.equal(context.email, c.email)
    assert.equal(context.challenge_id, null)
    const challengeId = randomUUID()
    const prepared = await prepare(attempt, c, challengeId)
    assert.equal(prepared.ok, true)
    assert.equal(prepared.email, c.email)
    assert.equal(prepared.challenge_id, challengeId)
    assert.equal((await rpc('team_contact_confirmation_context', [attempt.token, c.userId])).challenge_id, null)
    const activated = await activate(attempt, c, challengeId)
    assert.equal(activated.ok, true)
    assert.equal(activated.challenge_id, challengeId)
    assert.equal((await rpc('team_contact_confirmation_context', [attempt.token, c.userId])).challenge_id, challengeId)
    const confirmation = await confirm(attempt, c, challengeId)
    assert.equal(confirmation.ok, true)
    assert.equal(confirmation.status, 'confirmed')
    assert.equal(confirmation.proof_method, 'email_otp')
    const paidAt = new Date(Date.now() + 1000).toISOString()
    const q = await asRole('service_role', () => query(
      'select * from public.team_qualifying_contacts($1, $2)',
      [c.assignmentId, paidAt],
    ))
    assert.equal(q.rows.length, 1)
    assert.equal(q.rows[0].kind, 'awardee_confirmed_contact')
    assert.equal(q.rows[0].provider_verified, false)
    assert.equal(q.rows[0].evidence.recipientVerifiedBy, 'email_otp')
    assert.equal(q.rows[0].evidence.attemptId, attempt.id)
    assert.equal(q.rows[0].evidence.confirmedBy, c.userId)
    const paymentId = await insertPaidOrder(c, paidAt)
    const result = await applyPayment(c, paymentId, paidAt)
    assert.equal(result.outcome, 'commission_created')
    assert.equal(result.contact_kind, 'awardee_confirmed_contact')
    assert.equal(result.provider_verified, false)
    assert.equal(
      (await query("select count(*)::int as count from team_commission_entries where payment_id = $1 and entry_type = 'earning'", [paymentId])).rows[0].count,
      1,
    )
    assert.equal((await applyPayment(c, paymentId, paidAt)).outcome, 'already_earned')
    assert.equal((await confirm(attempt, c, challengeId)).status, 'confirmed')
  })

  test('wrong recipient, rep, token, destination and assignment are rejected generically', async () => {
    const c = await createCase('identity')
    const other = await createCase('other-destination')
    const emailOnly = await createCase('email-only', {
      profile: false,
      projectionEmail: 'mutable-projection-note@test.invalid',
    })
    const attempt = await begin(c)
    await assert.rejects(rpc('team_contact_confirmation_context', [attempt.token, other.userId]), /contact confirmation context unavailable/i)
    await assert.rejects(rpc('team_contact_confirmation_context', [attempt.token, repId]), /contact confirmation context unavailable/i)
    await assert.rejects(rpc('team_contact_confirmation_context', [randomUUID(), c.userId]), /contact confirmation context unavailable/i)
    await assert.rejects(
      rpc('team_begin_contact_attempt', [teamId, secondRepId, c.awardeeId, 'call', randomUUID()]),
      /contact attempt is not authorized/i,
    )
    await query("update team_assignments set status = 'removed', ended_at = clock_timestamp() where id = $1", [other.assignmentId])
    await assert.rejects(begin(other), /contact attempt is not authorized/i)
    const mismatchUser = (
      await query("insert into auth.users(email, email_confirmed_at) values ('mismatch@test.invalid', now()) returning id")
    ).rows[0].id
    await assert.rejects(rpc('team_contact_confirmation_context', [attempt.token, mismatchUser]), /contact confirmation context unavailable/i)
    const emailOnlyAttempt = await begin(emailOnly)
    const emailOnlyContext = await rpc('team_contact_confirmation_context', [emailOnlyAttempt.token, emailOnly.userId])
    assert.equal(emailOnlyContext.email, emailOnly.email)
    assert.notEqual(emailOnlyContext.email, 'mutable-projection-note@test.invalid')

    const profileAuthority = await createCase('profile-authority', {
      sourceEmail: 'public-source-mismatch@test.invalid',
    })
    const profileAuthorityAttempt = await begin(profileAuthority)
    const profileAuthorityContext = await rpc('team_contact_confirmation_context', [
      profileAuthorityAttempt.token, profileAuthority.userId,
    ])
    assert.equal(profileAuthorityContext.email, profileAuthority.email)
    assert.notEqual(profileAuthorityContext.email, 'public-source-mismatch@test.invalid')

    const authAuthority = await createCase('auth-authority', {
      email: 'auth-authority@test.invalid',
      profileEmail: 'stale-profile@test.invalid',
      sourceEmail: 'public-source@test.invalid',
      projectionEmail: 'projection-note@test.invalid',
    })
    const authAuthorityAttempt = await begin(authAuthority)
    const authAuthorityContext = await rpc('team_contact_confirmation_context', [
      authAuthorityAttempt.token, authAuthority.userId,
    ])
    assert.equal(authAuthorityContext.email, 'auth-authority@test.invalid')
    const authAuthorityChallenge = randomUUID()
    assert.equal((await prepare(authAuthorityAttempt, authAuthority, authAuthorityChallenge)).ok, true)
    assert.equal((await activate(authAuthorityAttempt, authAuthority, authAuthorityChallenge)).ok, true)
    assert.equal((await confirm(authAuthorityAttempt, authAuthority, authAuthorityChallenge)).status, 'confirmed')

    const localPhone = await createCase('local-phone', { phone: '08031234567' })
    const localPhoneAttempt = await begin(localPhone, 'whatsapp')
    assert.equal(localPhoneAttempt.phone, '+2348031234567')
    const localPhoneWithoutCountry = await createCase('local-phone-without-country', {
      phone: '08031234567', country: null,
    })
    const localPhoneWithoutCountryAttempt = await begin(localPhoneWithoutCountry)
    assert.equal(localPhoneWithoutCountryAttempt.phone, '+2348031234567')
  })

  test('attempt snapshots and challenge hashes cannot be backdated or rewritten by the API role', async () => {
    const c = await createCase('immutable')
    const attempt = await begin(c)
    await assert.rejects(
      asRole('service_role', () => query("update team_contact_attempts set initiated_at = '2000-01-01' where id = $1", [attempt.id])),
      /permission denied/i,
    )
    await assert.rejects(
      asRole('service_role', () => query(
        "insert into team_contact_challenges(id, attempt_id, user_id, code_hash, expires_at) values ($1, $2, $3, repeat('a', 64), now() + interval '10 minutes')",
        [randomUUID(), attempt.id, c.userId],
      )),
      /permission denied/i,
    )
    const row = (await query('select initiated_at, phone, actor_user_id from team_contact_attempts where id = $1', [attempt.id])).rows[0]
    assert.equal(row.phone, '+2348031234567')
    assert.equal(row.actor_user_id, repId)
    assert.ok(new Date(row.initiated_at).getUTCFullYear() >= 2026)
  })

  test('wrong OTP increments and locks, latest-only resend and expiry are enforced', async () => {
    const c = await createCase('challenge')
    const attempt = await begin(c)
    const firstChallenge = randomUUID()
    assert.equal((await prepare(attempt, c, firstChallenge)).ok, true)
    assert.equal((await confirm(attempt, c, firstChallenge)).reason, 'challenge_not_ready')
    assert.equal((await activate(attempt, c, firstChallenge)).ok, true)
    const remaining = []
    for (let index = 0; index < 5; index += 1) {
      const wrong = await confirm(attempt, c, firstChallenge, '000000')
      remaining.push(wrong.remaining)
      assert.equal(wrong.ok, false)
      assert.equal(wrong.reason, 'invalid_code')
    }
    assert.deepEqual(remaining, [4, 3, 2, 1, 0])
    assert.equal((await confirm(attempt, c, firstChallenge)).reason, 'challenge_invalidated')
    const challengeRow = (await query('select verify_attempts, invalidated_at from team_contact_challenges where id = $1', [firstChallenge])).rows[0]
    assert.equal(challengeRow.verify_attempts, 5)
    assert.ok(challengeRow.invalidated_at)
    assert.equal((await prepare(attempt, c, randomUUID())).reason, 'resend_cooldown')
    await query('alter table team_contact_challenges disable trigger team_seal_contact_challenge')
    await query("update team_contact_challenges set created_at = clock_timestamp() - interval '61 seconds' where attempt_id = $1", [attempt.id])
    await query('alter table team_contact_challenges enable trigger team_seal_contact_challenge')
    assert.equal((await prepare(attempt, c, randomUUID())).ok, true)
    await query('alter table team_contact_challenges disable trigger team_seal_contact_challenge')
    await query("update team_contact_challenges set created_at = clock_timestamp() - interval '61 seconds' where attempt_id = $1", [attempt.id])
    await query('alter table team_contact_challenges enable trigger team_seal_contact_challenge')
    assert.equal((await prepare(attempt, c, randomUUID())).ok, true)
    await query('alter table team_contact_challenges disable trigger team_seal_contact_challenge')
    await query("update team_contact_challenges set created_at = clock_timestamp() - interval '61 seconds' where attempt_id = $1", [attempt.id])
    await query('alter table team_contact_challenges enable trigger team_seal_contact_challenge')
    assert.equal((await prepare(attempt, c, randomUUID())).reason, 'challenge_send_limit')

    const expiredCase = await createCase('expired')
    const expiredAttempt = await begin(expiredCase)
    const expiredChallenge = randomUUID()
    await prepare(expiredAttempt, expiredCase, expiredChallenge)
    assert.equal((await activate(expiredAttempt, expiredCase, expiredChallenge)).ok, true)
    await query('alter table team_contact_challenges disable trigger team_seal_contact_challenge')
    await query("update team_contact_challenges set expires_at = clock_timestamp() - interval '1 second' where id = $1", [expiredChallenge])
    await query('alter table team_contact_challenges enable trigger team_seal_contact_challenge')
    assert.equal((await confirm(expiredAttempt, expiredCase, expiredChallenge)).reason, 'challenge_expired')

    const expiredPrepareCase = await createCase('expired-prepare')
    const expiredPrepareAttempt = await begin(expiredPrepareCase)
    const expiredPrepareChallenge = randomUUID()
    await prepare(expiredPrepareAttempt, expiredPrepareCase, expiredPrepareChallenge)
    await query('alter table team_contact_challenges disable trigger team_seal_contact_challenge')
    await query("update team_contact_challenges set expires_at = clock_timestamp() - interval '1 second' where id = $1", [expiredPrepareChallenge])
    await query('alter table team_contact_challenges enable trigger team_seal_contact_challenge')
    assert.equal(
      (await prepare(expiredPrepareAttempt, expiredPrepareCase, expiredPrepareChallenge)).reason,
      'challenge_expired',
    )
  })

  test('SMTP failure invalidates the challenge, and an OTP-backed decline cannot qualify', async () => {
    const c = await createCase('invalidate')
    const attempt = await begin(c)
    const challengeId = randomUUID()
    await prepare(attempt, c, challengeId)
    assert.equal((await confirm(attempt, c, challengeId)).reason, 'challenge_not_ready')
    const invalidated = await rpc('team_invalidate_contact_challenge', [
      attempt.token, c.userId, challengeId,
    ])
    assert.equal(invalidated.ok, true)
    assert.equal(invalidated.challenge_id, challengeId)
    assert.equal((await confirm(attempt, c, challengeId)).reason, 'challenge_invalidated')

    const declinedCase = await createCase('decline')
    const declinedAttempt = await begin(declinedCase)
    const declinedChallenge = randomUUID()
    await prepare(declinedAttempt, declinedCase, declinedChallenge)
    assert.equal((await activate(declinedAttempt, declinedCase, declinedChallenge)).ok, true)
    const declined = await confirm(declinedAttempt, declinedCase, declinedChallenge, '123456', false)
    assert.equal(declined.ok, true)
    assert.equal(declined.status, 'declined')
    const paidAt = new Date(Date.now() + 1000).toISOString()
    const paymentId = await insertPaidOrder(declinedCase, paidAt)
    assert.equal((await applyPayment(declinedCase, paymentId, paidAt)).outcome, 'paid_without_qualifying_contact')
  })

  test('recipient challenge quota is atomic across concurrent tokens', async () => {
    const base = await createCase('quota-base')
    const siblingCases = []
    for (const index of [1, 2, 3]) {
      siblingCases.push(await createCase('quota-sibling-' + index, {
        email: base.email,
        userId: base.userId,
        profileId: base.profileId,
        projectionEmail: 'quota-projection-' + index + '@test.invalid',
      }))
    }
    const cases = [base, ...siblingCases]
    const attempts = []
    for (const c of cases) attempts.push(await begin(c))
    const results = await Promise.all(attempts.map(async (attempt, index) => {
      const client = new pg.Client({ connectionString: url })
      await client.connect()
      const challengeId = randomUUID()
      return rpcWithClient(client, 'team_prepare_contact_challenge', [
        attempt.token,
        cases[index].userId,
        challengeId,
        digest(attempt, cases[index], challengeId, '123456'),
      ])
    }))
    assert.equal(results.filter((result) => result.ok).length, 3)
    assert.equal(results.filter((result) => result.reason === 'challenge_send_limit').length, 1)
  })

  test('payment wins the race: post-payment confirmation cannot create a reward', async () => {
    const c = await createCase('after-payment')
    const attempt = await begin(c)
    const paidAt = new Date(Date.now() + 1000).toISOString()
    const paymentId = await insertPaidOrder(c, paidAt)
    assert.equal((await applyPayment(c, paymentId, paidAt)).outcome, 'paid_without_qualifying_contact')
    const postPaymentPrepare = await prepare(attempt, c)
    assert.equal(postPaymentPrepare.ok, false)
    assert.equal(postPaymentPrepare.reason, 'contact_attempt_unavailable')
    const postPaymentContext = await rpc('team_contact_confirmation_context', [attempt.token, c.userId])
    assert.deepEqual(postPaymentContext, { ok: false, reason: 'contact_attempt_unavailable' })
    assert.equal(
      (await query("select count(*)::int as count from team_commission_entries where payment_id = $1 and entry_type = 'earning'", [paymentId])).rows[0].count,
      0,
    )
    assert.equal((await query('select status from team_assignments where id = $1', [c.assignmentId])).rows[0].status, 'removed')
  })

  test('provider-accepted email attribution remains unchanged and provider_verified', async () => {
    const c = await createCase('provider-email')
    const paidAt = new Date(Date.now() + 1000).toISOString()
    const timeline = new Date(Date.now() - 60000).toISOString()
    const logId = (
      await query(
        "insert into team_email_logs(team_id, awardee_id, agent_id, to_email, subject, body, status, provider_message_id, attempted_at, sent_at, created_at, idempotency_key) values ($1, $2, $3, $4, 'Subject', 'Body', 'sent', 'provider-1', $5, $5, $5, $6) returning id",
        [teamId, c.awardeeId, repMembershipId, c.email, timeline, randomUUID()],
      )
    ).rows[0].id
    await query(
      "insert into team_followups(team_id, assignment_id, awardee_id, agent_id, channel, outcome, email_log_id, contacted_at, notes) values ($1, $2, $3, $4, 'email', 'email_sent', $5, $6, 'Provider accepted email')",
      [teamId, c.assignmentId, c.awardeeId, repMembershipId, logId, timeline],
    )
    const paymentId = await insertPaidOrder(c, paidAt)
    const result = await applyPayment(c, paymentId, paidAt)
    assert.equal(result.outcome, 'commission_created')
    assert.equal(result.contact_kind, 'provider_email_sent')
    assert.equal(result.provider_verified, true)
  })

  test('member role cannot call the service-only RPCs or read/write proof tables', async () => {
    const c = await createCase('permissions')
    await assert.rejects(
      asRole('authenticated', () => query(
        "select public.team_begin_contact_attempt($1, $2, $3, 'call', $4)",
        [teamId, repId, c.awardeeId, randomUUID()],
      )),
      /permission denied/i,
    )
    await assert.rejects(
      asRole('authenticated', () => query(
        'select public.team_activate_contact_challenge($1, $2, $3)',
        [randomUUID(), repId, randomUUID()],
      )),
      /permission denied/i,
    )
    await assert.rejects(asRole('authenticated', () => query('select * from public.team_contact_attempts')), /permission denied/i)
    await assert.rejects(
      asRole('authenticated', () => query(
        "insert into public.team_contact_attempts(request_id, team_id, awardee_id, assignment_id, agent_id, actor_user_id, agent_user_id, channel, phone, recipient_email, rep_name) values ($1, $2, $3, $4, $5, $6, $6, 'call', '+2348031234567', $7, 'Rep')",
        [randomUUID(), teamId, c.awardeeId, c.assignmentId, repMembershipId, repId, c.email],
      )),
      /permission denied/i,
    )
  })
}
