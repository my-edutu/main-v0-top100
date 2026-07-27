// tests/courier/gig.test.ts
// Zero network. `fetch` is stubbed for every test.
//
// These tests are the ONLY verification this adapter gets before it is pointed
// at a live GIG account, so they assert the money and duplicate-shipment
// invariants directly rather than just the happy path.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { gigCourier, mapCarrierStatus, nairaToKobo } from '@/lib/courier/gig'
import { peekGigAuthCache, resetGigAuthCache } from '@/lib/courier/http'

const BASE = 'https://gig.test/api/thirdparty'

const GIG_ENV_KEYS = [
  'GIG_API_BASE_URL',
  'GIG_API_USERNAME',
  'GIG_API_PASSWORD',
  'GIG_RETRY_BASE_MS',
  'GIG_RETRIES',
  'GIG_GEOCODE_ENABLED',
  'GIG_TIMEOUT_MS',
  'GIG_TOKEN_TTL_MS',
  'GIG_TOKEN_SKEW_MS',
  'GIG_PATH_LOGIN',
  'GIG_PATH_QUOTE',
  'GIG_PATH_BOOK',
  'GIG_PATH_TRACK',
  'GIG_PATH_GEOCODE',
  'GIG_FIELD_QUOTE_AMOUNT',
  'GIG_FIELD_QUOTE_CURRENCY',
  'GIG_FIELD_WAYBILL',
  'GIG_FIELD_TOKEN',
  'GIG_FIELD_TRACK_EVENTS',
  'GIG_FIELD_TRACK_STATUS',
  'GIG_TRACKING_URL_TEMPLATE',
  'GIG_STATUS_MAP_JSON',
  'GIG_EXPECTED_CURRENCY',
  'GIG_QUOTE_EXTRA_JSON',
  'GIG_BOOK_EXTRA_JSON',
]

const ADDRESS = {
  recipientName: 'Ada Obi',
  phone: '08030000000',
  addressLine1: '12 Adeola Odeku Street',
  city: 'Victoria Island',
  state: 'Lagos',
  country: 'Nigeria',
}

const BOOK_INPUT = { ...ADDRESS, orderId: 'order-123', email: 'ada@example.com' }

type Call = { url: string; init: RequestInit }

let calls: Call[] = []

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const LOGIN_OK = {
  Object: { access_token: 'token-1', UserId: 'user-1', UserName: 'CUST001' },
}

/**
 * Route by URL substring. Each route may be a Response, a function, or an
 * array of responses consumed one per call (for retry assertions).
 */
function stubFetch(routes: Record<string, unknown>) {
  const queues = new Map<string, unknown[]>()
  const fetchMock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const href = String(url)
    calls.push({ url: href, init })

    for (const [fragment, route] of Object.entries(routes)) {
      if (!href.includes(fragment)) continue

      let value = route
      if (Array.isArray(route)) {
        if (!queues.has(fragment)) queues.set(fragment, [...route])
        const queue = queues.get(fragment)!
        value = queue.length > 1 ? queue.shift() : queue[0]
      }
      if (typeof value === 'function') return (value as (u: string, i: RequestInit) => unknown)(href, init)
      if (value instanceof Response) return value.clone()
      return json(value)
    }

    throw new Error(`Unstubbed fetch: ${href}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function callsTo(fragment: string): Call[] {
  return calls.filter((call) => call.url.includes(fragment))
}

function timeoutError(): Error {
  return Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
}

beforeEach(() => {
  calls = []
  resetGigAuthCache()
  process.env.GIG_API_BASE_URL = BASE
  process.env.GIG_API_USERNAME = 'api-user'
  process.env.GIG_API_PASSWORD = 'api-password'
  // Keep the suite fast; the retry backoff itself is exercised by call counts.
  process.env.GIG_RETRY_BASE_MS = '0'
  // Geocoding is on by default in production; switched off here so each test
  // stubs only the calls it is about. One test turns it back on.
  process.env.GIG_GEOCODE_ENABLED = '0'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetGigAuthCache()
  for (const key of GIG_ENV_KEYS) delete process.env[key]
})

// ---------------------------------------------------------------------------

describe('nairaToKobo', () => {
  it('converts whole naira', () => {
    expect(nairaToKobo(3500)).toBe(350_000)
  })

  it('rounds a half-kobo up at the .005 boundary', () => {
    // 2500.005 * 100 === 250000.5 exactly in IEEE-754, so this rounds up.
    expect(nairaToKobo(2500.005)).toBe(250_001)
    expect(nairaToKobo(0.005)).toBe(1)
  })

  it('rounds down when the float lands below the boundary', () => {
    // 1.005 * 100 === 100.49999999999999. Documenting the real behaviour
    // rather than the arithmetically ideal one: the app must never disagree
    // with what it actually charges.
    expect(nairaToKobo(1.005)).toBe(100)
  })

  it('keeps ordinary kobo precision', () => {
    expect(nairaToKobo(1500.5)).toBe(150_050)
    expect(nairaToKobo(1234.565)).toBe(123_457)
  })

  it.each([0, -1, -0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE])(
    'refuses to convert %s',
    (value) => {
      expect(nairaToKobo(value)).toBeNull()
    },
  )

  it('refuses non-numbers', () => {
    expect(nairaToKobo('3500')).toBeNull()
    expect(nairaToKobo(null)).toBeNull()
    expect(nairaToKobo(undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------

describe('gigCourier.quote', () => {
  it('is named gig', () => {
    expect(gigCourier.name).toBe('gig')
  })

  it('returns the quoted naira amount as kobo', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 3500 } } })

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.shippingKobo).toBe(350_000)
    expect(callsTo('/price')).toHaveLength(1)
  })

  it('reads a numeric string amount', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: '4,250.50' } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(425_050)
  })

  it('falls back to DeliveryPrice when GrandTotal is absent', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { DeliveryPrice: 1200 } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(120_000)
  })

  it('sends the bearer token and the account fields', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 100 } } })
    await gigCourier.quote(ADDRESS)

    const priceCall = callsTo('/price')[0]
    expect((priceCall.init.headers as Record<string, string>).Authorization).toBe('Bearer token-1')
    const body = JSON.parse(String(priceCall.init.body))
    expect(body.UserId).toBe('user-1')
    expect(body.CustomerCode).toBe('CUST001')
    expect(body.ReceiverName).toBe('Ada Obi')
    expect(body.ReceiverAddress).toContain('Adeola Odeku')
  })

  it.each([
    ['missing', { Object: {} }],
    ['zero', { Object: { GrandTotal: 0 } }],
    ['negative', { Object: { GrandTotal: -500 } }],
    ['NaN-ish', { Object: { GrandTotal: 'not-a-number' } }],
    ['null', { Object: { GrandTotal: null } }],
    ['empty body', {}],
  ])('declines to quote when the amount is %s', async (_label, payload) => {
    stubFetch({ '/login': LOGIN_OK, '/price': payload })

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/could not calculate a delivery cost/i)
  })

  it('declines on a non-2xx response', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': json({ message: 'bad request' }, 400) })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price')).toHaveLength(1) // 4xx is not retried
  })

  it('declines on a timeout, after exhausting retries', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/price': () => {
        throw timeoutError()
      },
    })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price')).toHaveLength(3) // 1 attempt + 2 retries
  })

  it('retries a 5xx and succeeds on the second attempt', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/price': [json({ message: 'boom' }, 500), json({ Object: { GrandTotal: 2000 } })],
    })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(200_000)
    expect(callsTo('/price')).toHaveLength(2)
  })

  it('declines when the 2xx body is not JSON', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': new Response('<html>maintenance</html>', { status: 200 }) })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price')).toHaveLength(1) // unparseable is not retried
  })

  it('declines rather than converting a non-naira amount', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 25, CurrencyCode: 'USD' } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
  })

  it('accepts an explicit NGN currency and reports it', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 3500, CurrencyCode: 'ngn' } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.shippingKobo).toBe(350_000)
      expect(result.currency).toBe('NGN')
    }
  })

  it('declines when login fails, without throwing', async () => {
    stubFetch({ '/login': json({ message: 'bad credentials' }, 401) })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price')).toHaveLength(0)
  })

  it('never puts the password in the raw payload it hands back', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': json({ message: 'nope' }, 400) })

    const result = await gigCourier.quote(ADDRESS)
    expect(JSON.stringify(result)).not.toContain('api-password')
  })

  it('resolves receiver coordinates when geocoding is enabled', async () => {
    process.env.GIG_GEOCODE_ENABLED = '1'
    stubFetch({
      '/login': LOGIN_OK,
      '/getaddressdetails': { Object: { Latitude: '6.4281', Longitude: '3.4219' } },
      '/price': { Object: { GrandTotal: 3500 } },
    })

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(true)
    const body = JSON.parse(String(callsTo('/price')[0].init.body))
    expect(body.ReceiverLocation).toEqual({ Latitude: '6.4281', Longitude: '3.4219' })
  })

  it('still prices when geocoding fails', async () => {
    process.env.GIG_GEOCODE_ENABLED = '1'
    stubFetch({
      '/login': LOGIN_OK,
      '/getaddressdetails': json({ message: 'nope' }, 400),
      '/price': { Object: { GrandTotal: 3500 } },
    })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(350_000)
    expect(JSON.parse(String(callsTo('/price')[0].init.body)).ReceiverLocation).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------

describe('token cache', () => {
  it('logs in once across multiple quotes', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 3500 } } })

    await gigCourier.quote(ADDRESS)
    await gigCourier.quote(ADDRESS)
    await gigCourier.quote(ADDRESS)

    expect(callsTo('/login')).toHaveLength(1)
    expect(callsTo('/price')).toHaveLength(3)
  })

  it('logs in once for concurrent quotes', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 3500 } } })

    await Promise.all([gigCourier.quote(ADDRESS), gigCourier.quote(ADDRESS)])

    expect(callsTo('/login')).toHaveLength(1)
  })

  it('re-logs in exactly once on a 401 and then succeeds', async () => {
    stubFetch({
      '/login': [json(LOGIN_OK), json({ Object: { access_token: 'token-2', UserId: 'user-1', UserName: 'CUST001' } })],
      '/price': [json({ message: 'expired' }, 401), json({ Object: { GrandTotal: 3500 } })],
    })

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok && result.shippingKobo).toBe(350_000)
    expect(callsTo('/login')).toHaveLength(2)
    expect(callsTo('/price')).toHaveLength(2)
    const headers = callsTo('/price')[1].init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-2')
  })

  it('gives up after a single re-login when the 401 persists', async () => {
    stubFetch({ '/login': LOGIN_OK, '/price': json({ message: 'expired' }, 401) })

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(false)
    expect(callsTo('/login')).toHaveLength(2)
    expect(callsTo('/price')).toHaveLength(2)
  })

  it('refreshes the token ahead of its expiry', async () => {
    process.env.GIG_TOKEN_TTL_MS = '120000'
    process.env.GIG_TOKEN_SKEW_MS = '60000'
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 3500 } } })

    const before = Date.now()
    await gigCourier.quote(ADDRESS)
    const cached = peekGigAuthCache()

    expect(cached).not.toBeNull()
    // 120s lifetime minus 60s skew: the cached entry expires ~60s from now.
    expect(cached!.expiresAt).toBeGreaterThanOrEqual(before + 59_000)
    expect(cached!.expiresAt).toBeLessThanOrEqual(Date.now() + 61_000)
  })

  it('prefers the expiry the carrier reports', async () => {
    process.env.GIG_TOKEN_SKEW_MS = '0'
    stubFetch({
      '/login': { Object: { access_token: 't', expires_in: 3600 } },
      '/price': { Object: { GrandTotal: 100 } },
    })

    await gigCourier.quote(ADDRESS)
    expect(peekGigAuthCache()!.expiresAt).toBeGreaterThan(Date.now() + 3_500_000)
  })

  it('declines when the login response has no token', async () => {
    stubFetch({ '/login': { Object: { UserId: 'user-1' } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------

describe('gigCourier.book', () => {
  it('returns the waybill', async () => {
    stubFetch({ '/login': LOGIN_OK, '/captureshipment': { Object: { waybill: 'AGL123456', message: 'ok' } } })

    const result = await gigCourier.book(BOOK_INPUT)

    expect(result.waybill).toBe('AGL123456')
    expect(result.trackingUrl).toBeNull()
    expect(JSON.parse(String(callsTo('/captureshipment')[0].init.body)).ReceiverEmail).toBe('ada@example.com')
  })

  it('reads a capitalised waybill field and a numeric waybill', async () => {
    stubFetch({ '/login': LOGIN_OK, '/captureshipment': { Object: { Waybill: 1234567890 } } })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.waybill).toBe('1234567890')
  })

  it('builds a tracking URL from the configured template', async () => {
    process.env.GIG_TRACKING_URL_TEMPLATE = 'https://giglogistics.com/track/{waybill}'
    stubFetch({ '/login': LOGIN_OK, '/captureshipment': { Object: { waybill: 'AGL123456' } } })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.trackingUrl).toBe('https://giglogistics.com/track/AGL123456')
  })

  it('throws when a 200 carries no waybill', async () => {
    stubFetch({ '/login': LOGIN_OK, '/captureshipment': { Object: { message: 'accepted' } } })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow(/no waybill/i)
  })

  it('is never retried after a 500 — a second booking is a second parcel', async () => {
    stubFetch({ '/login': LOGIN_OK, '/captureshipment': json({ message: 'server error' }, 500) })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow(/order-123/)
    expect(callsTo('/captureshipment')).toHaveLength(1)
  })

  it('is never retried after a network error', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/captureshipment': () => {
        throw new Error('ECONNRESET')
      },
    })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow()
    expect(callsTo('/captureshipment')).toHaveLength(1)
  })

  it('is never retried after a timeout', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/captureshipment': () => {
        throw timeoutError()
      },
    })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow()
    expect(callsTo('/captureshipment')).toHaveLength(1)
  })

  it('re-authenticates once on a 401 — a rejected request booked nothing', async () => {
    stubFetch({
      '/login': [json(LOGIN_OK), json({ Object: { access_token: 'token-2' } })],
      '/captureshipment': [json({ message: 'expired' }, 401), json({ Object: { waybill: 'AGL999' } })],
    })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.waybill).toBe('AGL999')
    expect(callsTo('/captureshipment')).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------

describe('mapCarrierStatus', () => {
  it.each([
    ['UNASSIGNED', 'dispatched'],
    ['ACCEPTED', 'dispatched'],
    ['UPCOMING', 'dispatched'],
    ['STARTED', 'in_transit'],
    ['MCRT', 'in_transit'],
    ['ARRIVED', 'in_transit'],
    ['In Transit', 'in_transit'],
    ['ENDED', 'delivered'],
    ['Delivered', 'delivered'],
    ['SHIPMENT RECEIVED BY CUSTOMER', 'delivered'],
  ])('maps %s to %s', (text, expected) => {
    expect(mapCarrierStatus(text)).toBe(expected)
  })

  it('is case- and whitespace-insensitive', () => {
    expect(mapCarrierStatus('  eNdEd  ')).toBe('delivered')
    expect(mapCarrierStatus('out   for   delivery')).toBe('in_transit')
  })

  it.each(['FAILED', 'DECLINE', 'CANCEL', 'DELETED', 'something new', '', '   '])(
    'returns unknown for %s rather than guessing',
    (text) => {
      expect(mapCarrierStatus(text)).toBe('unknown')
    },
  )

  it('returns unknown for non-strings', () => {
    expect(mapCarrierStatus(null)).toBe('unknown')
    expect(mapCarrierStatus(7)).toBe('unknown')
    expect(mapCarrierStatus(undefined)).toBe('unknown')
  })

  it('honours GIG_STATUS_MAP_JSON overrides', () => {
    process.env.GIG_STATUS_MAP_JSON = JSON.stringify({ 'PARCEL HANDED OVER': 'delivered', ENDED: 'in_transit' })
    expect(mapCarrierStatus('parcel handed over')).toBe('delivered')
    expect(mapCarrierStatus('ENDED')).toBe('in_transit')
  })

  it('ignores an override with an invalid target status', () => {
    process.env.GIG_STATUS_MAP_JSON = JSON.stringify({ ENDED: 'paid' })
    expect(mapCarrierStatus('ENDED')).toBe('delivered')
  })
})

// ---------------------------------------------------------------------------

describe('gigCourier.track', () => {
  it('reports the furthest-along recognised status', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/TrackAllShipment/': {
        Object: { MobileShipmentTrackings: [{ Status: 'ACCEPTED' }, { Status: 'ENDED' }, { Status: 'STARTED' }] },
      },
    })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('delivered')
    expect(result.carrierStatus).toBe('ENDED')
  })

  it('URL-encodes the waybill into the path', async () => {
    stubFetch({ '/login': LOGIN_OK, '/TrackAllShipment/': { Object: { MobileShipmentTrackings: [] } } })

    await gigCourier.track('AGL 123/456')
    expect(callsTo('/TrackAllShipment/')[0].url).toBe(`${BASE}/TrackAllShipment/AGL%20123%2F456`)
  })

  it('returns unknown when nothing in the response is recognised', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/TrackAllShipment/': { Object: { MobileShipmentTrackings: [{ Status: 'INVENTED STATE' }] } },
    })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('unknown')
    expect(result.carrierStatus).toBe('INVENTED STATE')
  })

  it('returns unknown on a carrier error rather than throwing', async () => {
    stubFetch({ '/login': LOGIN_OK, '/TrackAllShipment/': json({ message: 'not found' }, 404) })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('unknown')
  })

  it('returns unknown when login fails', async () => {
    stubFetch({ '/login': json({ message: 'bad credentials' }, 401) })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('unknown')
  })

  it('reads a top-level status field', async () => {
    stubFetch({ '/login': LOGIN_OK, '/TrackAllShipment/': { Object: { ShipmentStatus: 'In Transit' } } })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('in_transit')
  })
})

// ---------------------------------------------------------------------------

describe('env overrides', () => {
  it('honours an endpoint path override', async () => {
    process.env.GIG_PATH_QUOTE = 'v2/Thirdparty/price'
    stubFetch({ '/login': LOGIN_OK, '/v2/Thirdparty/price': { Object: { GrandTotal: 3500 } } })

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(true)
    expect(callsTo('/v2/Thirdparty/price')[0].url).toBe(`${BASE}/v2/Thirdparty/price`)
  })

  it('honours the login path override', async () => {
    process.env.GIG_PATH_LOGIN = 'Admin/login'
    stubFetch({ '/Admin/login': LOGIN_OK, '/price': { Object: { GrandTotal: 100 } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(true)
    expect(callsTo('/Admin/login')).toHaveLength(1)
  })

  it('honours an amount field-name override', async () => {
    process.env.GIG_FIELD_QUOTE_AMOUNT = 'data.shipping.amount'
    stubFetch({ '/login': LOGIN_OK, '/price': { data: { shipping: { amount: 4200 } }, Object: { GrandTotal: 9999 } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(420_000)
  })

  it('honours a waybill field-name override', async () => {
    process.env.GIG_FIELD_WAYBILL = 'data.shipment.reference'
    stubFetch({ '/login': LOGIN_OK, '/captureshipment': { data: { shipment: { reference: 'REF-1' } } } })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.waybill).toBe('REF-1')
  })

  it('honours a tracking-events field-name override', async () => {
    process.env.GIG_FIELD_TRACK_EVENTS = 'data.events'
    stubFetch({ '/login': LOGIN_OK, '/TrackAllShipment/': { data: { events: [{ Status: 'DELIVERED' }] } } })

    const result = await gigCourier.track('AGL1')
    expect(result.status).toBe('delivered')
  })

  it('merges GIG_QUOTE_EXTRA_JSON into the request body', async () => {
    process.env.GIG_QUOTE_EXTRA_JSON = JSON.stringify({ VehicleType: 'VAN', PaymentType: 'Cash' })
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 100 } } })

    await gigCourier.quote(ADDRESS)

    const body = JSON.parse(String(callsTo('/price')[0].init.body))
    expect(body.VehicleType).toBe('VAN')
    expect(body.PaymentType).toBe('Cash')
  })

  it('ignores malformed extra JSON instead of crashing the quote', async () => {
    process.env.GIG_QUOTE_EXTRA_JSON = '{not json'
    stubFetch({ '/login': LOGIN_OK, '/price': { Object: { GrandTotal: 100 } } })

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(true)
  })
})
