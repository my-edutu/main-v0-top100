import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import {
  getWhatsAppGroupIndexForProfile,
  isMissingWhatsAppGroupAssignmentsTable,
  getWhatsAppGroupForProfile,
  resolveWhatsAppGroupAssignment,
} from '@/lib/groups/whatsapp'
import { loadProfileForGroups } from '@/lib/groups/server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked

  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const profile = await loadProfileForGroups(supabase, user.id)
  if (profile?.membership_status !== 'approved') {
    return NextResponse.json({ message: 'Approved members can access WhatsApp groups.' }, { status: 403 })
  }

  try {
    const stableIndex = getWhatsAppGroupIndexForProfile(user.id)
    const assignment = await resolveWhatsAppGroupAssignment(supabase, user.id, stableIndex)
    return NextResponse.json(assignment, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (isMissingWhatsAppGroupAssignmentsTable(error as { code?: string; message?: string })) {
      return NextResponse.json(
        { group: getWhatsAppGroupForProfile(user.id), created: true },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    console.error('[whatsapp-groups] assignment lookup failed', error)
    return NextResponse.json(
      { message: 'Could not load your WhatsApp group. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
