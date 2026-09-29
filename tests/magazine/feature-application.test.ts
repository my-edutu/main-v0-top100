import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  paymentView: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: vi.fn(async () => mocks.user) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true })),
  createRateLimitResponse: vi.fn(),
  RATE_LIMITS: { AUTH: {} },
}))
vi.mock('@/lib/magazine/payment-server', () => ({
  getMagazineFeaturePaymentView: mocks.paymentView,
  MagazinePaymentError: class MagazinePaymentError extends Error { statusCode = 503 },
}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock('@/lib/member-hub-server', () => ({ mapFeature: (row: any) => row }))

import { POST } from '@/app/api/member/features/route'

function request(body: unknown) {
  return new Request('https://top100afl.com/api/member/features', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }) as any
}

const application = { title: 'Leadership in action', summary: 'A story about a community initiative and its measurable impact.', category: 'story' }

describe('magazine feature application payment gate', () => {
  beforeEach(() => {
    mocks.user = { id: 'authenticated-profile', email: 'awardee@example.com' }
    mocks.paymentView.mockReset()
    mocks.rpc.mockReset()
    mocks.paymentView.mockResolvedValue({ applicationEligible: true, campaign: { id: 'afl-magazine-2026' } })
    mocks.rpc.mockResolvedValue({ data: { outcome: 'created', submission: { id: 'feature-1', member_id: 'authenticated-profile' } }, error: null })
  })

  it('requires a separate confirmed magazine payment, regardless of any award payment', async () => {
    mocks.paymentView.mockResolvedValue({ applicationEligible: false, orderStatus: 'unpaid' })
    const response = await POST(request(application))
    expect(response.status).toBe(402)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('submits through the atomic magazine RPC using authenticated identity and campaign', async () => {
    const response = await POST(request({ ...application, memberId: 'forged-member', contactEmail: 'forged@example.com' }))
    expect(response.status).toBe(201)
    expect(mocks.rpc).toHaveBeenCalledWith('submit_magazine_feature_application', expect.objectContaining({
      p_profile_id: 'authenticated-profile',
      p_campaign_id: 'afl-magazine-2026',
      p_contact_email: 'awardee@example.com',
      p_title: application.title,
    }))
  })

  it('requires authentication before checking payment or submitting', async () => {
    mocks.user = null
    expect((await POST(request(application))).status).toBe(401)
    expect(mocks.paymentView).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
