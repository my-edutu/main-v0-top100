import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ApiError, jsonError } from '@/lib/api'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  code: z.string().trim().min(20).max(40).transform((value) => value.replace(/-/g, '').toUpperCase()),
})

export async function POST(request: Request) {
  let createdUserId: string | null = null
  try {
    const payload = signupSchema.parse(await request.json().catch(() => null))
    if (!env.supabaseUrl || !env.supabaseAnonKey || !env.serviceRoleKey) {
      throw new ApiError('Account registration is temporarily unavailable.', 503)
    }

    const codeHash = createHash('sha256').update(payload.code).digest('hex')
    const admin = createAdminClient()
    const { data: validCode, error: validateError } = await admin.rpc('team_validate_signup_code', { p_code_hash: codeHash })
    if (validateError) {
      console.error('[team-signup] Could not check code', validateError.message)
      throw new ApiError('Account registration is not ready yet. The team access migration must be applied.', 503)
    }
    if (!validCode) throw new ApiError('That code is invalid, expired, or already used.', 400)

    const publicClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const origin = process.env.NEXT_PUBLIC_TEAM_PLATFORM_URL ||
      (process.env.NODE_ENV === 'development' ? new URL(request.url).origin : 'https://teams.top100afl.com')
    const emailRedirectTo = new URL('/auth/callback?next=%2Fdashboard', origin).toString()
    const { data, error } = await publicClient.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { emailRedirectTo, data: { full_name: payload.fullName } },
    })
    if (error) {
      if (/already.*(registered|exists)|user already/i.test(error.message)) {
        throw new ApiError('An account already exists for this email. Sign in or reset its password.', 409)
      }
      throw new ApiError(error.message, 400)
    }
    if (!data.user || !data.user.identities?.length) {
      throw new ApiError('An account already exists for this email. Sign in or reset its password.', 409)
    }
    createdUserId = data.user.id

    const { error: redeemError } = await admin.rpc('team_redeem_signup_code', {
      p_code_hash: codeHash,
      p_user_id: data.user.id,
      p_email: payload.email,
      p_full_name: payload.fullName,
    })
    if (redeemError) {
      console.error('[team-signup] Could not redeem code', redeemError.message)
      await admin.auth.admin.deleteUser(data.user.id)
      createdUserId = null
      throw new ApiError(/already|duplicate/i.test(redeemError.message)
        ? 'This email already has a team membership.'
        : 'That code was just used or expired. Ask an administrator for another code.', 409)
    }
    createdUserId = null

    return NextResponse.json({
      needsEmailConfirmation: !data.session,
      message: data.session
        ? 'Account created. An administrator must approve your team access before you can open the workspace.'
        : 'Account created. Check your email to confirm it, then wait for an administrator to approve your team access.',
    }, { status: 201 })
  } catch (error) {
    if (createdUserId) {
      try { await createAdminClient().auth.admin.deleteUser(createdUserId) } catch { /* best-effort rollback */ }
    }
    return jsonError(error)
  }
}
