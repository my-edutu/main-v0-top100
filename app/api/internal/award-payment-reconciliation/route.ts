import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { reconcilePendingAwardPayments } from '@/lib/awards/payment-reconciliation'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!expected || received.length !== expected.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }
  try {
    const result = await reconcilePendingAwardPayments(createAdminClient())
    return NextResponse.json(result, { status: result.errors ? 503 : 200 })
  } catch { return NextResponse.json({ message: 'Payment reconciliation unavailable.' }, { status: 503 }) }
}
export async function GET(request: NextRequest) { return POST(request) }
