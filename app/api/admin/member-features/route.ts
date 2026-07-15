// app/api/admin/member-features/route.ts
// Admin: list member feature submissions.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapFeature } from '@/lib/member-hub-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('member_features')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ message: 'Could not load feature submissions.' }, { status: 500 })
  return NextResponse.json({ featureSubmissions: (data ?? []).map(mapFeature) })
}
