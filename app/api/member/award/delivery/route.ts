import { deliveryApi } from '@/lib/awards/delivery/api'
import { readDelivery, saveDeliveryQuote } from '@/lib/awards/delivery/server'
export const runtime = 'nodejs'
export const maxDuration = 60
export function GET(request: Request) { return deliveryApi(request, member => readDelivery(member.id)) }
export function POST(request: Request) { return deliveryApi(request, (member, body) => saveDeliveryQuote(member, body)) }
