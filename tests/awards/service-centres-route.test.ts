import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  rate: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.rate,
  RATE_LIMITS: { QUERY: {} },
  createRateLimitResponse: () => new Response('{}', { status: 429 }),
}))
vi.mock('@/lib/courier/gig', () => ({ listGigServiceCentres: mocks.list }))

import { GET } from '@/app/api/member/award/service-centres/route'

function request(query = 'state=Lagos&city=Victoria%20Island') {
  return new NextRequest(`https://top100afl.com/api/member/award/service-centres?${query}`)
}

beforeEach(() => {
  mocks.user.mockResolvedValue({ id: 'member-1' })
  mocks.rate.mockResolvedValue({ success: true })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.list.mockResolvedValue([
    {
      id: 18,
      name: 'IKOTUN',
      code: 'IKT',
      address: '29, Idimu Road, Ikotun, Lagos',
      stationId: 4,
      latitude: 6.550577,
      longitude: 3.268126,
    },
  ])
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('GET /api/member/award/service-centres', () => {
  it('requires authentication', async () => {
    mocks.user.mockResolvedValue(null)
    expect((await GET(request())).status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('rejects an invalid state before calling GIG', async () => {
    expect((await GET(request('state=Atlantis&city=Lagos'))).status).toBe(400)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('returns verified centre coordinates', async () => {
    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith({ state: 'Lagos', city: 'Victoria Island' })
    expect(body.serviceCentres).toEqual([
      {
        id: 18,
        name: 'IKOTUN',
        code: 'IKT',
        address: '29, Idimu Road, Ikotun, Lagos',
        stationId: 4,
        latitude: 6.550577,
        longitude: 3.268126,
      },
    ])
  })

  it('returns a retryable 503 when GIG is unavailable', async () => {
    mocks.list.mockRejectedValue(new Error('carrier down'))
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect((await response.json()).message).toMatch(/temporarily unavailable/i)
  })
})
