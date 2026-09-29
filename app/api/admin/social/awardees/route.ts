import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'
import { mapPublicAwardee } from '@/lib/admin-social/profile'
import { PUBLIC_AWARDEE_SELECT } from '@/lib/admin-social/server'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error

  const term = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (term.length > 80) return NextResponse.json({ message: 'Search text is too long.' }, { status: 400 })
  const awardeeId = request.nextUrl.searchParams.get('awardeeId')
  if (awardeeId && !z.string().uuid().safeParse(awardeeId).success) return NextResponse.json({ message: 'Invalid awardee ID.' }, { status: 400 })

  try {
    const db = createAdminClient()
    let query = db.from('awardee_directory').select(PUBLIC_AWARDEE_SELECT)
      .eq('is_public', true).order('name', { ascending: true }).limit(awardeeId ? 1 : 200)
    if (term) query = query.ilike('name', `%${term}%`)
    if (awardeeId) query = query.eq('awardee_id', awardeeId)
    const { data, error } = await query
    if (error) return NextResponse.json({ message: 'Could not load awardees.' }, { status: 503 })
    const origin = process.env.NODE_ENV === 'development' ? request.nextUrl.origin : SITE_URL
    const awardees = (data ?? []).map((row: unknown) => mapPublicAwardee(row as Parameters<typeof mapPublicAwardee>[0], origin))
      .filter((profile) => profile.isPublic && profile.slug && profile.name)
    return NextResponse.json({ awardees })
  } catch {
    return NextResponse.json({ message: 'Could not load awardees.' }, { status: 503 })
  }
}
