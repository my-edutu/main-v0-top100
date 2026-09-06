import { Role, parseRole } from './types/roles'
import type { Session, User } from '@supabase/supabase-js'

/**
 * Normalize role value from various possible formats
 * Handles case-insensitivity and common variations
 */
export function normalizeRole(role: any): Role | null {
  if (!role) return null

  // If it's already a Role enum value, return it
  if (Object.values(Role).includes(role)) {
    return role as Role
  }

  // Try to parse string value
  if (typeof role === 'string') {
    return parseRole(role)
  }

  return null
}

/**
 * Extract role from a Supabase session object.
 * Checks the trusted locations where role might be stored:
 * 1. user.app_metadata.role (service-role writable only)
 * 2. user['custom:role'] (custom claim pattern, set by the auth server)
 *
 * SECURITY: `user_metadata` is NOT a role source. Supabase lets any user write
 * their own `user_metadata` with the anon key (`auth.updateUser({ data })`), so
 * trusting it here would let any signed-up user mint themselves an admin role.
 * `user.role` is Postgres' role ("authenticated"), not an app role.
 */
export function extractRoleFromSession(session: Session | null): Role | null {
  if (!session?.user) {
    console.log('[auth-utils] No session or user found')
    return null
  }

  const user = session.user

  const possibleRoles = [
    user.app_metadata?.role,
    (user as any)['custom:role'],
  ]

  console.log('[auth-utils] Checking role from session:', {
    userId: user.id,
    email: user.email,
    possibleRoles,
    appMetadata: user.app_metadata,
  })

  // Return the first valid role found
  for (const roleValue of possibleRoles) {
    const normalized = normalizeRole(roleValue)
    if (normalized) {
      console.log('[auth-utils] Found role:', normalized)
      return normalized
    }
  }

  console.log('[auth-utils] No role found in session, defaulting to null')
  return null
}

/**
 * Extract role from a raw decoded JWT payload.
 * Used when we decode the JWT directly without going through Supabase client.
 *
 * SECURITY: see extractRoleFromSession — `user_metadata` is self-writable by
 * the user and must never be trusted as a role source.
 */
export function extractRoleFromJWTPayload(payload: any): Role | null {
  if (!payload) {
    console.log('[auth-utils] No JWT payload provided')
    return null
  }

  const possibleRoles = [
    payload.app_metadata?.role,
    payload['custom:role'],
  ]

  console.log('[auth-utils] Checking role from JWT payload:', {
    sub: payload.sub,
    email: payload.email,
    possibleRoles,
  })

  for (const roleValue of possibleRoles) {
    const normalized = normalizeRole(roleValue)
    if (normalized) {
      console.log('[auth-utils] Found role in JWT:', normalized)
      return normalized
    }
  }

  console.log('[auth-utils] No role found in JWT payload')
  return null
}

/**
 * Turn a Supabase sign-in error into something safe to show a member.
 *
 * Supabase surfaces infrastructure failures verbatim — a suspended project, for
 * instance, returns "Service for this project is restricted due to the following
 * violations: exceed_cached_egress_quota. The project owner must upgrade their
 * plan...". Rendering that raw tells the visitor nothing they can act on and
 * leaks our billing state, so anything that isn't a genuine credential problem
 * collapses to one neutral message. The original still goes to console.error
 * at the call site for debugging.
 */
export function friendlySignInError(error: {
  code?: string
  message?: string
  name?: string
  status?: number
} | null): string {
  const code = error?.code ?? ''
  const message = error?.message ?? ''

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Invalid email or password.'
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return 'Please confirm your email address before signing in.'
  }
  if (
    code === 'over_request_rate_limit' ||
    /too many requests|rate limit/i.test(message) ||
    error?.status === 429
  ) {
    return 'Too many sign-in attempts. Please wait a minute and try again.'
  }

  return 'Sign-in is temporarily unavailable. Please try again in a few minutes — if it keeps happening, contact the Top100 team.'
}

/**
 * Extract user object from JWT payload for debugging
 */
export function extractUserFromJWTPayload(payload: any): any {
  if (!payload) return null

  return {
    id: payload.sub || payload.user_id || payload.id,
    email: payload.email,
    role: extractRoleFromJWTPayload(payload),
    user_metadata: payload.user_metadata,
    app_metadata: payload.app_metadata,
    rawPayload: payload,
  }
}
