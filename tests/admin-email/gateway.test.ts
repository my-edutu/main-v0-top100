import { describe, expect, it, vi } from 'vitest'
import { deliverGatewayMessage } from '@/lib/admin-email/gateway'
const campaign = '00000000-0000-4000-8000-000000000001'
const subscriber = '00000000-0000-4000-8000-000000000002'
const payload = { subject: 'Your award', body: '<p>Hello</p>', content_type: 'html', recipients: [{ uuid: subscriber, email: 'person@example.org', name: 'Person', status: 'enabled', attribs: {} }], campaign: { uuid: campaign, name: 'Award' }, attachments: [] }
const context = { recipientId: 'r1', email: 'person@example.org', name: 'Person', unsubscribeUrl: 'https://top100afl.com/api/award-outreach/a/stop', unsubscribePage: 'https://top100afl.com/award-outreach/stop/a', message: { subject: 'Approved subject', html: '<p>Approved text</p>', text: 'Approved text' }, decision: 'send' as const }
function deps() { return { waitForSlot: vi.fn().mockResolvedValue(undefined), claim: vi.fn().mockResolvedValue(context), update: vi.fn().mockResolvedValue(undefined), send: vi.fn().mockResolvedValue({ ok: true }), evidence: vi.fn().mockResolvedValue(context) } }
describe('Listmonk delivery gateway', () => {
  it('sends an eligible message once and records SMTP acceptance', async () => {
    const d = deps()
    expect((await deliverGatewayMessage(payload, d)).status).toBe(200)
    expect(d.send).toHaveBeenCalledOnce()
    expect(d.send).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Approved subject', html: '<p>Approved text</p>' }))
    expect(d.update).toHaveBeenCalledWith('r1', 'accepted', expect.any(String))
  })
  it('does not resend an already claimed recipient', async () => {
    const d = deps(); d.claim.mockResolvedValue(null)
    expect((await deliverGatewayMessage(payload, d)).status).toBe(200)
    expect(d.send).not.toHaveBeenCalled()
  })
  it('skips recipients when eligibility changed', async () => {
    const d = deps(); d.evidence.mockResolvedValue({ ...context, decision: 'skip' })
    expect((await deliverGatewayMessage(payload, d)).status).toBe(200)
    expect(d.send).not.toHaveBeenCalled(); expect(d.update).toHaveBeenCalledWith('r1', 'skipped', expect.any(String))
  })
  it('holds messages when suppression or coupon evidence is unavailable', async () => {
    const d = deps(); d.evidence.mockRejectedValue(new Error('database unavailable'))
    expect((await deliverGatewayMessage(payload, d)).status).toBe(200)
    expect(d.send).not.toHaveBeenCalled(); expect(d.update).toHaveBeenCalledWith('r1', 'delivery_unknown', expect.any(String))
  })
  it('never retries an uncertain SMTP outcome', async () => {
    const d = deps(); d.send.mockResolvedValue({ ok: false, delivery: 'unknown' })
    expect((await deliverGatewayMessage(payload, d)).status).toBe(200)
    expect(d.update).toHaveBeenCalledWith('r1', 'delivery_unknown', expect.any(String))
  })
  it('rejects unregistered payloads and unsupported attachments', async () => {
    const d = deps()
    expect((await deliverGatewayMessage({ ...payload, attachments: [{ name: 'x' }] }, d)).status).toBe(400)
    expect(d.claim).not.toHaveBeenCalled()
  })
})
it('records the exact Stalwart queue ID for later delivery events', async () => {
  const d = deps(); d.send.mockResolvedValue({ ok: true, queueId: '123456' })
  await deliverGatewayMessage(payload, d)
  expect(d.update).toHaveBeenCalledWith('r1', 'accepted', expect.any(String), '123456')
})

it('rechecks eligibility after waiting for a sending slot', async () => {
  const d = deps(); d.evidence.mockResolvedValue({ ...context, decision: 'skip' })
  await deliverGatewayMessage(payload, d)
  expect(d.waitForSlot.mock.invocationCallOrder[0]).toBeLessThan(d.evidence.mock.invocationCallOrder[0])
  expect(d.send).not.toHaveBeenCalled()
})
