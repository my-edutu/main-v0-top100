import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { deliveryLocationQuery } from '@/lib/awards/delivery-locations'
import { suggestDeliveryCities } from '@/lib/awards/delivery-locations-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `delivery-locations:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many requests. Please wait a moment.')
  const parsed = deliveryLocationQuery.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success || !parsed.data.query) return NextResponse.json({ message: 'Choose a country and type at least two letters of your city.' }, { status: 400 })
  try {
    return NextResponse.json({ suggestions: await suggestDeliveryCities({ ...parsed.data, query: parsed.data.query }) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ message: 'City suggestions are unavailable. Enter your city manually.' }, { status: 503 })
  }
}
