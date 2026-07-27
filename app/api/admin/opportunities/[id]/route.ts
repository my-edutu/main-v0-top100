// app/api/admin/opportunities/[id]/route.ts
// Admin: update or delete one opportunity.
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  OPPORTUNITIES_SETUP_MESSAGE,
  OPPORTUNITY_COLUMNS,
  isMissingOpportunityTable,
  mapOpportunity,
  publishBlockedReason,
  toRowPatch,
  updateOpportunitySchema,
} from '@/lib/opportunities/server'

export const runtime = 'nodejs'

function setupResponse() {
  return NextResponse.json({ message: OPPORTUNITIES_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Opportunity id is required.' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = updateOpportunitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || 'Please check the form and try again.' },
      { status: 400 },
    )
  }
  const input = parsed.data
  const patch = toRowPatch(input)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing, error: loadError } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (loadError) {
    if (isMissingOpportunityTable(loadError)) return setupResponse()
    console.error('[admin-opportunities] could not load opportunity', loadError)
    return NextResponse.json({ message: 'Could not update this opportunity.' }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 })

  const current = mapOpportunity(existing)

  // The publish gate is checked against the MERGED row, not the patch alone —
  // an admin flipping status to 'published' on an existing draft that has no
  // application link must still be stopped.
  const nextStatus = input.status ?? current.status
  if (nextStatus === 'published') {
    const blocked = publishBlockedReason({
      title: input.title ?? current.title,
      type: input.type ?? current.type,
      applicationUrl: input.applicationUrl !== undefined ? input.applicationUrl : current.applicationUrl,
      contactEmail: input.contactEmail !== undefined ? input.contactEmail : current.contactEmail,
    })
    if (blocked) return NextResponse.json({ message: blocked }, { status: 400 })
  }

  // Note: a past deadline is only rejected on create. Editing an existing
  // listing whose deadline has already gone by must stay possible — that is
  // exactly when an admin needs to close or re-date it.

  const { data, error } = await supabase
    .from('opportunities')
    .update(patch)
    .eq('id', id)
    .select(OPPORTUNITY_COLUMNS)
    .maybeSingle()

  if (error) {
    if (isMissingOpportunityTable(error)) return setupResponse()
    console.error('[admin-opportunities] could not update opportunity', error)
    return NextResponse.json({ message: 'Could not update this opportunity.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 })

  return NextResponse.json({ opportunity: mapOpportunity(data) })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Opportunity id is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    if (isMissingOpportunityTable(error)) return setupResponse()
    console.error('[admin-opportunities] could not delete opportunity', error)
    return NextResponse.json({ message: 'Could not delete this opportunity.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ message: 'Opportunity not found.' }, { status: 404 })

  return NextResponse.json({ deleted: true })
}
