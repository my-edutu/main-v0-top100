import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { festivalInterestSchema } from '@/lib/festival/interest'
import {
  readFestivalInterest,
  saveFestivalInterest,
} from '@/lib/festival/server'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id)
    return NextResponse.json(
      { message: 'Authentication required.' },
      { status: 401, headers },
    )
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
  const parsed = festivalInterestSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success)
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Check your details.' },
      { status: 400, headers },
    )
  try {
    return NextResponse.json(await saveFestivalInterest(user.id, parsed.data), {
      headers,
    })
  } catch {
    return NextResponse.json(
      {
        message: 'Your interest could not be saved. Please try again shortly.',
      },
      { status: 503, headers },
    )
  }
}
