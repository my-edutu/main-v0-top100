import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// The shared code permits a pending application. Only admin approval links
// and publishes the awardee record.
export async function POST(request: NextRequest) {
  const session = await getServerSession(request)
  const accountEmail = session?.user.email?.trim().toLowerCase()
  if (!session || !accountEmail) {
    return NextResponse.json({ message: 'Sign in before requesting your profile.' }, { status: 401 })
  }
  const limited = await rateLimitResponse([
    { maxRequests: 5, windowSeconds: 60, identifier: `claim-member:${session.user.id}` },
    { maxRequests: 1200, windowSeconds: 60, identifier: `claim-network:${getClientIdentifier(request.headers)}` },
  ], 'Too many claim attempts. Try again shortly.')
  if (limited) return limited
  const body = await request.json().catch(() => null) as { awardeeId?: unknown; inviteCode?: unknown } | null
  const awardeeId = typeof body?.awardeeId === 'string' ? body.awardeeId.trim() : ''
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : ''
  if (!/^[0-9a-f-]{36}$/i.test(awardeeId) || !inviteCode || inviteCode.length > 100) {
    return NextResponse.json({ message: 'Select a winner and enter your invite code.' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db.rpc('request_pending_awardee_claim', {
    p_awardee_id: awardeeId,
    p_user_id: session.user.id,
    p_email: accountEmail,
    p_code: inviteCode,
  })
  if (error) {
    const message = error.message ?? ''
    if (/already claimed|already owns|pending claim|unavailable/i.test(message)) {
      return NextResponse.json({ message: 'This profile or account already has a claim. Contact the admin team if you need help.' }, { status: 409 })
    }
    if (/email|invite code|cannot claim/i.test(message)) {
      return NextResponse.json({ message: 'Your account email or invite code does not match this winner.' }, { status: 403 })
    }
    console.error('[claim] Database claim failed', { code: error.code, message })
    return NextResponse.json({ message: 'Could not complete your claim. Try again or contact the admin team.' }, { status: 500 })
  }
  revalidatePath('/awardees')
  return NextResponse.json({ success: true, claim: data })
}
