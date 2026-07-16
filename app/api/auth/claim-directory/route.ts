// app/api/auth/claim-directory/route.ts
// Public, rate-limited list of awardees who have not yet claimed an account.
// Signup starts here: the person picks who they are from this list, then
// proves it with their email + an admin-issued code.
//
// Deliberately exposes only what the picker needs — no emails (only a masked
// hint), no bios, no contact data.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/rate-limit'

export const runtime = 'nodejs'

/** "paul.light@gmail.com" -> "p•••@g•••.com" — enough to recognize, not to harvest. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '•••'
  const dot = domain.lastIndexOf('.')
  const domainName = dot > 0 ? domain.slice(0, dot) : domain
  const tld = dot > 0 ? domain.slice(dot) : ''
  return `${local[0]}•••@${domainName[0]}•••${tld}`
}

export async function GET(request: NextRequest) {
  const identifier = getClientIdentifier(request.headers)
  const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `claim-directory:${identifier}` })
  if (!rl.success) {
    return createRateLimitResponse(rl, 'Too many requests. Please try again shortly.')
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('awardees')
      .select('id, name, country, course, image_url, email, profile_id')
      .is('profile_id', null)
      .order('name', { ascending: true })

    if (error) throw new Error(error.message)

    const awardees = (data ?? [])
      .filter((a) => a.name)
      .map((a) => ({
        id: a.id,
        name: a.name as string,
        country: a.country ?? null,
        course: a.course ?? null,
        imageUrl: a.image_url ?? null,
        emailHint: a.email ? maskEmail(a.email) : null,
      }))

    return NextResponse.json({ awardees })
  } catch (error) {
    console.error('[claim-directory] Failed to load directory:', error)
    return NextResponse.json({ message: 'Could not load the awardee directory.' }, { status: 500 })
  }
}
