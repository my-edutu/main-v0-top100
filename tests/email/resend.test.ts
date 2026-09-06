import { afterEach, expect, it, vi } from 'vitest'
import { sendTransactionalEmail } from '@/lib/email/send'
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
const input = { to: 'recipient@example.com', subject: 'New message', html: '<p>Open your inbox.</p>' }
it('uses the verified Resend sender and keeps the key in request headers', async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-key'); vi.stubEnv('RESEND_FROM_EMAIL', 'Top100 <test@example.com>')
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', fetcher)
  expect(await sendTransactionalEmail(input)).toEqual({ ok: true })
  expect(fetcher.mock.calls[0][0]).toBe('https://api.resend.com/emails')
  expect(JSON.parse(fetcher.mock.calls[0][1].body).from).toBe('Top100 <test@example.com>')
  expect(fetcher.mock.calls[0][1].body).not.toContain('test-key')
})
it('reports missing sender configuration without sending', async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-key'); vi.stubEnv('RESEND_FROM_EMAIL', '')
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  expect((await sendTransactionalEmail(input)).ok).toBe(false)
  expect(fetcher).not.toHaveBeenCalled()
})
it('does not double-send through another provider when Resend rejects a request', async () => {
  vi.stubEnv('RESEND_API_KEY', 'test-key'); vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.com'); vi.stubEnv('BREVO_API_KEY', 'other-key')
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 429 })); vi.stubGlobal('fetch', fetcher)
  expect((await sendTransactionalEmail(input)).ok).toBe(false)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
