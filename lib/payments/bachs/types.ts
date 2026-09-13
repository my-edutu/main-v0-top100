/** Currency choices exposed by the member award-payment flow. */
export type AwardPaymentCurrency = 'NGN' | 'USD'

export const AWARD_PAYMENT_CURRENCIES: readonly AwardPaymentCurrency[] = ['NGN', 'USD']

/** Versioned server-owned award price contract. */
export type AwardFee = {
  currency: AwardPaymentCurrency
  amountMinor: number
  bachsAmount: string
  display: string
  priceVersion: string
}

/** Trusted, server-only Bachs configuration. */
export type BachsConfig = {
  apiKey: string
  apiBaseUrl: 'https://sandbox-api.bachs.io' | 'https://api.bachs.io'
  webhookSecret: string
  organizationId: string | null
  webhookToleranceSeconds: number
  checkoutHosts: ReadonlySet<string>
  siteUrl: string
}

export type BachsCheckoutPricing = {
  currency: 'USD'
  amount: string
  currency_options: { NGN: string }
}

export type BachsCheckoutCustomer = {
  email: string
  name?: string
  phone_number?: string
}

/** Exact request body sent to POST /v1/checkout-sessions. */
export type BachsCheckoutRequest = {
  pricing: BachsCheckoutPricing
  billing_currency: AwardPaymentCurrency
  customer: BachsCheckoutCustomer
  reference: string
  metadata: {
    order_id: string
    payment_attempt_id: string
    purpose: 'afl_award_fee_v1'
  }
  success_url: string
  cancel_url: string
  expires_in_minutes: 60
}

/** Application input for one immutable checkout attempt. */
export type CreateCheckoutInput = {
  orderId: string
  attemptId: string
  idempotencyKey: string
  reference: string
  currency: AwardPaymentCurrency
  customer: {
    email: string
    name?: string
    phoneNumber?: string
  }
  /** Optional explicit config for tests and callers that already loaded it. */
  config?: BachsConfig
  /** Optional trusted site origin; normally supplied by BachsConfig. */
  siteUrl?: string
}

/** Provider response shape for POST /v1/checkout-sessions. */
export type BachsCheckoutResponse = {
  checkout_id?: unknown
  checkout_url?: unknown
  status?: unknown
  created_at?: unknown
  expires_at?: unknown
  reference?: unknown
  [key: string]: unknown
}

/** Validated checkout session returned to the payment service. */
export type BachsCheckoutSession = {
  checkoutId: string
  checkoutUrl: string
  status: 'open'
  createdAt: string
  expiresAt: string
  safeProviderResponse: Record<string, unknown>
}

export type BachsWebhookEventType =
  | 'collection.succeeded'
  | 'collection.failed'
  | 'collection.underpaid'
  | 'checkout.completed'
  | 'checkout.expired'

export type BachsWebhookData = {
  checkout_id?: string
  reference?: string
  metadata?: Record<string, string>
  status?: string
  amount?: string
  currency?: string
  charge_id?: string | null
  [key: string]: unknown
}

export type BachsWebhookEvent = {
  id: string
  type: BachsWebhookEventType | string
  created_at: string
  organization_id: string | null
  data: BachsWebhookData
}

export const BACHS_AWARD_SUCCESS_PATH = '/dashboard/me/award?payment=done'
export const BACHS_AWARD_CANCEL_PATH = '/dashboard/me/award?payment=cancelled'
