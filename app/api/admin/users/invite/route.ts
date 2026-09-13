import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { buildAdminInviteMetadata, getAdminInviteRedirectUrl, normalizeAdminInviteInput } from '@/lib/admin/user-invite'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let payload: { email?: unknown; fullName?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'A valid JSON body is required.' }, { status: 400 })
  }

  let invite
  try {
    invite = normalizeAdminInviteInput({
      email: typeof payload.email === 'string' ? payload.email : '',
      fullName: typeof payload.fullName === 'string' ? payload.fullName : '',
    })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Invalid invitation.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(invite.email, {
    data: buildAdminInviteMetadata(invite),
    redirectTo: getAdminInviteRedirectUrl(siteOrigin),
  })

  if (error) {
    const message = error.message.toLowerCase().includes('already')
      ? 'That email already has an account. Update the existing user instead.'
      : 'The invitation could not be sent. Please try again.'
    return NextResponse.json({ message }, { status: error.message.toLowerCase().includes('already') ? 409 : 502 })
  }

  const userId = data.user?.id
  if (!userId) return NextResponse.json({ message: 'The invitation was not created.' }, { status: 502 })

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, email: invite.email, full_name: invite.fullName || null, role: 'admin' }, { onConflict: 'id' })
    .select('id')
    .single()

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId).catch(() => undefined)
    console.error('[admin/users/invite] Profile provisioning failed', profileError)
    return NextResponse.json({ message: 'The invitation could not be completed. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Admin invitation sent.', user: { id: userId, email: invite.email, role: 'admin' } }, { status: 201 })
}
