import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { founderListingSchema, type FounderListing } from '@/lib/founder-listing'
import { FOUNDER_PAGE_SIZE } from '@/lib/founders-network'

const columns = 'profile_id,startup,summary,linkedin_url'

function listing(row: { startup: string; summary: string; linkedin_url: string }): FounderListing {
  return { startup: row.startup, summary: row.summary, linkedinUrl: row.linkedin_url }
}

async function access() {
  const user = await getCurrentUser()
  if (!user?.id) return { ok: false, response: NextResponse.json({ message: 'Sign in to view the Founders Network.' }, { status: 401 }) } as const
  const db = createAdminClient()
  const { data, error } = await db.from('profiles').select('membership_status').eq('id', user.id).maybeSingle()
  if (error) return { ok: false, response: unavailable() } as const
  if (data?.membership_status !== 'approved') {
    return { ok: false, response: NextResponse.json({ message: 'The Founders Network is available to approved members.' }, { status: 403 }) } as const
  }
  return { ok: true, db, profileId: user.id } as const
}

function unavailable() {
  return NextResponse.json({ message: 'The Founders Network is temporarily unavailable. Please try again.' }, { status: 503 })
}

export async function GET(request: NextRequest) {
  const member = await access()
  if (!member.ok) return member.response
  const { db, profileId } = member

  if (request.nextUrl.searchParams.get('mine') === '1') {
    const { data, error } = await db.from('member_founder_listings').select(columns).eq('profile_id', profileId).maybeSingle()
    return error ? unavailable() : NextResponse.json({ listing: data ? listing(data) : null })
  }

  const page = Number(request.nextUrl.searchParams.get('page') ?? 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) {
    return NextResponse.json({ message: 'Invalid page.' }, { status: 400 })
  }
  const offset = (page - 1) * FOUNDER_PAGE_SIZE
  const { data, error } = await db.from('member_founder_listings')
    .select(`${columns},founder:profiles!member_founder_listings_profile_id_fkey!inner(full_name)`)
    .eq('founder.membership_status', 'approved')
    .order('created_at', { ascending: false })
    .order('profile_id')
    .range(offset, offset + FOUNDER_PAGE_SIZE)
  if (error) return unavailable()

  return NextResponse.json({
    entries: data.slice(0, FOUNDER_PAGE_SIZE).map(row => ({
      ...listing(row), profileId: row.profile_id,
      founderName: (row.founder as unknown as { full_name: string | null })?.full_name?.trim() || 'Top100 founder',
    })),
    hasNextPage: data.length > FOUNDER_PAGE_SIZE,
  })
}

export async function PUT(request: NextRequest) {
  const member = await access()
  if (!member.ok) return member.response
  const result = founderListingSchema.safeParse(await request.json().catch(() => null))
  if (!result.success) {
    return NextResponse.json({ message: result.error.issues[0]?.message || 'Check your startup details.' }, { status: 400 })
  }
  const { startup, summary, linkedinUrl } = result.data
  const { error } = await member.db.from('member_founder_listings').upsert({
    profile_id: member.profileId, startup, summary, linkedin_url: linkedinUrl,
  }, { onConflict: 'profile_id' })
  return error ? unavailable() : NextResponse.json({ listing: result.data })
}

export async function DELETE() {
  const member = await access()
  if (!member.ok) return member.response
  const { error } = await member.db.from('member_founder_listings').delete().eq('profile_id', member.profileId)
  return error ? unavailable() : NextResponse.json({ listing: null })
}
