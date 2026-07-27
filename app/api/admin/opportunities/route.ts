// app/api/admin/opportunities/route.ts
// Admin: list every opportunity, and create a new one.
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  OPPORTUNITIES_SETUP_MESSAGE,
  OPPORTUNITY_COLUMNS,
  buildUniqueSlug,
  createOpportunitySchema,
  deadlineRejectionReason,
  isMissingOpportunityTable,
  mapOpportunity,
  publishBlockedReason,
} from '@/lib/opportunities/server'

export const runtime = 'nodejs'

function setupResponse() {
  return NextResponse.json({ message: OPPORTUNITIES_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    if (isMissingOpportunityTable(error)) return setupResponse()
    console.error('[admin-opportunities] could not list opportunities', error)
    return NextResponse.json({ message: 'Could not load opportunities.' }, { status: 500 })
  }

  return NextResponse.json({ opportunities: (data ?? []).map((row: any) => mapOpportunity(row)) })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = createOpportunitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || 'Please check the form and try again.' },
      { status: 400 },
    )
  }
  const input = parsed.data

  // A listing that is already closed helps nobody.
  const deadlineProblem = deadlineRejectionReason(input.deadline)
  if (deadlineProblem) return NextResponse.json({ message: deadlineProblem }, { status: 400 })

  // A published opportunity with no way to apply is the most common failure
  // mode here, so the gate runs before anything is written.
  if (input.status === 'published') {
    const blocked = publishBlockedReason(input)
    if (blocked) return NextResponse.json({ message: blocked }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { slug, error: slugError } = await buildUniqueSlug(supabase, input.title)
  if (slugError || !slug) {
    if (slugError && isMissingOpportunityTable(slugError)) return setupResponse()
    console.error('[admin-opportunities] could not build a slug', slugError)
    return NextResponse.json({ message: 'Could not create this opportunity.' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      title: input.title,
      slug,
      type: input.type,
      organization: input.organization,
      location: input.location,
      summary: input.summary,
      description: input.description,
      application_url: input.applicationUrl,
      contact_email: input.contactEmail,
      deadline: input.deadline,
      amount_note: input.amountNote,
      visibility: input.visibility,
      is_featured: input.isFeatured,
      status: input.status,
      created_by: adminCheck.user?.id ?? null,
    })
    .select(OPPORTUNITY_COLUMNS)
    .single()

  if (error) {
    if (isMissingOpportunityTable(error)) return setupResponse()
    console.error('[admin-opportunities] could not create opportunity', error)
    return NextResponse.json({ message: 'Could not create this opportunity.' }, { status: 500 })
  }

  return NextResponse.json({ opportunity: mapOpportunity(data) }, { status: 201 })
}
