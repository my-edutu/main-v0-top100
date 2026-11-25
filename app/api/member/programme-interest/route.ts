import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { communityApplicationSchema } from '@/lib/programme-manager/community-application'
import { interestSchema } from '@/lib/programme-manager/interest'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/server'

const headers = { 'Cache-Control': 'private, no-store' }
const interestColumns = 'id,kind,activity_id'

function unavailable(operation: string, error: { code?: string }) {
  console.error('[programme-interest]', operation, error.code || 'unavailable')
  return NextResponse.json({ message: 'Programme signups are temporarily unavailable. Please try again.' }, { status: 503, headers })
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401, headers })

  const db = createAdminClient()
  const interests = db.from('programme_manager_interests').select(interestColumns).eq('member_id', user.id)
  if (new URL(request.url).searchParams.get('scope') === 'community') {
    const result = await interests.eq('kind', 'community')
    if (result.error) return unavailable('read application status', result.error)
    return NextResponse.json({ interests: result.data }, { headers })
  }

  const [activities, saved] = await Promise.all([
    db.from('programme_manager_activities').select('id,title,month,format').eq('status', 'approved').eq('open_for_interest', true).order('month'),
    interests,
  ])
  const error = activities.error ?? saved.error
  if (error) return unavailable('read programme signups', error)
  return NextResponse.json({ activities: activities.data, interests: saved.data }, { headers })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401, headers })

  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `programme-interest:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Please wait before trying again.')

  const body = await request.json().catch(() => null)
  const parsed = interestSchema.safeParse(body)
  if (!parsed.success) {
    const application = body?.community_details?.version === 2 ? communityApplicationSchema.safeParse(body.community_details) : null
    const issue = application?.error?.issues.find(issue => issue.path[0] === 'answers')
    const field = issue?.path[1]
    return NextResponse.json({
      message: issue?.message ?? 'Check your answers and confirm before submitting.',
      ...(typeof field === 'string' ? { field } : {}),
    }, { status: 400, headers })
  }

  const { kind, activity_id } = parsed.data
  const db = createAdminClient()
  const { data, error } = await db.from('programme_manager_interests').insert({
    member_id: user.id, kind, activity_id,
    ...(kind === 'community' ? { community_details: parsed.data.community_details } : {}),
  }).select(interestColumns).single()

  if (error?.code === '23505' && kind === 'community') {
    const existing = await db.from('programme_manager_interests').select(interestColumns)
      .eq('member_id', user.id).eq('kind', 'community').is('activity_id', null).maybeSingle()
    if (existing.error || !existing.data) return unavailable('recover existing application', existing.error ?? error)
    return NextResponse.json({ interest: existing.data, alreadyRecorded: true }, { headers })
  }
  if (error?.code === '23505' || (error?.code === '23514' && kind === 'programme')) {
    return NextResponse.json({
      message: error.code === '23505' ? 'Your interest is already recorded.' : 'This activity is no longer open for interest.',
    }, { status: 409, headers })
  }
  if (error) return unavailable('save interest', error)
  return NextResponse.json({ interest: data }, { status: 201, headers })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401, headers })

  const body = z.object({ id: z.guid() }).safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ message: 'Invalid interest.' }, { status: 400, headers })

  const { error } = await createAdminClient().from('programme_manager_interests').delete()
    .eq('id', body.data.id).eq('member_id', user.id)
  if (error) return unavailable('withdraw interest', error)
  return NextResponse.json({ message: 'Interest withdrawn.' }, { headers })
}
