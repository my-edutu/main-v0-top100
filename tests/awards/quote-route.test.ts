// tests/awards/quote-route.test.ts
// Route-level validation and persistence. The carrier and geocoder are mocked
// here; their own wire-format behaviour is covered in tests/courier and
// tests/geocoding.
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  rate: vi.fn(),
  courier: { quote: vi.fn() },
  loadOrder: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.rate,
  RATE_LIMITS: { QUERY: {} },
  createRateLimitResponse: () => new Response('{}', { status: 429 }),
}))
vi.mock('@/lib/courier', () => ({ getCourier: () => mocks.courier }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/awards/server', () => ({
  AWARD_SETUP_MESSAGE: 'award setup needed',
  isMissingAwardTable: () => false,
  loadOrderForUser: mocks.loadOrder,
  mapAwardOrder: (row: Record<string, unknown>) => ({
    id: row.id ?? 'order-1',
    status: row.status,
    shippingAmountKobo: row.shipping_amount_kobo ?? null,
    totalAmountKobo: row.total_amount_kobo ?? null,
    quoteExpiresAt: row.gig_quote_expires_at ?? null,
  }),
}))

import { POST } from '@/app/api/member/award/quote/route'

const VALID_BODY = {
  recipientName: 'Ada Obi',
  phone: '08030000000',
  email: 'ada@example.com',
  addressLine1: '12 Adeola Odeku Street',
  city: 'Victoria Island',
  state: 'Lagos',
  country: 'Nigeria',
}

function request(body: unknown) {
  return new NextRequest('https://top100afl.com/api/member/award/quote', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

let inserted: Record<string, unknown> | null = null

beforeEach(() => {
  inserted = null
  mocks.user.mockResolvedValue({ id: 'member-1', email: 'ada@example.com' })
  mocks.rate.mockResolvedValue({ success: true })
  mocks.loadOrder.mockResolvedValue({ order: null, error: null })
  mocks.from.mockReturnValue({
    insert: (columns: Record<string, unknown>) => {
      inserted = columns
      return {
        select: () => ({
          single: async () => ({ data: { id: 'order-1', ...columns }, error: null }),
        }),
      }
    },
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/member/award/quote', () => {
  it('requires authentication', async () => {
    mocks.user.mockResolvedValue(null)
    const response = await POST(request(VALID_BODY))
    expect(response.status).toBe(401)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('rejects an incomplete street address before calling the carrier', async () => {
    const response = await POST(request({ ...VALID_BODY, addressLine1: '12' }))
    expect(response.status).toBe(400)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('rejects an unrecognised Nigerian state', async () => {
    const response = await POST(request({ ...VALID_BODY, state: 'Atlantis' }))
    expect(response.status).toBe(400)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('requires a service-centre id for service-centre delivery', async () => {
    const response = await POST(request({ ...VALID_BODY, deliveryMode: 'service_centre' }))
    expect(response.status).toBe(400)
    expect((await response.json()).message).toMatch(/service centre/i)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('rejects a service-centre id on a home-delivery request', async () => {
    const response = await POST(request({ ...VALID_BODY, serviceCentreId: 18 }))
    expect(response.status).toBe(400)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('persists a successful home quote and its verified delivery', async () => {
    mocks.courier.quote.mockResolvedValue({
      ok: true,
      shippingKobo: 350_000,
      currency: 'NGN',
      raw: { data: { data: { GrandTotal: 3500 } } },
      delivery: {
        mode: 'home',
        stationId: 4,
        latitude: 6.4281,
        longitude: 3.4219,
        formattedAddress: '12 Adeola Odeku Street, Victoria Island, Lagos',
      },
    })

    const response = await POST(request(VALID_BODY))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.courier.quote).toHaveBeenCalledWith(expect.objectContaining({
      addressLine1: '12 Adeola Odeku Street',
      deliveryMode: 'home',
      country: 'Nigeria',
    }))
    expect(inserted).toMatchObject({
      status: 'quoted',
      shipping_amount_kobo: 350_000,
      total_amount_kobo: 2_350_000,
    })
    expect(inserted?.gig_quote).toEqual({
      raw: { data: { data: { GrandTotal: 3500 } } },
      delivery: expect.objectContaining({ mode: 'home', latitude: 6.4281 }),
    })
    expect(body.message).toBeNull()
  })

  it('persists a service-centre quote with no geocoded home address', async () => {
    mocks.courier.quote.mockResolvedValue({
      ok: true,
      shippingKobo: 250_000,
      raw: { data: { data: { GrandTotal: 2500 } } },
      delivery: {
        mode: 'service_centre',
        stationId: 4,
        serviceCentreId: 18,
        serviceCentreName: 'IKOTUN',
        latitude: 6.550577,
        longitude: 3.268126,
        formattedAddress: '29, Idimu Road, Ikotun, Lagos',
      },
    })

    const response = await POST(request({
      ...VALID_BODY,
      deliveryMode: 'service_centre',
      serviceCentreId: 18,
    }))

    expect(response.status).toBe(200)
    expect(mocks.courier.quote).toHaveBeenCalledWith(expect.objectContaining({
      deliveryMode: 'service_centre',
      serviceCentreId: 18,
    }))
    expect(inserted).toMatchObject({ status: 'quoted', shipping_amount_kobo: 250_000 })
    expect(inserted?.gig_quote).toEqual(expect.objectContaining({
      delivery: expect.objectContaining({ mode: 'service_centre', serviceCentreId: 18 }),
    }))
  })

  it('parks an unresolvable address at quote_failed with a clear message and code', async () => {
    mocks.courier.quote.mockResolvedValue({
      ok: false,
      code: 'no_match',
      reason: 'We could not locate that address in Nigeria. Check the street, area, city and state, then try again.',
      raw: null,
    })

    const response = await POST(request(VALID_BODY))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.code).toBe('no_match')
    expect(body.message).toMatch(/could not locate that address/i)
    expect(inserted).toMatchObject({
      status: 'quote_failed',
      shipping_amount_kobo: null,
      total_amount_kobo: null,
      gig_quote: null,
    })
  })

  it('parks a GIG outage at quote_failed without a fabricated price', async () => {
    mocks.courier.quote.mockResolvedValue({
      ok: false,
      code: 'carrier_error',
      reason: 'We could not calculate a delivery cost automatically. Our team will contact you with a delivery cost.',
      raw: { message: 'server error' },
    })

    const response = await POST(request(VALID_BODY))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.code).toBe('carrier_error')
    expect(inserted).toMatchObject({
      status: 'quote_failed',
      shipping_amount_kobo: null,
      total_amount_kobo: null,
    })
    expect(inserted?.gig_response).toEqual({ message: 'server error' })
  })

  it('does not call the carrier for an international address', async () => {
    const response = await POST(request({ ...VALID_BODY, country: 'Ghana', state: 'Greater Accra' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
    expect(body.order.status).toBe('quote_failed')
    expect(body.message).toMatch(/international/i)
  })
})
