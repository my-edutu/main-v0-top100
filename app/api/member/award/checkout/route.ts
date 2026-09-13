// app/api/member/award/checkout/route.ts
// Kept as a migration guard for stale clients and bookmarks. New member award
// payments use the Bachs checkout route; this endpoint must never initialise a
// Paystack transaction or touch an award order.
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MIGRATION_MESSAGE = 'This checkout has moved. Refresh the dashboard to pay with Bachs.'

export async function POST() {
  return NextResponse.json({ message: MIGRATION_MESSAGE }, { status: 410 })
}
