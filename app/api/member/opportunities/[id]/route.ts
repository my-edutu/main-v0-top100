// app/api/member/opportunities/[id]/route.ts
// Bookmark / un-bookmark one opportunity. Both verbs are idempotent.
//
// A member may only ever save something they are actually allowed to see, so
// the target row is re-checked against visibleTiersFor() before the save is
// written — otherwise a guessed id would let a pending member pin (and later
// read back) an approved-tier listing.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import {
  OPPORTUNITIES_SETUP_MESSAGE,
  isMissingOpportunityTable,
  loadMemberStatus,
  visibleTiersFor,
} from '@/lib/opportunities/server'

export const runtime = 'nodejs'

function setupResponse() {
  return NextResponse.json({ message: OPPORTUNITIES_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `opportunity-save:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many requests. Please try again shortly.')

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Opportunity id is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const status = await loadMemberStatus(supabase, user.id)
  const tiers = visibleTiersFor({ status })

  const { data: opportunity, error: lookupError } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .eq('status', 'published')
    .in('visibility', tiers)
    .maybeSingle()

  if (lookupError) {
    if (isMissingOpportunityTable(lookupError)) return setupResponse()
    console.error('[member-opportunities] save lookup failed', lookupError)
    return NextResponse.json({ message: 'Could not save this opportunity.' }, { status: 500 })
  }
  // Deliberately a 404 rather than a 403: a member outside the tier must not
  // even learn that the listing exists.
  if (!opportunity) return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 })

  // Idempotent: the unique (opportunity_id, profile_id) index makes a repeated
  // save a no-op rather than a duplicate row or an error.
  const { error } = await supabase
    .from('opportunity_saves')
    .upsert({ opportunity_id: id, profile_id: user.id }, { onConflict: 'opportunity_id,profile_id' })

  if (error) {
    if (isMissingOpportunityTable(error)) return setupResponse()
    console.error('[member-opportunities] could not save opportunity', error)
    return NextResponse.json({ message: 'Could not save this opportunity.' }, { status: 500 })
  }

  return NextResponse.json({ isSaved: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `opportunity-save:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many requests. Please try again shortly.')

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Opportunity id is required.' }, { status: 400 })

  const supabase = createAdminClient()

  // Scoped to the caller's own rows, so this can never remove someone else's
  // bookmark, and removing a bookmark that is not there simply succeeds.
  const { error } = await supabase
    .from('opportunity_saves')
    .delete()
    .eq('opportunity_id', id)
    .eq('profile_id', user.id)

  if (error) {
    if (isMissingOpportunityTable(error)) return setupResponse()
    console.error('[member-opportunities] could not unsave opportunity', error)
    return NextResponse.json({ message: 'Could not remove this bookmark.' }, { status: 500 })
  }

  return NextResponse.json({ isSaved: false })
}
