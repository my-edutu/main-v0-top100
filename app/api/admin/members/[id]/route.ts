// app/api/admin/members/[id]/route.ts
// Admin: approve / reject / suspend a member, or reset their BIO update limit.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapProfileToMember } from '@/lib/member-hub-server'

export const runtime = 'nodejs'

const STATUS_ACTIONS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
  pending: 'pending',
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Member id is required.' }, { status: 400 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const action = String(body.action ?? '')
  const update: Record<string, unknown> = {}

  if (action === 'reset-bio') {
    update.bio_update_count = 0
  } else if (STATUS_ACTIONS[action]) {
    update.membership_status = STATUS_ACTIONS[action]
  } else {
    return NextResponse.json({ message: `Unsupported action: ${action}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', id)
    .eq('role', 'user')
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ message: 'Could not update the member.' }, { status: 500 })
  if (!data) return NextResponse.json({ message: 'Member not found.' }, { status: 404 })

  return NextResponse.json({ member: mapProfileToMember(data) })
}
