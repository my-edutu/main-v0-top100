// app/api/member/me/route.ts
// The authenticated member's own hub data.
//   GET   -> profile + notifications + feature submissions
//   PATCH -> update own profile / preferences (enforces bio_update_limit)
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  mapProfileToMember,
  mapNotification,
  mapFeature,
  buildProfileUpdate,
  patchTouchesBio,
} from '@/lib/member-hub-server'

export const runtime = 'nodejs'

async function loadLinkedAwardeeId(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await supabase.from('awardees').select('id').eq('profile_id', userId).maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) {
    return NextResponse.json({ message: 'Could not load your profile.' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ message: 'Profile not found. Contact the admin team.' }, { status: 404 })
  }

  const [awardeeId, notificationsRes, featuresRes] = await Promise.all([
    loadLinkedAwardeeId(supabase, user.id),
    supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('delivered_at', { ascending: false }),
    supabase
      .from('member_features')
      .select('*')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    member: mapProfileToMember(profile, awardeeId),
    notifications: (notificationsRes.data ?? []).map(mapNotification),
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

  const supabase = createAdminClient()

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error || !profile) {
    return NextResponse.json({ message: 'Profile not found.' }, { status: 404 })
  }

  const { columns, prefs } = buildProfileUpdate(patch, (profile.notification_prefs ?? {}) as Record<string, unknown>)

  // Enforce the BIO update limit only when a BIO field actually changes value.
  const touchesBio = patchTouchesBio(patch)
  const bioChanged =
    touchesBio &&
    ['headline', 'bio', 'location', 'organization', 'field'].some(
      (key) => typeof patch[key] === 'string' && patch[key] !== (profile as any)[key],
    )

  let nextCount = profile.bio_update_count ?? 0
  if (bioChanged) {
    nextCount += 1
    if (nextCount > (profile.bio_update_limit ?? 2)) {
      return NextResponse.json(
        { message: 'BIO update limit reached. Ask the admin team to reset your update access.' },
        { status: 429 },
      )
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      ...columns,
      notification_prefs: prefs,
      bio_update_count: nextCount,
    })
    .eq('id', user.id)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ message: 'Could not save your update.' }, { status: 500 })
  }

  const awardeeId = await loadLinkedAwardeeId(supabase, user.id)
  return NextResponse.json({ member: mapProfileToMember(updated, awardeeId) })
}
