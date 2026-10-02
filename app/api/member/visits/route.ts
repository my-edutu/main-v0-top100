import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ensureWelcomeMessage } from '@/lib/dashboard/welcome-message'
import { onboardingComplete } from '@/lib/dashboard/onboarding'

export async function POST() {
  const auth = await createClient()
  const { data, error } = await auth.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub || !claims.session_id)
    return NextResponse.json(
      { message: 'Please sign in again.' },
      { status: 401 },
    )
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('notification_prefs')
    .eq('id', claims.sub)
    .single()
  const prefs = profile?.notification_prefs ?? {}
  if (!onboardingComplete(prefs))
    return NextResponse.json(
      { message: 'Complete onboarding first.' },
      { status: 403 },
    )
  const { data: count, error: saveError } = await db.rpc('record_dashboard_visit', {
    p_profile_id: claims.sub,
    p_session_id: claims.session_id,
  })
  if (saveError || count === null || count === undefined)
    return NextResponse.json(
      { message: 'Could not record your visit.' },
      { status: 503 },
    )

  after(async () => {
    const welcome = await ensureWelcomeMessage(claims.sub)
    if (!welcome.ok) console.warn('[welcome]', welcome.reason)
  })
  return NextResponse.json({ count })
}
