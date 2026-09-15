import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from '@/lib/auth-server'
import { sendLoginEmail } from '@/lib/email/resend'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Sends the post-login confirmation without trusting any client-supplied email or name. */
export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginMutation(request)
  if (originRejection) return originRejection

  const session = await getServerSession(request)
  if (!session?.user.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const email = session.user.email?.trim()
  if (!email) return NextResponse.json({ message: 'No email is attached to this account.' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
    await sendLoginEmail({ email, name: profile?.full_name ?? session.user.user_metadata?.full_name })
    return NextResponse.json({ sent: true })
  } catch (error) {
    // Email is a notification, not an auth dependency. The user is already signed in.
    console.error('[login-notification] failed to send sign-in email', error)
    return NextResponse.json({ sent: false }, { status: 202 })
  }
}
