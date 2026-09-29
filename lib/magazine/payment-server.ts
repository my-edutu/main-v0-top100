import { randomUUID } from 'node:crypto'

import { createCheckoutSession, isDefinitiveNoSessionError } from '@/lib/payments/bachs/checkout'
import { bachsConfig } from '@/lib/payments/bachs/config'
import type { AwardPaymentCurrency, BachsCheckoutSession } from '@/lib/payments/bachs/types'
import { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_AWARDEE_JOURNEY_SETTINGS } from '@/lib/dashboard/awardee-journey-settings'
import { magazineBillingCurrency } from '@/lib/magazine/billing-country'

import { magazineFeaturePrice, mapMagazinePaymentView, type MagazineCampaign, type MagazinePaymentAttempt } from './payment'

export class MagazinePaymentError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
    this.name = 'MagazinePaymentError'
  }
}

function campaignFromRow(row: any): MagazineCampaign {
  const defaults = DEFAULT_AWARDEE_JOURNEY_SETTINGS.magazineCampaign
  return {
    id: row?.id ?? defaults.id,
    title: row?.title ?? defaults.title,
    description: row?.description ?? defaults.description,
    ngnAmountMinor: Number(row?.ngn_amount_minor ?? defaults.ngnAmountMinor),
    usdAmountMinor: Number(row?.usd_amount_minor ?? defaults.usdAmountMinor),
    priceVersion: row?.price_version ?? defaults.priceVersion,
    applicationOpen: row?.application_open ?? defaults.applicationOpen,
  }
}

async function activeCampaign(db: any): Promise<MagazineCampaign> {
  const { data: settings, error: settingsError } = await db.from('awardee_onboarding_settings').select('magazine_campaign_id').eq('id', true).maybeSingle()
  if (settingsError) throw new MagazinePaymentError(503, 'Magazine checkout is temporarily unavailable.')
  const id = settings?.magazine_campaign_id ?? DEFAULT_AWARDEE_JOURNEY_SETTINGS.magazineCampaign.id
  const { data, error } = await db.from('magazine_feature_campaigns').select('*').eq('id', id).maybeSingle()
  if (error) throw new MagazinePaymentError(503, 'Magazine checkout is temporarily unavailable.')
  if (!data) throw new MagazinePaymentError(503, 'The magazine campaign is not configured yet.')
  return campaignFromRow(data)
}

export async function getMagazineFeaturePaymentView(profileId: string) {
  const db = createAdminClient()
  const campaign = await activeCampaign(db)
  const { data: order, error: orderError }: { data: { id: string; status: string } | null; error: unknown } = await db.from('magazine_feature_orders').select('id,status').eq('profile_id', profileId).eq('campaign_id', campaign.id).maybeSingle()
  if (orderError) throw new MagazinePaymentError(503, 'Could not verify magazine payment status.')
  let attempts: MagazinePaymentAttempt[] = []
  if (order) {
    const { data, error } = await db.from('magazine_feature_payment_attempts').select('id,status,currency,requested_amount_minor,checkout_expires_at,provider_response').eq('order_id', order.id).order('created_at', { ascending: false }).limit(5)
    if (error) throw new MagazinePaymentError(503, 'Could not verify magazine payment status.')
    attempts = (data ?? []) as MagazinePaymentAttempt[]
  }
  let checkoutHosts = new Set(['checkout.bachs.io'])
  try { checkoutHosts = new Set(bachsConfig().checkoutHosts) } catch { /* Only the default provider hostname is trusted when config is incomplete. */ }
  return mapMagazinePaymentView(campaign, order, attempts, checkoutHosts)
}

export async function createMagazineFeatureCheckout(
  member: { id: string },
  customer: { name: string; email: string; countryCode: string },
) {
  if (!customer.name.trim()) throw new MagazinePaymentError(400, 'Enter your full name.')
  if (!customer.email.trim() || !customer.email.includes('@')) throw new MagazinePaymentError(400, 'Enter a valid email address.')
  let currency: AwardPaymentCurrency
  try { currency = magazineBillingCurrency(customer.countryCode) }
  catch { throw new MagazinePaymentError(400, 'Select a valid country.') }
  const db = createAdminClient()
  const campaign = await activeCampaign(db)
  if (!campaign.applicationOpen) throw new MagazinePaymentError(409, 'This magazine campaign is closed to new applications.')
  const price = magazineFeaturePrice(campaign, currency)
  const attemptId = randomUUID()
  const { data: reservation, error } = await db.rpc('reserve_bachs_magazine_checkout', {
    p_profile_id: member.id,
    p_campaign_id: campaign.id,
    p_attempt_id: attemptId,
    p_provider_reference: `AFL-MAG-${member.id}-${attemptId}`,
    p_idempotency_key: `afl-magazine-${attemptId}`,
    p_currency: currency,
    p_requested_amount_minor: price.amountMinor,
    p_price_version: price.priceVersion,
  })
  if (error) throw new MagazinePaymentError(503, 'Could not reserve a magazine payment. Please try again.')
  if (reservation?.outcome === 'already_paid') throw new MagazinePaymentError(409, 'Your magazine payment is already confirmed.')
  if (reservation?.outcome === 'campaign_closed') throw new MagazinePaymentError(409, 'This magazine campaign is closed to new applications.')
  if (reservation?.outcome === 'needs_review') throw new MagazinePaymentError(409, 'Your earlier magazine payment needs support review.')
  if (reservation?.outcome !== 'created') throw new MagazinePaymentError(409, 'A magazine payment is already in progress. Refresh to check its status.')

  let session: BachsCheckoutSession
  try {
    session = await createCheckoutSession({
      orderId: reservation.order_id,
      attemptId: reservation.attempt_id,
      reference: reservation.provider_reference,
      idempotencyKey: reservation.idempotency_key,
      currency,
      customer: { email: customer.email.trim(), name: customer.name.trim() },
      config: bachsConfig(),
      purpose: 'afl_magazine_feature_v1',
      priceMinorByCurrency: { NGN: campaign.ngnAmountMinor, USD: campaign.usdAmountMinor },
      successPath: '/dashboard/me/feature?payment=done',
      cancelPath: '/dashboard/me/feature?payment=cancelled',
    })
  } catch (cause) {
    if (isDefinitiveNoSessionError(cause)) {
      await db.rpc('fail_bachs_magazine_checkout_creation', { p_attempt_id: reservation.attempt_id, p_order_id: reservation.order_id, p_failure_reason: 'Bachs rejected the magazine checkout request.' })
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
