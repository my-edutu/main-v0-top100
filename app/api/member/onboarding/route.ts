import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { mapProfileToMember } from '@/lib/member-hub-server'
import {
  onboardingComplete,
  onboardingFields,
  validateOnboarding,
} from '@/lib/dashboard/onboarding'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.id)
    return NextResponse.json(
      { message: 'Please sign in again.' },
      { status: 401 },
    )
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return NextResponse.json({ message: 'Invalid form.' }, { status: 400 })
  const db = createAdminClient()
  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error || !profile)
    return NextResponse.json(
      { message: 'Could not load your profile.' },
      { status: 503 },
    )
  const prefs = profile.notification_prefs ?? {}
  if (onboardingComplete(prefs))
    return NextResponse.json(
      { message: 'Your setup is already complete.' },
      { status: 409 },
    )
  const columns: Record<string, string> = {}
  for (const field of onboardingFields) {
    if (body[field.key] !== undefined) {
      if (
        typeof body[field.key] !== 'string' ||
        body[field.key].trim().length > field.max
      )
        return NextResponse.json(
          { message: `Please check ${field.key}.` },
          { status: 400 },
        )
      columns[field.key] = body[field.key].trim()
    }
  }
  if (body.complete === true) {
    const message = validateOnboarding({ ...profile, ...columns })
    if (message) return NextResponse.json({ message }, { status: 400 })
  }
  const prefsPatch = {
    ...(Number.isInteger(body.step)
      ? { onboardingStep: Math.max(0, Math.min(4, body.step as number)) }
      : {}),
    ...(body.welcomeSeen === true
      ? { onboardingWelcomeSeenAt: new Date().toISOString() }
      : {}),
    ...(body.complete === true
      ? { onboardingCompletedAt: new Date().toISOString() }
      : {}),
  }
  // Initial setup has its own endpoint so saving individual steps never consumes BIO edit access.
  let saved = profile
  if (Object.keys(columns).length) {
    const { data: updatedProfile, error: saveError } = await db
      .from('profiles')
      .update(columns)
      .eq('id', user.id)
      .select('*')
      .single()
    if (saveError) {
      return NextResponse.json(
        { message: 'Your progress could not be saved. Please try again.' },
        { status: 503 },
      )
    }
    saved = updatedProfile
  }
  const { data: mergedPrefs, error: prefsError } = await db.rpc('merge_profile_notification_prefs', {
    p_profile_id: user.id,
    p_patch: prefsPatch,
  })
  // Some deployed databases may not yet have the RPC migration. Keep onboarding
  // usable there while the migration is rolled out; preserve existing preference
  // keys when applying this member's onboarding fields.
  if (prefsError?.code === 'PGRST202' || prefsError?.code === '42883') {
    const { data: updatedPrefs, error: fallbackError } = await db
      .from('profiles')
      .update({ notification_prefs: { ...prefs, ...prefsPatch } })
      .eq('id', user.id)
      .select('notification_prefs')
      .single()
    if (fallbackError || !updatedPrefs?.notification_prefs)
      return NextResponse.json(
        { message: 'Your progress could not be saved. Please try again.' },
        { status: 503 },
      )
    saved.notification_prefs = updatedPrefs.notification_prefs
    return NextResponse.json({ member: mapProfileToMember(saved) })
  }
  if (prefsError || !mergedPrefs)
    return NextResponse.json(
      { message: 'Your progress could not be saved. Please try again.' },
      { status: 503 },
    )
  saved.notification_prefs = mergedPrefs
  return NextResponse.json({ member: mapProfileToMember(saved) })
}
