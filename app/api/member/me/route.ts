// app/api/member/me/route.ts
// The authenticated member's own hub data.
//   GET   -> profile + notifications + feature submissions
//   PATCH -> update own profile / preferences (unlimited member profile edits)
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { validateSocialLinks } from '@/lib/profile-contact'
import { PROFILE_TEXT_LIMITS } from '@/app/dashboard/_lib/profile-editor'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { PARTICIPANT_HANDBOOK } from '@/lib/handbook/participant-handbook'
import { PARTICIPANT_HANDBOOK_CAMPAIGN_ID } from '@/lib/dashboard/participant-handbook-broadcast'
import {
  mapProfileToMember,
  mapNotification,
  mapFeature,
  buildProfileUpdate,
  patchTouchesBio,
} from '@/lib/member-hub-server'

export const runtime = 'nodejs'

const LEGACY_AWARDEE_COLUMNS = 'id, profile_id, name, email, slug, headline, tagline, bio, country, course'
type MemberNotificationRow = {
  id: string
  user_id: string
  title: string
  body: string
  category: string
  metadata: Record<string, unknown> | null
  cta_label: string | null
  cta_url: string | null
  campaign_id?: string | null
  delivered_at: string | null
  read_at: string | null
}

async function loadLinkedAwardee(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase
    .from('awardees')
    .select(LEGACY_AWARDEE_COLUMNS)
    .eq('profile_id', userId)
    .maybeSingle()
  return data as {
    id: string
    profile_id: string | null
    name: string | null
    email: string | null
    slug: string | null
    headline: string | null
    tagline: string | null
    bio: string | null
    country: string | null
    course: string | null
  } | null
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()

  const [profileResult, awardee, notificationsRes, featuresRes] = await Promise.all([
    supabase.from('profiles')
      .select('id,role,full_name,email,access_code,slug,membership_status,headline,bio,location,organization,tagline,field,field_of_study,avatar_url,portfolio_cover_url,notification_prefs,bio_update_count,bio_update_limit,created_at')
      .eq('id', user.id)
      .maybeSingle(),
    loadLinkedAwardee(supabase, user.id),
    supabase
      .from('user_notifications')
      .select('id,user_id,title,body,category,metadata,cta_label,cta_url,campaign_id,delivered_at,read_at')
      .eq('user_id', user.id)
      .order('delivered_at', { ascending: false })
      .limit(50),
    supabase
      .from('member_features')
      .select('id,member_id,member_name,title,category,summary,contact_email,status,created_at')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const { data: profile, error } = profileResult
  if (error) return NextResponse.json({ message: 'Could not load your profile.' }, { status: 500 })
  if (!profile) return NextResponse.json({ message: 'Profile not found. Contact the admin team.' }, { status: 404 })

  let notificationRows: MemberNotificationRow[] = notificationsRes.data ?? []
  const hasHandbook = (row: MemberNotificationRow) => row.campaign_id === PARTICIPANT_HANDBOOK_CAMPAIGN_ID
    || row.title === PARTICIPANT_HANDBOOK.notificationTitle
  if (!notificationRows.some(hasHandbook)) {
    const handbookPayload = {
      user_id: user.id,
      title: PARTICIPANT_HANDBOOK.notificationTitle,
      body: PARTICIPANT_HANDBOOK.notificationMessage,
      category: 'admin',
      cta_label: PARTICIPANT_HANDBOOK.notificationCta,
      cta_url: PARTICIPANT_HANDBOOK.path,
      delivered_at: new Date().toISOString(),
      metadata: { audience: 'all', broadcast_id: PARTICIPANT_HANDBOOK_CAMPAIGN_ID, campaign_id: PARTICIPANT_HANDBOOK_CAMPAIGN_ID },
    }

    // Existing databases may not have received the campaign-id migration yet.
    // Keep the current member inbox usable during local preview and rollout by
    // using the stable title as an idempotency key on that older schema.
    if (notificationsRes.error?.code === '42703') {
      const legacySelection = 'id,user_id,title,body,category,metadata,cta_label,cta_url,delivered_at,read_at'
      const { data: existingLegacyNotice } = await supabase
        .from('user_notifications')
        .select(legacySelection)
        .eq('user_id', user.id)
        .eq('title', PARTICIPANT_HANDBOOK.notificationTitle)
        .maybeSingle()

      if (existingLegacyNotice) {
        notificationRows = [existingLegacyNotice, ...notificationRows]
      } else {
        const { data: handbookNotification, error: handbookError } = await supabase
          .from('user_notifications')
          .insert(handbookPayload)
          .select(legacySelection)
          .maybeSingle()
        if (handbookError) {
          console.error('[member/me] Could not add handbook notification to member inbox:', handbookError.message)
        } else if (handbookNotification) {
          notificationRows = [handbookNotification, ...notificationRows]
        }
      }
    } else {
      const { data: handbookNotification, error: handbookError } = await supabase
        .from('user_notifications')
        .upsert({ ...handbookPayload, campaign_id: PARTICIPANT_HANDBOOK_CAMPAIGN_ID }, { onConflict: 'user_id,campaign_id', ignoreDuplicates: true })
        .select('id,user_id,title,body,category,metadata,cta_label,cta_url,campaign_id,delivered_at,read_at')
        .maybeSingle()

      if (handbookError) {
        console.error('[member/me] Could not add handbook notification to member inbox:', handbookError.message)
      } else if (handbookNotification) {
        notificationRows = [handbookNotification, ...notificationRows]
      }
    }
  }

  // The handbook is now for all member accounts. Normalize legacy campaign
  // metadata so an older approved-only notification remains visible to a
  // member whose status changes while the campaign row already exists.
  const notifications = notificationRows.map((row) => row.campaign_id === PARTICIPANT_HANDBOOK_CAMPAIGN_ID
    ? { ...row, metadata: { ...(row.metadata ?? {}), audience: 'all' } }
    : row)

  return NextResponse.json({
    member: mapProfileToMember(profile, awardee?.id ?? null, awardee),
    notifications: notifications.map(mapNotification),
    featureSubmissions: (featuresRes.data ?? []).map(mapFeature),
  })
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  let patch: Record<string, unknown> = {}
  try {
    patch = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  for (const [key, limit] of Object.entries(PROFILE_TEXT_LIMITS)) {
    if (key in patch && (typeof patch[key] !== 'string' || (patch[key] as string).length > limit)) {
      return NextResponse.json({ message: `${key} must be text of ${limit} characters or fewer.` }, { status: 400 })
    }
  }

  if ('socialLinks' in patch) {
    const problem = validateSocialLinks(patch.socialLinks)
    if (problem) return NextResponse.json({ message: problem }, { status: 400 })
  }
  for (const key of ['socialLinksConsent', 'contactEmailConsent']) {
    if (key in patch && typeof patch[key] !== 'boolean') return NextResponse.json({ message: 'Invalid consent choice.' }, { status: 400 })
  }
  const supabase = createAdminClient()

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error || !profile) {
    return NextResponse.json({ message: 'Profile not found.' }, { status: 404 })
  }

  const { columns, preferencePatch } = buildProfileUpdate(patch, (profile.notification_prefs ?? {}) as Record<string, unknown>)

  // Track text changes for public-profile synchronization, without consuming edit quotas.
  const touchesBio = patchTouchesBio(patch)
  const bioChanged =
    touchesBio &&
    ['headline', 'bio', 'location', 'organization', 'field'].some(
      (key) => typeof patch[key] === 'string' && patch[key] !== (profile as any)[key],
    )

  const { data: updated, error: updateError } = await supabase.rpc('update_member_profile_atomic', {
    p_profile_id: user.id,
    p_columns: columns,
    p_preference_patch: preferencePatch,
    p_increment_bio: false,
  })

  if (updateError) {
    // Missing membership columns => supabase/SETUP-MEMBER-HUB.sql has not been
    // run against this database yet. Surface that instead of a generic error.
    if (updateError.code === 'PGRST204' || /column .* does not exist|schema cache/i.test(updateError.message ?? '')) {
      return NextResponse.json(
        { message: 'The member hub database is not fully set up yet. Ask the admin to run supabase/SETUP-MEMBER-HUB.sql.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ message: 'Could not save your update.' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ message: 'Profile not found.' }, { status: 404 })
  }

  const awardee = await loadLinkedAwardee(supabase, user.id)

  // Keep the public awardee record in sync with dashboard BIO edits. This runs
  // server-side with the service role — the dashboard session has no awardee
  // cookie, so it must never call /api/awardees/self-update itself.
  if (awardee?.id && bioChanged) {
    const awardeePatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof columns.headline === 'string') awardeePatch.headline = columns.headline
    if (typeof columns.tagline === 'string') awardeePatch.tagline = columns.tagline
    if (typeof columns.field_of_study === 'string') awardeePatch.course = columns.field_of_study
    if (typeof columns.bio === 'string') awardeePatch.bio = columns.bio

    const { data: updatedAwardee } = await supabase
      .from('awardees')
      .update(awardeePatch)
      .eq('id', awardee.id)
      .select('slug')
      .maybeSingle()

    if (updatedAwardee?.slug) revalidatePath(`/awardees/${updatedAwardee.slug}`)
    revalidatePath('/awardees')
    revalidateTag('awardees')
  }

  if (awardee?.slug) revalidatePath(`/awardees/${awardee.slug}`)

  return NextResponse.json({ member: mapProfileToMember(updated, awardee?.id ?? null, awardee) })
}
