import { describe, expect, it } from 'vitest'

import {
  formatFeatureRequestAmount,
  summarizeAdminFeatureRequests,
} from '@/lib/feature-requests/admin-summary'

describe('summarizeAdminFeatureRequests', () => {
  it('counts confirmed payments as cleared without requiring a paid workflow status', () => {
    const summary = summarizeAdminFeatureRequests([
      { status: 'pending', payment_status: 'pending' },
      { status: 'contacted', payment_status: 'confirmed' },
      { status: 'paid', payment_status: 'pending' },
      { status: 'published', payment_status: 'confirmed' },
    ])

    expect(summary).toEqual({
      total: 4,
      pending: 1,
      paymentCleared: 3,
      published: 1,
    })
  })
})

describe('formatFeatureRequestAmount', () => {
  it('formats the amount with the currency supplied by the request', () => {
    expect(formatFeatureRequestAmount(1250, 'USD')).toBe('$1,250')
    expect(formatFeatureRequestAmount(20000, 'NGN')).toBe('₦20,000')
  })
})
