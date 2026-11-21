import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getCurrentUser: vi.fn(),
  createAdminClient: vi.fn(),
  getAwardLetterAccess: vi.fn(),
  manageRecommendationPack: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/award-letters/access', () => ({ getAwardLetterAccess: mocks.getAwardLetterAccess }))
vi.mock('@/lib/award-letters/recommendation-payment-server', () => ({ manageRecommendationPack: mocks.manageRecommendationPack }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  createRateLimitResponse: vi.fn(),
  RATE_LIMITS: { AUTH: {} },
}))

import { POST } from '@/app/api/member/recommendation-letters/payment/route'
import { PLAY_DISTRIBUTION_COOKIE } from '@/lib/play-distribution'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getCurrentUser.mockResolvedValue({ id: 'member-id', email: 'member@example.test' })
  mocks.getAwardLetterAccess.mockResolvedValue({ year: '2026' })
  mocks.checkRateLimit.mockResolvedValue({ success: true })
})

function paymentRequest(action: 'checkout' | 'check') {
  return new Request('https://www.top100afl.com/api/member/recommendation-letters/payment', {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

it.each(['checkout', 'check'] as const)('rejects Android payment action %s before resolving or creating a provider session', async action => {
  mocks.cookies.mockResolvedValue(new Map([[PLAY_DISTRIBUTION_COOKIE, { value: '1' }]]))
  const response = await POST(paymentRequest(action))
  expect(response.status).toBe(403)
  expect(mocks.createAdminClient).not.toHaveBeenCalled()
  expect(mocks.manageRecommendationPack).not.toHaveBeenCalled()
})

it('preserves checkout for a regular web visit', async () => {
  const db = {}
  mocks.cookies.mockResolvedValue(new Map())
  mocks.createAdminClient.mockReturnValue(db)
  mocks.manageRecommendationPack.mockResolvedValue({ checkoutUrl: 'https://checkout.example.test/' })
  const response = await POST(paymentRequest('checkout'))
  expect(response.status).toBe(200)
  expect(mocks.manageRecommendationPack).toHaveBeenCalledWith(db, 'member-id', 'member@example.test', true)
})
