import { randomInt, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { isTrustedRequestOrigin } from '@/lib/security/same-origin'
import { getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit'
import { sendTransactionalEmail } from '@/lib/email/send'
import { contactCodeDigest, contactCodeMessage, maskContactEmail } from '@/lib/team-operations/contact-code.server'

export const runtime = 'nodejs'
export const maxDuration = 60
type Context = { params: Promise<{ token: string }> }
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request_code') }).strict(),
  z.object({ action: z.enum(['confirm', 'decline']), challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).strict(),
])
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
const unavailable = () => json({ message: 'Contact confirmation is temporarily unavailable. Please try again later.' }, 503)

function denied(reason: unknown) {
  if (reason === 'invalid_code') return json({ message: 'That code is incorrect. Check the most recent email and try again.' }, 400)
  if (['expired_code', 'challenge_expired', 'challenge_invalid', 'invalid_challenge', 'stale_challenge', 'challenge_invalidated', 'challenge_already_used'].includes(String(reason))) return json({ message: 'That code is no longer usable. Request a new code.' }, 410)
  if (['rate_limited', 'resend_limited', 'resend_cooldown', 'challenge_send_limit', 'challenge_locked', 'too_many_attempts', 'too_many_sends'].includes(String(reason))) return json({ message: 'Please wait before trying again or requesting another code.' }, 429)
  if (['already_paid', 'payment_already_made', 'assignment_inactive', 'already_decided', 'decision_already_recorded', 'contact_attempt_unavailable'].includes(String(reason))) return json({ message: 'This contact can no longer be confirmed. Your award remains available.' }, 409)
  return json({ message: 'This confirmation link is unavailable for your account.' }, 404)
}

type RpcData = { ok?: boolean; reason?: string; [key: string]: unknown }
function safeContext(data: RpcData) {
  return {
    status: data.status === 'initiated' ? 'pending' : data.status, repName: data.rep_name, channel: data.channel, initiatedAt: data.initiated_at,
    emailHint: typeof data.email === 'string' ? maskContactEmail(data.email) : 'your recorded email address',
    challengeId: data.challenge_id ?? null, expiresAt: data.expires_at ?? null,
  }
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(request)
    if (!session?.user.id) return json({ message: 'Sign in to your awardee account to confirm this contact.' }, 401)
    const { token } = await context.params
    if (!z.string().uuid().safeParse(token).success) return denied('not_found')
    const { data, error } = await createAdminClient().rpc('team_contact_confirmation_context', { p_token: token, p_user_id: session.user.id })
    if (error?.code === '42501') return denied('not_found')
    if (error || !data) return unavailable()
    if (data.ok !== true) return denied(data.reason)
    return json(safeContext(data))
  } catch { return unavailable() }
}

export async function POST(request: NextRequest, context: Context) {
  if (!isTrustedRequestOrigin(request)) return json({ message: 'Cross-origin request blocked.' }, 403)
  try {
    const session = await getServerSession(request)
    if (!session?.user.id) return json({ message: 'Sign in to your awardee account to confirm this contact.' }, 401)
    const { token } = await context.params
    if (!z.string().uuid().safeParse(token).success) return denied('not_found')
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return json({ message: 'Choose an action and enter the six-digit code when confirming a response.' }, 400)
    const limited = await rateLimitResponse([
      { maxRequests: parsed.data.action === 'request_code' ? 6 : 30, windowSeconds: parsed.data.action === 'request_code' ? 3600 : 60, identifier: `contact-confirmation:user:${session.user.id}:${parsed.data.action}` },
      { maxRequests: 100, windowSeconds: 3600, identifier: `contact-confirmation:ip:${getClientIdentifier(request.headers)}` },
    ], 'Please wait before trying again.')
    if (limited) return limited
    const db = createAdminClient()
    const args = { p_token: token, p_user_id: session.user.id }
    const owner = await db.rpc('team_contact_confirmation_context', args)
    if (owner.error?.code === '42501') return denied('not_found')
    if (owner.error || !owner.data) return unavailable()
    if (owner.data.ok !== true) return denied(owner.data.reason)
    if (parsed.data.action !== 'request_code') {
      const result = await db.rpc('team_confirm_contact_attempt', {
        ...args, p_challenge_id: parsed.data.challengeId,
        p_code_hash: contactCodeDigest(token, session.user.id, parsed.data.challengeId, parsed.data.code),
        p_confirmed: parsed.data.action === 'confirm',
      })
      if (result.error?.code === '42501') return denied('contact_attempt_unavailable')
      if (result.error || !result.data) return unavailable()
      if (result.data.ok !== true) return denied(result.data.remaining === 0 ? 'challenge_locked' : result.data.reason)
      return json({ status: result.data.status })
    }
    if (owner.data.status !== 'initiated') return denied('already_decided')
    const challengeId = randomUUID()
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const prepared = await db.rpc('team_prepare_contact_challenge', {
      ...args, p_challenge_id: challengeId, p_code_hash: contactCodeDigest(token, session.user.id, challengeId, code),
    })
    if (prepared.error?.code === '42501') return denied('not_found')
    if (prepared.error || !prepared.data) return unavailable()
    if (prepared.data.ok !== true) return denied(prepared.data.reason)
    const invalidate = async () => {
      try {
        const result = await db.rpc('team_invalidate_contact_challenge', { ...args, p_challenge_id: challengeId })
        return !result.error && result.data?.ok === true
      } catch { return false }
    }
    const email = z.string().email().safeParse(prepared.data.email)
    if (!email.success || prepared.data.challenge_id !== challengeId) {
      if (!await invalidate()) return unavailable()
      return unavailable()
    }
    let sent = false
    try {
      const result = await sendTransactionalEmail({
        to: email.data,
        ...contactCodeMessage(code, String(owner.data.rep_name ?? 'your Top100 rep'), String(owner.data.channel)),
        idempotencyKey: `contact-confirmation/${challengeId}`, requireBrevoSmtp: true,
      })
      sent = result.ok
    } catch { /* Unknown delivery outcome must never activate the challenge. */ }
    if (!sent) {
      if (!await invalidate()) return unavailable()
      return json({ message: 'The code could not be sent. Wait a minute before requesting a new one.' }, 503)
    }
    const activated = await db.rpc('team_activate_contact_challenge', { ...args, p_challenge_id: challengeId })
    if (activated.error || activated.data?.ok !== true) {
      if (!await invalidate()) return unavailable()
      return !activated.error && activated.data?.reason ? denied(activated.data.reason) : unavailable()
    }
    return json({ status: 'pending', challengeId, expiresAt: prepared.data.expires_at, emailHint: maskContactEmail(email.data), resendAfter: 60 })
  } catch { return unavailable() }
}
