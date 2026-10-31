import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { canAttendFestival } from '@/lib/festival/config'
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

async function checkAwardeeAccess(memberId: string) {
  try {
    const { data, error } = await createAdminClient()
      .from('profiles')
      .select('membership_status')
      .eq('id', memberId)
      .maybeSingle()
    if (error) throw error
    if (!data || !canAttendFestival(data.membership_status))
      return NextResponse.json(
        { message: 'Festival registration is available to approved Top100 awardees.' },
        { status: 403, headers },
      )
    return null
  } catch {
    return NextResponse.json(
      { message: 'We couldn’t check your awardee status. Please try again shortly.' },
      { status: 503, headers },
    )
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id)
    return NextResponse.json(
      { message: 'Authentication required.' },
      { status: 401, headers },
    )
  const blocked = await checkAwardeeAccess(user.id)
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
  const blocked = await checkAwardeeAccess(user.id)
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
