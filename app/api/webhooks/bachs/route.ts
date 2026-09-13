import { NextRequest, NextResponse } from 'next/server'

import { handleBachsEvent, type BachsWebhookResult } from '@/lib/awards/bachs-webhook'
import { notifyAwardPaymentConfirmed } from '@/lib/awards/payment-notify'
import { bachsConfig } from '@/lib/payments/bachs/config'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function responseFor(result: BachsWebhookResult): NextResponse {
  if (result.httpStatus >= 500) {
    return NextResponse.json({ message: 'Webhook processing is temporarily unavailable.' }, { status: result.httpStatus })
  }
  if (result.httpStatus === 401) return NextResponse.json({ message: 'Invalid signature.' }, { status: 401 })
  if (result.httpStatus === 400) return NextResponse.json({ message: 'Invalid webhook payload.' }, { status: 400 })

  // Bachs retries only when this endpoint fails. Valid unmatched, failed,
  // expired, underpaid, and duplicate events are durably acknowledged by the
  // processor RPC, even when their application-level status is `exception`.
  return NextResponse.json({ received: true }, { status: 200 })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Signature verification is over the exact request bytes. Do not call
  // request.json() before this read or reserialize the body.
  const rawBody = await request.text()

  try {
    const config = bachsConfig()
    const db = createAdminClient()
    const result = await handleBachsEvent(rawBody, request.headers, {
      db,
      config,
      notifyAwardPayment: (input) => notifyAwardPaymentConfirmed(input, { db }),
    })
    return responseFor(result)
  } catch (error) {
    // Do not echo provider payloads, credentials, or database error text to
    // Bachs. A 503 asks the provider to retry the exact signed delivery.
    console.error('[bachs-webhook] route failed before durable processing', {
      error: error instanceof Error ? error.message : 'unknown error',
    })
    return NextResponse.json({ message: 'Webhook processing is temporarily unavailable.' }, { status: 503 })
  }
}
