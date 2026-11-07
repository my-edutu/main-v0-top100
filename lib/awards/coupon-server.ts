// Coupon codes are processed only on the server.
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { AwardPaymentError } from './payment-errors'

export const awardCouponCodeSchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/i, 'Enter a valid coupon code.')

export function awardCouponDigest(code: string): string {
  return createHash('sha256').update(awardCouponCodeSchema.parse(code).toUpperCase()).digest('hex')
}

export function awardCouponUnavailable(): AwardPaymentError {
  return new AwardPaymentError(422, 'This coupon is unavailable for your award.')
}
