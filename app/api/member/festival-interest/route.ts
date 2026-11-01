import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { checkFestivalAwardeeAccess } from '@/lib/festival/access'
import { sendFestivalTicketEmail } from '@/lib/festival/ticket-email'
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { festivalInterestSchema } from '@/lib/festival/interest'
import {
  readFestivalInterest,
  saveFestivalInterest,
  FestivalRegistrationError,
} from '@/lib/festival/server'

export const runtime = 'nodejs'
export const maxDuration = 60
const headers = { 'Cache-Control': 'private, no-store' }


export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id)
    return NextResponse.json(
      { message: 'Authentication required.' },
      { status: 401, headers },
    )
  const blocked = await checkFestivalAwardeeAccess(user.id)
  if (blocked) return blocked
  try {
    return NextResponse.json(await readFestivalInterest(user.id), { headers })
  } catch {
    return NextResponse.json(
      {
        message:
          'Festival interest is temporarily unavailable. Please try again shortly.',
      },
      { status: 503, headers },
    )
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id)
    return NextResponse.json(
      { message: 'Authentication required.' },
      { status: 401, headers },
    )
  const rate = await checkRateLimit({
    ...RATE_LIMITS.AUTH,
    identifier: `festival-interest:${user.id}`,
  })
  if (!rate.success)
    return createRateLimitResponse(
      rate,
      'Please wait a moment before saving again.',
    )
  const blocked = await checkFestivalAwardeeAccess(user.id)
  if (blocked) return blocked
  const parsed = festivalInterestSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success)
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Check your details.' },
      { status: 400, headers },
    )
  try {
    const view = await saveFestivalInterest(user.id, parsed.data)
    if (view.ticket && user.email) {
      try { view.ticket.emailStatus = await sendFestivalTicketEmail(user.id, user.email) }
      catch { view.ticket.emailStatus = 'failed' }
    } else if (view.ticket) view.ticket.emailStatus = 'failed'
    return NextResponse.json(view, { headers })
  } catch (error) {
    if (error instanceof FestivalRegistrationError)
      return NextResponse.json({ message: error.message, payment: error.payment }, { status: error.status, headers })
    return NextResponse.json(
      {
        message: 'Your interest could not be saved. Please try again shortly.',
      },
      { status: 503, headers },
    )
  }
}
