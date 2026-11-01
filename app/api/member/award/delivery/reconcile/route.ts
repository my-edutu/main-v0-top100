import { z } from 'zod'
import { deliveryApi } from '@/lib/awards/delivery/api'
import { reconcileMemberDelivery } from '@/lib/awards/delivery/server'
export const runtime = 'nodejs'
export const maxDuration = 60
export function POST(request: Request) {
  return deliveryApi(request, (member, body) => { z.object({}).strict().parse(body); return reconcileMemberDelivery(member.id) })
}
