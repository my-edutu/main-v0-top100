import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const smtp = vi.hoisted(() => ({ send: vi.fn(), create: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: smtp.create } }))
import { sendTransactionalEmail } from '@/lib/email/send'
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('BREVO_SMTP_LOGIN', 'smtp-test-user'); vi.stubEnv('BREVO_SMTP_KEY', 'smtp-test-key')
  vi.stubEnv('BREVO_SMTP_HOST', 'smtp-relay.brevo.com'); vi.stubEnv('BREVO_SMTP_PORT', '587')
  smtp.create.mockReturnValue({ sendMail: smtp.send })
  smtp.send.mockResolvedValue({ accepted: ['member@example.com'], rejected: [] })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
const input = { to: 'member@example.com', subject: 'Festival ticket', html: '<p>Your ticket</p>', requireBrevoSmtp: true, attachments: [{ filename: 'ticket.png', content: Buffer.from('ticket-png'), contentType: 'image/png' }] }
it('attaches the actual ticket buffer to the Brevo SMTP message', async () => {
  expect(await sendTransactionalEmail(input)).toEqual({ ok: true })
  expect(smtp.send.mock.calls[0][0].attachments).toEqual(input.attachments)
  expect(smtp.create.mock.calls[0][0]).toMatchObject({ host: 'smtp-relay.brevo.com', port: 587, disableFileAccess: true, disableUrlAccess: true })
})
it('fails without falling back to another provider when Brevo SMTP is required but absent', async () => {
  vi.stubEnv('BREVO_SMTP_KEY', ''); vi.stubEnv('BREVO_API_KEY', 'other-test-key')
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  expect((await sendTransactionalEmail(input)).ok).toBe(false)
  expect(smtp.send).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled()
})
it('reports recipient rejection without claiming a successful send or trying another provider', async () => {
  smtp.send.mockResolvedValue({ accepted: [], rejected: ['member@example.com'] })
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  expect(await sendTransactionalEmail(input)).toMatchObject({ ok: false, delivery: 'not_sent' })
  expect(fetcher).not.toHaveBeenCalled()
})
it('distinguishes a definite SMTP rejection from an uncertain transport timeout', async () => {
  smtp.send.mockRejectedValueOnce({ code: 'EENVELOPE', responseCode: 550 })
  expect(await sendTransactionalEmail(input)).toMatchObject({ ok: false, delivery: 'not_sent' })
  smtp.send.mockRejectedValueOnce({ code: 'ETIMEDOUT' })
  expect(await sendTransactionalEmail(input)).toMatchObject({ ok: false, delivery: 'unknown' })
})
