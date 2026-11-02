import type { DeliveryMode } from '@/lib/courier/types'

export type DeliveryOrderStatus = 'quoted' | 'creating' | 'open' | 'paid' | 'booking' | 'dispatched' | 'expired' | 'needs_review'
export type DeliveryOrderView = {
  id: string
  status: DeliveryOrderStatus
  amountMinor: number
  currency: 'NGN'
  expiresAt: string
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  postalCode: string
  deliveryMode: DeliveryMode
  serviceCentreId?: number
  destination: string
  waybill: string | null
  trackingUrl: string | null
  paidAt: string | null
  paymentMode?: 'provider' | 'external_link'
}

/** Legacy combined-payment delivery details returned when no separate order exists. */
export type IncludedDeliveryView = {
  waybill: string | null
  trackingUrl: string | null
}

/** Private staff queue projection; review metadata is never part of the member view. */
export type AdminDeliveryOrderView = DeliveryOrderView & {
  memberId: string
  reviewReason?: string | null
  recoveryWaybill?: string | null
}
export const DELIVERY_PURPOSE = 'afl_award_delivery_v1' as const
