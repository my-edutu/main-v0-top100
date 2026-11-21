import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAwardLetterAccess } from '@/lib/award-letters/access'
import { letterResponse } from '@/lib/award-letters/recommendations'
import { manageRecommendationPack } from '@/lib/award-letters/recommendation-payment-server'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id) return letterResponse({ message: 'Sign in to access recommendations.' }, 401)
  const body = await request.json().catch(() => null)
  if (body?.action !== 'checkout' && body?.action !== 'check') return letterResponse({ message: 'Choose a payment action.' }, 400)
  try {
    const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `recommendation-pack:${user.id}` })
    if (!rate.success) return createRateLimitResponse(rate)
    const db = createAdminClient()
    if (!await getAwardLetterAccess(db, user.id)) return letterResponse({ message: 'Letters are available to awardees only.' }, 403)
    const result = await manageRecommendationPack(db, user.id, user.email ?? undefined, body.action === 'checkout')
    return letterResponse(result)
  } catch {
    return letterResponse({ message: 'We couldn’t verify or open checkout. Please check payment status again shortly.' }, 503)
  }
}
