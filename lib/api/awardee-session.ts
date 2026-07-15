/**
 * Awardee self-service sessions.
 *
 * Awardees edit their own profile without a Supabase account: they prove who
 * they are by entering the email on their awardee record (see
 * /api/awardees/verify-email). That check has to leave behind something the
 * server can re-verify on later requests — otherwise the only evidence of
 * verification is client state, and every self-service endpoint is wide open to
 * anyone who knows an awardee id.
 *
 * So verify-email issues a short-lived HMAC-signed token, scoped to exactly one
 * awardee id, delivered as an httpOnly cookie. Endpoints take the awardee id
 * *from the token* — never from the request body — so a verified awardee can
 * only ever act on their own profile.
 *
 * This is deliberately not a Supabase session: awardees have no account. It
 * grants nothing except "may edit awardee <id>'s self-service fields".
 */

import { createHmac, timingSafeEqual } from "crypto"
import type { NextRequest, NextResponse } from "next/server"

export const AWARDEE_SESSION_COOKIE = "awardee_session"

/** Long enough to finish editing a profile, short enough to limit a stolen token. */
const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * These routes already require SUPABASE_SERVICE_ROLE_KEY (they use the admin
 * client), so deriving from it means no new env var to configure and no chance
 * of a deploy silently running with an unset secret. A dedicated
 * AWARDEE_SESSION_SECRET takes precedence if you'd rather rotate it separately.
 */
function getSecret(): string {
  const dedicated = process.env.AWARDEE_SESSION_SECRET
  if (dedicated && dedicated.length > 0) return dedicated

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey && serviceKey.length > 0) return `awardee-session:${serviceKey}`

  throw new Error(
    "Cannot sign awardee sessions: set AWARDEE_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY.",
  )
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url")
}

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** `<awardeeId>.<expiresAt>.<signature>` */
export function issueAwardeeToken(awardeeId: string, now = Date.now()): string {
  const expiresAt = now + TOKEN_TTL_MS
  const payload = `${awardeeId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

/** Returns the awardee id the token authorises, or null if it isn't valid. */
export function verifyAwardeeToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null

  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [awardeeId, expiresAtRaw, signature] = parts
  if (!awardeeId || !expiresAtRaw || !signature) return null

  // Check the signature before trusting any part of the payload.
  if (!safeEquals(signature, sign(`${awardeeId}.${expiresAtRaw}`))) return null

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null

  return awardeeId
}

export function setAwardeeSessionCookie(response: NextResponse, awardeeId: string): void {
  response.cookies.set(AWARDEE_SESSION_COOKIE, issueAwardeeToken(awardeeId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // The self-service flow is all same-origin; lax keeps it out of cross-site requests.
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_MS / 1000,
  })
}

export function clearAwardeeSessionCookie(response: NextResponse): void {
  response.cookies.set(AWARDEE_SESSION_COOKIE, "", { path: "/", maxAge: 0 })
}

/**
 * The guard for self-service endpoints. Returns the awardee id this request may
 * act on, or null when there is no valid session.
 *
 * Callers must use the returned id rather than any id supplied by the client.
 */
export function getAwardeeSession(request: NextRequest): string | null {
  return verifyAwardeeToken(request.cookies.get(AWARDEE_SESSION_COOKIE)?.value)
}
