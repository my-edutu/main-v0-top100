import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  getJourney: vi.fn(),
  saveProgress: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: vi.fn(async () => mocks.user) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true })),
  createRateLimitResponse: vi.fn(),
  RATE_LIMITS: { AUTH: {} },
}))
vi.mock('@/lib/dashboard/awardee-journey-server', () => ({
  getAwardeeJourneyForMember: mocks.getJourney,
  saveAwardeeJourneyProgress: mocks.saveProgress,
}))

import { GET, PATCH } from '@/app/api/member/onboarding-journey/route'

function request(method: string, body?: unknown) {
  return new Request('https://www.top100afl.com/api/member/onboarding-journey', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('/api/member/onboarding-journey', () => {
  beforeEach(() => {
    mocks.user = { id: 'authenticated-member' }
    mocks.getJourney.mockReset()
    mocks.saveProgress.mockReset()
    mocks.getJourney.mockResolvedValue({ progress: { completed: 0, total: 3, percent: 0 } })
    mocks.saveProgress.mockResolvedValue(undefined)
  })

  it('requires authentication before reading member state', async () => {
    mocks.user = null
    expect((await GET()).status).toBe(401)
    expect(mocks.getJourney).not.toHaveBeenCalled()
  })

  it('always scopes progress writes to the authenticated member, ignoring a forged memberId', async () => {
    const response = await PATCH(request('PATCH', {
      memberId: 'another-member',
      welcomeRead: true,
    }))

    expect(response.status).toBe(200)
    expect(mocks.saveProgress).toHaveBeenCalledWith('authenticated-member', { welcomeRead: true })
  })

  it('saves WhatsApp completion for the authenticated member', async () => {
    const response = await PATCH(request('PATCH', { whatsappChannelJoined: true }))

    expect(response.status).toBe(200)
    expect(mocks.saveProgress).toHaveBeenCalledWith('authenticated-member', { whatsappChannelJoined: true })
  })

  it('rejects a false WhatsApp completion value', async () => {
    const response = await PATCH(request('PATCH', { whatsappChannelJoined: false }))

    expect(response.status).toBe(400)
    expect(mocks.saveProgress).not.toHaveBeenCalled()
  })

  it('rejects unsupported acknowledgement fields', async () => {
    const response = await PATCH(request('PATCH', { awardPaid: true }))

    expect(response.status).toBe(400)
    expect(mocks.saveProgress).not.toHaveBeenCalled()
  })

  it('does not expose another member id in the public journey response', async () => {
    mocks.getJourney.mockResolvedValue({ memberId: 'private-id', progress: { completed: 1, total: 3, percent: 33 } })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).not.toHaveProperty('memberId')
  })

  it('saves handbook prompt-seen and read acknowledgements independently for the authenticated member', async () => {
    mocks.getJourney.mockResolvedValue({ handbook: { eligible: true } })
    const response = await PATCH(request('PATCH', {
    memberId: 'another-member',
    handbookPromptSeen: true,
  }))

  expect(response.status).toBe(200)
  expect(mocks.saveProgress).toHaveBeenCalledWith('authenticated-member', { handbookPromptSeen: true })
  })

  it('does not create handbook progress for an unverified or non-2026 member', async () => {
    mocks.getJourney.mockResolvedValue({ handbook: { eligible: false } })

    const response = await PATCH(request('PATCH', { handbookRead: true }))

    expect(response.status).toBe(403)
    expect(mocks.saveProgress).not.toHaveBeenCalled()
  })

  it('rejects false handbook progress values', async () => {
    const response = await PATCH(request('PATCH', { handbookRead: false }))

    expect(response.status).toBe(400)
    expect(mocks.saveProgress).not.toHaveBeenCalled()
  })
})
