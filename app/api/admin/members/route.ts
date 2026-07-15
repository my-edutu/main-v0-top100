// app/api/admin/members/route.ts
// Admin: list member accounts (role = 'user').
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapProfileToMember } from '@/lib/member-hub-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ message: 'Could not load members.' }, { status: 500 })
  }

  const members = (data ?? []).map((row) => mapProfileToMember(row))
  return NextResponse.json({ members })
}
