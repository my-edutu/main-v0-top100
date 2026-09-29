// app/api/member/features/route.ts
// The authenticated member submits a "feature my story" request.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { mapFeature } from '@/lib/member-hub-server'
import { sanitizeInput } from '@/lib/security'
import { getMagazineFeaturePaymentView, MagazinePaymentError } from '@/lib/magazine/payment-server'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const CATEGORIES = ['bio', 'story', 'product', 'project'] as const

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `magazine-application:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many application attempts. Please wait a moment.')
  let payment
  try {
    payment = await getMagazineFeaturePaymentView(user.id)
    if (!payment.applicationEligible) return NextResponse.json({ message: 'Pay the separate magazine feature fee before submitting your application.' }, { status: 402 })
  } catch (error) {
    const status = error instanceof MagazinePaymentError ? error.statusCode : 503
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not verify magazine payment. Please try again shortly.' }, { status })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const title = sanitizeInput(String(body.title ?? ''))
  const summary = sanitizeInput(String(body.summary ?? ''))
  const category = CATEGORIES.includes(body.category as any) ? (body.category as string) : 'bio'
  const memberName = sanitizeInput(String(
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Awardee',
  ))
  const contactEmail = user.email ?? ''

  if (title.length < 3 || title.length > 160 || summary.length < 20 || summary.length > 10_000 || !contactEmail) {
    return NextResponse.json({ message: 'Add a title and a summary of at least 20 characters, and make sure your account has an email address.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('submit_magazine_feature_application', {
    p_profile_id: user.id,
    p_campaign_id: payment.campaign.id,
    p_member_name: memberName || 'Awardee',
    p_title: title,
    p_category: category,
    p_summary: summary,
    p_contact_email: contactEmail,
  })

  if (error) {
    console.error('[magazine-feature] application submission failed')
    return NextResponse.json({ message: 'Could not submit this magazine application. Please try again.' }, { status: 503 })
  }
  const result = data && typeof data === 'object' ? data as Record<string, any> : {}
  const status = result.outcome === 'created' ? 201 : 200
  return NextResponse.json({ submission: mapFeature(result.submission) }, { status })
}
