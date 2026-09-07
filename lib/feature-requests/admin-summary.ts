type FeatureRequestSummaryItem = {
  status: string
  payment_status?: string
}

export function summarizeAdminFeatureRequests(items: FeatureRequestSummaryItem[]) {
  return {
    total: items.length,
    pending: items.filter((item) => item.status === 'pending').length,
    paymentCleared: items.filter(
      (item) => item.status === 'paid' || item.payment_status === 'confirmed',
    ).length,
    published: items.filter((item) => item.status === 'published').length,
  }
}

export function formatFeatureRequestAmount(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
