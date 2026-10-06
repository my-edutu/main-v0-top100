// app/api/auth/claim-directory/route.ts
// Public, rate-limited name search for registration and existing account guidance.
// Signup starts here: the person picks who they are from this list, then
// proves it with their email + an admin-issued code.
//
// Deliberately exposes only what the picker needs — no emails (only a masked
// hint), no bios, no contact data.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  getClientIdentifier,
  rateLimitResponse,
} from '@/lib/rate-limit'
import {
  CLAIM_DIRECTORY_MIN_QUERY_LENGTH,
  CLAIM_DIRECTORY_PAGE_SIZE,
  normalizeClaimDirectorySearch,
  toIlikePattern,
} from '@/lib/claim-directory-search'

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
  const search = normalizeClaimDirectorySearch(request.nextUrl.searchParams.get('q'))
  if (!search) {
    return NextResponse.json({
      awardees: [],
      hasMore: false,
      minQueryLength: CLAIM_DIRECTORY_MIN_QUERY_LENGTH,
    })
  }

  const identifier = getClientIdentifier(request.headers)
  const limited = await rateLimitResponse([
    { maxRequests: 3000, windowSeconds: 60, identifier: `claim-directory:${identifier}` },
  ], 'Too many requests. Please try again shortly.')
  if (limited) return limited

  try {
    const supabase = createAdminClient()
    const result = await supabase
      .from('awardees')
      .select('id, name, country, course, image_url, email, profile_id')
      .ilike('name', toIlikePattern(search))
      .order('name', { ascending: true })
      .limit(CLAIM_DIRECTORY_PAGE_SIZE + 1)

    if (result.error) throw new Error(result.error.message)
    let data = result.data
    let suggested = false
    if (!data?.length) {
      const word = search.split(/\s+/).sort((a, b) => b.length - a.length)[0]
      if (word.length >= 3 && word !== search) {
        const fallback = await supabase.from('awardees')
          .select('id, name, country, course, image_url, email, profile_id')
          .ilike('name', toIlikePattern(word)).order('name').limit(CLAIM_DIRECTORY_PAGE_SIZE + 1)
        if (fallback.error) throw new Error(fallback.error.message)
        data = fallback.data
        suggested = Boolean(data?.length)
      }
    }

    const hasMore = (data ?? []).length > CLAIM_DIRECTORY_PAGE_SIZE
    const awardees = (data ?? [])
      .slice(0, CLAIM_DIRECTORY_PAGE_SIZE)
      .filter((a) => a.name)
      .map((a) => ({
        id: a.id,
        name: a.name as string,
        country: a.country ?? null,
        course: a.course ?? null,
        imageUrl: a.image_url ?? null,
        emailHint: a.email ? maskEmail(a.email) : null,
        hasAccount: Boolean(a.profile_id),
      }))

    return NextResponse.json({ awardees, hasMore, suggested })
  } catch (error) {
    console.error('[claim-directory] Failed to load directory:', error)
    return NextResponse.json({ message: 'Could not load the awardee directory.' }, { status: 500 })
  }
}
