import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import {
  MAGAZINE_GUEST_ACCESS_COOKIE,
} from '@/lib/magazine/guest-access'
import {
  MagazinePaymentError,
  submitPublicMagazineFeatureApplication,
} from '@/lib/magazine/guest-payment-server'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const schema = z.object({
  title: z.string().trim().min(3, 'Add a title of at least 3 characters.').max(160),
  category: z.enum(['bio', 'story', 'product', 'project']),
  summary: z.string().trim().min(20, 'Add at least 20 characters about your work.').max(10_000),
}).strict()

export async function POST(request: NextRequest) {
  const token = request.cookies.get(MAGAZINE_GUEST_ACCESS_COOKIE)?.value ?? null
  if (!token) return NextResponse.json({ message: 'Complete payment before submitting your application.' }, { status: 401 })
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ message: 'Invalid application details.' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Check your application details.' }, { status: 400 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `public-magazine-application:${getClientIdentifier(request.headers)}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many submissions. Please wait a moment.')
  try {
    const submission = await submitPublicMagazineFeatureApplication(token, parsed.data)
    return NextResponse.json({ submission }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof MagazinePaymentError) return NextResponse.json({ message: error.message }, { status: error.statusCode })
    console.error('[public-magazine] Guest application could not be submitted.')
    return NextResponse.json({ message: 'Could not submit your magazine feature application.' }, { status: 503 })
  }
}
