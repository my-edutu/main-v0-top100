import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { deliveryPreviewSchema } from '@/lib/awards/delivery-preview'
import { getLiveDeliveryPreview } from '@/lib/awards/delivery-preview-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = await checkRateLimit({
    ...RATE_LIMITS.QUERY,
    identifier: `award-delivery-preview:${user.id}`,
  })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many quote requests. Please wait a moment.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = deliveryPreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Check your delivery details.' },
      { status: 400 },
    )
  }

  const result = await getLiveDeliveryPreview(parsed.data)
  return result.ok
    ? NextResponse.json({ quote: result.quote }, { headers: { 'Cache-Control': 'private, no-store' } })
    : NextResponse.json({ message: result.message, code: result.code }, { status: result.status, headers: { 'Cache-Control': 'private, no-store' } })
}
