// lib/geocoding/geoapify.ts
// Server-only Nigerian address geocoding via Geoapify.
//
// The GIG API requires a receiver coordinate for Price V3. We therefore need a
// provider that can turn a free-text Nigerian street address into a point. This
// module is deliberately strict:
//
//   * it only searches Nigeria (`filter=countrycode:ng`);
//   * it rejects country/state/LGA/city/postcode centroids, because a centroid
//     is not the customer's address and would be a guessed coordinate;
//   * it rejects points outside Nigeria's bounding box; and
//   * it never substitutes a default coordinate when Geoapify fails.
//
// The API key is read from `GEOAPIFY_API_KEY` and stays on the server. Nothing
// here is imported by a client component.

export const NIGERIA_BOUNDS = {
  minLatitude: 4,
  maxLatitude: 14,
  minLongitude: 2.5,
  maxLongitude: 15,
} as const

export type GeocodeFailureCode =
  | 'not_configured'
  | 'invalid_address'
  | 'not_nigeria'
  | 'no_match'
  | 'not_specific'
  | 'outside_nigeria'
  | 'timeout'
  | 'network'
  | 'http_error'
  | 'invalid_response'

export type GeocodeSuccess = {
  ok: true
  latitude: number
  longitude: number
  formattedAddress: string
  resultType: string | null
  confidence: number | null
  countryCode: string | null
}

export type GeocodeFailure = {
  ok: false
  code: GeocodeFailureCode
  /** Member-safe. Never contains an API key, URL, or provider internals. */
  message: string
  retryable: boolean
}

export type GeocodeResult = GeocodeSuccess | GeocodeFailure

export type NigerianAddress = {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode?: string
}

const MEMBER_MESSAGES: Record<GeocodeFailureCode, string> = {
  not_configured:
    'Address verification is temporarily unavailable. Our team will contact you with a delivery cost.',
  invalid_address: 'Enter a complete street address, city and state.',
  not_nigeria: 'Home delivery is only available within Nigeria. Choose a Nigerian address or a GIG service centre.',
  no_match:
    'We could not locate that address in Nigeria. Check the street, area, city and state, then try again.',
  not_specific:
    'We could not pinpoint that address. Add a street number, street name and area so the courier can find it.',
  outside_nigeria: 'That address resolved outside Nigeria. Check the country, state and city.',
  timeout: 'Address verification timed out. Please try again in a moment.',
  network: 'We could not reach the address verification service. Please try again in a moment.',
  http_error: 'Address verification is temporarily unavailable. Please try again or choose a GIG service centre.',
  invalid_response: 'We could not verify that address right now. Please try again in a moment.',
}

/**
 * Coarse results are centroids for an area, not a deliverable address. Pricing
 * a home delivery from one would be inventing a location, so they fail closed.
 */
const COARSE_RESULT_TYPES = new Set(['country', 'state', 'county', 'district', 'city', 'postcode'])

function env(name: string, fallback: string): string {
  const value = process.env[name]
  return value === undefined || value.trim() === '' ? fallback : value.trim()
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function failure(code: GeocodeFailureCode, retryable = false): GeocodeFailure {
  return { ok: false, code, message: MEMBER_MESSAGES[code], retryable }
}

function isAbortError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name
  return name === 'TimeoutError' || name === 'AbortError'
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** True for `NG`, `Nigeria`, and the country's full formal name. */
export function isNigerianCountry(value: string): boolean {
  const country = value.trim().toLowerCase()
  return ['ng', 'nigeria', 'federal republic of nigeria'].includes(country)
}

/** Nigeria's bounding box. Used for both geocoded homes and GIG service centres. */
export function isNigerianCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= NIGERIA_BOUNDS.minLatitude &&
    latitude <= NIGERIA_BOUNDS.maxLatitude &&
    longitude >= NIGERIA_BOUNDS.minLongitude &&
    longitude <= NIGERIA_BOUNDS.maxLongitude
  )
}

/** Build the free-text query Geoapify receives. Always constrained to Nigeria. */
export function buildNigerianAddressQuery(input: NigerianAddress): string {
  return [
    input.addressLine1,
    input.addressLine2,
    input.city,
    input.state,
    input.postalCode,
    'Nigeria',
  ]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(', ')
}

function isValidAddress(input: NigerianAddress): boolean {
  return (
    input.addressLine1.trim().length >= 4 &&
    input.city.trim().length >= 2 &&
    input.state.trim().length >= 2
  )
}

type GeoapifyProperties = Record<string, unknown>

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readProperties(payload: unknown): GeoapifyProperties[] {
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, unknown>

  // `format=json` returns { results: [...] }. GeoJSON returns
  // { features: [{ properties: {...} }] }. Accept both so a provider response
  // shape change cannot silently turn into a made-up coordinate.
  if (Array.isArray(record.results)) {
    return record.results.filter((entry): entry is GeoapifyProperties =>
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    )
  }
  if (Array.isArray(record.features)) {
    return record.features
      .map((entry) => (entry && typeof entry === 'object' ? (entry as Record<string, unknown>).properties : null))
      .filter((entry): entry is GeoapifyProperties =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      )
  }
  return []
}

function interpret(payload: unknown, query: string): GeocodeResult {
  const properties = readProperties(payload)[0]
  if (!properties) return failure('no_match')

  const latitude = parseNumber(properties.lat)
  const longitude = parseNumber(properties.lon)
  if (latitude === null || longitude === null) return failure('invalid_response')

  const countryCode = typeof properties.country_code === 'string'
    ? properties.country_code.trim().toLowerCase()
    : null
  if (countryCode !== null && countryCode !== 'ng') return failure('outside_nigeria')
  if (!isNigerianCoordinate(latitude, longitude)) return failure('outside_nigeria')

  const resultType = typeof properties.result_type === 'string'
    ? properties.result_type.trim().toLowerCase()
    : null
  const allowCoarse = process.env.GEOAPIFY_ALLOW_COARSE_RESULTS === 'true'
  if (!allowCoarse && resultType !== null && COARSE_RESULT_TYPES.has(resultType)) {
    return failure('not_specific')
  }

  const confidence = (() => {
    const rank = properties.rank
    if (!rank || typeof rank !== 'object') return null
    return parseNumber((rank as Record<string, unknown>).confidence)
  })()
  const minimumConfidence = envNumber('GEOAPIFY_MIN_CONFIDENCE', 0)
  if (confidence !== null && minimumConfidence > 0 && confidence < minimumConfidence) {
    return failure('no_match')
  }

  const formattedAddress = typeof properties.formatted === 'string' && properties.formatted.trim() !== ''
    ? properties.formatted.trim()
    : query

  return {
    ok: true,
    latitude,
    longitude,
    formattedAddress,
    resultType,
    confidence,
    countryCode,
  }
}

/**
 * Geocode one Nigerian street address.
 *
 * Retries only timeout/network/5xx/429 failures. A 4xx or a 200 with no usable
 * result is final: repeating it cannot make the address more precise.
 */
export async function geocodeNigerianAddress(input: NigerianAddress): Promise<GeocodeResult> {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim()
  if (!apiKey) return failure('not_configured')

  if (!isNigerianCountry(input.country)) return failure('not_nigeria')
  if (!isValidAddress(input)) return failure('invalid_address')

  const query = buildNigerianAddressQuery(input)
  if (query.length < 8) return failure('invalid_address')

  const baseUrl = env('GEOAPIFY_BASE_URL', 'https://api.geoapify.com')
  let url: URL
  try {
    url = new URL('/v1/geocode/search', baseUrl)
  } catch {
    return failure('not_configured')
  }
  url.searchParams.set('text', query)
  url.searchParams.set('filter', 'countrycode:ng')
  url.searchParams.set('limit', '1')
  url.searchParams.set('format', 'json')
  url.searchParams.set('lang', 'en')
  url.searchParams.set('apiKey', apiKey)

  const timeoutMs = Math.max(1_000, envNumber('GEOAPIFY_TIMEOUT_MS', 6_000))
  const retries = Math.max(0, envNumber('GEOAPIFY_RETRIES', 1))
  const retryBaseMs = Math.max(0, envNumber('GEOAPIFY_RETRY_BASE_MS', 250))

  let last: GeocodeFailure = failure('network', true)

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(retryBaseMs * 2 ** (attempt - 1))

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      const text = await response.text().catch(() => '')

      if (!response.ok) {
        const retryable = response.status >= 500 || response.status === 429
        last = failure('http_error', retryable)
        // Never log the URL: it contains the API key.
        console.error(`[geoapify] geocode failed with HTTP ${response.status}.`)
        if (!retryable) return last
        continue
      }

      let payload: unknown
      try {
        payload = text.trim() === '' ? null : JSON.parse(text)
      } catch {
        console.error('[geoapify] geocode returned a non-JSON body.')
        return failure('invalid_response')
      }

      return interpret(payload, query)
    } catch (error) {
      if (isAbortError(error)) {
        last = failure('timeout', true)
        console.error(`[geoapify] geocode timed out after ${timeoutMs}ms.`)
      } else {
        last = failure('network', true)
        console.error(`[geoapify] geocode network error: ${(error as Error)?.message ?? 'unknown'}`)
      }
    }
  }

  return last
}
