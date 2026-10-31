import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { deliveryLocationQuery } from '@/lib/awards/delivery-locations'
import { getDeliveryLocationOptions } from '@/lib/awards/delivery-locations-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `delivery-locations:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many requests. Please wait a moment.')
  const parsed = deliveryLocationQuery.safeParse({ countryCode: request.nextUrl.searchParams.get('countryCode') })
  if (!parsed.success) return NextResponse.json({ message: 'Select a valid country.' }, { status: 400 })
  return NextResponse.json(await getDeliveryLocationOptions(parsed.data.countryCode), { headers: { 'Cache-Control': 'private, no-store' } })
}
