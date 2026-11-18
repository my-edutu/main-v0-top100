import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ database: vi.fn(), process: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.database }))
vi.mock('@/lib/awards/outreach-worker', () => ({ processOutreachJobs: mocks.process }))
import { POST } from '@/app/api/internal/award-outreach/process/route'
const request = (token?: string) => new NextRequest('https://www.top100afl.com/api/internal/award-outreach/process', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {} })
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('AWARD_OUTREACH_WORKER_SECRET', undefined)
  vi.stubEnv('EMAIL_OUTBOX_WORKER_SECRET', undefined)
  vi.stubEnv('CRON_SECRET', 'existing-server-cron-secret')
  vi.stubEnv('AWARD_OUTREACH_SMTP_HOST', undefined)
  vi.stubEnv('AWARD_OUTREACH_SMTP_USER', undefined)
  vi.stubEnv('AWARD_OUTREACH_SMTP_PASSWORD', undefined)
  vi.stubEnv('BREVO_SMTP_LOGIN', 'test-login')
  vi.stubEnv('BREVO_SMTP_KEY', 'test-key')
  mocks.process.mockResolvedValue({ claimed: 0, sent: 0, skipped: 0, failed: 0, deliveryUnknown: 0 })
})
afterEach(() => { vi.unstubAllEnvs() })
it('uses the existing server cron credential when dedicated worker credentials are absent', async () => {
  expect((await POST(request('existing-server-cron-secret'))).status).toBe(200)
  expect(mocks.process).toHaveBeenCalledOnce()
})
it('continues to prefer an explicitly configured dedicated worker credential', async () => {
  vi.stubEnv('AWARD_OUTREACH_WORKER_SECRET', 'dedicated-secret')
  expect((await POST(request('existing-server-cron-secret'))).status).toBe(401)
  expect(mocks.process).not.toHaveBeenCalled()
  expect((await POST(request('dedicated-secret'))).status).toBe(200)
})
it('does not process jobs without the correct server credential', async () => {
  expect((await POST(request())).status).toBe(401)
  expect((await POST(request('wrong'))).status).toBe(401)
  expect(mocks.database).not.toHaveBeenCalled()
})

it('uses the configured outreach SMTP transport without Brevo credentials', async () => {
  vi.stubEnv('BREVO_SMTP_LOGIN', undefined)
  vi.stubEnv('BREVO_SMTP_KEY', undefined)
  vi.stubEnv('AWARD_OUTREACH_SMTP_HOST', 'mail.example.test')
  vi.stubEnv('AWARD_OUTREACH_SMTP_USER', 'sender@example.test')
  vi.stubEnv('AWARD_OUTREACH_SMTP_PASSWORD', 'test-password')
  expect((await POST(request('existing-server-cron-secret'))).status).toBe(200)
})

it('rejects an incomplete outreach transport even when Brevo is configured', async () => {
  vi.stubEnv('AWARD_OUTREACH_SMTP_HOST', 'mail.example.test')
  expect((await POST(request('existing-server-cron-secret'))).status).toBe(503)
  expect(mocks.process).not.toHaveBeenCalled()
})
