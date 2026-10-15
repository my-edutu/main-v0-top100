import { NextRequest, NextResponse } from 'next/server'

import { handleBachsMagazineEvent } from '@/lib/magazine/bachs-webhook'
import { bachsConfig } from '@/lib/payments/bachs/config'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyMagazinePaymentStatus } from '@/lib/magazine/payment-email'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  try {
    const db = createAdminClient()
    const result = await handleBachsMagazineEvent(rawBody, request.headers, {
      config: bachsConfig(),
      db: db as any,
    })
    if (result.httpStatus === 200 && result.attemptId) {
      const notification = await notifyMagazinePaymentStatus(result.attemptId)
      if (notification.retry) return NextResponse.json({ message: 'Payment email delivery is temporarily unavailable.' }, { status: 503 })
    }
    if (result.httpStatus === 503) return NextResponse.json({ message: 'Webhook processing is temporarily unavailable.' }, { status: 503 })
    if (result.httpStatus === 401) return NextResponse.json({ message: 'Invalid signature.' }, { status: 401 })
    if (result.httpStatus === 400) return NextResponse.json({ message: 'Invalid webhook payload.' }, { status: 400 })
    return NextResponse.json({ received: true }, { status: 200 })
  } catch {
    return NextResponse.json({ message: 'Webhook processing is temporarily unavailable.' }, { status: 503 })
  }
}
