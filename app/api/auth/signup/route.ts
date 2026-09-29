import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// The account is established by Supabase email OTP before this endpoint runs.
// The database function claims the winner, fills the profile, and consumes the
// invite code in one transaction.
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `claim:${getClientIdentifier(request.headers)}` })
  if (!rl.success) return createRateLimitResponse(rl, 'Too many claim attempts. Try again shortly.')

  const session = await getServerSession(request)
  const verifiedEmail = session?.user.email?.trim().toLowerCase()
  const confirmedAt = session?.user.rawPayload?.email_confirmed_at
  if (!session || !verifiedEmail || !confirmedAt) {
    return NextResponse.json({ message: 'Verify your email before claiming your profile.' }, { status: 401 })
  }
  const body = await request.json().catch(() => null) as { awardeeId?: unknown; inviteCode?: unknown } | null
  const awardeeId = typeof body?.awardeeId === 'string' ? body.awardeeId.trim() : ''
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : ''
  if (!/^[0-9a-f-]{36}$/i.test(awardeeId) || !inviteCode || inviteCode.length > 100) {
    return NextResponse.json({ message: 'Select a winner and enter your invite code.' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db.rpc('claim_verified_awardee', {
    p_awardee_id: awardeeId,
    p_user_id: session.user.id,
    p_email: verifiedEmail,
    p_code: inviteCode,
  })
  if (error) {
    const message = error.message ?? ''
    if (/already claimed|already owns|unavailable/i.test(message)) {
      return NextResponse.json({ message: 'This profile is already claimed. Contact the admin team if it is yours.' }, { status: 409 })
    }
    if (/email|invite code|cannot claim/i.test(message)) {
      return NextResponse.json({ message: 'Your verified email or invite code does not match this winner.' }, { status: 403 })
    }
    console.error('[claim] Database claim failed', { code: error.code, message })
    return NextResponse.json({ message: 'Could not complete your claim. Try again or contact the admin team.' }, { status: 500 })
  }
  revalidatePath('/awardees')
  return NextResponse.json({ success: true, claim: data })
}
