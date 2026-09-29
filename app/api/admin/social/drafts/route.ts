import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapPublicAwardee, publicSnapshot } from '@/lib/admin-social/profile'
import { mapSocialDraft, PUBLIC_AWARDEE_SELECT, SOCIAL_DRAFT_SELECT } from '@/lib/admin-social/server'
import { parseDraftInput } from '@/lib/admin-social/validation'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  try {
    const db = createAdminClient()
    let query = db.from('admin_social_share_drafts').select(SOCIAL_DRAFT_SELECT)
      .order('updated_at', { ascending: false }).limit(100)
    const awardeeId = request.nextUrl.searchParams.get('awardeeId')
    if (awardeeId) query = query.eq('awardee_id', awardeeId)
    const { data, error } = await query
    if (error) return NextResponse.json({ message: 'Could not load saved drafts.' }, { status: 503 })
    return NextResponse.json({ drafts: (data ?? []).map(mapSocialDraft) })
  } catch {
    return NextResponse.json({ message: 'Could not load saved drafts.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 16_000) return NextResponse.json({ message: 'Draft is too large.' }, { status: 413 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }
  const input = parseDraftInput(body)
  if (!input) return NextResponse.json({ message: 'Check the platform and caption, then try again.' }, { status: 400 })

  const origin = process.env.NODE_ENV === 'development' ? request.nextUrl.origin : SITE_URL
  try {
    const db = createAdminClient()
    const { data: profileRow, error: profileError } = await db.from('awardee_directory')
      .select(PUBLIC_AWARDEE_SELECT).eq('awardee_id', input.awardeeId).eq('is_public', true).maybeSingle()
    if (profileError) return NextResponse.json({ message: 'Could not load awardee profile.' }, { status: 503 })
    if (!profileRow) return NextResponse.json({ message: 'Public awardee profile not found.' }, { status: 404 })
    const profile = mapPublicAwardee(profileRow, origin)
    if (!profile.slug || !profile.name) return NextResponse.json({ message: 'Public awardee profile is incomplete.' }, { status: 422 })

    const { data: existing, error: existingError } = await db.from('admin_social_share_drafts')
      .select('id,publish_state').eq('awardee_id', input.awardeeId).eq('platform', input.platform).eq('status', 'draft').maybeSingle()
    if (existingError) return NextResponse.json({ message: 'Could not save draft.' }, { status: 503 })
    if (existing && !['ready', 'failed'].includes(existing.publish_state)) {
      return NextResponse.json({ message: 'This draft is publishing or needs a delivery check. Refresh its status before editing it.' }, { status: 409 })
    }

    const snapshot = publicSnapshot(profile)
    const values = {
      awardee_id: input.awardeeId,
      profile_id: profile.profileId,
      platform: input.platform,
      caption: input.caption,
      snapshot_name: profile.name,
      snapshot_bio: profile.bio,
      snapshot_profile_updated_at: profile.updatedAt,
      snapshot_facts: {
        headline: profile.headline,
        country: profile.country,
        fieldOfStudy: profile.fieldOfStudy,
        cohort: profile.cohort,
        year: profile.year,
        achievements: snapshot.achievements,
        impactProjects: profile.impactProjects,
        livesImpacted: profile.livesImpacted,
        awardsReceived: profile.awardsReceived,
        updatedAt: profile.updatedAt,
      },
      snapshot_profile_url: profile.profileUrl,
      snapshot_image_url: profile.imageUrl,
      snapshot_image_source: profile.imageSource,
      publish_state: 'ready',
      publish_error: null,
      updated_by: access.user.id,
      updated_at: new Date().toISOString(),
    }
    const result = existing?.id
      ? await db.from('admin_social_share_drafts').update(values).eq('id', existing.id).eq('publish_state', existing.publish_state).select(SOCIAL_DRAFT_SELECT).single()
      : await db.from('admin_social_share_drafts').insert({ ...values, created_by: access.user.id })
        .select(SOCIAL_DRAFT_SELECT).single()
    if (result.error && result.error.code === '23505') {
      const { data: concurrent } = await db.from('admin_social_share_drafts').select('id,publish_state')
        .eq('awardee_id', input.awardeeId).eq('platform', input.platform).eq('status', 'draft').maybeSingle()
      if (concurrent?.id && ['ready', 'failed'].includes(concurrent.publish_state)) {
        const retry = await db.from('admin_social_share_drafts').update(values).eq('id', concurrent.id).eq('publish_state', concurrent.publish_state)
          .select(SOCIAL_DRAFT_SELECT).single()
        if (!retry.error && retry.data) return NextResponse.json({ draft: mapSocialDraft(retry.data) })
      }
    }
    if (result.error || !result.data) return NextResponse.json({ message: 'Could not save draft.' }, { status: 503 })
    return NextResponse.json({ draft: mapSocialDraft(result.data) }, { status: existing?.id ? 200 : 201 })
  } catch {
    return NextResponse.json({ message: 'Could not save draft.' }, { status: 503 })
  }
}
