import { randomUUID } from 'node:crypto'

import { createCheckoutSession, isDefinitiveNoSessionError } from '@/lib/payments/bachs/checkout'
import { bachsConfig } from '@/lib/payments/bachs/config'
import type { AwardPaymentCurrency, BachsCheckoutSession } from '@/lib/payments/bachs/types'
import { createAdminClient } from '@/lib/supabase/server'
import { magazineBillingCurrency } from '@/lib/magazine/billing-country'

import { hashMagazineGuestAccessToken } from './guest-access'
import { magazineFeaturePrice, mapMagazinePaymentView, type MagazinePaymentAttempt } from './payment'
import { getActiveMagazineCampaign, MagazinePaymentError } from './payment-server'
export { MagazinePaymentError } from './payment-server'

type GuestCustomer = { name: string; email: string; countryCode: string }

function checkoutUrl(attempt: MagazinePaymentAttempt | null): string | null {
  const rawUrl = attempt?.provider_response?.checkout_url
  if (typeof rawUrl !== 'string') return null
  let hosts = new Set(['checkout.bachs.io'])
  try { hosts = new Set(bachsConfig().checkoutHosts) } catch { /* Use the default trusted hostname. */ }
  try {
    const url = new URL(rawUrl)
    if (url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.search && !url.hash && hosts.has(url.hostname.toLowerCase())) return url.toString()
  } catch { /* Ignore stale or invalid provider URLs. */ }
  return null
}

export async function getPublicMagazinePaymentView(token: string | null) {
  const campaign = await getActiveMagazineCampaign()
  const tokenHash = hashMagazineGuestAccessToken(token)
  if (!tokenHash) return { campaign, orderStatus: 'unpaid', currentAttempt: null, applicationStatus: null }

  const db = createAdminClient()
  const { data: order, error: orderError } = await db.from('magazine_feature_orders')
    .select('id,status,customer_name,customer_email')
    .is('profile_id', null)
    .eq('guest_access_token_hash', tokenHash)
    .eq('campaign_id', campaign.id)
    .maybeSingle()
  if (orderError) throw new MagazinePaymentError(503, 'Could not verify magazine payment status.')
  if (!order) return { campaign, orderStatus: 'unpaid', currentAttempt: null, applicationStatus: null }

  const { data: attempts, error: attemptsError } = await db.from('magazine_feature_payment_attempts')
    .select('id,status,currency,requested_amount_minor,checkout_expires_at,provider_response')
    .eq('order_id', order.id).order('created_at', { ascending: false }).limit(5)
  if (attemptsError) throw new MagazinePaymentError(503, 'Could not verify magazine payment status.')
  let checkoutHosts = new Set(['checkout.bachs.io'])
  try { checkoutHosts = new Set(bachsConfig().checkoutHosts) } catch { /* Use the default trusted Bachs hostname. */ }
  const view = mapMagazinePaymentView(campaign, order, (attempts ?? []) as MagazinePaymentAttempt[], checkoutHosts)
  const { data: application, error: applicationError } = await db.from('magazine_feature_applications')
    .select('status').eq('order_id', order.id).maybeSingle()
  if (applicationError) throw new MagazinePaymentError(503, 'Could not verify magazine application status.')
  return {
    ...view,
    customer: { name: order.customer_name, email: order.customer_email },
    applicationStatus: application?.status ?? null,
  }
}

export async function createPublicMagazineFeatureCheckout(customer: GuestCustomer, token: string) {
  const name = customer.name.trim()
  const email = customer.email.trim().toLowerCase()
  if (name.length < 2 || name.length > 120) throw new MagazinePaymentError(400, 'Enter your full name.')
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MagazinePaymentError(400, 'Enter a valid email address.')
  let currency: AwardPaymentCurrency
  try { currency = magazineBillingCurrency(customer.countryCode) }
  catch { throw new MagazinePaymentError(400, 'Select a valid country.') }
  const tokenHash = hashMagazineGuestAccessToken(token)
  if (!tokenHash) throw new MagazinePaymentError(400, 'Guest application access expired. Refresh the page and try again.')

  const db = createAdminClient()
  const campaign = await getActiveMagazineCampaign()
  if (!campaign.applicationOpen) throw new MagazinePaymentError(409, 'This magazine campaign is closed to new applications.')
  const price = magazineFeaturePrice(campaign, currency)
  const attemptId = randomUUID()
  const reference = `AFL-MAG-GUEST-${attemptId}`
  const { data: reservation, error } = await db.rpc('reserve_bachs_public_magazine_checkout', {
    p_campaign_id: campaign.id,
    p_attempt_id: attemptId,
    p_customer_name: name,
    p_customer_email: email,
    p_guest_access_token_hash: tokenHash,
    p_provider_reference: reference,
    p_idempotency_key: `afl-magazine-${attemptId}`,
    p_currency: currency,
    p_requested_amount_minor: price.amountMinor,
    p_price_version: price.priceVersion,
  })
  if (error) throw new MagazinePaymentError(503, 'Could not reserve a magazine payment. Please try again.')
  if (reservation?.outcome === 'campaign_closed') throw new MagazinePaymentError(409, 'This magazine campaign is closed to new applications.')
  if (reservation?.outcome === 'access_conflict') throw new MagazinePaymentError(409, 'This email or browser is already linked to a magazine application. Use the email and browser from checkout, or contact info@top100afl.com for help.')
  if (reservation?.outcome === 'already_paid') throw new MagazinePaymentError(409, 'Your magazine payment is already confirmed.')
  if (reservation?.outcome === 'needs_review') throw new MagazinePaymentError(409, 'Your earlier magazine payment needs support review.')

  if (reservation?.outcome === 'existing') {
    const { data: existing, error: existingError } = await db.from('magazine_feature_payment_attempts')
      .select('id,status,currency,requested_amount_minor,checkout_expires_at,provider_response')
      .eq('id', reservation.attempt_id).eq('order_id', reservation.order_id).maybeSingle()
    if (existingError) throw new MagazinePaymentError(503, 'Could not load the current payment session.')
    const savedUrl = checkoutUrl(existing as MagazinePaymentAttempt | null)
    if (savedUrl) return { checkoutUrl: savedUrl, attemptId: reservation.attempt_id }
    throw new MagazinePaymentError(409, 'A magazine payment is already in progress. Refresh to check its status.')
  }
  if (reservation?.outcome !== 'created') throw new MagazinePaymentError(409, 'Could not start this magazine payment. Refresh and try again.')

  let session: BachsCheckoutSession
  try {
    session = await createCheckoutSession({
      orderId: reservation.order_id,
      attemptId: reservation.attempt_id,
      reference: reservation.provider_reference,
      idempotencyKey: reservation.idempotency_key,
      currency,
      customer: { email, name },
      config: bachsConfig(),
      purpose: 'afl_magazine_feature_v1',
      priceMinorByCurrency: { NGN: campaign.ngnAmountMinor, USD: campaign.usdAmountMinor },
      successPath: '/magazine/feature?payment=done',
      cancelPath: '/magazine/feature?payment=cancelled',
    })
  } catch (cause) {
    if (isDefinitiveNoSessionError(cause)) {
      await db.rpc('fail_bachs_magazine_checkout_creation', {
        p_attempt_id: reservation.attempt_id,
        p_order_id: reservation.order_id,
        p_failure_reason: 'Bachs rejected the guest magazine checkout request.',
      })
    }
    throw new MagazinePaymentError(502, 'Could not start the magazine payment. Please check the payment status before retrying.')
  }

  const { data: persisted, error: persistError } = await db.from('magazine_feature_payment_attempts').update({
    provider_checkout_id: session.checkoutId,
    provider_status: 'OPEN',
    provider_response: session.safeProviderResponse,
    checkout_expires_at: session.expiresAt,
    status: 'open',
  }).eq('id', reservation.attempt_id).eq('order_id', reservation.order_id).eq('status', 'creating').select('id')
  if (persistError || !persisted?.length) throw new MagazinePaymentError(503, 'The payment session needs review before it can be opened. Please contact support.')
  return { checkoutUrl: session.checkoutUrl, attemptId: reservation.attempt_id }
}

export async function submitPublicMagazineFeatureApplication(
  token: string | null,
  input: { title: string; category: 'bio' | 'story' | 'product' | 'project'; summary: string },
) {
  const tokenHash = hashMagazineGuestAccessToken(token)
  if (!tokenHash) throw new MagazinePaymentError(401, 'Your private application link is missing. Refresh the page and try again.')
  const db = createAdminClient()
  const { data, error } = await db.rpc('submit_public_magazine_feature_application', {
    p_guest_access_token_hash: tokenHash,
    p_title: input.title.trim(),
    p_category: input.category,
    p_summary: input.summary.trim(),
  })
  if (error) {
    const message = String((error as { message?: string }).message ?? '')
    if (message.includes('confirmed magazine feature payment is required')) throw new MagazinePaymentError(402, 'Your payment has not been confirmed yet. Refresh the status and try again.')
    if (message.includes('guest magazine application access was not found')) throw new MagazinePaymentError(404, 'No magazine payment was found for this browser.')
    if (message.includes('details are invalid')) throw new MagazinePaymentError(400, 'Check your application details and try again.')
    throw new MagazinePaymentError(503, 'Could not submit the magazine feature application.')
  }
  return data
}
