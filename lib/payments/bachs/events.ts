import type { BachsWebhookData, BachsWebhookEvent, BachsWebhookEventType } from './types'

const KNOWN_EVENT_TYPES = new Set<BachsWebhookEventType>([
  'collection.succeeded',
  'collection.failed',
  'collection.underpaid',
  'checkout.completed',
  'checkout.expired',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`Bachs event ${label} is required.`)
  return value.trim()
}

function parseMetadata(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) throw new Error('Bachs event metadata must be an object.')
  const entries = Object.entries(value)
  if (entries.length > 20) throw new Error('Bachs event metadata has too many keys.')
  const metadata: Record<string, string> = {}
  for (const [key, entry] of entries) {
    if (key.length === 0 || key.length > 256 || typeof entry !== 'string' || entry.length > 10_000) {
      throw new Error('Bachs event metadata contains an invalid value.')
    }
    metadata[key] = entry
  }
  return metadata
}

function parseData(value: unknown, type: string): BachsWebhookData {
  if (!isRecord(value)) throw new Error('Bachs event data must be an object.')
  const data = { ...value } as BachsWebhookData

  if (data.checkout_id !== undefined) data.checkout_id = requiredString(data.checkout_id, 'checkout_id')
  if (data.reference !== undefined) data.reference = requiredString(data.reference, 'reference')
  if (data.status !== undefined) data.status = requiredString(data.status, 'status')
  if (data.amount !== undefined) data.amount = requiredString(data.amount, 'amount')
  if (data.currency !== undefined) {
    data.currency = requiredString(data.currency, 'currency')
    if (!/^[A-Z]{3}$/.test(data.currency)) throw new Error('Bachs event currency must be an ISO uppercase code.')
  }
  if (data.charge_id !== undefined && data.charge_id !== null) data.charge_id = requiredString(data.charge_id, 'charge_id')
  const metadata = parseMetadata(data.metadata)
  if (metadata === undefined) delete data.metadata
  else data.metadata = metadata

  const isCollectionSuccess = type === 'collection.succeeded'
  const knownEvent = KNOWN_EVENT_TYPES.has(type as BachsWebhookEventType)
  const hasIdentity = Boolean(data.checkout_id || data.reference)
  if (knownEvent && !hasIdentity) throw new Error('Bachs event data must include checkout_id or reference.')
  if (isCollectionSuccess && (!data.status || !data.amount || !data.currency)) {
    throw new Error('Bachs collection.succeeded event is missing payment evidence.')
  }
  return data
}

/** Runtime-validate the signed Bachs webhook envelope and preserve provider field names. */
export function parseBachsEvent(input: unknown): BachsWebhookEvent {
  if (!isRecord(input)) throw new Error('Bachs event must be an object.')
  const id = requiredString(input.id, 'id')
  const type = requiredString(input.type, 'type')
  const createdAt = requiredString(input.created_at, 'created_at')
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Bachs event created_at must be an ISO timestamp.')
  if (input.organization_id !== undefined && input.organization_id !== null) requiredString(input.organization_id, 'organization_id')
  if (!KNOWN_EVENT_TYPES.has(type as BachsWebhookEventType) && !type.includes('.')) {
    throw new Error('Bachs event type is invalid.')
  }

  return {
    id,
    type,
    created_at: createdAt,
    organization_id: input.organization_id === null || input.organization_id === undefined ? null : String(input.organization_id).trim(),
    data: parseData(input.data, type),
  }
}

/** Bachs treats both SUCCEEDED and ACCEPTED as terminal successful charge states. */
export function isBachsTerminalSuccess(status: unknown): boolean {
  return typeof status === 'string' && ['SUCCEEDED', 'ACCEPTED'].includes(status.trim().toUpperCase())
}

export { KNOWN_EVENT_TYPES }
