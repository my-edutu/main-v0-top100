import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { checkFestivalAwardeeAccess } from '@/lib/festival/access'
import { readFestivalInterest } from '@/lib/festival/server'
import { sendFestivalTicketEmail } from '@/lib/festival/ticket-email'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401, headers })
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `festival-ticket-email:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Please wait a moment before retrying.')
  const blocked = await checkFestivalAwardeeAccess(user.id)
  if (blocked) return blocked
  try {
    const view = await readFestivalInterest(user.id)
    if (view.payment === 'unavailable') return NextResponse.json({ message: 'We couldn’t verify your payment. Check again shortly.' }, { status: 503, headers })
    if (!view.ticket || view.payment !== 'confirmed') return NextResponse.json({ message: 'Register with confirmed award payment before requesting a ticket.' }, { status: 409, headers })
    if (!user.email) return NextResponse.json({ message: 'Your account email is unavailable. Please contact support.' }, { status: 409, headers })
    view.ticket.emailStatus = await sendFestivalTicketEmail(user.id, user.email)
    return NextResponse.json(view, { headers })
  } catch {
    return NextResponse.json({ message: 'Ticket email is unavailable. You can still download your ticket.' }, { status: 503, headers })
  }
}
