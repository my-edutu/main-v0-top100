import type { AwardPaymentCurrency } from '@/lib/payments/bachs/types'

export type MagazineCampaignPrice = {
  currency: AwardPaymentCurrency
  amountMinor: number
  bachsAmount: string
  display: string
  priceVersion: string
}

export type MagazineCampaign = {
  id: string
  title: string
  description: string
  ngnAmountMinor: number
  usdAmountMinor: number
  priceVersion: string
  applicationOpen: boolean
}

export function magazineFeaturePrice(campaign: MagazineCampaign, currency: AwardPaymentCurrency): MagazineCampaignPrice {
  const amountMinor = currency === 'NGN' ? campaign.ngnAmountMinor : campaign.usdAmountMinor
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error('Magazine campaign price is invalid.')
  const major = Math.floor(amountMinor / 100)
  const fraction = amountMinor % 100
  const symbol = currency === 'NGN' ? '₦' : '$'
  const locale = currency === 'NGN' ? 'en-NG' : 'en-US'
  return {
    currency,
    amountMinor,
    bachsAmount: `${major}.${String(fraction).padStart(2, '0')}`,
    display: `${symbol}${major.toLocaleString(locale)}${fraction ? `.${String(fraction).padStart(2, '0')}` : ''}`,
    priceVersion: campaign.priceVersion,
  }
}

export type MagazinePaymentAttempt = {
  id: string
  status: string
  currency: string
  requested_amount_minor: number | string
  checkout_expires_at?: string | null
  provider_response?: Record<string, unknown> | null
}

export function mapMagazinePaymentView(
  campaign: MagazineCampaign,
  order: { status?: string | null } | null,
  attempts: MagazinePaymentAttempt[],
  checkoutHosts: ReadonlySet<string> = new Set(['checkout.bachs.io']),
) {
  const status = order?.status ?? 'unpaid'
  const latest = attempts[0]
  const rawUrl = latest?.provider_response?.checkout_url
  let checkoutUrl: string | undefined
  if (typeof rawUrl === 'string') {
    try {
      const url = new URL(rawUrl)
      if (url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.search && !url.hash && checkoutHosts.has(url.hostname.toLowerCase())) checkoutUrl = url.toString()
    } catch { /* A stale or invalid saved URL is not exposed. */ }
  }
  return {
    campaign,
    orderStatus: status,
    applicationEligible: status === 'paid',
    currentAttempt: latest ? {
      id: latest.id,
      status: latest.status,
      currency: latest.currency,
      amountMinor: Number(latest.requested_amount_minor),
      expiresAt: latest.checkout_expires_at ?? null,
      ...(checkoutUrl ? { checkoutUrl } : {}),
    } : null,
  }
}
