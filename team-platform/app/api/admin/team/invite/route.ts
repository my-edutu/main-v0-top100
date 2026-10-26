import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiError, apiAdmin, audit, jsonError } from '@/lib/api'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient()
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new ApiError('Could not inspect existing accounts', 500)
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 200) return null
  }
  return null
}

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = inviteSchema.parse(await request.json())
    const email = payload.email.trim().toLowerCase()
    const admin = createAdminClient()

    const { data: existing, error: existingError } = await admin
      .from('team_memberships')
      .select('id, status, team_id')
      .eq('team_id', member.membership.team_id)
      .ilike('email', email)
      .maybeSingle()
    if (existingError) throw new ApiError('Could not check existing members', 500)
    if (existing) throw new ApiError('This email is already on the team', 409)

    const origin = new URL(request.url).origin || env.appUrl
    const redirectTo = `${origin}/auth/callback?next=/set-password`

    let userId: string | null = null
    let delivery: 'invite' | 'recovery' = 'invite'

    const invite = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: payload.fullName, invited_to: 'Top100 AFL team platform' },
    })

    if (invite.error) {
      if (/already.*(registered|exists)|user already/i.test(invite.error.message)) {
        const user = await findAuthUserByEmail(email)
        if (!user) {
          throw new ApiError(
            `An account already exists for ${email}, but it could not be located. Ask them to reset their password from the sign-in page.`,
            409,
          )
        }
        userId = user.id
        delivery = 'recovery'
        const publicClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { error: resetError } = await publicClient.auth.resetPasswordForEmail(email, {
          redirectTo,
        })
        if (resetError) {
          throw new ApiError(
            `The account exists, but the access email could not be sent: ${resetError.message}`,
            502,
          )
        }
      } else {
        throw new ApiError(
          `The invitation email could not be sent: ${invite.error.message}. Check the Supabase Auth SMTP settings.`,
          502,
        )
      }
    } else {
      userId = invite.data.user.id
    }

    const { data: membership, error: insertError } = await admin
      .from('team_memberships')
      .insert({
        team_id: member.membership.team_id,
        user_id: userId,
        email,
        full_name: payload.fullName,
        role: payload.role,
        status: 'invited',
        phone: payload.phone || null,
        invited_by: member.user.id,
        invited_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (insertError) {
      if (delivery === 'invite' && userId) {
        await admin.auth.admin.deleteUser(userId).catch(() => undefined)
      }
      if (insertError.code === '23505') throw new ApiError('This email is already invited', 409)
      throw new ApiError(`Could not save the team invitation: ${insertError.message}`, 500)
    }

    await audit(member, 'team.invited', 'membership', membership.id, {
      email,
      role: payload.role,
      delivery,
    })

    return NextResponse.json(
      {
        member: membership,
        delivery,
        message:
          delivery === 'invite'
            ? `Invitation email sent to ${email}.`
            : `${email} already had an account; a secure sign-in link was emailed.`,
      },
      { status: 201 },
    )
  } catch (error) {
    return jsonError(error)
  }
}
