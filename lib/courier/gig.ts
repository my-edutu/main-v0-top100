// lib/courier/gig.ts
// GIG Logistics ("Agility" third-party) courier adapter.
//
// ============================ READ THIS FIRST ============================
// THE WIRE FORMAT BELOW IS UNVERIFIED AGAINST A LIVE GIG ACCOUNT. There are no
// GIG credentials in this environment, so not one line of this file has ever
// been executed against the real API. It is written against the shape used by
// GIG's own WooCommerce plugin and a second independent client — see
// docs/gig-integration.md for the citations and for the first-call
// verification checklist.
//
// Consequently: every endpoint path, every response field name and the status
// lookup table are read from environment variables with the documented value
// as the default. If the first real call disagrees with these defaults, the
// fix is a config change, not a code change.
//
// The one thing this adapter must never do is invent a shipping price. Any
// missing, unparseable, non-2xx, timed-out, zero, negative or wrong-currency
// response returns `{ ok: false }`, which parks the order at `quote_failed`
// for an admin to price by hand. Charging a member a guessed shipping cost is
// the only truly unacceptable outcome here.
// =========================================================================
import {
  env,
  envFlag,
  envJsonObject,
  envNumber,
  getGigAuth,
  gigAuthedRequest,
  pickFirstNumber,
  pickFirstString,
  pickValue,
  type HttpResult,
} from './http'
import type {
  BookInput,
  BookResult,
  CourierAdapter,
  CourierStatus,
  QuoteInput,
  QuoteResult,
  TrackResult,
} from './types'

/** Shown to the member whenever we decline to quote. Never leaks carrier detail. */
const MEMBER_SAFE_QUOTE_FAILURE =
  'We could not calculate a delivery cost automatically. Our team will contact you with a delivery cost.'

// ---------------------------------------------------------------------------
// Endpoint paths (relative to GIG_API_BASE_URL, e.g.
// https://mobile.gigl-go.com/api/thirdparty/)
// ---------------------------------------------------------------------------
const paths = {
  quote: () => env('GIG_PATH_QUOTE', 'price'),
  book: () => env('GIG_PATH_BOOK', 'captureshipment'),
  track: () => env('GIG_PATH_TRACK', 'TrackAllShipment/{waybill}'),
  geocode: () => env('GIG_PATH_GEOCODE', 'getaddressdetails'),
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * GIG quotes in naira; this app stores integer kobo everywhere. Returns `null`
 * for anything that is not a strictly positive, finite, representable amount —
 * the caller must then decline to quote rather than substitute a number.
 */
export function nairaToKobo(naira: unknown): number | null {
  if (typeof naira !== 'number' || !Number.isFinite(naira) || naira <= 0) return null
  const kobo = Math.round(naira * 100)
  if (!Number.isSafeInteger(kobo) || kobo <= 0) return null
  return kobo
}

// ---------------------------------------------------------------------------
// Carrier status -> AwardStatus
// ---------------------------------------------------------------------------

/**
 * Explicit, case-insensitive lookup. Anything absent maps to `'unknown'`,
 * which the track route reads as "write nothing" — so terminal-but-unhappy
 * carrier states (FAILED, DECLINE, CANCEL, DELETED) are deliberately absent:
 * they are not one of the app's three forward statuses and must not be guessed
 * into one. The base status vocabulary is GIG's own job-status list.
 */
const DEFAULT_STATUS_MAP: Record<string, CourierStatus> = {
  // With the carrier, not yet moving.
  unassigned: 'dispatched',
  upcoming: 'dispatched',
  accepted: 'dispatched',
  assigned: 'dispatched',
  'shipment created': 'dispatched',
  'shipment scheduled': 'dispatched',
  processing: 'dispatched',
  // Moving.
  started: 'in_transit',
  mcrt: 'in_transit',
  arrived: 'in_transit',
  'in transit': 'in_transit',
  intransit: 'in_transit',
  'out for delivery': 'in_transit',
  'shipment departed': 'in_transit',
  'shipment arrived final destination': 'in_transit',
  // Done.
  ended: 'delivered',
  delivered: 'delivered',
  completed: 'delivered',
  'shipment received by customer': 'delivered',
}

/** Merge of the built-in table and `GIG_STATUS_MAP_JSON`, all keys lowercased. */
function statusMap(): Record<string, CourierStatus> {
  const merged: Record<string, CourierStatus> = { ...DEFAULT_STATUS_MAP }
  for (const [key, value] of Object.entries(envJsonObject('GIG_STATUS_MAP_JSON'))) {
    if (value === 'dispatched' || value === 'in_transit' || value === 'delivered' || value === 'unknown') {
      merged[key.trim().toLowerCase()] = value
    }
  }
  return merged
}

/** Map one carrier status string. Unrecognised text -> `'unknown'`, never a guess. */
export function mapCarrierStatus(text: unknown): CourierStatus {
  if (typeof text !== 'string') return 'unknown'
  const key = text.trim().toLowerCase().replace(/\s+/g, ' ')
  if (key === '') return 'unknown'
  return statusMap()[key] ?? 'unknown'
}

const STATUS_RANK: Record<CourierStatus, number> = { unknown: 0, dispatched: 1, in_transit: 2, delivered: 3 }

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

type Coordinates = { Latitude: string; Longitude: string }

function senderCoordinates(): Coordinates | null {
  const lat = env('GIG_SENDER_LATITUDE', '')
  const lng = env('GIG_SENDER_LONGITUDE', '')
  return lat && lng ? { Latitude: lat, Longitude: lng } : null
}

function receiverAddressLine(input: QuoteInput): string {
  return [input.addressLine1, input.addressLine2, input.city, input.state, input.postalCode, input.country]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(', ')
}

/**
 * The reference client resolves the receiver's coordinates through GIG's own
 * `getaddressdetails` before pricing. It is idempotent, so it retries. A
 * failure here is not fatal: we send the price request without coordinates and
 * let the carrier decide, because the fallback is a declined quote, not a
 * wrong one.
 */
async function geocode(address: string): Promise<Coordinates | null> {
  if (!envFlag('GIG_GEOCODE_ENABLED', true)) return null

  const result = await gigAuthedRequest(paths.geocode(), {
    method: 'POST',
    body: { Address: address, ...envJsonObject('GIG_GEOCODE_EXTRA_JSON') },
    retries: envNumber('GIG_RETRIES', 2),
  })
  if (!result.ok) {
    console.error('[gig] geocode failed, pricing without coordinates:', result.error)
    return null
  }

  const lat = pickFirstString(result.data, env('GIG_FIELD_GEOCODE_LATITUDE', 'Object.Latitude,Latitude'))
  const lng = pickFirstString(result.data, env('GIG_FIELD_GEOCODE_LONGITUDE', 'Object.Longitude,Longitude'))
  return lat && lng ? { Latitude: lat.value, Longitude: lng.value } : null
}

/**
 * Shared price/shipment body. Field casing matches the reference client
 * exactly. `GIG_QUOTE_EXTRA_JSON` / `GIG_BOOK_EXTRA_JSON` are merged last, so
 * any request field this shape gets wrong can be added or overridden from env.
 */
async function buildShipmentBody(input: QuoteInput, extraEnvVar: string): Promise<Record<string, unknown>> {
  const receiverAddress = receiverAddressLine(input)
  const receiverLocation = await geocode(receiverAddress)
  const senderLocation = senderCoordinates()

  const items = [
    {
      SpecialPackageId: '0',
      Quantity: envNumber('GIG_ITEM_QUANTITY', 1),
      Weight: env('GIG_ITEM_WEIGHT_KG', '1'),
      ItemType: env('GIG_ITEM_TYPE', 'Normal'),
      WeightRange: '0',
      ItemName: env('GIG_ITEM_NAME', 'Award plaque'),
      Value: env('GIG_ITEM_VALUE_NAIRA', '0'),
      ShipmentType: env('GIG_SHIPMENT_TYPE', 'Regular'),
    },
  ]

  return {
    ReceiverName: input.recipientName,
    ReceiverPhoneNumber: input.phone,
    ReceiverAddress: receiverAddress,
    ReceiverStateName: input.state,
    ReceiverLocality: input.city,
    ...(receiverLocation ? { ReceiverLocation: receiverLocation } : {}),
    SenderName: env('GIG_SENDER_NAME', ''),
    SenderPhoneNumber: env('GIG_SENDER_PHONE', ''),
    SenderAddress: env('GIG_SENDER_ADDRESS', ''),
    SenderLocality: env('GIG_SENDER_CITY', ''),
    ...(senderLocation ? { SenderLocation: senderLocation } : {}),
    VehicleType: env('GIG_VEHICLE_TYPE', 'BIKE'),
    SenderStationId: env('GIG_SENDER_STATION_ID', '4'),
    ReceiverStationId: env('GIG_RECEIVER_STATION_ID', '4'),
    PreShipmentItems: items,
    ...envJsonObject(extraEnvVar),
  }
}

/** GIG echoes the logged-in account back on every priced/booked request. */
function withAccount(
  body: Record<string, unknown>,
  auth: { userId: string | null; customerCode: string | null },
): Record<string, unknown> {
  return {
    ...body,
    ...(auth.userId ? { UserId: auth.userId } : {}),
    ...(auth.customerCode ? { CustomerCode: auth.customerCode } : {}),
  }
}

function trackingUrlFor(waybill: string, payload: unknown): string | null {
  const fromField = pickFirstString(
    payload,
    env('GIG_FIELD_TRACKING_URL', 'Object.TrackingUrl,Object.trackingUrl,TrackingUrl'),
  )
  if (fromField) return fromField.value
  // Only build a URL from a template the operator configured. Guessing a
  // customer-facing tracking link that 404s is worse than showing none.
  const template = env('GIG_TRACKING_URL_TEMPLATE', '')
  return template ? template.replace('{waybill}', encodeURIComponent(waybill)) : null
}

function logFailure(scope: string, result: Extract<HttpResult, { ok: false }>): void {
  console.error(`[gig] ${scope} failed (${result.kind}${result.status ? ` ${result.status}` : ''}): ${result.error}`)
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const gigCourier: CourierAdapter = {
  name: 'gig',

  async quote(input: QuoteInput): Promise<QuoteResult> {
    let result: HttpResult
    try {
      const auth = await getGigAuth()
      const body = withAccount(await buildShipmentBody(input, 'GIG_QUOTE_EXTRA_JSON'), auth)
      result = await gigAuthedRequest(paths.quote(), { method: 'POST', body, retries: envNumber('GIG_RETRIES', 2) })
    } catch (error) {
      // Login failure, config failure, anything unexpected: decline, never guess.
      console.error('[gig] quote could not be attempted:', (error as Error)?.message ?? error)
      return { ok: false, reason: MEMBER_SAFE_QUOTE_FAILURE, raw: null }
    }

    if (!result.ok) {
      logFailure('quote', result)
      return { ok: false, reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
    }

    // If the carrier names a currency and it is not naira, stop. Converting a
    // foreign amount at a rate we do not have would be inventing a price.
    const currency = pickFirstString(
      result.data,
      env('GIG_FIELD_QUOTE_CURRENCY', 'Object.CurrencyCode,CurrencyCode,Object.Currency'),
    )
    const expectedCurrency = env('GIG_EXPECTED_CURRENCY', 'NGN').toUpperCase()
    if (currency && currency.value.toUpperCase() !== expectedCurrency) {
      console.error(`[gig] quote returned currency ${currency.value}, expected ${expectedCurrency}. Declining.`)
      return { ok: false, reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
    }

    const amount = pickFirstNumber(
      result.data,
      env('GIG_FIELD_QUOTE_AMOUNT', 'Object.GrandTotal,Object.DeliveryPrice,Object.Total'),
    )
    if (!amount) {
      console.error('[gig] quote response carried no readable amount. Check GIG_FIELD_QUOTE_AMOUNT.')
      return { ok: false, reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
    }

    const shippingKobo = nairaToKobo(amount.value)
    if (shippingKobo === null) {
      console.error(`[gig] quote amount at ${amount.path} was not a usable naira value: ${amount.value}`)
      return { ok: false, reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
    }

    return {
      ok: true,
      shippingKobo,
      raw: result.data,
      ...(currency ? { currency: currency.value.toUpperCase() } : {}),
    }
  },

  async book(input: BookInput): Promise<BookResult> {
    const auth = await getGigAuth()
    const body = withAccount(await buildShipmentBody(input, 'GIG_BOOK_EXTRA_JSON'), auth)
    body.ReceiverEmail = input.email
    body.CustomerReference = input.orderId

    // retries: 0 is load-bearing. A retried booking books a second parcel and
    // the member is charged once for two shipments.
    const result = await gigAuthedRequest(paths.book(), { method: 'POST', body, retries: 0 })

    if (!result.ok) {
      logFailure('book', result)
      throw new Error(`GIG could not book order ${input.orderId}: ${result.error}`)
    }

    const waybill = pickFirstString(
      result.data,
      env('GIG_FIELD_WAYBILL', 'Object.waybill,Object.Waybill,Object.WaybillNumber,waybill'),
    )
    if (!waybill) {
      // A 2xx with no waybill may well be a real shipment we cannot identify.
      // Throwing puts the order in the admin "paid but not dispatched" queue,
      // which is recoverable; silently returning would strand it forever.
      console.error('[gig] book returned 2xx with no waybill. Check GIG_FIELD_WAYBILL.')
      throw new Error(
        `GIG accepted order ${input.orderId} but returned no waybill number. ` +
          'Check the GIG dashboard for a shipment against this order before retrying, then dispatch from /admin/awards.',
      )
    }

    return {
      waybill: waybill.value,
      trackingUrl: trackingUrlFor(waybill.value, result.data),
      raw: result.data,
    }
  },

  async track(waybill: string): Promise<TrackResult> {
    let result: HttpResult
    try {
      const path = paths.track().replace('{waybill}', encodeURIComponent(waybill))
      result = await gigAuthedRequest(path, { method: 'GET', retries: envNumber('GIG_RETRIES', 2) })
    } catch (error) {
      console.error('[gig] track could not be attempted:', (error as Error)?.message ?? error)
      return { status: 'unknown', description: 'Tracking is temporarily unavailable.', raw: null, carrierStatus: null }
    }

    if (!result.ok) {
      logFailure('track', result)
      return {
        status: 'unknown',
        description: 'Tracking is temporarily unavailable.',
        raw: result.data,
        carrierStatus: null,
      }
    }

    // Candidate status strings: an optional top-level one, plus every event in
    // the tracking array.
    const candidates: string[] = []
    const topLevel = pickFirstString(
      result.data,
      env('GIG_FIELD_TRACK_STATUS', 'Object.ShipmentStatus,Object.Status,ShipmentStatus'),
    )
    if (topLevel) candidates.push(topLevel.value)

    const events = pickValue(result.data, env('GIG_FIELD_TRACK_EVENTS', 'Object.MobileShipmentTrackings'))
    const eventField = env('GIG_FIELD_TRACK_EVENT_STATUS', 'Status')
    if (Array.isArray(events)) {
      for (const event of events) {
        const text = pickFirstString(event, eventField)
        if (text) candidates.push(text.value)
      }
    }

    // Take the furthest-along status we can *explicitly* recognise. Event order
    // is unverified, and a shipment's journey is monotonic, so ranking beats
    // trusting the array's ordering. Nothing recognised -> 'unknown', which the
    // track route treats as "write nothing".
    let best: CourierStatus = 'unknown'
    let bestText: string | null = null
    for (const text of candidates) {
      const mapped = mapCarrierStatus(text)
      if (STATUS_RANK[mapped] > STATUS_RANK[best]) {
        best = mapped
        bestText = text
      }
      if (bestText === null && mapped === 'unknown') bestText = text
    }

    return {
      status: best,
      description: bestText ?? 'No tracking updates yet.',
      raw: result.data,
      carrierStatus: bestText,
    }
  },
}
