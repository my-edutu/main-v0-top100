import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { processAwardPaymentReminders } from '@/lib/awards/payment-reminders'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!expected || received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

  try {
    const db = createAdminClient()
    const result = await processAwardPaymentReminders(db, { limit: 5 })
    if (result.errors.some((error) => error.startsWith('claim:'))) {
      console.error('[award-payment-reminders] could not claim reminders', { errors: result.errors })
      return NextResponse.json({ message: 'Could not claim award payment reminders.' }, { status: 503 })
    }
    if (result.errors.length) {
      console.error('[award-payment-reminders] some reminders need retry', { failed: result.failed, errors: result.errors })
    }
    return NextResponse.json({ claimed: result.claimed, sent: result.sent, failed: result.failed })
  } catch (error) {
    console.error('[award-payment-reminders] worker failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    })
    return NextResponse.json({ message: 'Award payment reminders are temporarily unavailable.' }, { status: 503 })
  }
}
