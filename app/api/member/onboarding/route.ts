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
  const nextPrefs = {
    ...prefs,
    onboardingStep: Math.max(
      0,
      Math.min(4, Number.isInteger(body.step) ? body.step : 0),
    ),
    ...(body.complete === true
      ? { onboardingCompletedAt: new Date().toISOString() }
      : {}),
  }
  // Initial setup has its own endpoint so saving individual steps never consumes BIO edit access.
  const { data: saved, error: saveError } = await db
    .from('profiles')
    .update({ ...columns, notification_prefs: nextPrefs })
    .eq('id', user.id)
    .select('*')
    .single()
  if (saveError)
    return NextResponse.json(
      { message: 'Your progress could not be saved. Please try again.' },
      { status: 503 },
    )
  return NextResponse.json({ member: mapProfileToMember(saved) })
}
