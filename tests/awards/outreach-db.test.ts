import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const database = process.env.TOP100_OUTREACH_TEST_DB
const pool = database ? new Pool({ host: '/tmp', database, user: process.env.USER }) : null
describe.runIf(Boolean(database))('outreach durable queue in isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!database?.startsWith('top100_outreach_test_')) throw new Error('Use an isolated outreach test database.')
    await pool!.query('drop schema public cascade; create schema public; grant usage on schema public to authenticated,service_role; create table public.awardees (id uuid primary key); create table public.profiles (id uuid primary key);')
    await pool!.query(readFileSync('supabase/migrations/20261102113950_award_outreach_workspace.sql', 'utf8'))
  })
  afterAll(async () => { await pool?.end() })
  async function queue() {
    const member = randomUUID(), admin = randomUUID(), campaign = randomUUID()
    await pool!.query('insert into awardees values ($1)', [member])
    await pool!.query('insert into profiles values ($1)', [admin])
    const args = [campaign, admin, 'recovery', 'Subject', 'Body', '{}', JSON.stringify([{ awardee_id: member, email: `${member}@example.com`, name: 'Member' }])]
    await pool!.query('select queue_award_outreach($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)', args)
    return { campaign, member, args }
  }
  it('snapshots once across repeated requests and disjoint concurrent claims', async () => {
    const { campaign, args } = await queue()
    await pool!.query('select queue_award_outreach($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)', args)
    expect((await pool!.query('select count(*) from award_outreach_recipients where campaign_id=$1', [campaign])).rows[0].count).toBe('1')
    const claimed = await Promise.all([pool!.query('select * from claim_award_outreach(3)'), pool!.query('select * from claim_award_outreach(3)')])
    expect(claimed.flatMap(r => r.rows).filter(r => r.campaign_id === campaign)).toHaveLength(1)
  })
  it('holds expired leases for manual review rather than claiming them again', async () => {
    const { campaign } = await queue()
    await pool!.query('select * from claim_award_outreach(3)')
    await pool!.query("update award_outreach_recipients set lease_until=now()-interval '1 minute' where campaign_id=$1", [campaign])
    const jobs = (await pool!.query('select * from claim_award_outreach(3)')).rows
    expect(jobs.some(r => r.campaign_id === campaign)).toBe(false)
    expect((await pool!.query('select status from award_outreach_recipients where campaign_id=$1', [campaign])).rows[0].status).toBe('delivery_unknown')
  })
  it('does not claim the same email concurrently across different campaigns', async () => {
    const { args } = await queue()
    const second = [...args]; second[0] = randomUUID()
    await pool!.query('select queue_award_outreach($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)', second)
    const email = JSON.parse(args[6] as string)[0].email
    const claims = await Promise.all([pool!.query('select * from claim_award_outreach(3)'), pool!.query('select * from claim_award_outreach(3)')])
    expect(claims.flatMap(c => c.rows).filter(r => r.email === email)).toHaveLength(1)
  })
  it('denies authenticated members direct access to contact data and worker functions', async () => {
    const client = await pool!.connect()
    try {
      await client.query('begin'); await client.query('set local role authenticated')
      await expect(client.query('select * from award_outreach_contacts')).rejects.toMatchObject({ code: '42501' })
    } finally { await client.query('rollback'); client.release() }
    const other = await pool!.connect()
    try {
      await other.query('begin'); await other.query('set local role authenticated')
      await expect(other.query('select * from claim_award_outreach(3)')).rejects.toMatchObject({ code: '42501' })
    } finally { await other.query('rollback'); other.release() }
  })
})
