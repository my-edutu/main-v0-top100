// Browser-safe award payment contract. Amounts are always supplied by the server.
import { dashboardRead } from '@/lib/http/dashboard-read'

export type AwardPaymentCurrency = 'NGN' | 'USD'

export type AwardPaymentView = {
  checkoutEnabled?: boolean
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
  return readResponse(await dashboardRead('/api/member/award/payment'))
}

export async function startAwardPaymentCheckout(currency: AwardPaymentCurrency): Promise<{
  checkoutUrl: string
  attemptId: string
}> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    return await readResponse(await fetch('/api/member/award/payment/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency }),
      signal: controller.signal,
    }))
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Checkout is taking longer than expected. Refresh this page to check your payment status before trying again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
