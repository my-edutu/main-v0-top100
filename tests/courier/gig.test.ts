// tests/courier/gig.test.ts
// Zero network. `fetch` is stubbed for every test.
//
// These tests are the ONLY verification this adapter gets before it is pointed
// at a live GIG account, so they assert the money, coordinate and
// duplicate-shipment invariants directly rather than just the happy path.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { gigCourier, mapCarrierStatus, nairaToKobo, resetGigServiceCentreCache } from '@/lib/courier/gig'
import { peekGigAuthCache, resetGigAuthCache } from '@/lib/courier/http'
import { resetGigStationCache } from '@/lib/courier/gig'

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
  'GIG_PATH_SERVICE_CENTRES',
  'GIG_QUOTE_SCHEMA',
  'GIG_TRACK_FETCH_OPTION',
  'GIG_STATION_CACHE_MS',
  'GIG_SERVICE_CENTRE_CACHE_MS',
  'GIG_RECEIVER_STATION_MAP_JSON',
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
  'GIG_SENDER_LATITUDE',
  'GIG_SENDER_LONGITUDE',
  'GEOAPIFY_API_KEY',
  'GEOAPIFY_BASE_URL',
  'GEOAPIFY_RETRY_BASE_MS',
  'GEOAPIFY_RETRIES',
  'GEOAPIFY_TIMEOUT_MS',
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

const GEO_OK = {
  results: [
    {
      lat: 6.4281,
      lon: 3.4219,
      formatted: '12 Adeola Odeku Street, Victoria Island, Lagos, Nigeria',
      country_code: 'ng',
      result_type: 'building',
      rank: { confidence: 0.95 },
    },
  ],
}

const SERVICE_CENTRES_OK = {
  success: true,
  data: {
    message: 'Success',
    status: 200,
    data: [
      {
        StationId: 4,
        StationName: 'LAGOS',
        StationCode: 'LOS',
        StateId: 24,
        ServiceCentreId: 18,
        ServiceCentreName: 'IKOTUN',
        ServiceCentreCode: 'IKT',
        Latitude: 6.550577,
        Longitude: 3.268126,
        Address: '29, Idimu Road, Opp. Local Govt. Council, Ikotun, Lagos',
      },
    ],
  },
}

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

/** A quote stub with the shared login + geocoder calls already present. */
function quoteStub(extra: Record<string, unknown> = {}) {
  return {
    '/login': LOGIN_OK,
    '/v1/geocode/search': GEO_OK,
    '/price/v3': { Object: { GrandTotal: 3500 } },
    ...extra,
  }
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
  resetGigStationCache()
  resetGigServiceCentreCache()
  process.env.GIG_API_BASE_URL = BASE
  process.env.GIG_API_USERNAME = 'api-user'
  process.env.GIG_API_PASSWORD = 'api-password'
  // Explicit destination override keeps these adapter unit tests focused;
  // production leaves this unset and resolves the station from the directory.
  process.env.GIG_RECEIVER_STATION_ID = '4'
  // Keep the suite fast; the retry backoff itself is exercised by call counts.
  process.env.GIG_RETRY_BASE_MS = '0'
  process.env.GIG_SENDER_LATITUDE = '6.529800'
  process.env.GIG_SENDER_LONGITUDE = '3.314500'
  process.env.GIG_GEOCODE_ENABLED = '1'
  process.env.GEOAPIFY_API_KEY = 'geo-test-key'
  process.env.GEOAPIFY_BASE_URL = 'https://geo.test'
  process.env.GEOAPIFY_RETRY_BASE_MS = '0'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetGigAuthCache()
  resetGigStationCache()
  resetGigServiceCentreCache()
  delete process.env.GIG_RECEIVER_STATION_ID
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
    stubFetch(quoteStub())

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.shippingKobo).toBe(350_000)
    expect(callsTo('/price/v3')).toHaveLength(1)
  })

  it('reads GIG\'s documented nested login and price response', async () => {
    stubFetch(quoteStub({
      '/login': {
        success: true,
        data: { data: { UserName: 'ECO038082', 'access-token': 'official-token' } },
      },
      '/price/v3': { success: true, data: { data: { GrandTotal: 4100 } } },
    }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(410_000)
    expect((callsTo('/price/v3')[0].init.headers as Record<string, string>)['access-token']).toBe('official-token')
  })

  it('sends the Price V3 body with verified receiver and sender coordinates', async () => {
    stubFetch(quoteStub())
    await gigCourier.quote(ADDRESS)

    const body = JSON.parse(String(callsTo('/price/v3')[0].init.body))
    expect(body.ReceiverLocation).toEqual({ Latitude: 6.4281, Longitude: 3.4219 })
    expect(body.SenderLocation).toEqual({ Latitude: 6.5298, Longitude: 3.3145 })
    expect(body.PickUpOptions).toBe(0) // HomeDelivery
    expect(body.SenderStationId).toBe(4)
    expect(body.ReceiverStationId).toBe(4)
    expect(body.ShipmentItems[0].ItemName).toBe('Award plaque')
    expect(callsTo('/v1/geocode/search')).toHaveLength(1)
    // Price V3 rejects undeclared legacy fields; none of these may be sent.
    expect(body.CustomerType).toBeUndefined()
    expect(body.DeliveryOptionIds).toBeUndefined()
    expect(body.IsFromAgility).toBeUndefined()
    expect(body.CustomerCode).toBeUndefined()
    expect(body.Value).toBeUndefined()
  })

  it('resolves the receiver station from the submitted state and city', async () => {
    delete process.env.GIG_RECEIVER_STATION_ID
    stubFetch(quoteStub({
      '/localstations/get': {
        success: true,
        data: { data: [{ StationId: 77, StationName: 'ABUJA', StationCode: 'ABJ', StateName: 'FCT' }] },
      },
      '/price/v3': { Object: { GrandTotal: 4100 } },
    }))

    const result = await gigCourier.quote({ ...ADDRESS, city: 'Abuja', state: 'FCT' })
    expect(result.ok).toBe(true)
    const body = JSON.parse(String(callsTo('/price/v3')[0].init.body))
    expect(body.ReceiverStationId).toBe(77)
    expect(callsTo('/localstations/get')).toHaveLength(1)
  })

  it('reads a numeric string amount', async () => {
    stubFetch(quoteStub({ '/price/v3': { Object: { GrandTotal: '4,250.50' } } }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(425_050)
  })

  it('falls back to DeliveryPrice when GrandTotal is absent', async () => {
    stubFetch(quoteStub({ '/price/v3': { Object: { DeliveryPrice: 1200 } } }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(120_000)
  })

  it('sends the documented access token', async () => {
    stubFetch(quoteStub())
    await gigCourier.quote(ADDRESS)

    const priceCall = callsTo('/price/v3')[0]
    expect((priceCall.init.headers as Record<string, string>)['access-token']).toBe('token-1')
  })

  it.each([
    ['missing', { Object: {} }],
    ['zero', { Object: { GrandTotal: 0 } }],
    ['negative', { Object: { GrandTotal: -500 } }],
    ['NaN-ish', { Object: { GrandTotal: 'not-a-number' } }],
    ['null', { Object: { GrandTotal: null } }],
    ['empty body', {}],
  ])('declines to quote when the amount is %s', async (_label, payload) => {
    stubFetch(quoteStub({ '/price/v3': payload }))

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/could not calculate a delivery cost/i)
      expect(result.code).toBe('carrier_error')
    }
  })

  it('declines on a non-2xx response', async () => {
    stubFetch(quoteStub({ '/price/v3': json({ message: 'bad request' }, 400) }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price/v3')).toHaveLength(1) // 4xx is not retried
  })

  it('declines on a timeout, after exhausting retries', async () => {
    stubFetch(quoteStub({
      '/price/v3': () => {
        throw timeoutError()
      },
    }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price/v3')).toHaveLength(3) // 1 attempt + 2 retries
  })

  it('retries a 5xx and succeeds on the second attempt', async () => {
    stubFetch(quoteStub({
      '/price/v3': [json({ message: 'boom' }, 500), json({ Object: { GrandTotal: 2000 } })],
    }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(200_000)
    expect(callsTo('/price/v3')).toHaveLength(2)
  })

  it('declines when the 2xx body is not JSON', async () => {
    stubFetch(quoteStub({ '/price/v3': new Response('<html>maintenance</html>', { status: 200 }) }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price/v3')).toHaveLength(1) // unparseable is not retried
  })

  it('declines rather than converting a non-naira amount', async () => {
    stubFetch(quoteStub({ '/price/v3': { Object: { GrandTotal: 25, CurrencyCode: 'USD' } } }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
  })

  it('accepts an explicit NGN currency and reports it', async () => {
    stubFetch(quoteStub({ '/price/v3': { Object: { GrandTotal: 3500, CurrencyCode: 'ngn' } } }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.shippingKobo).toBe(350_000)
      expect(result.currency).toBe('NGN')
    }
  })

  it('declines when login fails, without throwing', async () => {
    stubFetch(quoteStub({ '/login': json({ message: 'bad credentials' }, 401) }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    expect(callsTo('/price/v3')).toHaveLength(0)
  })

  it('never puts the password in the raw payload it hands back', async () => {
    stubFetch(quoteStub({ '/price/v3': json({ message: 'nope' }, 400) }))

    const result = await gigCourier.quote(ADDRESS)
    expect(JSON.stringify(result)).not.toContain('api-password')
  })

  it('returns the verified delivery used for the quote', async () => {
    stubFetch(quoteStub())

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.delivery).toMatchObject({
        mode: 'home',
        stationId: 4,
        latitude: 6.4281,
        longitude: 3.4219,
      })
    }
  })

  it('declines an unresolvable home address without calling GIG', async () => {
    stubFetch(quoteStub({ '/v1/geocode/search': { results: [] } }))

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('no_match')
      expect(result.reason).toMatch(/could not locate that address/i)
    }
    expect(callsTo('/price/v3')).toHaveLength(0)
    expect(callsTo('/login')).toHaveLength(0)
  })

  it('declines when the geocoder is unavailable rather than inventing a point', async () => {
    stubFetch(quoteStub({ '/v1/geocode/search': json({ message: 'down' }, 500) }))

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('http_error')
    expect(callsTo('/price/v3')).toHaveLength(0)
  })

  it('declines when the geocoder times out', async () => {
    stubFetch(quoteStub({
      '/v1/geocode/search': () => {
        throw timeoutError()
      },
    }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('timeout')
    expect(callsTo('/price/v3')).toHaveLength(0)
  })

  it('declines when the sender location is not configured', async () => {
    delete process.env.GIG_SENDER_LATITUDE
    delete process.env.GIG_SENDER_LONGITUDE
    stubFetch(quoteStub())

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('configuration')
    expect(callsTo('/price/v3')).toHaveLength(0)
  })

  it('quotes a service-centre destination with verified centre coordinates', async () => {
    stubFetch(quoteStub({
      '/serviceCentresByStation': SERVICE_CENTRES_OK,
    }))

    const result = await gigCourier.quote({
      ...ADDRESS,
      deliveryMode: 'service_centre',
      serviceCentreId: 18,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.delivery).toMatchObject({
        mode: 'service_centre',
        stationId: 4,
        serviceCentreId: 18,
        serviceCentreName: 'IKOTUN',
        latitude: 6.550577,
        longitude: 3.268126,
      })
    }

    const body = JSON.parse(String(callsTo('/price/v3')[0].init.body))
    expect(body.PickUpOptions).toBe(1) // ServiceCentre
    expect(body.ReceiverLocation).toEqual({ Latitude: 6.550577, Longitude: 3.268126 })
    expect(body.ReceiverStationId).toBe(4)
    // A service-centre quote must not geocode the member's street address.
    expect(callsTo('/v1/geocode/search')).toHaveLength(0)
  })

  it('rejects a service-centre id that GIG does not list', async () => {
    stubFetch(quoteStub({ '/serviceCentresByStation': SERVICE_CENTRES_OK }))

    const result = await gigCourier.quote({
      ...ADDRESS,
      deliveryMode: 'service_centre',
      serviceCentreId: 999,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('service_centre_invalid')
    expect(callsTo('/price/v3')).toHaveLength(0)
  })

  it('requires a service-centre id for service-centre delivery', async () => {
    stubFetch(quoteStub())

    const result = await gigCourier.quote({ ...ADDRESS, deliveryMode: 'service_centre' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('service_centre_required')
    expect(callsTo('/price/v3')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------

describe('token cache', () => {
  it('logs in once across multiple quotes', async () => {
    stubFetch(quoteStub())

    await gigCourier.quote(ADDRESS)
    await gigCourier.quote(ADDRESS)
    await gigCourier.quote(ADDRESS)

    expect(callsTo('/login')).toHaveLength(1)
    expect(callsTo('/price/v3')).toHaveLength(3)
  })

  it('logs in once for concurrent quotes', async () => {
    stubFetch(quoteStub())

    await Promise.all([gigCourier.quote(ADDRESS), gigCourier.quote(ADDRESS)])

    expect(callsTo('/login')).toHaveLength(1)
  })

  it('re-logs in exactly once on a 401 and then succeeds', async () => {
    stubFetch(quoteStub({
      '/login': [json(LOGIN_OK), json({ Object: { access_token: 'token-2', UserId: 'user-1', UserName: 'CUST001' } })],
      '/price/v3': [json({ message: 'expired' }, 401), json({ Object: { GrandTotal: 3500 } })],
    }))

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok && result.shippingKobo).toBe(350_000)
    expect(callsTo('/login')).toHaveLength(2)
    expect(callsTo('/price/v3')).toHaveLength(2)
    const headers = callsTo('/price/v3')[1].init.headers as Record<string, string>
    expect(headers['access-token']).toBe('token-2')
  })

  it('gives up after a single re-login when the 401 persists', async () => {
    stubFetch(quoteStub({ '/price/v3': json({ message: 'expired' }, 401) }))

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(false)
    expect(callsTo('/login')).toHaveLength(2)
    expect(callsTo('/price/v3')).toHaveLength(2)
  })

  it('refreshes the token ahead of its expiry', async () => {
    process.env.GIG_TOKEN_TTL_MS = '120000'
    process.env.GIG_TOKEN_SKEW_MS = '60000'
    stubFetch(quoteStub())

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
    stubFetch(quoteStub({ '/login': { Object: { access_token: 't', expires_in: 3600 } } }))

    await gigCourier.quote(ADDRESS)
    expect(peekGigAuthCache()!.expiresAt).toBeGreaterThan(Date.now() + 3_500_000)
  })

  it('declines when the login response has no token', async () => {
    stubFetch(quoteStub({ '/login': { Object: { UserId: 'user-1' } } }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------

describe('gigCourier.book', () => {
  it('returns the waybill', async () => {
    stubFetch({ '/login': LOGIN_OK, '/v1/geocode/search': GEO_OK, '/capture/preshipment': { Object: { waybill: 'AGL123456', message: 'ok' } } })

    const result = await gigCourier.book(BOOK_INPUT)

    expect(result.waybill).toBe('AGL123456')
    expect(result.trackingUrl).toBeNull()
    const body = JSON.parse(String(callsTo('/capture/preshipment')[0].init.body))
    expect(body.ReceiverDetails.ReceiverName).toBe('Ada Obi')
    expect(body.ReceiverDetails.ReceiverLocation).toEqual({ Latitude: 6.4281, Longitude: 3.4219 })
  })

  it('books a service-centre order with the centre coordinates and id', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/serviceCentresByStation': SERVICE_CENTRES_OK,
      '/capture/preshipment': { Object: { waybill: 'AGL-SC-1' } },
    })

    const result = await gigCourier.book({
      ...BOOK_INPUT,
      deliveryMode: 'service_centre',
      serviceCentreId: 18,
    })

    expect(result.waybill).toBe('AGL-SC-1')
    const body = JSON.parse(String(callsTo('/capture/preshipment')[0].init.body))
    expect(body.ReceiverDetails.ReceiverLocation).toEqual({ Latitude: 6.550577, Longitude: 3.268126 })
    expect(body.ReceiverDetails.DestinationServiceCenterId).toBe(18)
    expect(callsTo('/v1/geocode/search')).toHaveLength(0)
  })

  it('reuses the quoted home destination instead of geocoding again', async () => {
    stubFetch({ '/login': LOGIN_OK, '/capture/preshipment': { Object: { waybill: 'AGL-REUSE' } } })

    const result = await gigCourier.book({
      ...BOOK_INPUT,
      quotedDelivery: {
        mode: 'home',
        stationId: 4,
        latitude: 6.6001,
        longitude: 3.3501,
        formattedAddress: '12 Adeola Odeku Street, Victoria Island, Lagos',
      },
    })

    expect(result.waybill).toBe('AGL-REUSE')
    const body = JSON.parse(String(callsTo('/capture/preshipment')[0].init.body))
    expect(body.ReceiverDetails.ReceiverLocation).toEqual({ Latitude: 6.6001, Longitude: 3.3501 })
    expect(callsTo('/v1/geocode/search')).toHaveLength(0)
  })

  it('books a quoted service centre without re-reading the directory', async () => {
    stubFetch({ '/login': LOGIN_OK, '/capture/preshipment': { Object: { waybill: 'AGL-SC-Q' } } })

    const result = await gigCourier.book({
      ...BOOK_INPUT,
      deliveryMode: 'service_centre',
      serviceCentreId: 18,
      quotedDelivery: {
        mode: 'service_centre',
        stationId: 4,
        latitude: 6.550577,
        longitude: 3.268126,
        formattedAddress: '29, Idimu Road, Ikotun, Lagos',
        serviceCentreId: 18,
        serviceCentreName: 'IKOTUN',
      },
    })

    expect(result.waybill).toBe('AGL-SC-Q')
    const body = JSON.parse(String(callsTo('/capture/preshipment')[0].init.body))
    expect(body.ReceiverDetails.ReceiverLocation).toEqual({ Latitude: 6.550577, Longitude: 3.268126 })
    expect(body.ReceiverDetails.DestinationServiceCenterId).toBe(18)
    expect(callsTo('/serviceCentresByStation')).toHaveLength(0)
  })

  it('ignores a quoted destination that belongs to another service centre', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/serviceCentresByStation': SERVICE_CENTRES_OK,
      '/capture/preshipment': { Object: { waybill: 'AGL-SC-2' } },
    })

    await gigCourier.book({
      ...BOOK_INPUT,
      deliveryMode: 'service_centre',
      serviceCentreId: 18,
      quotedDelivery: {
        mode: 'service_centre',
        stationId: 4,
        latitude: 6.6001,
        longitude: 3.3501,
        formattedAddress: 'Somewhere else',
        serviceCentreId: 99,
      },
    })

    const body = JSON.parse(String(callsTo('/capture/preshipment')[0].init.body))
    expect(body.ReceiverDetails.ReceiverLocation).toEqual({ Latitude: 6.550577, Longitude: 3.268126 })
    expect(body.ReceiverDetails.DestinationServiceCenterId).toBe(18)
  })

  it('reads a capitalised waybill field and a numeric waybill', async () => {
    stubFetch({ '/login': LOGIN_OK, '/v1/geocode/search': GEO_OK, '/capture/preshipment': { Object: { Waybill: 1234567890 } } })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.waybill).toBe('1234567890')
  })

  it('builds a tracking URL from the configured template', async () => {
    process.env.GIG_TRACKING_URL_TEMPLATE = 'https://giglogistics.com/track/{waybill}'
    stubFetch({ '/login': LOGIN_OK, '/v1/geocode/search': GEO_OK, '/capture/preshipment': { Object: { waybill: 'AGL123456' } } })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.trackingUrl).toBe('https://giglogistics.com/track/AGL123456')
  })

  it('throws when a 200 carries no waybill', async () => {
    stubFetch({ '/login': LOGIN_OK, '/v1/geocode/search': GEO_OK, '/capture/preshipment': { Object: { message: 'accepted' } } })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow(/no waybill/i)
  })

  it('is never retried after a 500 — a second booking is a second parcel', async () => {
    stubFetch({ '/login': LOGIN_OK, '/v1/geocode/search': GEO_OK, '/capture/preshipment': json({ message: 'server error' }, 500) })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow(/order-123/)
    expect(callsTo('/capture/preshipment')).toHaveLength(1)
  })

  it('is never retried after a network error', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/v1/geocode/search': GEO_OK,
      '/capture/preshipment': () => {
        throw new Error('ECONNRESET')
      },
    })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow()
    expect(callsTo('/capture/preshipment')).toHaveLength(1)
  })

  it('is never retried after a timeout', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/v1/geocode/search': GEO_OK,
      '/capture/preshipment': () => {
        throw timeoutError()
      },
    })

    await expect(gigCourier.book(BOOK_INPUT)).rejects.toThrow()
    expect(callsTo('/capture/preshipment')).toHaveLength(1)
  })

  it('re-authenticates once on a 401 — a rejected request booked nothing', async () => {
    stubFetch({
      '/login': [json(LOGIN_OK), json({ Object: { access_token: 'token-2' } })],
      '/v1/geocode/search': GEO_OK,
      '/capture/preshipment': [json({ message: 'expired' }, 401), json({ Object: { waybill: 'AGL999' } })],
    })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.waybill).toBe('AGL999')
    expect(callsTo('/capture/preshipment')).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------

describe('mapCarrierStatus', () => {
  it.each([
    ['UNASSIGNED', 'dispatched'],
    ['ACCEPTED', 'dispatched'],
    ['UPCOMING', 'dispatched'],
    ['STARTED', 'in_transit'],
    ['MCRT', 'dispatched'],
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
      '/track/mobileShipment': {
        Object: { MobileShipmentTrackings: [{ Status: 'ACCEPTED' }, { Status: 'ENDED' }, { Status: 'STARTED' }] },
      },
    })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('delivered')
    expect(result.carrierStatus).toBe('ENDED')
  })

  it('URL-encodes the waybill into the path', async () => {
    stubFetch({ '/login': LOGIN_OK, '/track/mobileShipment': { Object: { MobileShipmentTrackings: [] } } })

    await gigCourier.track('AGL 123/456')
    expect(callsTo('/track/mobileShipment')[0].url).toBe(`${BASE}/track/mobileShipment?Waybill=AGL%20123%2F456&fetchOption=1`)
  })

  it('returns unknown when nothing in the response is recognised', async () => {
    stubFetch({
      '/login': LOGIN_OK,
      '/track/mobileShipment': { Object: { MobileShipmentTrackings: [{ Status: 'INVENTED STATE' }] } },
    })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('unknown')
    expect(result.carrierStatus).toBe('INVENTED STATE')
  })

  it('returns unknown on a carrier error rather than throwing', async () => {
    stubFetch({ '/login': LOGIN_OK, '/track/mobileShipment': json({ message: 'not found' }, 404) })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('unknown')
  })

  it('returns unknown when login fails', async () => {
    stubFetch({ '/login': json({ message: 'bad credentials' }, 401) })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('unknown')
  })

  it('reads a top-level status field', async () => {
    stubFetch({ '/login': LOGIN_OK, '/track/mobileShipment': { Object: { ShipmentStatus: 'In Transit' } } })

    const result = await gigCourier.track('AGL123456')
    expect(result.status).toBe('in_transit')
  })
})

// ---------------------------------------------------------------------------

describe('env overrides', () => {
  it('honours an endpoint path override and the legacy schema', async () => {
    process.env.GIG_PATH_QUOTE = 'v2/Thirdparty/price'
    stubFetch({
      '/login': LOGIN_OK,
      '/v1/geocode/search': GEO_OK,
      '/v2/Thirdparty/price': { Object: { GrandTotal: 3500 } },
    })

    const result = await gigCourier.quote(ADDRESS)

    expect(result.ok).toBe(true)
    expect(callsTo('/v2/Thirdparty/price')[0].url).toBe(`${BASE}/v2/Thirdparty/price`)
    const body = JSON.parse(String(callsTo('/v2/Thirdparty/price')[0].init.body))
    expect(body.CustomerCode).toBe('CUST001')
    expect(body.CustomerType).toBe(0)
  })

  it('honours the login path override', async () => {
    process.env.GIG_PATH_LOGIN = 'Admin/login'
    stubFetch(quoteStub({ '/Admin/login': LOGIN_OK }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(true)
    expect(callsTo('/Admin/login')).toHaveLength(1)
  })

  it('honours an amount field-name override', async () => {
    process.env.GIG_FIELD_QUOTE_AMOUNT = 'data.shipping.amount'
    stubFetch(quoteStub({ '/price/v3': { data: { shipping: { amount: 4200 } }, Object: { GrandTotal: 9999 } } }))

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok && result.shippingKobo).toBe(420_000)
  })

  it('honours a waybill field-name override', async () => {
    process.env.GIG_FIELD_WAYBILL = 'data.shipment.reference'
    stubFetch({ '/login': LOGIN_OK, '/v1/geocode/search': GEO_OK, '/capture/preshipment': { data: { shipment: { reference: 'REF-1' } } } })

    const result = await gigCourier.book(BOOK_INPUT)
    expect(result.waybill).toBe('REF-1')
  })

  it('honours a tracking-events field-name override', async () => {
    process.env.GIG_FIELD_TRACK_EVENTS = 'data.events'
    stubFetch({ '/login': LOGIN_OK, '/track/mobileShipment': { data: { events: [{ Status: 'DELIVERED' }] } } })

    const result = await gigCourier.track('AGL1')
    expect(result.status).toBe('delivered')
  })

  it('merges GIG_QUOTE_EXTRA_JSON into the request body', async () => {
    process.env.GIG_QUOTE_EXTRA_JSON = JSON.stringify({ IsPriorityShipment: true, PaymentType: 'Cash' })
    stubFetch(quoteStub())

    await gigCourier.quote(ADDRESS)

    const body = JSON.parse(String(callsTo('/price/v3')[0].init.body))
    expect(body.IsPriorityShipment).toBe(true)
    expect(body.PaymentType).toBe('Cash')
  })

  it('ignores malformed extra JSON instead of crashing the quote', async () => {
    process.env.GIG_QUOTE_EXTRA_JSON = '{not json'
    stubFetch(quoteStub())

    const result = await gigCourier.quote(ADDRESS)
    expect(result.ok).toBe(true)
  })
})
