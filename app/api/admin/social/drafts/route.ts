import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapPublicAwardee, publicSnapshot } from '@/lib/admin-social/profile'
import {
  mapSocialDraft,
  PUBLIC_AWARDEE_SELECT,
  SOCIAL_DRAFT_SELECT,
} from '@/lib/admin-social/server'
import { parseDraftInput } from '@/lib/admin-social/validation'
import { SITE_URL } from '@/lib/site'
import { z } from 'zod'
import { spotlightSignature } from '@/lib/admin-social/spotlight-snapshot'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const page = Number(request.nextUrl.searchParams.get('page') ?? '1')
  const status = request.nextUrl.searchParams.get('status')
  const awardeeId = request.nextUrl.searchParams.get('awardeeId')
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    (status && !['draft', 'marked_posted'].includes(status)) ||
    (awardeeId && !z.string().uuid().safeParse(awardeeId).success)
  ) {
    return NextResponse.json(
      { message: 'Invalid history filters.' },
      { status: 400 },
    )
  }
  try {
    const db = createAdminClient()
    let query = db
      .from('admin_social_share_drafts')
      .select(SOCIAL_DRAFT_SELECT, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
    if (awardeeId) query = query.eq('awardee_id', awardeeId)
    if (status) query = query.eq('status', status)
    const { data, error, count } = await query.range(
      (page - 1) * 20,
      page * 20 - 1,
    )
    if (error)
      return NextResponse.json(
        { message: 'Could not load saved drafts.' },
        { status: 503 },
      )
    return NextResponse.json(
      {
        drafts: (data ?? []).map(mapSocialDraft),
        total: count ?? 0,
        page,
        hasMore: page * 20 < (count ?? 0),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { message: 'Could not load saved drafts.' },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 16_000)
    return NextResponse.json(
      { message: 'Draft is too large.' },
      { status: 413 },
    )

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body.' },
      { status: 400 },
    )
  }
  const input = parseDraftInput(body)
  if (!input)
    return NextResponse.json(
      { message: 'Check the platform and caption, then try again.' },
      { status: 400 },
    )

  const origin = SITE_URL
  try {
    const db = createAdminClient()
    const { data: profileRow, error: profileError } = await db
      .from('awardee_directory')
      .select(PUBLIC_AWARDEE_SELECT)
      .eq('awardee_id', input.awardeeId)
      .eq('is_public', true)
      .maybeSingle()
    if (profileError)
      return NextResponse.json(
        { message: 'Could not load awardee profile.' },
        { status: 503 },
      )
    if (!profileRow)
      return NextResponse.json(
        { message: 'Public awardee profile not found.' },
        { status: 404 },
      )
    const profile = mapPublicAwardee(profileRow, origin)
    if (!profile.slug || !profile.name)
      return NextResponse.json(
        { message: 'Public awardee profile is incomplete.' },
        { status: 422 },
      )
    if (input.signature && input.signature !== spotlightSignature(profile))
      return NextResponse.json(
        {
          message:
            'This profile has changed. Reload the latest profile and review your caption before saving.',
        },
        { status: 409 },
      )

    const { data: existing, error: existingError } = await db
      .from('admin_social_share_drafts')
      .select('id,publish_state,updated_at')
      .eq('awardee_id', input.awardeeId)
      .eq('platform', input.platform)
      .eq('status', 'draft')
      .maybeSingle()
    if (existingError)
      return NextResponse.json(
        { message: 'Could not save draft.' },
        { status: 503 },
      )
    if (
      input.expectedUpdatedAt !== undefined &&
      (existing?.updated_at ?? null) !== input.expectedUpdatedAt
    ) {
      return NextResponse.json(
        {
          message:
            'This draft was changed by another admin. Reload the saved draft before making further changes. Your edits are still in this editor.',
        },
        { status: 409 },
      )
    }
    if (existing && !['ready', 'failed'].includes(existing.publish_state)) {
      return NextResponse.json(
        {
          message:
            'This draft is publishing or needs a delivery check. Refresh its status before editing it.',
        },
        { status: 409 },
      )
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
      ? await db
          .from('admin_social_share_drafts')
          .update(values)
          .eq('id', existing.id)
          .eq('updated_at', existing.updated_at)
          .eq('status', 'draft')
          .eq('publish_state', existing.publish_state)
          .select(SOCIAL_DRAFT_SELECT)
          .maybeSingle()
      : await db
          .from('admin_social_share_drafts')
          .insert({ ...values, created_by: access.user.id })
          .select(SOCIAL_DRAFT_SELECT)
          .single()
    if (result.error && result.error.code === '23505') {
      return NextResponse.json(
        {
          message:
            'A draft was saved by another admin. Reload the saved draft before making further changes.',
        },
        { status: 409 },
      )
    }
    if (!result.error && !result.data)
      return NextResponse.json(
        {
          message:
            'This draft changed while saving. Reload the saved draft. Your edits are still in this editor.',
        },
        { status: 409 },
      )
    if (result.error || !result.data)
      return NextResponse.json(
        { message: 'Could not save draft.' },
        { status: 503 },
      )
    return NextResponse.json(
      { draft: mapSocialDraft(result.data) },
      { status: existing?.id ? 200 : 201 },
    )
  } catch {
    return NextResponse.json(
      { message: 'Could not save draft.' },
      { status: 503 },
    )
  }
}
