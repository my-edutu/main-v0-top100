// app/api/admin/member-features/[id]/route.ts
// Admin: update the status of a member feature submission.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapFeature } from '@/lib/member-hub-server'

export const runtime = 'nodejs'

const STATUSES = ['pending', 'reviewing', 'approved', 'published'] as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Submission id is required.' }, { status: 400 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const status = String(body.status ?? '')
  if (!STATUSES.includes(status as any)) {
    return NextResponse.json({ message: `Unsupported status: ${status}` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('member_features')
    .update({ status })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ message: 'Could not update the submission.' }, { status: 500 })
  if (!data) return NextResponse.json({ message: 'Submission not found.' }, { status: 404 })

  return NextResponse.json({ submission: mapFeature(data) })
}
