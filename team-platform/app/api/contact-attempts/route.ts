import { NextResponse } from 'next/server'
import { ApiError, apiMember, jsonError } from '@/lib/api'
import { contactAttemptSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const DEFAULT_MAIN_ORIGIN = 'https://www.top100afl.com'
const TRUSTED_TEAM_HOST = 'teams.top100afl.com'
const TRUSTED_MAIN_HOSTS = new Set(['top100afl.com', 'www.top100afl.com'])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

type ContactAttemptRow = {
  id?: unknown
  token?: unknown
  channel?: unknown
  phone?: unknown
  rep_name?: unknown
  status?: unknown
  initiated_at?: unknown
}

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname.toLowerCase())
}

function isTrustedTeamOrigin(value: string, request: Request) {
  try {
    const origin = new URL(value)
    const requestUrl = new URL(request.url)
    const hostname = origin.hostname.toLowerCase()

    if (origin.origin === `https://${TRUSTED_TEAM_HOST}`) return true

    // Local development uses the current app origin. Keep this development
    // exception out of production so an arbitrary Host header cannot become a
    // CSRF allowlist entry on the deployed team app.
    if (
      process.env.NODE_ENV !== 'production' &&
      origin.protocol === requestUrl.protocol &&
      origin.origin === requestUrl.origin &&
      isLocalHost(hostname) &&
      isLocalHost(requestUrl.hostname)
    ) {
      return true
    }
  } catch {
    return false
  }
  return false
}

/**
 * The team app is cookie-authenticated. A contact attempt must therefore be
 * same-origin even though its result launches an external phone/WhatsApp
 * handler. The production proxy may use `/internalproxy`; Origin and Referer
 * still resolve to the trusted teams.top100afl.com origin.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && isTrustedTeamOrigin(origin, request)) return
  if (origin) throw new ApiError('Origin check failed', 403)

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      if (isTrustedTeamOrigin(new URL(referer).origin, request)) return
    } catch {
      // Fall through to a deliberate CSRF failure.
    }
  }

  // Some same-origin browser requests omit Origin. Only accept that case when
  // the request's effective host is itself the known team host (or local dev),
  // never merely because a caller supplied an arbitrary Host header.
  if (!origin && !referer) {
    try {
      const requestUrl = new URL(request.url)
      if (
        requestUrl.origin === `https://${TRUSTED_TEAM_HOST}`
      ) {
        return
      }
      if (process.env.NODE_ENV !== 'production' && isLocalHost(requestUrl.hostname)) {
        return
      }
    } catch {
      // Fall through to the CSRF failure below.
    }
  }

  throw new ApiError('Origin check failed', 403)
}

function mainOrigin() {
  const configured = process.env.TOP100_SITE_URL?.trim()
  if (!configured) return DEFAULT_MAIN_ORIGIN

  try {
    const url = new URL(configured)
    const hostname = url.hostname.toLowerCase()
    const local = process.env.NODE_ENV !== 'production' && isLocalHost(hostname)
    const secureMain = url.protocol === 'https:' && TRUSTED_MAIN_HOSTS.has(hostname)
    const localMain = local && (url.protocol === 'http:' || url.protocol === 'https:')
    if (secureMain || localMain) return url.origin
  } catch {
    // A malformed or team-site URL must never become a token destination.
  }

  return DEFAULT_MAIN_ORIGIN
}

function normalizeServerPhone(input: unknown) {
  if (typeof input !== 'string') throw new ApiError('This awardee has no usable phone number', 422)

  const raw = input.trim()
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    throw new ApiError('This awardee has no usable phone number', 422)
  }

  // The worklist is primarily Nigerian, but RPC data may already contain an
  // international E.164 number. Never accept a client-provided destination;
  // this value came from the service-only RPC response.
  let e164Digits = digits
  if (digits.length === 11 && digits.startsWith('0')) {
    e164Digits = `234${digits.slice(1)}`
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    e164Digits = `234${digits}`
  }

  if (e164Digits.length < 8 || e164Digits.length > 15 || e164Digits.startsWith('0')) {
    throw new ApiError('This awardee has no usable phone number', 422)
  }

  return {
    phone: `+${e164Digits}`,
    digits: e164Digits,
  }
}

function unwrapRpcRow(data: unknown): ContactAttemptRow | null {
  if (Array.isArray(data)) return (data[0] as ContactAttemptRow | undefined) ?? null
  if (data && typeof data === 'object') return data as ContactAttemptRow
  return null
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(`Contact attempt response is missing ${label}`, 502)
  }
  return value
}

function rpcError(error: { code?: string; message?: string } | null) {
  if (!error) return null
  const description = `${error.code ?? ''} ${error.message ?? ''}`
  if (/not assigned|active assignment|not authorized|permission|forbidden|membership/i.test(description)) {
    return new ApiError('This awardee is not assigned to you', 403)
  }
  if (/not available|unpaid|payment/i.test(description)) {
    return new ApiError('This awardee is not available for a new contact attempt', 422)
  }
  if (/phone|contact number|no usable/i.test(description)) {
    return new ApiError('This awardee has no usable phone number', 422)
  }
  return new ApiError('Could not start contact attempt', 500)
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const member = await apiMember()
    if (member.membership.role !== 'agent') {
      throw new ApiError('Only the assigned rep can start a contact attempt', 403)
    }

    const payload = contactAttemptSchema.parse(await request.json())
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('team_begin_contact_attempt', {
      p_team_id: member.membership.team_id,
      p_actor: member.user.id,
      p_awardee_id: payload.awardeeId,
      p_channel: payload.channel,
      p_request_id: payload.requestId,
    })

    const mappedError = rpcError(error)
    if (mappedError) throw mappedError

    const row = unwrapRpcRow(data)
    if (!row) throw new ApiError('Could not start contact attempt', 502)

    const id = requiredString(row.id, 'id')
    const token = requiredString(row.token, 'token')
    const channel = payload.channel
    const repName = requiredString(row.rep_name, 'rep name')
    const status = requiredString(row.status, 'status')
    const initiatedAt = requiredString(row.initiated_at, 'start time')
    const { phone, digits } = normalizeServerPhone(row.phone)
    const confirmationUrl = `${mainOrigin()}/contact-confirmation/${encodeURIComponent(token)}`
    const destination =
      channel === 'call' ? `tel:${phone}` : `https://wa.me/${digits}`

    return NextResponse.json(
      {
        attempt: {
          id,
          token,
          channel,
          phone,
          rep_name: repName,
          status,
          initiated_at: initiatedAt,
        },
        confirmationUrl,
        destination,
      },
      { status: 201 },
    )
  } catch (error) {
    return jsonError(error)
  }
}
