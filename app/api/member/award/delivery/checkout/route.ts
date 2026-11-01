import { deliveryApi } from '@/lib/awards/delivery/api'
import { startDeliveryCheckout } from '@/lib/awards/delivery/server'
import { deliveryCheckoutSchema } from '@/lib/awards/delivery/schema'
export const runtime = 'nodejs'
export const maxDuration = 60
export function POST(request: Request) {
  return deliveryApi(request, (member, body) => startDeliveryCheckout(member.id, deliveryCheckoutSchema.parse(body).deliveryId), true)
}
