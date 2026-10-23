import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { getRecoveryRequestOrigin, type RecoveryArea } from '@/lib/auth/password-recovery'
import { sendPasswordRecoveryEmail } from '@/lib/auth/send-password-recovery-email'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originFailure = rejectCrossOriginMutation(request)
  if (originFailure) return originFailure

  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ message: 'Choose a valid user account.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const [{ data: authResult, error: authError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.auth.admin.getUserById(id),
      supabase.from('profiles').select('role, full_name').eq('id', id).maybeSingle(),
    ])

    const user = authResult?.user
    if (authError || !user?.email || profileError || !profile) {
      return NextResponse.json({ message: 'Could not find an active account for this user.' }, { status: 404 })
    }

    const configuredSiteUrl = process.env.TOP100_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
    let origin: string
    try {
      origin = getRecoveryRequestOrigin({
        browserOrigin: request.nextUrl.origin,
        canonicalSiteUrl: configuredSiteUrl,
        isProduction: process.env.NODE_ENV === 'production',
      })
    } catch {
      return NextResponse.json({ message: 'Password recovery is not configured for the public site.' }, { status: 503 })
    }

    const email = user.email.trim().toLowerCase()
    const rateLimit = await checkRateLimit({
      maxRequests: 3,
      windowSeconds: 900,
      identifier: `password-reset:email:${email}`,
    })
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit, 'A recovery email was recently sent. Please wait before sending another.')
    }

    const area: RecoveryArea = ['admin', 'superadmin', 'editor'].includes(profile.role ?? '') ? 'admin' : 'member'
    const result = await sendPasswordRecoveryEmail({
      email,
      fullName: profile.full_name,
      origin,
      area,
    })

    if (!result.ok) {
      console.error('[admin/users/password-reset] recovery email failed', {
        adminId: adminCheck.user.id,
        userId: id,
        stage: result.stage,
        reason: result.reason,
      })
      return NextResponse.json({ message: 'Could not send the recovery email. Check the email provider logs and try again.' }, { status: 502 })
    }

    console.info('[admin/users/password-reset] recovery email sent', {
      adminId: adminCheck.user.id,
      userId: id,
    })
    return NextResponse.json({ message: 'The email provider accepted the recovery email.', sentTo: email })
  } catch (error) {
    console.error('[admin/users/password-reset] request failed', {
      adminId: adminCheck.user.id,
      userId: id,
      error: error instanceof Error ? error.message : 'unknown error',
    })
    return NextResponse.json({ message: 'Could not send the recovery email. Please try again later.' }, { status: 502 })
  }
}
