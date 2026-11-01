import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ read: vi.fn(), send: vi.fn(), db: vi.fn(), render: vi.fn() }))
vi.mock('@/lib/festival/server', () => ({ readFestivalInterest: state.read }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: state.send }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: state.db }))
vi.mock('@/lib/festival/ticket', async original => ({ ...await original<typeof import('@/lib/festival/ticket')>(), renderFestivalTicket: state.render }))
import { sendFestivalTicketEmail } from '@/lib/festival/ticket-email'
const view = { payment: 'confirmed', ticket: { id: 'e078c178-077d-43c4-9f31-1140beab9cc3', registeredAt: '2026-10-31', emailStatus: 'pending' }, interest: { fullName: 'Amara', pickupRequested: false } }
let claim: Record<string, ReturnType<typeof vi.fn>>
let finish: Record<string, ReturnType<typeof vi.fn>>
beforeEach(() => {
  vi.resetAllMocks()
  state.read.mockResolvedValue(structuredClone(view))
  state.render.mockResolvedValue(Buffer.from('ticket-png'))
  state.send.mockResolvedValue({ ok: true })
  claim = Object.fromEntries(['update', 'eq', 'is', 'or', 'select'].map(key => [key, vi.fn().mockReturnThis()]))
  claim.maybeSingle = vi.fn().mockResolvedValue({ data: { ticket_id: view.ticket.id }, error: null })
  finish = { update: vi.fn().mockReturnThis(), eq: vi.fn() }
  finish.eq.mockReturnValue(finish)
  // The last equality returns a thenable PostgREST result.
  finish.then = vi.fn((resolve: (value: unknown) => unknown) => resolve({ error: null }))
  state.db.mockReturnValue({ from: vi.fn().mockReturnValueOnce(claim).mockReturnValue(finish) })
})
it('sends the named ticket as an in-memory attachment through Brevo SMTP to the account email', async () => {
  expect(await sendFestivalTicketEmail('member-1', 'member@example.com')).toBe('sent')
  expect(state.send).toHaveBeenCalledWith(expect.objectContaining({
    to: 'member@example.com', requireBrevoSmtp: true,
    idempotencyKey: 'festival-ticket/afl-festival-2026/e078c178-077d-43c4-9f31-1140beab9cc3',
    attachments: [{ filename: 'Africa-Future-Leaders-Festival-2026-ticket.png', content: Buffer.from('ticket-png'), contentType: 'image/png' }],
  }))
  expect(claim.eq).toHaveBeenCalledWith('member_id', 'member-1')
  expect(claim.is).toHaveBeenCalledWith('ticket_email_sent_at', null)
  expect(claim.or.mock.calls[0][0]).toMatch(/^ticket_email_claimed_at.is.null,ticket_email_claimed_at.lt./)
  const token = claim.update.mock.calls[0][0].ticket_email_claim_token
  expect(finish.eq).toHaveBeenCalledWith('ticket_email_claim_token', token)
  expect(finish.update.mock.calls[0][0].ticket_email_sent_at).toEqual(expect.any(String))
})
it('does not resend after recorded SMTP acceptance', async () => {
  state.read.mockResolvedValue({ ...view, ticket: { ...view.ticket, emailStatus: 'sent' } })
  expect(await sendFestivalTicketEmail('member-1', 'member@example.com')).toBe('sent')
  expect(claim.update).not.toHaveBeenCalled()
  expect(state.send).not.toHaveBeenCalled()
})
it('does not send while another request owns the atomic claim', async () => {
  claim.maybeSingle.mockResolvedValue({ data: null, error: null })
  expect(await sendFestivalTicketEmail('member-1', 'member@example.com')).toBe('pending')
  expect(state.send).not.toHaveBeenCalled()
})
it('records a retryable failure without marking email sent when SMTP rejects the ticket', async () => {
  state.send.mockResolvedValue({ ok: false, reason: 'rejected' })
  expect(await sendFestivalTicketEmail('member-1', 'member@example.com')).toBe('failed')
  expect(finish.update).toHaveBeenCalledWith(expect.objectContaining({ ticket_email_sent_at: null, ticket_email_claim_token: null, ticket_email_failed_at: expect.any(String) }))
})
it('does not issue mail when current payment or registration is missing', async () => {
  state.read.mockResolvedValue({ ...view, payment: 'required' })
  expect(await sendFestivalTicketEmail('member-1', 'member@example.com')).toBe('failed')
  expect(state.send).not.toHaveBeenCalled()
  expect(claim.update).not.toHaveBeenCalled()
})
