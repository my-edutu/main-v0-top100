// tests/geocoding/geoapify.test.ts
// Zero network: every Geoapify call is stubbed. These tests pin the invariants
// that matter before a real quote: only Nigeria, only street-level results,
// no guessed coordinates, bounded timeouts and no API-key leakage.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildNigerianAddressQuery,
  geocodeNigerianAddress,
  isNigerianCoordinate,
  type NigerianAddress,
} from '@/lib/geocoding/geoapify'

const ADDRESS: NigerianAddress = {
  addressLine1: '12 Adeola Odeku Street',
  city: 'Victoria Island',
  state: 'Lagos',
  country: 'Nigeria',
}

type Call = { url: string; init: RequestInit }

let calls: Call[] = []

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function timeoutError(): Error {
  return Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
}

function stubFetch(handler: (url: string, init: RequestInit) => unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const href = String(url)
    calls.push({ url: href, init })
    const value = handler(href, init)
    if (value instanceof Response) return value.clone()
    if (typeof value === 'function') return (value as () => unknown)()
    return json(value)
  }))
}

const MATCH = {
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

beforeEach(() => {
  calls = []
  process.env.GEOAPIFY_API_KEY = 'geo-test-key'
  process.env.GEOAPIFY_BASE_URL = 'https://geo.test'
  process.env.GEOAPIFY_RETRY_BASE_MS = '0'
  process.env.GEOAPIFY_RETRIES = '1'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const key of [
    'GEOAPIFY_API_KEY',
    'GEOAPIFY_BASE_URL',
    'GEOAPIFY_RETRY_BASE_MS',
    'GEOAPIFY_RETRIES',
    'GEOAPIFY_TIMEOUT_MS',
    'GEOAPIFY_MIN_CONFIDENCE',
    'GEOAPIFY_ALLOW_COARSE_RESULTS',
  ]) {
    delete process.env[key]
  }
})

describe('buildNigerianAddressQuery', () => {
  it('joins the address and constrains the text to Nigeria', () => {
    expect(buildNigerianAddressQuery(ADDRESS)).toBe(
      '12 Adeola Odeku Street, Victoria Island, Lagos, Nigeria',
    )
  })

  it('drops blank optional parts', () => {
    expect(buildNigerianAddressQuery({ ...ADDRESS, addressLine2: '  ', postalCode: '' })).toBe(
      '12 Adeola Odeku Street, Victoria Island, Lagos, Nigeria',
    )
  })
})

describe('isNigerianCoordinate', () => {
  it('accepts points inside Nigeria', () => {
    expect(isNigerianCoordinate(6.4281, 3.4219)).toBe(true)
    expect(isNigerianCoordinate(9.0579, 7.4951)).toBe(true)
  })

  it('rejects points outside Nigeria and non-finite values', () => {
    expect(isNigerianCoordinate(51.5074, -0.1278)).toBe(false)
    expect(isNigerianCoordinate(Number.NaN, 3.4)).toBe(false)
    expect(isNigerianCoordinate(6.4, Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('geocodeNigerianAddress', () => {
  it('returns the verified Geoapify coordinate', async () => {
    stubFetch(() => MATCH)

    const result = await geocodeNigerianAddress(ADDRESS)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.latitude).toBe(6.4281)
      expect(result.longitude).toBe(3.4219)
      expect(result.countryCode).toBe('ng')
      expect(result.resultType).toBe('building')
    }
    expect(calls).toHaveLength(1)
    const url = new URL(calls[0].url)
    expect(url.origin).toBe('https://geo.test')
    expect(url.pathname).toBe('/v1/geocode/search')
    expect(url.searchParams.get('filter')).toBe('countrycode:ng')
    expect(url.searchParams.get('text')).toContain('Adeola Odeku')
    expect(url.searchParams.get('apiKey')).toBe('geo-test-key')
  })

  it('refuses a non-Nigerian country without calling the provider', async () => {
    stubFetch(() => MATCH)
    const result = await geocodeNigerianAddress({ ...ADDRESS, country: 'Ghana' })
    expect(result).toMatchObject({ ok: false, code: 'not_nigeria' })
    expect(calls).toHaveLength(0)
  })

  it('refuses an incomplete address without calling the provider', async () => {
    stubFetch(() => MATCH)
    const result = await geocodeNigerianAddress({ ...ADDRESS, addressLine1: '12' })
    expect(result).toMatchObject({ ok: false, code: 'invalid_address' })
    expect(calls).toHaveLength(0)
  })

  it('fails clearly when the key is not configured', async () => {
    delete process.env.GEOAPIFY_API_KEY
    stubFetch(() => MATCH)
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'not_configured' })
    expect(calls).toHaveLength(0)
  })

  it('returns no_match when Geoapify has no result', async () => {
    stubFetch(() => ({ results: [] }))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'no_match' })
  })

  it('rejects a city/state centroid rather than pricing a guessed point', async () => {
    stubFetch(() => ({
      results: [{ lat: 6.455, lon: 3.384, country_code: 'ng', result_type: 'city' }],
    }))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'not_specific' })
  })

  it('allows a coarse result only when explicitly opted in', async () => {
    process.env.GEOAPIFY_ALLOW_COARSE_RESULTS = 'true'
    stubFetch(() => ({
      results: [{ lat: 6.455, lon: 3.384, country_code: 'ng', result_type: 'city' }],
    }))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result.ok).toBe(true)
  })

  it('rejects a foreign coordinate even with a matching result shape', async () => {
    stubFetch(() => ({
      results: [{ lat: 51.5074, lon: -0.1278, country_code: 'gb', result_type: 'building' }],
    }))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'outside_nigeria' })
  })

  it('rejects a coordinate outside Nigeria when the country field is absent', async () => {
    stubFetch(() => ({ results: [{ lat: 51.5074, lon: -0.1278, result_type: 'building' }] }))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'outside_nigeria' })
  })

  it('enforces an optional minimum confidence', async () => {
    process.env.GEOAPIFY_MIN_CONFIDENCE = '0.9'
    stubFetch(() => ({
      results: [{ lat: 6.4281, lon: 3.4219, country_code: 'ng', result_type: 'building', rank: { confidence: 0.4 } }],
    }))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'no_match' })
  })

  it('retries a timeout and returns a timeout code', async () => {
    stubFetch(() => {
      throw timeoutError()
    })
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'timeout' })
    expect(calls).toHaveLength(2) // 1 attempt + 1 retry
  })

  it('retries a 5xx and succeeds', async () => {
    let attempt = 0
    stubFetch(() => {
      attempt += 1
      return attempt === 1 ? json({ message: 'boom' }, 500) : MATCH
    })
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result.ok).toBe(true)
    expect(calls).toHaveLength(2)
  })

  it('does not retry a 4xx', async () => {
    stubFetch(() => json({ message: 'bad request' }, 400))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'http_error' })
    expect(calls).toHaveLength(1)
  })

  it('fails on a non-JSON 2xx body', async () => {
    stubFetch(() => new Response('<html>maintenance</html>', { status: 200 }))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(result).toMatchObject({ ok: false, code: 'invalid_response' })
    expect(calls).toHaveLength(1)
  })

  it('never returns the API key in its result', async () => {
    stubFetch(() => json({ message: 'nope' }, 400))
    const result = await geocodeNigerianAddress(ADDRESS)
    expect(JSON.stringify(result)).not.toContain('geo-test-key')
  })
})
