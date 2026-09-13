// Browser-safe award payment contract. Amounts are always supplied by the server.
export type AwardPaymentCurrency = 'NGN' | 'USD'

export type AwardPaymentView = {
  status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
  priceOptions: Array<{ currency: AwardPaymentCurrency; amountMinor: number; display: string }>
  currentAttempt: null | {
    id: string
    currency: AwardPaymentCurrency
    amountMinor: number
    status: string
    expiresAt: string | null
    checkoutUrl?: string | null
  }
  confirmedPayment: null | {
    currency: AwardPaymentCurrency
    amountMinor: number
    paidAt: string
  }
  needsPayment: boolean
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'Could not load award payment. Please try again.')
  return body
}

export async function fetchAwardPayment(): Promise<AwardPaymentView> {
  return readResponse(await fetch('/api/member/award/payment', { cache: 'no-store' }))
}

export async function startAwardPaymentCheckout(currency: AwardPaymentCurrency): Promise<{
  checkoutUrl: string
  attemptId: string
}> {
  return readResponse(await fetch('/api/member/award/payment/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency }),
  }))
}
