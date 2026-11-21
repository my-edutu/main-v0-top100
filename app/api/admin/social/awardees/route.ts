import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'
import { mapPublicAwardee } from '@/lib/admin-social/profile'
import { PUBLIC_AWARDEE_SELECT } from '@/lib/admin-social/server'
import { z } from 'zod'
import { spotlightSignature } from '@/lib/admin-social/spotlight-snapshot'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error

  const term = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const page = Number(request.nextUrl.searchParams.get('page') ?? '1')
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    return NextResponse.json({ message: 'Invalid page.' }, { status: 400 })
  if (term.length > 80)
    return NextResponse.json(
      { message: 'Search text is too long.' },
      { status: 400 },
    )
  const awardeeId = request.nextUrl.searchParams.get('awardeeId')
  if (awardeeId && !z.guid().safeParse(awardeeId).success)
    return NextResponse.json(
      { message: 'Invalid awardee ID.' },
      { status: 400 },
    )

  try {
    const db = createAdminClient()
    let query = db
      .from('awardee_directory')
      .select(PUBLIC_AWARDEE_SELECT, { count: 'exact' })
      .eq('is_public', true)
      .neq('slug', '')
      .neq('name', '')
      .order('name', { ascending: true })
      .order('awardee_id', { ascending: true })
    if (term)
      query = query.ilike('name', `%${term.replace(/[\\%_]/g, '\\$&')}%`)
    if (awardeeId) query = query.eq('awardee_id', awardeeId)
    const { data, error, count } = await query.range(
      awardeeId ? 0 : (page - 1) * 20,
      awardeeId ? 0 : page * 20 - 1,
    )
    if (error)
      return NextResponse.json(
        { message: 'Could not load awardees.' },
        { status: 503 },
      )
    const origin = SITE_URL
    const awardees = (data ?? [])
      .map((row: unknown) =>
        mapPublicAwardee(row as Parameters<typeof mapPublicAwardee>[0], origin),
      )
      .filter((profile) => profile.isPublic && profile.slug && profile.name)
      .map((profile) => ({
        ...profile,
        signature: spotlightSignature(profile),
      }))
    return NextResponse.json(
      {
        awardees,
        page,
        total: count ?? 0,
        hasMore: !awardeeId && page * 20 < (count ?? 0),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { message: 'Could not load awardees.' },
      { status: 503 },
    )
  }
}
