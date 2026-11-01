import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  awardDeliveryBill,
  canEditDelivery,
  canPayDelivery,
  canResumeDelivery,
  deliveryCheckoutBody,
  deliveryDestinationLabel,
  deliveryReconcileRequest,
  formatDeliveryAmount,
  isHostedCheckoutUrl,
  shouldReconcileDeliveryReturn,
} from '@/lib/awards/delivery/member-ui'
import { deliveryRecoveryWaybill, deliveryReviewReason } from '@/lib/awards/delivery/admin-ui'
import { DeliveryCostChecker } from '@/app/dashboard/_components/delivery-cost-checker'

const now = Date.parse('2026-11-01T12:00:00.000Z')

function delivery(status: 'quoted' | 'open' | 'paid' | 'booking' | 'needs_review' | 'expired', expiresAt = '2026-11-01T13:00:00.000Z') {
  return { status, expiresAt }
}

describe('separate award delivery UI rules', () => {
  it('offers payment only for a live quoted delivery, never for pending, paid, review, or expired rows', () => {
    expect(canPayDelivery(delivery('quoted'), now)).toBe(true)
    expect(canPayDelivery(delivery('quoted', '2026-11-01T11:59:59.000Z'), now)).toBe(false)
    expect(canPayDelivery(delivery('expired'), now)).toBe(false)
    expect(canPayDelivery(delivery('open'), now)).toBe(false)
    expect(canPayDelivery(delivery('paid'), now)).toBe(false)
    expect(canPayDelivery(delivery('booking'), now)).toBe(false)
    expect(canPayDelivery(delivery('needs_review'), now)).toBe(false)
  })

  it('allows an open provider checkout to resume without enabling another payment for locked rows', () => {
    expect(canResumeDelivery(delivery('open'))).toBe(true)
    expect(canResumeDelivery(delivery('paid'))).toBe(false)
    expect(canResumeDelivery(delivery('booking'))).toBe(false)
    expect(canResumeDelivery(delivery('dispatched'))).toBe(false)
    expect(canResumeDelivery(delivery('needs_review'))).toBe(false)
  })

  it('allows a fresh quote only when there is no row or the old row is quoted/expired', () => {
    expect(canEditDelivery(null, now)).toBe(true)
    expect(canEditDelivery(delivery('quoted'), now)).toBe(true)
    expect(canEditDelivery(delivery('expired'), now)).toBe(true)
    expect(canEditDelivery(delivery('open'), now)).toBe(false)
    expect(canEditDelivery(delivery('paid'), now)).toBe(false)
    expect(canEditDelivery(delivery('needs_review'), now)).toBe(false)
  })

  it('keeps checkout scoped to the delivery row and never sends an amount', () => {
    expect(deliveryCheckoutBody('delivery-123')).toEqual({ deliveryId: 'delivery-123' })
    expect(deliveryCheckoutBody('delivery-123')).not.toHaveProperty('amountMinor')
    expect(deliveryCheckoutBody('delivery-123')).not.toHaveProperty('awardAmountMinor')
  })

  it('keeps the confirmed award fee separate from the delivery fee', () => {
    const bill = awardDeliveryBill(
      { currency: 'USD', amountMinor: 12500, paidAt: '2026-11-01T11:00:00.000Z' },
      { currency: 'NGN', amountMinor: 750000 },
    )

    expect(bill.award).toMatchObject({ label: 'Award fee', amountMinor: 12500, status: 'paid' })
    expect(bill.delivery).toMatchObject({ label: 'Delivery fee', amountMinor: 750000, status: 'separate' })
    expect(bill.award?.amountMinor).not.toBe(bill.delivery?.amountMinor)
  })

  it('starts reconciliation from a successful hosted return, not from a cancellation or arbitrary URL', () => {
    expect(shouldReconcileDeliveryReturn('?deliveryPayment=done')).toBe(true)
    expect(shouldReconcileDeliveryReturn('?deliveryPayment=cancelled')).toBe(false)
    expect(shouldReconcileDeliveryReturn('?deliveryPayment=done&status=paid')).toBe(true)
    expect(shouldReconcileDeliveryReturn('?status=paid')).toBe(false)
    expect(deliveryReconcileRequest()).toEqual({ method: 'POST' })
    expect(deliveryReconcileRequest()).not.toHaveProperty('body')
  })

  it('accepts only HTTPS hosted checkout links', () => {
    expect(isHostedCheckoutUrl('https://checkout.example.test/session/123')).toBe(true)
    expect(isHostedCheckoutUrl('http://checkout.example.test/session/123')).toBe(false)
    expect(isHostedCheckoutUrl('javascript:alert(1)')).toBe(false)
    expect(isHostedCheckoutUrl(null)).toBe(false)
  })

  it('preserves kobo in displayed GIG delivery quotes', () => {
    expect(formatDeliveryAmount(513550, 'NGN')).toBe('₦5,135.50')
    expect(formatDeliveryAmount(500000, 'NGN')).toBe('₦5,000.00')
  })

  it('shows the server-resolved GIG centre destination instead of the search city', () => {
    expect(deliveryDestinationLabel({
      deliveryMode: 'service_centre',
      destination: 'GIG Ajah Centre, Lagos',
      addressLine1: '12 Search Street',
      addressLine2: '',
      city: 'Lekki',
      state: 'Lagos',
      postalCode: '',
      country: 'Nigeria',
    })).toBe('GIG Ajah Centre, Lagos')
  })

  it('restores saved destination fields when reopening an editable quote', () => {
    const markup = renderToStaticMarkup(<DeliveryCostChecker
      nigeriaOnly
      initialDraft={{
        deliveryMode: 'home',
        country: 'Nigeria',
        addressLine1: '12 Saved Street',
        addressLine2: 'Near the market',
        city: 'Lekki',
        state: 'Lagos',
        postalCode: '101233',
      }}
    />)

    expect(markup).toContain('value="12 Saved Street"')
    expect(markup).toContain('value="Near the market"')
    expect(markup).toContain('value="Lekki"')
    expect(markup).toContain('value="101233"')
    expect(markup).toContain('value="Lagos"')
  })

  it('bounds and strips control characters from staff review metadata', () => {
    expect(deliveryReviewReason({ reviewReason: 'Carrier timeout\n\u0000needs review' })).toBe('Carrier timeout needs review')
    expect(deliveryRecoveryWaybill({ recoveryWaybill: ' WB-42\t' })).toBe('WB-42')
    expect(deliveryRecoveryWaybill({ recoveryWaybill: null })).toBeNull()
    expect(deliveryReviewReason({ reviewReason: 'x'.repeat(1_100) })).toHaveLength(1_000)
  })
})
