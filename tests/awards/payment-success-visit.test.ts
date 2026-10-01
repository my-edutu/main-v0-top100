import { describe, expect, it } from 'vitest'

import { claimAwardPaymentSuccess } from '@/lib/awards/payment-success-visit'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('award payment success visit', () => {
  it('allows the confirmation once for a verified payment and suppresses later visits', () => {
    const storage = memoryStorage()
    const payment = {
      currency: 'NGN' as const,
      amountMinor: 2_500_000,
      paidAt: '2026-09-29T10:00:00.000Z',
    }

    expect(claimAwardPaymentSuccess(storage, payment)).toBe(true)
    expect(claimAwardPaymentSuccess(storage, payment)).toBe(false)
  })

  it('keeps separate payment confirmations independent', () => {
    const storage = memoryStorage()

    expect(
      claimAwardPaymentSuccess(storage, {
        currency: 'NGN',
        amountMinor: 2_500_000,
        paidAt: '2026-09-29T10:00:00.000Z',
      }),
    ).toBe(true)
    expect(
      claimAwardPaymentSuccess(storage, {
        currency: 'USD',
        amountMinor: 2_000,
        paidAt: '2026-09-29T10:01:00.000Z',
      }),
    ).toBe(true)
  })
})
