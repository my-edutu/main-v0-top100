import { bachsConfig } from '@/lib/payments/bachs/config'
import { parseBachsEvent } from '@/lib/payments/bachs/events'
import { parseBachsAmount } from '@/lib/payments/bachs/money'
import { verifyBachsSignature } from '@/lib/payments/bachs/signature'
import type { BachsConfig, BachsWebhookEvent } from '@/lib/payments/bachs/types'

type Db = {
  from(table: string): any
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

export type MagazineWebhookResult = { httpStatus: 200 | 400 | 401 | 503; outcome: string }
export type MagazineWebhookDeps = {
  db: Db
  config?: BachsConfig
  nowSeconds?: number
  verify?: typeof verifyBachsSignature
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null

async function findAttempt(db: Db, event: BachsWebhookEvent) {
  const data = event.data
  const metadata = data.metadata ?? {}
  const selectors: Array<[string, string | null]> = [
    ['id', typeof metadata.payment_attempt_id === 'string' && UUID.test(metadata.payment_attempt_id) ? metadata.payment_attempt_id : null],
    ['provider_checkout_id', nonEmpty(data.checkout_id)],
    ['provider_reference', nonEmpty(data.reference)],
  ]
  for (const [column, value] of selectors) {
    if (!value) continue
    const { data: attempt, error } = await db.from('magazine_feature_payment_attempts').select('*').eq(column, value).eq('provider', 'bachs').eq('charge_scope', 'magazine_feature').maybeSingle()
    if (error) throw new Error('Magazine payment lookup failed.')
    if (attempt) return attempt
  }
  return null
}

export async function handleBachsMagazineEvent(rawBody: string, headers: Headers, deps: MagazineWebhookDeps): Promise<MagazineWebhookResult> {
  let config: BachsConfig
  try { config = deps.config ?? bachsConfig() }
  catch { return { httpStatus: 503, outcome: 'configuration_error' } }
  if (!config.magazineWebhookSecret) return { httpStatus: 503, outcome: 'configuration_error' }

  const signed = (deps.verify ?? verifyBachsSignature)({
    rawBody,
    timestampHeader: headers.get('x-bachs-timestamp'),
    signatureHeader: headers.get('x-bachs-signature'),
    secret: config.magazineWebhookSecret,
    nowSeconds: deps.nowSeconds,
    toleranceSeconds: config.webhookToleranceSeconds,
  })
  if (!signed) return { httpStatus: 401, outcome: 'invalid_signature' }

  let event: BachsWebhookEvent
  try { event = parseBachsEvent(JSON.parse(rawBody)) }
  catch { return { httpStatus: 400, outcome: 'invalid_payload' } }
  if (config.organizationId && event.organization_id !== config.organizationId) return { httpStatus: 400, outcome: 'organization_mismatch' }

  let attempt
  try { attempt = await findAttempt(deps.db, event) }
  catch { return { httpStatus: 503, outcome: 'database_unavailable' } }
  const data = event.data
  const metadata = data.metadata ?? {}
  const purposeMatches = metadata.purpose === 'afl_magazine_feature_v1'
  const identityMatches = Boolean(attempt
    && purposeMatches
    && metadata.payment_attempt_id === attempt.id
    && metadata.order_id === attempt.order_id
    && (!data.reference || data.reference === attempt.provider_reference)
    && (!data.checkout_id || !attempt.provider_checkout_id || data.checkout_id === attempt.provider_checkout_id))

  const currency = typeof data.currency === 'string' ? data.currency.toUpperCase() : null
  let amountMinor: number | null = null
  if (typeof data.amount === 'string' && (currency === 'NGN' || currency === 'USD')) {
    try { amountMinor = parseBachsAmount(data.amount, currency) } catch { amountMinor = null }
  }
  // The isolated RPC records mismatched currency/amount as an exception or
  // underpayment; only payment identity and immutable scope are checked here.
  const matchedAttemptId = identityMatches ? attempt!.id : null

  let rpcResult: { data: unknown; error: unknown }
  try {
    rpcResult = await deps.db.rpc('process_bachs_magazine_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_organization_id: event.organization_id,
    p_attempt_id: matchedAttemptId,
    p_provider_checkout_id: nonEmpty(data.checkout_id),
    p_provider_reference: nonEmpty(data.reference),
    p_provider_status: nonEmpty(data.status),
    p_captured_amount_minor: amountMinor,
    p_currency: currency,
    p_provider_charge_id: nonEmpty(data.charge_id),
    p_payload: event,
    p_received_at: new Date((deps.nowSeconds ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    })
  } catch {
    return { httpStatus: 503, outcome: 'database_unavailable' }
  }
  if (rpcResult.error) return { httpStatus: 503, outcome: 'database_unavailable' }
  const result = rpcResult.data
  const outcome = typeof result === 'string' ? result : result && typeof result === 'object' && 'outcome' in result ? String(result.outcome) : 'unknown'
  return { httpStatus: 200, outcome }
}
