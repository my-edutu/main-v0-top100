/** Public Bachs hosted payment links supplied for Africa Future Leaders. */
export const BACHS_AWARD_PAYMENT_LINK = 'https://checkout.bachs.io/pay/pl_f912ab207c61'
export const BACHS_MAGAZINE_FEATURE_PAYMENT_LINK = 'https://checkout.bachs.io/pay/pl_f91a0ffbee95'
/** Public Bachs link used for delivery fees while static-link checkout is enabled. */
export const BACHS_DELIVERY_PAYMENT_LINK = 'https://checkout.bachs.io/pay/pl_2d4914db4ed0'

export function isHostedCheckoutUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}
