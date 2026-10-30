import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Explicitly opt in to an isolated local database; this suite cannot connect to production.
const database = process.env.TOP100_PAYMENT_TEST_DB
const pool = database ? new Pool({ host: '/tmp', database, user: process.env.USER }) : null
describe.runIf(Boolean(database))('atomic award reconciliation in PostgreSQL', () => {
  beforeAll(async () => {
    if (!database?.startsWith('top100_payment_recovery_test_')) throw new Error('Use a disposable local payment test database.')
    await pool!.query(`
      drop schema public cascade;
      create schema public;
      grant usage on schema public to anon, authenticated, service_role;
      create extension if not exists pgcrypto;
      create table public.profiles (id uuid primary key);
      create table public.award_orders (
        id uuid primary key default gen_random_uuid(), profile_id uuid, status text default 'draft',
        paid_at timestamptz, paystack_status text, paystack_reference text, currency text default 'NGN',
        award_amount_kobo bigint default 2500000, total_amount_kobo bigint,
        gig_waybill text, created_at timestamptz default now(), updated_at timestamptz default now()
      );`)
    await pool!.query(readFileSync('supabase/migrations/20260908113639_bachs_award_payments.sql', 'utf8'))
    await pool!.query(readFileSync('supabase/migrations/20261013215353_bachs_award_checkout_reconciliation.sql', 'utf8'))
    await pool!.query(readFileSync('supabase/migrations/20261030174333_bachs_award_late_success_recovery.sql', 'utf8'))
  })
  afterAll(async () => { await pool?.end() })
  async function seed(status = 'open', orderStatus = 'pending') {
    const orderId = randomUUID(), attemptId = randomUUID()
    await pool!.query('insert into award_orders (id,award_payment_status,gig_waybill) values ($1,$2,$3)', [orderId, orderStatus, 'original-waybill'])
    await pool!.query(`insert into award_payment_attempts (id,order_id,provider,charge_scope,status,price_version,requested_amount_minor,currency,provider_reference,provider_checkout_id,idempotency_key,failure_reason)
      values ($1,$2,'bachs','award_fee',$3,'afl-award-2026-v1',2500000,'NGN',$4,$5,$6,$7)`,
      [attemptId, orderId, status, `ref-${attemptId}`, `chk-${attemptId}`, `key-${attemptId}`, status === 'overpaid' ? 'Captured amount was above the reserved amount.' : null])
    const evidence = { checkout_id: `chk-${attemptId}`, reference: `ref-${attemptId}`, order_id: orderId, attempt_id: attemptId, currency: 'NGN', amount_minor: 2500000, status: 'paid', charge_id: `pay-${attemptId}`, charge_currency: 'GHS', gross_amount: '250.79' }
    return { orderId, attemptId, evidence }
  }
  async function reconcile(attemptId: string, evidence: unknown) { return (await pool!.query('select reconcile_bachs_award_checkout($1,$2::jsonb) as result', [attemptId, JSON.stringify(evidence)])).rows[0].result }
  async function state(id: string) { return (await pool!.query('select a.status,a.captured_amount_minor,o.award_payment_status,o.gig_waybill from award_payment_attempts a join award_orders o on o.id=a.order_id where a.id=$1', [id])).rows[0] }
  it('claims the original fee once under concurrent reconciliation and preserves delivery', async () => {
    const { attemptId, evidence } = await seed()
    await Promise.all([reconcile(attemptId, evidence), reconcile(attemptId, evidence)])
    expect(await state(attemptId)).toMatchObject({ status: 'succeeded', captured_amount_minor: '2500000', award_payment_status: 'paid', gig_waybill: 'original-waybill' })
    expect((await pool!.query('select count(*) from payment_webhook_events where payment_attempt_id=$1', [attemptId])).rows[0].count).toBe('1')
  })
  it.each(['failed', 'expired', 'exception'])('recovers verified %s without a manual status reset', async status => {
    const { attemptId, evidence } = await seed(status, 'failed')
    await reconcile(attemptId, evidence)
    expect(await state(attemptId)).toMatchObject({ status: 'succeeded', award_payment_status: 'paid', gig_waybill: 'original-waybill' })
  })
  it('recovers only a provider-verified false overpayment, retaining the original event', async () => {
    const { attemptId, evidence } = await seed('overpaid', 'failed')
    await pool!.query("insert into payment_webhook_events(id,event_type,provider,payment_attempt_id,processing_status,payload,error) values ($1,'collection.succeeded','bachs',$2,'exception','{}','captured amount was above the reserved amount')", [`original-${attemptId}`, attemptId])
    await reconcile(attemptId, evidence)
    expect(await state(attemptId)).toMatchObject({ status: 'succeeded', award_payment_status: 'paid' })
    expect((await pool!.query('select count(*) from payment_webhook_events where payment_attempt_id=$1', [attemptId])).rows[0].count).toBe('2')
  })
  it('releases an authenticated expired checkout without altering delivery', async () => {
    const { attemptId, evidence } = await seed()
    await reconcile(attemptId, { ...evidence, status: 'expired', charge_id: null })
    expect(await state(attemptId)).toMatchObject({ status: 'expired', award_payment_status: 'failed', gig_waybill: 'original-waybill' })
  })
  it('preserves a refunded order even with successful provider evidence', async () => {
    const { attemptId, evidence } = await seed('open', 'refunded')
    await reconcile(attemptId, evidence)
    expect(await state(attemptId)).toMatchObject({ status: 'open', award_payment_status: 'refunded' })
  })
  it('accepts a late exact success after failure and ignores a later failure callback', async () => {
    const { attemptId, evidence } = await seed('failed', 'failed')
    const args = [ 'late-'+attemptId, 'collection.succeeded', null, attemptId, evidence.checkout_id,
      evidence.reference, 'SUCCEEDED', 2500000, 'NGN', evidence.charge_id, '{}', new Date() ]
    const call = 'select process_bachs_webhook_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)'
    await pool!.query(call, args)
    expect(await state(attemptId)).toMatchObject({ status: 'succeeded', award_payment_status: 'paid' })
    await pool!.query(call, ['failed-'+attemptId, 'collection.failed', ...args.slice(2,6), 'FAILED', null, ...args.slice(8)])
    expect(await state(attemptId)).toMatchObject({ status: 'succeeded', award_payment_status: 'paid' })
  })
  it('keeps a refunded failed attempt refunded during recovery', async () => {
    const { attemptId, evidence } = await seed('failed', 'refunded')
    await reconcile(attemptId, evidence)
    expect(await state(attemptId)).toMatchObject({ status: 'failed', award_payment_status: 'refunded' })
  })
  it('rejects a different reference or amount without changing payment state', async () => {
    const { attemptId, evidence } = await seed()
    for (const changed of [{ ...evidence, reference: 'other' }, { ...evidence, amount_minor: 2000 }]) await expect(reconcile(attemptId, changed)).rejects.toThrow()
    expect(await state(attemptId)).toMatchObject({ status: 'open', award_payment_status: 'pending' })
  })
  it('denies direct reconciliation to authenticated members', async () => {
    const { attemptId, evidence } = await seed()
    const client = await pool!.connect()
    try {
      await client.query('begin'); await client.query('set local role authenticated')
      await expect(client.query('select public.reconcile_bachs_award_checkout($1,$2::jsonb)', [attemptId, JSON.stringify(evidence)])).rejects.toMatchObject({ code: '42501' })
    } finally { await client.query('rollback'); client.release() }
  })
})
