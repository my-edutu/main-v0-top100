// app/api/member/opportunities/route.ts
// The member-facing, visibility-tiered opportunities feed.
//
// This is NOT the public /api/opportunities route (an unauthenticated proxy
// over an external feed, deliberately left untouched). This one serves the
// admin-managed store and is the reason awardees get something outsiders do
// not: the visibility tier is resolved server-side from the caller's own
// membership status and applied as a `.in('visibility', tiers)` filter. A
// visibility filter is never accepted from the client.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import {
  OPPORTUNITIES_SETUP_MESSAGE,
  OPPORTUNITY_COLUMNS,
  isMissingOpportunityTable,
  loadMemberStatus,
  mapOpportunity,
  sanitizeSearchTerm,
  sortForMember,
  visibleTiersFor,
} from '@/lib/opportunities/server'
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/types'

export const runtime = 'nodejs'

const MAX_ROWS = 200

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = await checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `opportunities:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many requests. Please try again shortly.')

  const supabase = createAdminClient()

  // The one and only tier decision. Derived from the server's own read of the
  // caller's membership status — never from anything in the request.
  const status = await loadMemberStatus(supabase, user.id)
  const tiers = visibleTiersFor({ status })

  const params = request.nextUrl.searchParams
  const typeParam = params.get('type')?.trim() ?? ''
  const type = (OPPORTUNITY_TYPES as readonly string[]).includes(typeParam) ? typeParam : ''
  const q = sanitizeSearchTerm(params.get('q') ?? '')
  const savedOnly = params.get('saved') === '1'

  // The caller's bookmarks, used both for `isSaved` and for the saved-only
  // filter (applied server-side as an id whitelist, not in JS).
  const savesResult = await supabase
    .from('opportunity_saves')
    .select('opportunity_id')
    .eq('profile_id', user.id)

  if (savesResult.error) {
    if (isMissingOpportunityTable(savesResult.error)) {
      return NextResponse.json(
        { message: OPPORTUNITIES_SETUP_MESSAGE, setupRequired: true },
        { status: 503 },
      )
    }
    console.error('[member-opportunities] could not load saves', savesResult.error)
    return NextResponse.json({ message: 'Could not load your saved opportunities.' }, { status: 500 })
  }

  const savedIds = new Set((savesResult.data ?? []).map((row: { opportunity_id: string }) => row.opportunity_id))

  if (savedOnly && savedIds.size === 0) {
    return NextResponse.json({ opportunities: [], tiers })
  }

  let query = supabase
    .from('opportunities')
    .select(OPPORTUNITY_COLUMNS)
    .eq('status', 'published')
    .in('visibility', tiers)
    .order('is_featured', { ascending: false })
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(MAX_ROWS)

  if (type) query = query.eq('type', type)
  if (q) query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%,summary.ilike.%${q}%`)
  if (savedOnly) query = query.in('id', Array.from(savedIds))

  const { data, error } = await query

  if (error) {
    if (isMissingOpportunityTable(error)) {
      return NextResponse.json(
        { message: OPPORTUNITIES_SETUP_MESSAGE, setupRequired: true },
        { status: 503 },
      )
    }
    console.error('[member-opportunities] could not load opportunities', error)
    return NextResponse.json({ message: 'Could not load opportunities.' }, { status: 500 })
  }

  const opportunities = sortForMember((data ?? []).map((row: any) => mapOpportunity(row, savedIds.has(row.id))))

  return NextResponse.json({ opportunities, tiers })
}
