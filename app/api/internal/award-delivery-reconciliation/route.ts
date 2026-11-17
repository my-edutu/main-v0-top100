import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { bachsConfig } from '@/lib/payments/bachs/config'
import { syncPublicDeliveryPayments } from '@/lib/awards/delivery/public-payments'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const expected = Buffer.from(process.env.CRON_SECRET ?? '')
  const received = Buffer.from(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
  if (!expected.length || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }
  try {
    const result = await syncPublicDeliveryPayments(createAdminClient(), bachsConfig())
    return NextResponse.json(result, { status: result.errors ? 503 : 200 })
  } catch {
    return NextResponse.json({ message: 'Delivery payment reconciliation unavailable.' }, { status: 503 })
  }
}
