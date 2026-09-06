import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/auth-server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'
import { parseRole } from '@/lib/types/roles'

/**
 * Resolve the signed-in user's application role from server-owned profile data.
 * The caller cannot choose a user ID and the response intentionally exposes no
 * profile fields beyond the role needed by the post-login router.
 */
export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginMutation(request)
  if (originRejection) return originRejection

  const session = await getServerSession(request)
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('[check-profile] Could not query authenticated profile:', error.message)
      return NextResponse.json({ error: 'Could not verify account access.' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    const role = parseRole(profile.role)
    if (!role || role === 'guest') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
    }

    return NextResponse.json({ profile: { role } })
  } catch (error) {
    console.error(
      '[check-profile] Could not verify authenticated profile:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return NextResponse.json({ error: 'Could not verify account access.' }, { status: 500 })
  }
}
