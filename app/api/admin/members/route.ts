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
  const members = []
  const claims = new Map<string, { awardeeId: string; awardeeName: string; awardeeEmail: string }>()
  const { data: pendingClaims, error: claimsError } = await supabase
    .from('pending_awardee_claims')
    .select('user_id,awardee_id,awardees(name,email)')
  if (claimsError) return NextResponse.json({ message: 'Could not load pending claims.' }, { status: 500 })
  for (const claim of pendingClaims ?? []) {
    const awardee = Array.isArray(claim.awardees) ? claim.awardees[0] : claim.awardees
    claims.set(claim.user_id, {
      awardeeId: claim.awardee_id,
      awardeeName: awardee?.name ?? 'Unknown awardee',
      awardeeEmail: awardee?.email ?? '',
    })
  }
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 499)

    if (error) return NextResponse.json({ message: 'Could not load members.' }, { status: 500 })
    members.push(...(data ?? []).map((row) => ({
      ...mapProfileToMember(row),
      pendingClaim: claims.get(row.id),
    })))
    if ((data ?? []).length < 500) break
  }

  return NextResponse.json({ members })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const body = await request.json().catch(() => null) as { action?: unknown } | null
  if (body?.action !== 'approve-all-pending') {
    return NextResponse.json({ message: 'Unsupported member action.' }, { status: 400 })
  }

  const { data, error } = await createAdminClient().rpc('approve_all_pending_members', {
    p_admin_id: adminCheck.user.id,
  })
  if (error) {
    console.error('[admin/members] bulk approval failed', error)
    return NextResponse.json({ message: 'Could not approve pending awardees.' }, { status: 500 })
  }

  return NextResponse.json({ approved: Number(data ?? 0) })
}
