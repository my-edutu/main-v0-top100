import { expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { processOutreachJobs } from '@/lib/awards/outreach-worker'
import { defaultOutreachDraft } from '@/lib/awards/outreach-templates'
const member = { id: 'a', awardeeIds: ['a'], name: 'Amara', email: 'amara@example.com', years: [2026], phone: '', country: 'Nigeria', profileId: 'p', state: 'recovery' as const, orderCount: 1, suppressed: false, visit: 'unknown' as const, owner: '', lastContactedAt: null, nextFollowUpAt: null, reason: 'unknown' as const, notes: '', emailable: true }
function setup() {
  const updates: unknown[] = []
  const lease = { valid: true }
  const campaign = { id: 'campaign', template: 'recovery', ...defaultOutreachDraft('recovery'), audience_filter: { year: '2026', segment: 'recovery' }, cancelled_at: null }
  const db = { rpc: vi.fn(async () => ({ data: [{ id: 'job', campaign_id: 'campaign', awardee_id: 'a', email: 'amara@example.com', lease_token: 'lease' }], error: null })), from: vi.fn((table: string) => {
    const chain = { select: () => chain, eq: () => chain, gt: () => chain, update: (value: unknown) => { updates.push({ table, value }); return chain }, maybeSingle: async () => ({ data: table === 'award_outreach_recipients' ? lease.valid ? { id: 'job' } : null : campaign, error: null }), then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }) }; return chain
  }) }
  const load = vi.fn(async () => ({ setup: true, members: [member], contacts: [{ awardee_id: 'a', token: 'token' }] }))
  const send = vi.fn(async () => ({ ok: true }))
  return { db, load, send, updates, lease }
}
it('skips a member who paid after the campaign was queued', async () => {
  const f = setup(); f.load.mockResolvedValue({ setup: true, members: [{ ...member, state: 'paid' } as typeof member], contacts: [{ awardee_id: 'a', token: 'token' }] })
  expect(await processOutreachJobs(f.db as never, { load: f.load, send: f.send })).toMatchObject({ skipped: 1, sent: 0 })
  expect(f.send).not.toHaveBeenCalled()
})
it('does not send an email without a recipient name', async () => {
  const f = setup()
  f.load.mockResolvedValue({ setup: true, members: [{ ...member, name: 'Awardee' }], contacts: [{ awardee_id: 'a', token: 'token' }] })
  expect(await processOutreachJobs(f.db as never, { load: f.load, send: f.send })).toMatchObject({ skipped: 1, sent: 0 })
  expect(f.send).not.toHaveBeenCalled()
})
it('holds an uncertain send rather than retrying it', async () => {
  const f = setup(); f.send.mockRejectedValue(new Error('Socket timed out after DATA'))
  expect(await processOutreachJobs(f.db as never, { load: f.load, send: f.send })).toMatchObject({ deliveryUnknown: 1 })
  expect(f.send).toHaveBeenCalledTimes(1)
  expect(f.updates).toContainEqual({ table: 'award_outreach_recipients', value: expect.objectContaining({ status: 'delivery_unknown' }) })
})
it('does not send after losing or expiring the worker lease', async () => {
  const f = setup(); f.lease.valid = false
  expect(await processOutreachJobs(f.db as never, { load: f.load, send: f.send })).toMatchObject({ sent: 0, skipped: 1 })
  expect(f.send).not.toHaveBeenCalled()
})
it('uses stable message identity and skips suppressed or recently contacted members', async () => {
  vi.stubEnv('AWARD_OUTREACH_SMTP_HOST', 'mail.test.top100afl.com')
  const f = setup()
  expect(await processOutreachJobs(f.db as never, { load: f.load, send: f.send })).toMatchObject({ sent: 1 })
  expect(f.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'amara@example.com', idempotencyKey: 'award-outreach/campaign/job', awardOutreach: { unsubscribeUrl: expect.stringContaining('/api/award-outreach/token/stop') } }))
  const g = setup(); g.load.mockResolvedValue({ setup: true, members: [{ ...member, suppressed: true }], contacts: [{ awardee_id: 'a', token: 'token' }] })
  expect(await processOutreachJobs(g.db as never, { load: g.load, send: g.send })).toMatchObject({ skipped: 1 })
  expect(g.send).not.toHaveBeenCalled()
  vi.unstubAllEnvs()
})
