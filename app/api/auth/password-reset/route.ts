import { NextRequest, NextResponse } from 'next/server'

import type { RecoveryArea } from '@/lib/auth/password-recovery'
import { sendPasswordRecoveryEmail } from '@/lib/auth/send-password-recovery-email'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier } from '@/lib/rate-limit'
import { isTrustedRequestOrigin } from '@/lib/security/same-origin'

const GENERIC_RESPONSE = {
  message: 'If that address belongs to an account, you’ll receive a link to choose a password.',
}

function getRecoveryOrigin(request: NextRequest): string {
  const configuredUrl = process.env.TOP100_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (configuredUrl) return new URL(configuredUrl).origin
  if (process.env.NODE_ENV !== 'production') return request.nextUrl.origin
  throw new Error('The public site URL is not configured.')
}

export async function POST(request: NextRequest) {
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json({ message: 'Cross-origin request blocked.' }, { status: 403 })
  }

  let payload: { email?: unknown; area?: unknown }
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body')
    payload = parsed as { email?: unknown; area?: unknown }
  } catch {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 })
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 })
  }
  if (payload.area !== 'admin' && payload.area !== 'member') {
    return NextResponse.json({ message: 'Choose a valid account type.' }, { status: 400 })
  }
  const area = payload.area as RecoveryArea

  const clientIdentifier = getClientIdentifier(request.headers)
  for (const config of [
    { maxRequests: 10, windowSeconds: 60, identifier: `password-reset:ip:${clientIdentifier}` },
    { maxRequests: 3, windowSeconds: 900, identifier: `password-reset:email:${email}` },
  ]) {
    const result = await checkRateLimit(config)
    if (!result.success) {
      return createRateLimitResponse(result, 'Too many reset requests. Please wait and try again.')
    }
  }

  try {
    const origin = getRecoveryOrigin(request)
    const result = await sendPasswordRecoveryEmail({
      email,
      area,
      origin,
    })

    // Keep the public endpoint generic even when the account does not exist.
    if (!result.ok) {
      console.error(`[password-reset] ${result.stage} failed`, { reason: result.reason })
      return NextResponse.json(GENERIC_RESPONSE)
    }
  } catch (error) {
    console.error('[password-reset] request failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    })
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
