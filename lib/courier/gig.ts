// lib/courier/gig.ts
// GIG Logistics (Agility third-party) courier adapter.
//
// ============================ READ THIS FIRST ============================
// Quoting uses GIG's documented Price V3 schema:
//   POST {GIG_API_BASE_URL}/price/v3
// Price V3 requires SenderLocation, ReceiverLocation, PickUpOptions and
// ShipmentItems. Home-delivery coordinates come from a strict Nigerian
// geocoder (Geoapify); service-centre coordinates come from GIG's own
// serviceCentresByStation directory. The adapter never substitutes a guessed
// coordinate and never invents a shipping price.
//
// The surrounding auth, retry, station-directory, booking, tracking and field
// override code is the existing integration. The legacy `/price` body remains
// available through GIG_QUOTE_SCHEMA=legacy for rollback, but is no longer the
// default.
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
  splitPaths,
  type HttpResult,
} from './http'
import { geocodeNigerianAddress, isNigerianCoordinate, isNigerianCountry } from '@/lib/geocoding/geoapify'
import type {
  BookInput,
  BookResult,
  CourierAdapter,
  CourierStatus,
  DeliveryMode,
  QuoteInput,
  QuoteResult,
  ResolvedDelivery,
  TrackResult,
} from './types'

/** Shown to the member whenever we decline to quote. Never leaks carrier detail. */
const MEMBER_SAFE_QUOTE_FAILURE =
  'We could not calculate a delivery cost automatically. Our team will contact you with a delivery cost.'

const MEMBER_SAFE_CONFIGURATION_FAILURE =
  'Delivery quoting is temporarily unavailable. Our team will contact you with a delivery cost.'

const MEMBER_SAFE_DESTINATION_FAILURE =
  'We could not match this destination to a GIG station. Our team will contact you with a delivery cost.'

const MEMBER_SAFE_SERVICE_CENTRE_REQUIRED =
  'Choose a GIG service centre for service-centre delivery.'

const MEMBER_SAFE_SERVICE_CENTRE_INVALID =
  'That GIG service centre is not available for this destination. Choose another centre or use home delivery.'

const MEMBER_SAFE_SERVICE_CENTRE_UNAVAILABLE =
  'We could not load GIG service centres right now. Please try again or use home delivery.'

// ---------------------------------------------------------------------------
// Endpoint paths (relative to GIG_API_BASE_URL, e.g.
// https://thirdpartynode.theagilitysystems.com/)
// ---------------------------------------------------------------------------
const paths = {
  quote: () => env('GIG_PATH_QUOTE', 'price/v3'),
  book: () => env('GIG_PATH_BOOK', 'capture/preshipment'),
  track: () => env('GIG_PATH_TRACK', 'track/mobileShipment'),
  stations: () => env('GIG_PATH_STATIONS', 'localstations/get'),
  serviceCentres: () => env('GIG_PATH_SERVICE_CENTRES', 'serviceCentresByStation'),
}

// ---------------------------------------------------------------------------
// Quote failure handling
// ---------------------------------------------------------------------------

export type QuoteFailureCode =
  | 'invalid_delivery_mode'
  | 'not_nigeria'
  | 'configuration'
  | 'geocoding_disabled'
  | 'destination_unavailable'
  | 'service_centre_required'
  | 'service_centre_invalid'
  | 'service_centre_unavailable'
  | 'invalid_address'
  | 'no_match'
  | 'not_specific'
  | 'outside_nigeria'
  | 'timeout'
  | 'network'
  | 'http_error'
  | 'invalid_response'
  | 'carrier_error'

/** Internal control-flow error carrying a member-safe code and message. */
export class QuoteError extends Error {
  constructor(
    public readonly code: QuoteFailureCode,
    message: string,
  ) {
    super(message)
    this.name = 'QuoteError'
  }
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
  mapt: 'dispatched',
  crt: 'dispatched',
  'shipment created': 'dispatched',
  'shipment scheduled': 'dispatched',
  processing: 'dispatched',
  // Moving.
  started: 'in_transit',
  mcrt: 'dispatched',
  arrived: 'in_transit',
  'in transit': 'in_transit',
  intransit: 'in_transit',
  'out for delivery': 'in_transit',
  'shipment departed': 'in_transit',
  'shipment arrived final destination': 'in_transit',
  mahd: 'delivered',
  okc: 'delivered',
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
// Stations and service centres
// ---------------------------------------------------------------------------

type Coordinates = { Latitude: number; Longitude: number }

type GigStation = {
  id: number
  name: string
  code: string
  state: string
}

export type GigServiceCentre = {
  id: number
  name: string
  code: string
  address: string
  stationId: number
  latitude: number
  longitude: number
}

let stationCache: { expiresAt: number; stations: GigStation[] } | null = null
let inflightStations: Promise<GigStation[]> | null = null

const serviceCentreCache = new Map<number, { expiresAt: number; centres: GigServiceCentre[] }>()
const inflightServiceCentres = new Map<number, Promise<GigServiceCentre[]>>()

function normalizedLocation(value: string): string {
  return value
    .toLowerCase()
    .replace(/ state$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function stationFromPayload(value: unknown): GigStation | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = Number(record.StationId)
  if (!Number.isSafeInteger(id) || id <= 0) return null
  return {
    id,
    name: typeof record.StationName === 'string' ? record.StationName : '',
    code: typeof record.StationCode === 'string' ? record.StationCode : '',
    state: typeof record.StateName === 'string' ? record.StateName : '',
  }
}

async function loadStations(): Promise<GigStation[]> {
  if (stationCache && stationCache.expiresAt > Date.now()) return stationCache.stations
  if (!inflightStations) {
    inflightStations = (async () => {
      const result = await gigAuthedRequest(paths.stations(), {
        method: 'GET',
        retries: envNumber('GIG_RETRIES', 2),
      })
      if (!result.ok) throw new Error(`GIG station lookup failed: ${result.error}`)

      const candidates = [
        pickValue(result.data, 'data.data'),
        pickValue(result.data, 'data'),
        pickValue(result.data, 'Object.data'),
        pickValue(result.data, 'Object'),
      ]
      const raw = candidates.find(Array.isArray)
      const stations = Array.isArray(raw)
        ? raw.map(stationFromPayload).filter((station): station is GigStation => station !== null)
        : []
      if (stations.length === 0) throw new Error('GIG station lookup returned no usable stations.')
      stationCache = { stations, expiresAt: Date.now() + envNumber('GIG_STATION_CACHE_MS', 86_400_000) }
      return stations
    })().finally(() => {
      inflightStations = null
    })
  }
  return inflightStations
}

function serviceCentreFromPayload(value: unknown, expectedStationId: number): GigServiceCentre | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = Number(record.ServiceCentreId)
  const stationId = Number(record.StationId)
  const latitude = Number(record.Latitude)
  const longitude = Number(record.Longitude)
  if (!Number.isSafeInteger(id) || id <= 0) return null
  if (!Number.isSafeInteger(stationId) || stationId !== expectedStationId) return null
  if (!isNigerianCoordinate(latitude, longitude)) return null
  return {
    id,
    stationId,
    latitude,
    longitude,
    name: typeof record.ServiceCentreName === 'string' ? record.ServiceCentreName : '',
    code: typeof record.ServiceCentreCode === 'string' ? record.ServiceCentreCode : '',
    address: typeof record.Address === 'string' ? record.Address.trim() : '',
  }
}

function serviceCentrePath(stationId: number): string {
  const path = paths.serviceCentres()
  const encoded = encodeURIComponent(String(stationId))
  if (path.includes('{stationId}')) return path.replace('{stationId}', encoded)
  return `${path}${path.includes('?') ? '&' : '?'}StationId=${encoded}`
}

async function loadServiceCentres(stationId: number): Promise<GigServiceCentre[]> {
  const cached = serviceCentreCache.get(stationId)
  if (cached && cached.expiresAt > Date.now()) return cached.centres

  const inflight = inflightServiceCentres.get(stationId)
  if (inflight) return inflight

  const promise = (async () => {
    const result = await gigAuthedRequest(serviceCentrePath(stationId), {
      method: 'GET',
      retries: envNumber('GIG_RETRIES', 2),
    })
    if (!result.ok) throw new Error(`GIG service-centre lookup failed: ${result.error}`)

    const candidates = [
      pickValue(result.data, 'data.data'),
      pickValue(result.data, 'data'),
      pickValue(result.data, 'Object.data'),
      pickValue(result.data, 'Object'),
    ]
    const raw = candidates.find(Array.isArray)
    const centres = Array.isArray(raw)
      ? raw
          .map((centre) => serviceCentreFromPayload(centre, stationId))
          .filter((centre): centre is GigServiceCentre => centre !== null)
      : []
    if (centres.length === 0) {
      throw new Error('GIG service-centre lookup returned no usable service centres.')
    }

    serviceCentreCache.set(stationId, {
      centres,
      expiresAt: Date.now() + envNumber('GIG_SERVICE_CENTRE_CACHE_MS', 86_400_000),
    })
    return centres
  })().finally(() => {
    inflightServiceCentres.delete(stationId)
  })

  inflightServiceCentres.set(stationId, promise)
  return promise
}

export function resetGigStationCache(): void {
  stationCache = null
  inflightStations = null
}

export function resetGigServiceCentreCache(): void {
  serviceCentreCache.clear()
  inflightServiceCentres.clear()
}

async function receiverStationId(input: Pick<QuoteInput, 'state' | 'city'>): Promise<number> {
  // A single explicit id is retained for Postman/testing and emergency
  // operations. Production should leave it unset so user destinations are
  // resolved below.
  const explicit = process.env.GIG_RECEIVER_STATION_ID?.trim()
  if (explicit && /^\d+$/.test(explicit)) return Number(explicit)
  const state = normalizedLocation(input.state)
  const city = normalizedLocation(input.city)
  const overrides = envJsonObject('GIG_RECEIVER_STATION_MAP_JSON')
  const override = overrides[`${state}:${city}`] ?? overrides[city]
  if (typeof override === 'number' && Number.isSafeInteger(override) && override > 0) return override
  if (typeof override === 'string' && /^\d+$/.test(override.trim())) return Number(override)

  const stations = await loadStations()
  const inState = stations.filter((station) => normalizedLocation(station.state) === state)
  const exact = inState.filter((station) => {
    const names = [station.name, station.code].map(normalizedLocation).filter(Boolean)
    return names.includes(city)
  })
  if (exact.length === 1) return exact[0].id

  const partial = inState.filter((station) => {
    const names = [station.name, station.code].map(normalizedLocation).filter(Boolean)
    return names.some((name) => name.includes(city) || city.includes(name))
  })
  if (partial.length === 1) return partial[0].id
  if (inState.length === 1) return inState[0].id

  throw new Error(
    `GIG has multiple or no stations for ${input.city}, ${input.state}. ` +
      'Set GIG_RECEIVER_STATION_MAP_JSON for this destination or use manual pricing.',
  )
}

/** Public directory helper so a member can choose a service centre before quoting. */
export async function listGigServiceCentres(
  input: Pick<QuoteInput, 'state' | 'city'>,
): Promise<GigServiceCentre[]> {
  const stationId = await receiverStationId(input)
  return loadServiceCentres(stationId)
}

function senderCoordinates(): Coordinates | null {
  const lat = Number(env('GIG_SENDER_LATITUDE', ''))
  const lng = Number(env('GIG_SENDER_LONGITUDE', ''))
  return Number.isFinite(lat) && Number.isFinite(lng) ? { Latitude: lat, Longitude: lng } : null
}

/** Price V3 makes SenderLocation mandatory. Never guess a pickup point. */
function requiredSenderLocation(): Coordinates {
  const location = senderCoordinates()
  if (!location || !isNigerianCoordinate(location.Latitude, location.Longitude)) {
    throw new QuoteError(
      'configuration',
      'Delivery quoting is not configured with a valid Nigerian pickup location. Our team will contact you with a delivery cost.',
    )
  }
  return location
}

function stationId(name: string, fallback: number): number {
  return envNumber(name, fallback)
}

function receiverAddressLine(input: QuoteInput): string {
  return [input.addressLine1, input.addressLine2, input.city, input.state, input.postalCode, input.country]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(', ')
}

function deliveryAddressLine(input: QuoteInput, delivery: ResolvedDelivery): string {
  const address =
    delivery.mode === 'service_centre'
      ? delivery.formattedAddress || delivery.serviceCentreName || receiverAddressLine(input)
      : receiverAddressLine(input)
  return address.slice(0, 500)
}

/**
 * A quote stores the exact destination it priced. Booking reuses that record
 * instead of re-geocoding or re-reading the service-centre directory: the
 * member already paid for that destination, and a geocoder rate-limit or a
 * directory change must not move the parcel or block dispatch.
 *
 * The record is only reused when it still matches the requested mode and
 * service centre and carries a valid Nigerian coordinate.
 */
function reusableDelivery(
  quoted: ResolvedDelivery | undefined,
  mode: DeliveryMode,
  requestedCentreId: unknown,
): ResolvedDelivery | null {
  if (!quoted || quoted.mode !== mode) return null
  if (!Number.isSafeInteger(quoted.stationId) || quoted.stationId <= 0) return null
  if (!isNigerianCoordinate(quoted.latitude, quoted.longitude)) return null

  if (mode === 'service_centre') {
    const requested = Number(requestedCentreId)
    if (!Number.isSafeInteger(requested) || requested <= 0) return null
    if (quoted.serviceCentreId !== requested) return null
  }

  return {
    mode,
    stationId: quoted.stationId,
    latitude: quoted.latitude,
    longitude: quoted.longitude,
    formattedAddress: typeof quoted.formattedAddress === 'string' ? quoted.formattedAddress : null,
    ...(mode === 'service_centre' && quoted.serviceCentreId
      ? { serviceCentreId: quoted.serviceCentreId }
      : {}),
    ...(mode === 'service_centre' && quoted.serviceCentreName
      ? { serviceCentreName: quoted.serviceCentreName }
      : {}),
  }
}

/**
 * Resolve the destination the carrier will price. Home delivery is geocoded;
 * service-centre delivery uses GIG's verified centre coordinates. Both fail
 * closed rather than falling back to a centroid or a default point.
 */
type DeliveryInput = QuoteInput & { quotedDelivery?: ResolvedDelivery }

async function resolveDelivery(input: DeliveryInput): Promise<ResolvedDelivery> {
  const mode: DeliveryMode = input.deliveryMode ?? 'home'
  if (mode !== 'home' && mode !== 'service_centre') {
    throw new QuoteError('invalid_delivery_mode', 'Choose home delivery or a GIG service centre.')
  }
  if (!isNigerianCountry(input.country)) {
    throw new QuoteError(
      'not_nigeria',
      'Home delivery is only available within Nigeria. Choose a Nigerian address or a GIG service centre.',
    )
  }

  const reused = reusableDelivery(input.quotedDelivery, mode, input.serviceCentreId)
  if (reused) return reused

  let station: number
  try {
    station = await receiverStationId(input)
  } catch (error) {
    console.error('[gig] destination station could not be resolved:', (error as Error)?.message ?? error)
    throw new QuoteError('destination_unavailable', MEMBER_SAFE_DESTINATION_FAILURE)
  }

  if (mode === 'service_centre') {
    const requested = Number(input.serviceCentreId)
    if (!Number.isSafeInteger(requested) || requested <= 0) {
      throw new QuoteError('service_centre_required', MEMBER_SAFE_SERVICE_CENTRE_REQUIRED)
    }

    let centres: GigServiceCentre[]
    try {
      centres = await loadServiceCentres(station)
    } catch (error) {
      console.error('[gig] service-centre directory unavailable:', (error as Error)?.message ?? error)
      throw new QuoteError('service_centre_unavailable', MEMBER_SAFE_SERVICE_CENTRE_UNAVAILABLE)
    }

    const centre = centres.find((candidate) => candidate.id === requested)
    if (!centre) {
      throw new QuoteError('service_centre_invalid', MEMBER_SAFE_SERVICE_CENTRE_INVALID)
    }

    return {
      mode,
      stationId: station,
      latitude: centre.latitude,
      longitude: centre.longitude,
      formattedAddress: centre.address || centre.name || null,
      serviceCentreId: centre.id,
      serviceCentreName: centre.name || undefined,
    }
  }

  if (!envFlag('GIG_GEOCODE_ENABLED', true)) {
    throw new QuoteError('geocoding_disabled', MEMBER_SAFE_CONFIGURATION_FAILURE)
  }

  const geocoded = await geocodeNigerianAddress({
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    state: input.state,
    country: input.country,
    postalCode: input.postalCode,
  })
  if (!geocoded.ok) {
    if (geocoded.code === 'not_configured') {
      throw new QuoteError('configuration', MEMBER_SAFE_CONFIGURATION_FAILURE)
    }
    throw new QuoteError(geocoded.code, geocoded.message)
  }

  return {
    mode,
    stationId: station,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    formattedAddress: geocoded.formattedAddress,
  }
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

function quoteSchema(): 'v3' | 'legacy' {
  const configured = process.env.GIG_QUOTE_SCHEMA?.trim().toLowerCase()
  if (configured === 'v3' || configured === 'legacy') return configured
  return paths.quote().toLowerCase().includes('v3') ? 'v3' : 'legacy'
}

function shipmentItems(): Record<string, unknown>[] {
  return [
    {
      SpecialPackageId: 0,
      Quantity: envNumber('GIG_ITEM_QUANTITY', 1),
      Weight: envNumber('GIG_ITEM_WEIGHT_KG', 1),
      ItemName: env('GIG_ITEM_NAME', 'Award plaque'),
      Description: env('GIG_ITEM_DESCRIPTION', 'Award plaque'),
      IsVolumetric: false,
      Value: envNumber('GIG_ITEM_VALUE_NAIRA', 0),
      ShipmentType: envNumber('GIG_SHIPMENT_TYPE', 1),
    },
  ]
}

/**
 * Price V3 body. Field casing and the four required members come directly from
 * GIG's Price V3 schema. Extra fields are merged last so an account-specific
 * requirement can be added from env without a deploy.
 */
function buildV3QuoteBody(input: QuoteInput, delivery: ResolvedDelivery): Record<string, unknown> {
  const senderLocation = requiredSenderLocation()
  const senderAddress = env('GIG_SENDER_ADDRESS', '')

  return {
    ...(senderAddress ? { SenderAddress: senderAddress.slice(0, 500) } : {}),
    SenderStationId: stationId('GIG_SENDER_STATION_ID', 4),
    ReceiverStationId: delivery.stationId,
    VehicleType: envNumber('GIG_VEHICLE_TYPE', 1),
    ReceiverLocation: {
      Latitude: delivery.latitude,
      Longitude: delivery.longitude,
    },
    SenderLocation: senderLocation,
    ReceiverAddress: deliveryAddressLine(input, delivery),
    IsPriorityShipment: envFlag('GIG_IS_PRIORITY_SHIPMENT', false),
    // GIG's documented PICKUP_OPTION: 0 = HomeDelivery, 1 = ServiceCentre.
    PickUpOptions: delivery.mode === 'service_centre' ? 1 : 0,
    ShipmentItems: shipmentItems(),
    ...envJsonObject('GIG_QUOTE_EXTRA_JSON'),
  }
}

/**
 * Legacy `/price` body retained for rollback. It reuses the same verified
 * coordinates and never calls the retired `getaddressdetails` endpoint.
 */
function buildLegacyQuoteBody(input: QuoteInput, delivery: ResolvedDelivery): Record<string, unknown> {
  const senderLocation = senderCoordinates()

  return {
    ReceiverLocation: {
      Latitude: delivery.latitude,
      Longitude: delivery.longitude,
    },
    ...(senderLocation ? { SenderLocation: senderLocation } : {}),
    VehicleType: envNumber('GIG_VEHICLE_TYPE', 1),
    SenderStationId: stationId('GIG_SENDER_STATION_ID', 4),
    ReceiverStationId: delivery.stationId,
    CustomerType: envNumber('GIG_CUSTOMER_TYPE', 0),
    PickUpOptions: delivery.mode === 'service_centre' ? 1 : 0,
    DeliveryOptionIds: [envNumber('GIG_DELIVERY_OPTION_ID', 0)],
    IsFromAgility: envFlag('GIG_IS_FROM_AGILITY', false),
    ShipmentItems: shipmentItems(),
    Value: envNumber('GIG_ITEM_VALUE_NAIRA', 0),
    ...envJsonObject('GIG_QUOTE_EXTRA_JSON'),
  }
}

async function buildBookBody(input: BookInput): Promise<Record<string, unknown>> {
  const delivery = await resolveDelivery(input)
  const receiverAddress = deliveryAddressLine(input, delivery)
  const senderAddress = env('GIG_SENDER_ADDRESS', '')
  const senderLocation = senderCoordinates()
  const receiverLocation: Coordinates = {
    Latitude: delivery.latitude,
    Longitude: delivery.longitude,
  }

  return {
    SenderDetails: {
      SenderName: env('GIG_SENDER_NAME', ''),
      SenderPhoneNumber: env('GIG_SENDER_PHONE', ''),
      SenderStationId: stationId('GIG_SENDER_STATION_ID', 4),
      SenderAddress: senderAddress,
      InputtedSenderAddress: senderAddress,
      SenderLocality: env('GIG_SENDER_CITY', ''),
      ...(senderLocation ? { SenderLocation: senderLocation } : {}),
    },
    ReceiverDetails: {
      ReceiverStationId: delivery.stationId,
      ReceiverName: input.recipientName,
      ReceiverPhoneNumber: input.phone,
      ReceiverAddress: receiverAddress,
      InputtedReceiverAddress: receiverAddress,
      ReceiverLocation: receiverLocation,
      ...(delivery.mode === 'service_centre' && delivery.serviceCentreId
        ? { DestinationServiceCenterId: delivery.serviceCentreId }
        : {}),
    },
    ShipmentDetails: {
      VehicleType: envNumber('GIG_VEHICLE_TYPE', 1),
      IsFromAgility: envNumber('GIG_IS_FROM_AGILITY_NUMBER', 0),
      IsBatchPickUp: 0,
    },
    ShipmentItems: [
      {
        Quantity: envNumber('GIG_ITEM_QUANTITY', 1),
        ShipmentType: envNumber('GIG_SHIPMENT_TYPE', 1),
        ItemName: env('GIG_ITEM_NAME', 'Award plaque'),
        Description: env('GIG_ITEM_DESCRIPTION', `Award plaque for order ${input.orderId}`),
        Weight: envNumber('GIG_ITEM_WEIGHT_KG', 1),
        Value: envNumber('GIG_ITEM_VALUE_NAIRA', 0),
        IsVolumetric: false,
        SpecialPackageId: 0,
      },
    ],
    ...envJsonObject('GIG_BOOK_EXTRA_JSON'),
  }
}

/** Legacy `/price` echoes the logged-in account back. Price V3 does not. */
function withAccount(
  body: Record<string, unknown>,
  auth: { userId: string | null; customerCode: string | null },
): Record<string, unknown> {
  return {
    ...body,
    ...(auth.customerCode ? { CustomerCode: auth.customerCode } : {}),
    ...(envFlag('GIG_INCLUDE_USER_ID', false) && auth.userId ? { UserId: auth.userId } : {}),
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
    const schema = quoteSchema()
    let prepared: { body: Record<string, unknown>; delivery: ResolvedDelivery } | null = null

    try {
      const delivery = await resolveDelivery(input)
      const auth = schema === 'legacy' ? await getGigAuth() : null
      const body =
        schema === 'v3'
          ? buildV3QuoteBody(input, delivery)
          : buildLegacyQuoteBody(input, delivery)
      prepared = { body: auth ? withAccount(body, auth) : body, delivery }
    } catch (error) {
      if (error instanceof QuoteError) {
        // Deliberately log the code only: the message is member-facing and the
        // address is personal data.
        console.error(`[gig] quote declined (${error.code}).`)
        return { ok: false, code: error.code, reason: error.message, raw: null }
      }
      // Login failure, config failure, anything unexpected: decline, never guess.
      console.error('[gig] quote could not be attempted:', (error as Error)?.message ?? error)
      return { ok: false, code: 'carrier_error', reason: MEMBER_SAFE_QUOTE_FAILURE, raw: null }
    }

    if (!prepared) {
      return { ok: false, code: 'carrier_error', reason: MEMBER_SAFE_QUOTE_FAILURE, raw: null }
    }

    let result: HttpResult
    try {
      result = await gigAuthedRequest(paths.quote(), {
        method: 'POST',
        body: prepared.body,
        retries: envNumber('GIG_RETRIES', 2),
      })
    } catch (error) {
      console.error('[gig] quote request failed:', (error as Error)?.message ?? error)
      return { ok: false, code: 'carrier_error', reason: MEMBER_SAFE_QUOTE_FAILURE, raw: null }
    }

    if (!result.ok) {
      logFailure('quote', result)
      return { ok: false, code: 'carrier_error', reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
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
      return { ok: false, code: 'carrier_error', reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
    }

    const amount = pickFirstNumber(
      result.data,
      env('GIG_FIELD_QUOTE_AMOUNT', 'data.data.GrandTotal,data.GrandTotal,Object.GrandTotal,data.data.DeliverPrice,Object.DeliveryPrice,Object.Total'),
    )
    if (!amount) {
      console.error('[gig] quote response carried no readable amount. Check GIG_FIELD_QUOTE_AMOUNT.')
      return { ok: false, code: 'carrier_error', reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
    }

    const shippingKobo = nairaToKobo(amount.value)
    if (shippingKobo === null) {
      console.error(`[gig] quote amount at ${amount.path} was not a usable naira value: ${amount.value}`)
      return { ok: false, code: 'carrier_error', reason: MEMBER_SAFE_QUOTE_FAILURE, raw: result.data }
    }

    return {
      ok: true,
      shippingKobo,
      raw: result.data,
      delivery: prepared.delivery,
      ...(currency ? { currency: currency.value.toUpperCase() } : {}),
    }
  },

  async book(input: BookInput): Promise<BookResult> {
    const body = await buildBookBody(input)

    // retries: 0 is load-bearing. A retried booking books a second parcel and
    // the member is charged once for two shipments.
    const result = await gigAuthedRequest(paths.book(), { method: 'POST', body, retries: 0 })

    if (!result.ok) {
      logFailure('book', result)
      throw new Error(`GIG could not book order ${input.orderId}: ${result.error}`)
    }

    const waybill = pickFirstString(
      result.data,
      env(
        'GIG_FIELD_WAYBILL',
        'data.data.waybill,data.data.Waybill,data.data.WaybillNumber,data.waybill,data.Waybill,data.WaybillNumber,data.Shipments.0.Waybill,Object.waybill,Object.Waybill,Object.WaybillNumber,waybill',
      ),
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
      const configuredPath = paths.track()
      const path = configuredPath.includes('{waybill}')
        ? configuredPath.replace('{waybill}', encodeURIComponent(waybill))
        : `${configuredPath}?Waybill=${encodeURIComponent(waybill)}&fetchOption=${encodeURIComponent(envNumber('GIG_TRACK_FETCH_OPTION', 1))}`
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

    const eventPaths = splitPaths(env('GIG_FIELD_TRACK_EVENTS', 'data.0.MobileShipmentTrackings,data.data.0.MobileShipmentTrackings,Object.MobileShipmentTrackings,MobileShipmentTrackings'))
    const events = eventPaths.map((path) => pickValue(result.data, path)).find(Array.isArray)
    const eventField = env('GIG_FIELD_TRACK_EVENT_STATUS', 'Status,Code,Reason')
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
