import { bachsConfig } from '@/lib/payments/bachs/config'
import { parseBachsAmount } from '@/lib/payments/bachs/money'
import { isBachsTerminalSuccess, parseBachsEvent } from '@/lib/payments/bachs/events'
import { verifyBachsSignature } from '@/lib/payments/bachs/signature'
import type { BachsConfig, BachsWebhookEvent, BachsWebhookData } from '@/lib/payments/bachs/types'
import { notifyAwardPaymentConfirmed, type AwardPaymentNotificationInput } from '@/lib/awards/payment-notify'
import { createAdminClient } from '@/lib/supabase/server'

export type BachsWebhookDb = {
  from(table: string): any
  rpc(functionName: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

export type BachsWebhookDeps = {
  db: BachsWebhookDb
  config?: BachsConfig
  nowSeconds?: () => number
  verifySignature?: (input: Record<string, unknown>) => boolean
  parseEvent?: (input: unknown) => BachsWebhookEvent
  parseAmount?: (value: string, currency: 'NGN' | 'USD') => number
  notifyAwardPayment?: (input: AwardPaymentNotificationInput) => Promise<unknown>
}

export type BachsWebhookResult = {
  status: 'processed' | 'duplicate' | 'ignored' | 'exception' | 'rejected' | 'retryable_error' | 'configuration_error'
  httpStatus: 200 | 400 | 401 | 500 | 503
  eventId?: string
  attemptId?: string | null
  outcome?: string
  notificationNeeded?: boolean
  error?: string
}

type AttemptRow = {
  id: string
  order_id: string
  provider?: string | null
  charge_scope?: string | null
  status?: string | null
  requested_amount_minor?: number | string | null
  captured_amount_minor?: number | string | null
  currency?: string | null
  provider_reference?: string | null
  provider_checkout_id?: string | null
  provider_status?: string | null
  provider_charge_id?: string | null
}

type OrderRow = {
  id: string
  profile_id?: string | null
  recipient_name?: string | null
  email?: string | null
  award_payment_status?: string | null
  award_paid_at?: string | null
  award_paid_attempt_id?: string | null
}

type ProcessOutcome = {
  outcome?: unknown
  attempt_id?: unknown
  attempt_status?: unknown
  notification_needed?: unknown
}

class DatabaseFailure extends Error {
  readonly causeValue: unknown

  constructor(message: string, causeValue?: unknown) {
    super(message)
    this.name = 'DatabaseFailure'
    this.causeValue = causeValue
  }
}

function valueString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function headerValue(headers: Headers | Record<string, unknown>, name: string): string | null {
  if (typeof (headers as Headers).get === 'function') return valueString((headers as Headers).get(name))
  const record = headers as Record<string, unknown>
  const wanted = name.toLowerCase()
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === wanted) return valueString(value)
  }
  return null
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message ?? 'unknown error')
  return String(error ?? 'unknown error')
}

function resultObject(data: unknown): ProcessOutcome {
  if (data && typeof data === 'object') return data as ProcessOutcome
  if (typeof data === 'string') return { outcome: data }
  return {}
}

function normalizeOutcome(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function eventData(event: BachsWebhookEvent): BachsWebhookData {
  return event.data && typeof event.data === 'object' ? event.data : {}
}

function metadataValue(metadata: Record<string, unknown> | undefined, key: string): string | null {
  return valueString(metadata?.[key])
}

function upper(value: string | null): string | null {
  return value ? value.toUpperCase() : null
}

function numberMinor(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SERVER_AWARD_FEE_MINOR: Record<'NGN' | 'USD', number> = { NGN: 2_500_000, USD: 2_000 }

async function maybeSingle<T>(query: any): Promise<T | null> {
  let response: { data?: T | null; error?: unknown }
  try {
    response = await query.maybeSingle()
  } catch (error) {
    throw new DatabaseFailure('database read failed', error)
  }
  if (response?.error) throw new DatabaseFailure('database read failed', response.error)
  return response?.data ?? null
}

async function findAttempt(db: BachsWebhookDb, input: { attemptId: string | null; checkoutId: string | null; reference: string | null }): Promise<AttemptRow | null> {
  const selectors: Array<[string, string | null]> = [
    // `award_payment_attempts.id` is uuid. Do not send an arbitrary provider
    // metadata string to Postgres: a malformed value would raise 22P02 and
    // cause a valid signed unmatched event to retry forever.
    ['id', input.attemptId && UUID.test(input.attemptId) ? input.attemptId : null],
    ['provider_checkout_id', input.checkoutId],
    ['provider_reference', input.reference],
  ]

  for (const [column, value] of selectors) {
    if (!value) continue
    const query = db.from('award_payment_attempts').select('*').eq(column, value).eq('provider', 'bachs')
    const attempt = await maybeSingle<AttemptRow>(query)
    if (attempt) return attempt
  }
  return null
}

async function loadOrder(db: BachsWebhookDb, orderId: string): Promise<OrderRow | null> {
  const query = db.from('award_orders').select('*').eq('id', orderId)
  return maybeSingle<OrderRow>(query)
}

async function loadCanonicalAttempt(db: BachsWebhookDb, attemptId: string): Promise<AttemptRow | null> {
  const query = db.from('award_payment_attempts').select('*').eq('id', attemptId).eq('provider', 'bachs')
  return maybeSingle<AttemptRow>(query)
}

async function processEvent(
  db: BachsWebhookDb,
  event: BachsWebhookEvent,
  data: BachsWebhookData,
  attemptId: string | null,
  capturedAmountMinor: number | null,
  receivedAt: string,
): Promise<ProcessOutcome> {
  const { data: result, error } = await db.rpc('process_bachs_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_organization_id: event.organization_id ?? null,
    p_attempt_id: attemptId,
    p_provider_checkout_id: valueString(data.checkout_id),
    p_provider_reference: valueString(data.reference),
    p_provider_status: valueString(data.status),
    p_captured_amount_minor: capturedAmountMinor,
    p_currency: upper(valueString(data.currency)),
    p_provider_charge_id: valueString(data.charge_id),
    p_payload: event,
    p_received_at: receivedAt,
  })
  if (error) throw new DatabaseFailure('database event processing failed', error)
  return resultObject(result)
}

function configValue(config: BachsConfig, key: keyof BachsConfig): unknown {
  return config[key]
}

function isSuccessEvent(event: BachsWebhookEvent, status: string | null): boolean {
  if (event.type !== 'collection.succeeded') return false
  try {
    return isBachsTerminalSuccess(status)
  } catch {
    return status === 'SUCCEEDED' || status === 'ACCEPTED'
  }
}

async function sendPaymentNotification(
  db: BachsWebhookDb,
  attempt: AttemptRow,
  paidAt: string,
  notify: (input: AwardPaymentNotificationInput) => Promise<unknown>,
): Promise<boolean> {
  const order = await loadOrder(db, attempt.order_id)
  // A replay is allowed to repair a notification only when the database says
  // this order is paid and points at one canonical succeeded attempt. Never
  // build a paid notification from the replay's raw amount or currency: a
  // previously underpaid/exception event is also replayable.
  if (order?.award_payment_status !== 'paid' || !order.award_paid_attempt_id) return false
  const canonicalAttempt = await loadCanonicalAttempt(db, order.award_paid_attempt_id)
  if (canonicalAttempt?.status !== 'succeeded') return false
  const canonicalAmount = numberMinor(canonicalAttempt.captured_amount_minor)
  const canonicalCurrency = canonicalAttempt.currency === 'NGN' || canonicalAttempt.currency === 'USD'
    ? canonicalAttempt.currency
    : null
  if (canonicalAmount === null || !canonicalCurrency) return false
  const result = await notify({
    orderId: attempt.order_id,
    profileId: order?.profile_id ?? null,
    recipientName: order?.recipient_name ?? null,
    email: order?.email ?? null,
    currency: canonicalCurrency,
    amountMinor: canonicalAmount,
    paidAt: order.award_paid_at ?? paidAt,
  })
  if (result && typeof result === 'object' && 'errors' in result) {
    const errors = (result as { errors?: unknown }).errors
    if (Array.isArray(errors) && errors.length > 0) {
      console.error('[bachs-webhook] award notification reported channel failures', {
        orderId: attempt.order_id,
        errors,
      })
    }
  }
  return true
}

/**
 * Verify and process one signed Bachs delivery. The event processor RPC owns
 * the durable ledger and payment state transaction; this service only does
 * provider validation, attempt matching, and post-commit notification.
 */
export async function handleBachsEvent(
  rawBody: string,
  headers: Headers | Record<string, unknown>,
  dependencies: BachsWebhookDeps,
): Promise<BachsWebhookResult> {
  let config: BachsConfig
  try {
    config = dependencies.config ?? bachsConfig()
  } catch (error) {
    console.error('[bachs-webhook] configuration unavailable', { error: safeErrorMessage(error) })
    return { status: 'configuration_error', httpStatus: 500, error: 'configuration unavailable' }
  }

  const timestampHeader = headerValue(headers, 'x-bachs-timestamp')
  const signatureHeader = headerValue(headers, 'x-bachs-signature')
  const nowSeconds = dependencies.nowSeconds?.() ?? Math.floor(Date.now() / 1000)
  const verify = dependencies.verifySignature ?? (verifyBachsSignature as unknown as (input: Record<string, unknown>) => boolean)

  let signed = false
  try {
    signed = verify({
      rawBody,
      timestampHeader,
      signatureHeader,
      secret: configValue(config, 'webhookSecret'),
      nowSeconds,
      toleranceSeconds: configValue(config, 'webhookToleranceSeconds'),
    })
  } catch {
    signed = false
  }
  if (!signed) return { status: 'rejected', httpStatus: 401, error: 'invalid signature' }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return { status: 'rejected', httpStatus: 400, error: 'invalid payload' }
  }

  let event: BachsWebhookEvent
  try {
    event = (dependencies.parseEvent ?? parseBachsEvent)(parsedBody)
  } catch {
    return { status: 'rejected', httpStatus: 400, error: 'invalid payload' }
  }

  const organizationId = configValue(config, 'organizationId')
  if (typeof organizationId === 'string' && organizationId.trim() && event.organization_id !== organizationId) {
    return { status: 'rejected', httpStatus: 400, eventId: event.id, error: 'organization mismatch' }
  }

  const data = eventData(event)
  const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : undefined
  const metadataOrderId = metadataValue(metadata, 'order_id')
  const metadataAttemptId = metadataValue(metadata, 'payment_attempt_id')
  const purpose = metadataValue(metadata, 'purpose')
  const providerCheckoutId = valueString(data.checkout_id)
  const providerReference = valueString(data.reference)
  const providerStatus = valueString(data.status)
  const currencyRaw = upper(valueString(data.currency))
  const amountRaw = valueString(data.amount)
  const receivedAt = new Date(nowSeconds * 1000).toISOString()
  const parseAmount = dependencies.parseAmount ?? parseBachsAmount

  let amountMinor: number | null = null
  if (amountRaw && (currencyRaw === 'NGN' || currencyRaw === 'USD')) {
    try {
      amountMinor = parseAmount(amountRaw, currencyRaw)
    } catch {
      amountMinor = null
    }
  }

  const successEvent = isSuccessEvent(event, providerStatus)
  let attempt: AttemptRow | null = null
  try {
    attempt = await findAttempt(dependencies.db, {
      attemptId: metadataAttemptId,
      checkoutId: providerCheckoutId,
      reference: providerReference,
    })
  } catch (error) {
    console.error('[bachs-webhook] attempt lookup failed', { eventId: event.id, error: safeErrorMessage(error) })
    return { status: 'retryable_error', httpStatus: 503, eventId: event.id, error: 'database unavailable' }
  }

  const metadataMatches = Boolean(
    attempt &&
      (!metadataOrderId || metadataOrderId === attempt.order_id) &&
      (!metadataAttemptId || metadataAttemptId === attempt.id) &&
      (!purpose || purpose === 'afl_award_fee_v1'),
  )
  const providerEvidenceMatches = Boolean(
    attempt &&
      (!providerCheckoutId || !attempt.provider_checkout_id || providerCheckoutId === attempt.provider_checkout_id) &&
      (!providerReference || !attempt.provider_reference || providerReference === attempt.provider_reference) &&
      (!currencyRaw || currencyRaw === upper(valueString(attempt.currency))),
  )
  // Successful collections must carry the complete server-owned identity so a
  // charge cannot be claimed from a merely similar provider reference. Some
  // expiry/failure deliveries omit fields, so those events use the identifiers
  // that are present and remain matchable through the attempt id/checkout id.
  const successEvidenceComplete = Boolean(
    metadataOrderId === attempt?.order_id &&
      metadataAttemptId === attempt?.id &&
      purpose === 'afl_award_fee_v1' &&
      providerReference &&
      providerReference === attempt?.provider_reference &&
      (currencyRaw === 'NGN' || currencyRaw === 'USD') &&
      currencyRaw === upper(valueString(attempt?.currency)) &&
      numberMinor(attempt?.requested_amount_minor) === SERVER_AWARD_FEE_MINOR[currencyRaw as 'NGN' | 'USD'],
  )
  const identifiersMatch = Boolean(
    attempt &&
      attempt.provider === 'bachs' &&
      attempt.charge_scope === 'award_fee' &&
      metadataMatches &&
      providerEvidenceMatches &&
      (!successEvent || successEvidenceComplete),
  )

  // A signed but unmatched/malformed event is still sent through the RPC with
  // a null attempt so it is durably acknowledged as an exception/ignored row.
  const matchedAttemptId = identifiersMatch && attempt ? attempt.id : null
  let processResult: ProcessOutcome
  try {
    processResult = await processEvent(dependencies.db, event, data, matchedAttemptId, amountMinor, receivedAt)
  } catch (error) {
    console.error('[bachs-webhook] durable event processing failed', { eventId: event.id, error: safeErrorMessage(error) })
    return { status: 'retryable_error', httpStatus: 503, eventId: event.id, error: 'database unavailable' }
  }

  const outcome = normalizeOutcome(processResult.outcome)
  const notificationNeeded = processResult.notification_needed === true

  if (outcome === 'duplicate_event') {
    // A previous invocation may have committed the payment but crashed before
    // delivering its notification. Re-run the durable notification claim on
    // replay; the notification log prevents duplicate channels.
    if (attempt && successEvent && amountMinor !== null) {
      try {
        const notify = dependencies.notifyAwardPayment ?? ((input) => notifyAwardPaymentConfirmed(input, { db: dependencies.db }))
        await sendPaymentNotification(dependencies.db, attempt, receivedAt, notify)
      } catch (error) {
        console.error('[bachs-webhook] replay notification failed', { eventId: event.id, error: safeErrorMessage(error) })
      }
    }
    return { status: 'duplicate', httpStatus: 200, eventId: event.id, attemptId: attempt?.id ?? null, outcome }
  }

  if (outcome === 'ignored') return { status: 'ignored', httpStatus: 200, eventId: event.id, outcome }

  if (outcome === 'succeeded' || outcome === 'duplicate_succeeded') {
    if (attempt && successEvent && amountMinor !== null && currencyRaw) {
      try {
        const notify = dependencies.notifyAwardPayment ?? ((input) => notifyAwardPaymentConfirmed(input, { db: dependencies.db }))
        await sendPaymentNotification(dependencies.db, attempt, receivedAt, notify)
      } catch (error) {
        // State is already committed. Log the operational failure so it can be
        // replayed/reconciled without exposing provider payloads to the caller.
        console.error('[bachs-webhook] award notification failed', { eventId: event.id, error: safeErrorMessage(error) })
      }
    }
    return {
      status: outcome === 'duplicate_succeeded' ? 'exception' : 'processed',
      httpStatus: 200,
      eventId: event.id,
      attemptId: attempt?.id ?? null,
      outcome,
      notificationNeeded,
    }
  }

  if (outcome === 'exception') {
    return { status: 'exception', httpStatus: 200, eventId: event.id, attemptId: attempt?.id ?? null, outcome }
  }

  // `processed` covers failed, underpaid, and expired event outcomes. They are
  // acknowledged only after the transaction has durably written their state.
  if (outcome === 'processed') {
    return { status: 'processed', httpStatus: 200, eventId: event.id, attemptId: attempt?.id ?? null, outcome }
  }

  console.error('[bachs-webhook] unexpected event processor result', { eventId: event.id, outcome })
  return { status: 'retryable_error', httpStatus: 503, eventId: event.id, error: 'database event processing failed' }
}

/** Test and route convenience: use the production dependencies. */
export function defaultBachsWebhookDeps(): BachsWebhookDeps {
  const db = createAdminClient() as unknown as BachsWebhookDb
  return {
    db,
    config: bachsConfig(),
    notifyAwardPayment: (input) => notifyAwardPaymentConfirmed(input, { db }),
  }
}
