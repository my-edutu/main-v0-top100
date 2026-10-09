import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { isMagazineCheckoutEnabled } from '@/lib/production-readiness'
import { normalizeMagazineCountryCode } from '@/lib/magazine/billing-country'
import {
  createPublicMagazineFeatureCheckout,
  MagazinePaymentError,
} from '@/lib/magazine/guest-payment-server'
import {
  createMagazineGuestAccessToken,
  hashMagazineGuestAccessToken,
  MAGAZINE_GUEST_ACCESS_COOKIE,
  MAGAZINE_GUEST_ACCESS_MAX_AGE,
  MAGAZINE_GUEST_ACCESS_PATH,
} from '@/lib/magazine/guest-access'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(320),
  countryCode: z.string().trim().length(2, 'Select a valid country.'),
}).strict()

export async function POST(request: NextRequest) {
  if (!isMagazineCheckoutEnabled(process.env)) return NextResponse.json({ message: 'Magazine payment is temporarily unavailable.' }, { status: 503 })
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ message: 'Invalid checkout details.' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Check your checkout details.' }, { status: 400 })
  let countryCode: string
  try { countryCode = normalizeMagazineCountryCode(parsed.data.countryCode) }
  catch { return NextResponse.json({ message: 'Select a valid country.' }, { status: 400 }) }

  let guestToken: string | null = null
  try {
    const clientIp = getClientIdentifier(request.headers)
    const [ipRate, emailRate] = await Promise.all([
      checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `public-magazine-payment-ip:${clientIp}` }),
      checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `public-magazine-payment-email:${parsed.data.email.trim().toLowerCase()}` }),
    ])
    if (!ipRate.success) return createRateLimitResponse(ipRate, 'Too many payment attempts. Please wait a moment.')
    if (!emailRate.success) return createRateLimitResponse(emailRate, 'Too many payment attempts for this email. Please wait a moment.')

    const existingToken = request.cookies.get(MAGAZINE_GUEST_ACCESS_COOKIE)?.value
    guestToken = existingToken && hashMagazineGuestAccessToken(existingToken) ? existingToken : createMagazineGuestAccessToken()
    const checkout = await createPublicMagazineFeatureCheckout({ ...parsed.data, countryCode }, guestToken)
    const response = NextResponse.json(checkout)
    response.cookies.set(MAGAZINE_GUEST_ACCESS_COOKIE, guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: MAGAZINE_GUEST_ACCESS_PATH,
      maxAge: MAGAZINE_GUEST_ACCESS_MAX_AGE,
    })
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    const response = error instanceof MagazinePaymentError
      ? NextResponse.json({ message: error.message }, { status: error.statusCode })
      : NextResponse.json({ message: 'Could not start payment. Please check the payment status before retrying.' }, { status: 502 })
    if (guestToken) response.cookies.set(MAGAZINE_GUEST_ACCESS_COOKIE, guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: MAGAZINE_GUEST_ACCESS_PATH,
      maxAge: MAGAZINE_GUEST_ACCESS_MAX_AGE,
    })
    response.headers.set('Cache-Control', 'private, no-store')
    if (error instanceof MagazinePaymentError) return response
    console.error('[public-magazine] Guest checkout could not be completed.')
    return response
  }
}
