// app/api/member/award/track/route.ts
// GET -> re-read delivery status from the courier and persist any advance.
import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { canTransition, type AwardStatus } from '@/lib/awards/status'
import { getCourier } from '@/lib/courier'
import { loadOrderForUser, mapAwardOrder } from '@/lib/awards/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `award-track:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many tracking requests. Please wait a moment.')

  const supabase = createAdminClient()
  const { order, error: loadError } = await loadOrderForUser(supabase, user.id)

  // A read failure must not masquerade as "you have no award order" — that is
  // indistinguishable from the real thing and leaves nothing to diagnose.
  if (loadError) {
    console.error('[award-track] failed to load the order', user.id, loadError)
    return NextResponse.json({ message: 'Could not load your award order.' }, { status: 500 })
  }

  if (!order) return NextResponse.json({ message: 'No award order found.' }, { status: 404 })
  if (!order.gig_waybill) return NextResponse.json({ order: mapAwardOrder(order) })

  let tracking
  try {
    tracking = await getCourier().track(order.gig_waybill)
  } catch (trackingError) {
    console.error('[award-track] tracking lookup failed', order.id, trackingError)
    return NextResponse.json({ order: mapAwardOrder(order) })
  }

  const columns: Record<string, unknown> = {}

  // The stub adapter reports 'unknown' with a placeholder description
  // ("Tracking is unavailable for manually dispatched orders."). Writing that
  // unconditionally would overwrite a real courier description — including on
  // a delivered order — every time the member clicks "Refresh status".
  if (tracking.status !== 'unknown') {
    columns.gig_last_status = tracking.description
  }

  // Only advance the status — never move an order backwards on a noisy read.
  if (tracking.status !== 'unknown' && canTransition(order.status as AwardStatus, tracking.status as AwardStatus)) {
    columns.status = tracking.status
  }

  if (Object.keys(columns).length === 0) {
    return NextResponse.json({ order: mapAwardOrder(order) })
  }

  const { data: updated, error } = await supabase
    .from('award_orders')
    .update(columns)
    .eq('id', order.id)
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[award-track] failed to update status', order.id, error)
  }

  return NextResponse.json({ order: mapAwardOrder(updated ?? order) })
}
