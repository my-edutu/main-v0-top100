// Server-owned payment access. Never import this module from a client component.
import crypto from 'node:crypto'
import { bachsConfig } from '@/lib/payments/bachs/config'
import {
  createCheckoutSession,
  buildCheckoutRequest,
  isDefinitiveNoSessionError,
} from '@/lib/payments/bachs/checkout'
import type { BachsCheckoutSession } from '@/lib/payments/bachs/types'
import type { AwardPaymentCurrency } from './payment'
import { createAdminClient } from '@/lib/supabase/server'
import { loadOrderForUser, isMissingAwardTable } from './server'
import { mapPaymentView } from './payment-state'
import { awardFee } from './payment-price'
import { AwardPaymentError } from './payment-errors'
import type { AwardPaymentView } from './payment'
import { reconcileAwardAttempt } from './payment-reconciliation'
import { sendPaymentLifecycleEmail } from '@/lib/payments/payment-emails'

export function paymentDatabaseError(error: { code?: string; message?: string } | null): never {
  if (isMissingAwardTable(error) || error?.code === '42883' || error?.code === 'PGRST202') {
    throw new AwardPaymentError(503, 'Award payment setup is not complete yet. Please contact support.')
  }
  throw new AwardPaymentError(503, 'Could not access award payment. Please try again shortly.')
}

export async function getAwardPaymentView(userId: string): Promise<AwardPaymentView> {
  const db = createAdminClient()
  const { order, error } = await loadOrderForUser(db, userId)
  if (error) paymentDatabaseError(error)
  const priceOptions = (['NGN', 'USD'] as const).map(currency => {
    const { amountMinor, display } = awardFee(currency)
    return { currency, amountMinor, display }
  })
  if (!order) return mapPaymentView(null, [], priceOptions)
  // Select only payment-view fields; provider payloads remain admin-only.
  const { data: attempts, error: attemptsError } = await db
    .from('award_payment_attempts')
    .select('id,status,currency,requested_amount_minor,captured_amount_minor,checkout_expires_at,confirmed_at,provider_response')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
  if (attemptsError) paymentDatabaseError(attemptsError)
  const view = mapPaymentView(order, attempts ?? [], priceOptions)
  const latest = attempts?.[0]
  // A member can resume the same open checkout, never mint a replacement.
  // Revalidate a persisted redirect against the current server allowlist.
  if (view.currentAttempt?.status === 'open' && latest?.provider_response?.checkout_url) {
    try {
      const config = bachsConfig()
      const url = new URL(latest.provider_response.checkout_url)
      if (url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.search && !url.hash && config.checkoutHosts.has(url.hostname)
        && Date.parse(view.currentAttempt.expiresAt ?? '') > Date.now()) {
        view.currentAttempt.checkoutUrl = url.href
      }
    } catch {
      // Missing configuration or an invalid persisted URL never opens a redirect.
    }
  }
  return view
}

const CHECKOUT_PERSIST_MAX_ATTEMPTS = 3

type CheckoutReservation = {
  order_id: string
  attempt_id: string
  provider_reference: string
  idempotency_key: string
}

type PaymentDb = ReturnType<typeof createAdminClient>

function providerResponse(session: BachsCheckoutSession, checkoutContactEmail: string, checkoutCountryCode: string): Record<string, unknown> {
  return {
    ...session.safeProviderResponse,
    checkout_url: session.checkoutUrl,
    checkout_contact_email: checkoutContactEmail,
    checkout_country_code: checkoutCountryCode,
  }
}

function safeCreationFailureReason(error: unknown): string {
  if (isDefinitiveNoSessionError(error)) {
    return `Bachs rejected checkout creation with HTTP ${error.status}.`
  }
  return 'Bachs checkout creation failed before a session was returned.'
}

async function failCreatingAttemptBestEffort(
  db: PaymentDb,
  reservation: CheckoutReservation,
  error: unknown,
): Promise<void> {
  const failureReason = safeCreationFailureReason(error)
  try {
    const { error: rpcError } = await db.rpc('fail_bachs_award_checkout_creation', {
      p_attempt_id: reservation.attempt_id,
      p_order_id: reservation.order_id,
      p_failure_reason: failureReason,
    })
    if (!rpcError) return
  } catch {
    // Fall through to a guarded compatibility write for databases that have
    // not exposed the helper yet. The original provider error remains the
    // response to the member either way.
  }

  try {
    const { data: updated, error: attemptError } = await db
      .from('award_payment_attempts')
      .update({ status: 'failed', failure_reason: failureReason })
      .eq('id', reservation.attempt_id)
      .eq('order_id', reservation.order_id)
      .eq('status', 'creating')
      .select('id')
    if (attemptError || !updated?.length) return

    await db
      .from('award_orders')
      .update({ award_payment_status: 'failed' })
      .eq('id', reservation.order_id)
      .eq('award_payment_status', 'pending')
  } catch {
    // A database outage leaves the original creating reservation in place so
    // reconciliation can use its provider reference and idempotency key.
  }
}

async function persistCheckoutSession(
  db: PaymentDb,
  reservation: CheckoutReservation,
  session: BachsCheckoutSession,
  checkoutContactEmail: string,
  checkoutCountryCode: string,
): Promise<'persisted' | 'raced' | 'failed'> {
  const values = {
    status: 'open',
    provider_checkout_id: session.checkoutId,
    provider_status: session.status,
    checkout_expires_at: session.expiresAt,
    provider_response: providerResponse(session, checkoutContactEmail, checkoutCountryCode),
  }

  for (let attempt = 0; attempt < CHECKOUT_PERSIST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const { data, error } = await db
        .from('award_payment_attempts')
        .update(values)
        .eq('id', reservation.attempt_id)
        .eq('order_id', reservation.order_id)
        .eq('status', 'creating')
        .select('id')
      if (error) {
        if (attempt + 1 < CHECKOUT_PERSIST_MAX_ATTEMPTS) await Promise.resolve()
        continue
      }
      return data?.length ? 'persisted' : 'raced'
    } catch {
      if (attempt + 1 < CHECKOUT_PERSIST_MAX_ATTEMPTS) await Promise.resolve()
    }
  }
  return 'failed'
}

async function recordCreatedCheckoutExceptionBestEffort(
  db: PaymentDb,
  reservation: CheckoutReservation,
  session: BachsCheckoutSession,
  checkoutContactEmail: string,
  checkoutCountryCode: string,
): Promise<boolean> {
  try {
    const { data } = await db
      .from('award_payment_attempts')
      .update({
        status: 'exception',
        provider_checkout_id: session.checkoutId,
        provider_status: session.status,
        checkout_expires_at: session.expiresAt,
        provider_response: providerResponse(session, checkoutContactEmail, checkoutCountryCode),
        failure_reason: 'Bachs created a checkout but saving it failed.',
      })
      .eq('id', reservation.attempt_id)
      .eq('order_id', reservation.order_id)
      .eq('status', 'creating')
      .select('id')
    return Boolean(data?.length)
  } catch {
    return false
  }
}

/** Reserve first, then create exactly one provider session for that reservation. */
export async function createAwardPaymentCheckout(
  member: { id: string; email?: string | null },
  currency: AwardPaymentCurrency,
  contactEmail?: string,
  countryCode?: string,
): Promise<{ checkoutUrl: string; attemptId: string }> {
  let checkoutEmail = (contactEmail ?? member.email ?? '').trim().toLowerCase()
  if (!checkoutEmail || checkoutEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutEmail)) {
    throw new AwardPaymentError(400, 'Enter a valid email address for checkout.')
  }
  const config = bachsConfig()
  const fee = awardFee(currency)
  const attemptId = crypto.randomUUID()
  const db = createAdminClient()
  const { data: reservation, error } = await db.rpc('reserve_bachs_award_checkout', {
    p_profile_id: member.id,
    p_attempt_id: attemptId,
    p_provider_reference: `AFL-AWARD-${member.id}-${attemptId}`,
    p_idempotency_key: `afl-award-${attemptId}`,
    p_currency: currency,
    p_requested_amount_minor: fee.amountMinor,
    p_price_version: fee.priceVersion,
  })
  if (error) paymentDatabaseError(error)
  if (reservation?.outcome === 'already_paid') {
    throw new AwardPaymentError(409, 'Your award fee has already been paid. Refresh to see your confirmation.')
  }
  if (reservation?.outcome === 'legacy_pending') {
    throw new AwardPaymentError(409, 'An earlier payment needs confirmation. Please contact support before paying again.')
  }
  let savedRequest: { body: string; apiKeyFingerprint: string; apiBaseUrl: string } | null = null
  let checkoutCountryCode = countryCode ?? ''
  const keyFingerprint = crypto.createHash('sha256').update(config.apiKey).digest('hex')
  if (reservation?.outcome === 'existing' && reservation.attempt_id && reservation.order_id) {
    const { data: existing, error: existingError } = await db.from('award_payment_attempts').select('*')
      .eq('id', reservation.attempt_id).eq('order_id', reservation.order_id).maybeSingle()
    if (existingError) paymentDatabaseError(existingError)
    if (existing?.provider_checkout_id) {
      await reconcileAwardAttempt(db, existing, { config })
      const view = await getAwardPaymentView(member.id)
      if (view.currentAttempt?.checkoutUrl) {
        const existingContactEmail = typeof existing.provider_response?.checkout_contact_email === 'string'
          ? existing.provider_response.checkout_contact_email
          : (member.email ?? checkoutEmail).trim().toLowerCase()
        const emailResult = await sendPaymentLifecycleEmail({
          product: 'award', status: 'checkout', attemptId: existing.id,
          email: existingContactEmail, currency: existing.currency,
          amountMinor: Number(existing.requested_amount_minor), checkoutUrl: view.currentAttempt.checkoutUrl,
        })
        if (!emailResult.ok) console.error('[award-payment] checkout email could not be sent', { attemptId: existing.id, reason: emailResult.reason })
        return { checkoutUrl: view.currentAttempt.checkoutUrl, attemptId: existing.id }
      }
      throw new AwardPaymentError(409, 'Your payment status has been updated. Refresh your award page to continue.')
    }
    savedRequest = existing?.provider_response?.checkout_request ?? null
    if (typeof existing?.provider_response?.checkout_country_code === 'string') {
      checkoutCountryCode = existing.provider_response.checkout_country_code
    }
    if (existing?.status !== 'creating' || !savedRequest?.body ||
        !Number.isFinite(Date.parse(existing.created_at)) || Date.now() - Date.parse(existing.created_at) >= 23 * 60 * 60_000 ||
        savedRequest.apiKeyFingerprint !== keyFingerprint || savedRequest.apiBaseUrl !== config.apiBaseUrl) {
      throw new AwardPaymentError(409, 'This checkout needs verification. Check payment status on your award page before trying again.')
    }
    currency = existing.currency
  }
  if (reservation?.outcome !== 'created' && !savedRequest) {
    throw new AwardPaymentError(409, 'A payment is already being processed or needs review. Refresh your award page before continuing.')
  }

  const savedCustomerEmail = savedRequest
    ? (JSON.parse(savedRequest.body) as { customer?: { email?: unknown } }).customer?.email
    : null
  if (typeof savedCustomerEmail === 'string') checkoutEmail = savedCustomerEmail

  const input = {
    orderId: reservation.order_id, attemptId: reservation.attempt_id,
    reference: reservation.provider_reference, idempotencyKey: reservation.idempotency_key,
    currency, customer: { email: checkoutEmail }, config,
    adaptivePricing: Boolean(checkoutCountryCode),
  }
  const requestBody = savedRequest?.body ?? JSON.stringify(buildCheckoutRequest(input))
  if (!savedRequest) {
    const { data: saved, error: saveError } = await db.from('award_payment_attempts')
      .update({ provider_response: { checkout_country_code: checkoutCountryCode, checkout_request: { body: requestBody, apiKeyFingerprint: keyFingerprint, apiBaseUrl: config.apiBaseUrl } } })
      .eq('id', reservation.attempt_id).eq('order_id', reservation.order_id).eq('status', 'creating').select('id')
    if (saveError || !saved?.length) {
      await failCreatingAttemptBestEffort(db, reservation, new Error('Could not save the request before sending it.'))
      throw new AwardPaymentError(503, 'Could not prepare secure checkout. Please check payment status before trying again.')
    }
  }

  // The provider adapter retries the SAME body and idempotency key. If the
  // outcome remains uncertain, leave `creating` reserved for reconciliation.
  // Never mark a network timeout failed and expose another charge.
  let session: BachsCheckoutSession
  try {
    session = await createCheckoutSession({ ...input, requestBody, recover: Boolean(savedRequest) })
  } catch (error) {
    if (isDefinitiveNoSessionError(error)) {
      await failCreatingAttemptBestEffort(db, reservation, error)
    }
    throw error
  }

  const persisted = await persistCheckoutSession(db, reservation, session, checkoutEmail, checkoutCountryCode)
  if (persisted === 'persisted') {
    if (savedRequest && (session.status !== 'open' || Date.parse(session.expiresAt) <= Date.now())) {
      const { data: recovered, error: recoveryError } = await db.from('award_payment_attempts').select('*').eq('id', reservation.attempt_id).maybeSingle()
      if (recoveryError) paymentDatabaseError(recoveryError)
      if (recovered) await reconcileAwardAttempt(db, recovered, { config })
      throw new AwardPaymentError(409, 'Your payment status has been updated. Refresh your award page to continue.')
    }
    const emailResult = await sendPaymentLifecycleEmail({
      product: 'award', status: 'checkout', attemptId: reservation.attempt_id,
      email: checkoutEmail, currency, amountMinor: awardFee(currency).amountMinor, checkoutUrl: session.checkoutUrl,
    })
    if (!emailResult.ok) console.error('[award-payment] checkout email could not be sent', { attemptId: reservation.attempt_id, reason: emailResult.reason })
    return { checkoutUrl: session.checkoutUrl, attemptId: reservation.attempt_id }
  }

  const exceptionPersisted = await recordCreatedCheckoutExceptionBestEffort(db, reservation, session, checkoutEmail, checkoutCountryCode)
  if (exceptionPersisted) {
    throw new AwardPaymentError(503, 'Your payment was created but needs support review. Please contact support before retrying.')
  }

  const persistenceReason = persisted === 'raced'
    ? 'checkout persistence lost a concurrent payment-state race'
    : 'checkout persistence failed after bounded retries'
  console.error('[award-payment] checkout persistence failed', {
    attemptId: reservation.attempt_id,
    reason: persistenceReason,
  })
  if (persisted === 'raced') {
    throw new AwardPaymentError(409, 'Your payment state changed. Refresh to see its confirmation before continuing.')
  }
  throw new AwardPaymentError(503, 'Your payment was created but could not be saved. Please contact support before retrying.')
}
