import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { buildAdminInviteEmail, buildAdminInviteMetadata, getAdminInviteRedirectUrl, normalizeAdminInviteInput } from '@/lib/admin/user-invite'
import { sendTransactionalEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let payload: { email?: unknown; fullName?: unknown }
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ message: 'A valid invitation request is required.' }, { status: 400 })
    }
    payload = parsed as { email?: unknown; fullName?: unknown }
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

  const siteOrigin = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_SITE_URL || ''
    : process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  let redirectTo: string
  try {
    redirectTo = getAdminInviteRedirectUrl(siteOrigin)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Invite site URL is not configured.' }, { status: 503 })
  }

  try {
    const supabase = createAdminClient()
    // Generate the token first so no mail can go out until the admin profile is
    // provisioned. Development returns the link to the admin; production mails it.
    const productionInvite = process.env.NODE_ENV === 'production'
    const { data, error: authError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: invite.email,
      options: { data: buildAdminInviteMetadata(invite), redirectTo },
    })
    const userId = data.user?.id
    const setupLink = data.properties?.action_link ?? null

    if (authError) {
      const alreadyExists = authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('registered')
      const message = alreadyExists
        ? 'That email already has an account. Update the existing user instead.'
        : 'The setup link could not be created. Check the Supabase Auth configuration and try again.'
      return NextResponse.json({ message }, { status: alreadyExists ? 409 : 502 })
    }

    if (!userId || !setupLink) {
      if (userId) await supabase.auth.admin.deleteUser(userId).catch(() => undefined)
      return NextResponse.json({ message: 'The setup link could not be generated.' }, { status: 502 })
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, email: invite.email, full_name: invite.fullName || null, role: 'admin' }, { onConflict: 'id' })
      .select('id')
      .single()

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId).catch(() => undefined)
      console.error('[admin/users/invite] Profile provisioning failed', profileError)
      return NextResponse.json({ message: 'The admin account could not be provisioned. No setup link was issued.' }, { status: 500 })
    }

    if (productionInvite) {
      const email = buildAdminInviteEmail({ fullName: invite.fullName, setupLink })
      const sent = await sendTransactionalEmail({
        to: invite.email,
        toName: invite.fullName || undefined,
        ...email,
        idempotencyKey: `admin-invite-${userId}`,
      })
      if (!sent.ok) {
        const { error: cleanupError } = await supabase.from('profiles').delete().eq('id', userId)
        const { error: authCleanupError } = await supabase.auth.admin.deleteUser(userId)
        if (cleanupError || authCleanupError) {
          console.error('[admin/users/invite] Cleanup failed after email delivery failure', { cleanupError, authCleanupError })
        }
        console.error('[admin/users/invite] Email delivery failed', sent.reason)
        return NextResponse.json({ message: 'The admin account was not activated because the invitation email could not be sent. Check the email provider configuration and retry.' }, { status: 502 })
      }
    }

    return NextResponse.json({
      message: productionInvite ? 'Admin invitation email sent.' : 'Admin setup link created. No email was sent.',
      emailSent: productionInvite,
      setupLink: productionInvite ? null : setupLink,
      user: { id: userId, email: invite.email, role: 'admin' },
    }, { status: 201 })
  } catch (error) {
    console.error('[admin/users/invite] Setup link generation failed', error)
    return NextResponse.json({ message: 'The setup link could not be created. Check the server and Supabase Auth configuration.' }, { status: 502 })
  }
}
