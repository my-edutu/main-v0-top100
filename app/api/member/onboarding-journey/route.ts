import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import {
  getAwardeeJourneyForMember,
  saveAwardeeJourneyProgress,
} from '@/lib/dashboard/awardee-journey-server'

export const runtime = 'nodejs'

const PLATFORMS = ['linkedin', 'facebook', 'instagram', 'other'] as const

function parseProgressPatch(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const body = input as Record<string, unknown>
  const allowed = new Set(['memberId', 'welcomeRead', 'externalShareConfirmed', 'externalSharePlatform', 'top100MomentComplete', 'whatsappChannelJoined', 'handbookPromptSeen', 'handbookRead'])
  if (Object.keys(body).some((key) => !allowed.has(key))) return null

  const patch: {
    welcomeRead?: true
    externalShareConfirmed?: boolean
    externalSharePlatform?: typeof PLATFORMS[number]
    top100MomentComplete?: true
    whatsappChannelJoined?: true
    handbookPromptSeen?: true
    handbookRead?: true
  } = {}
  if (body.welcomeRead !== undefined) {
    if (body.welcomeRead !== true) return null
    patch.welcomeRead = true
  }
  if (body.top100MomentComplete !== undefined) {
    if (body.top100MomentComplete !== true) return null
    patch.top100MomentComplete = true
  }
  if (body.whatsappChannelJoined !== undefined) {
    if (body.whatsappChannelJoined !== true) return null
    patch.whatsappChannelJoined = true
  }
  if (body.handbookPromptSeen !== undefined) {
    if (body.handbookPromptSeen !== true) return null
    patch.handbookPromptSeen = true
  }
  if (body.handbookRead !== undefined) {
    if (body.handbookRead !== true) return null
    patch.handbookRead = true
  }
  if (body.externalShareConfirmed !== undefined) {
    if (typeof body.externalShareConfirmed !== 'boolean') return null
    patch.externalShareConfirmed = body.externalShareConfirmed
    if (body.externalShareConfirmed) {
      if (!PLATFORMS.includes(body.externalSharePlatform as typeof PLATFORMS[number])) return null
      patch.externalSharePlatform = body.externalSharePlatform as typeof PLATFORMS[number]
    } else if (body.externalSharePlatform !== undefined) {
      return null
    }
  } else if (body.externalSharePlatform !== undefined) {
    return null
  }
  return Object.keys(patch).length ? patch : null
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  try {
    const journey = await getAwardeeJourneyForMember(user.id)
    return NextResponse.json({ journey })
  } catch {
    return NextResponse.json({ message: 'Could not load your onboarding journey. Please try again shortly.' }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `awardee-journey:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many updates. Please wait a moment.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }
  const patch = parseProgressPatch(body)
  if (!patch) return NextResponse.json({ message: 'Choose a supported onboarding update.' }, { status: 400 })

  try {
    await saveAwardeeJourneyProgress(user.id, patch)
    return NextResponse.json({ saved: true })
  } catch {
    return NextResponse.json({ message: 'Could not save that update. Please try again.' }, { status: 503 })
  }
}
