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
 * Checks multiple possible locations where role might be stored:
 * 1. user.role (direct property)
 * 2. user.user_metadata.role (most common for Supabase)
 * 3. user.app_metadata.role (for app-level metadata)
 * 4. user['custom:role'] (custom claim pattern)
 *
 * BUG FIX: This function addresses the "can view but cannot act" bug by
 * centralizing role extraction logic. Previously, different parts of the
 * codebase checked different properties, leading to inconsistencies.
 */
export function extractRoleFromSession(session: Session | null): Role | null {
  if (!session?.user) {
    console.log('[auth-utils] No session or user found')
    return null
  }

  const user = session.user

  // Check all possible locations for role
  const possibleRoles = [
    user.role,
    user.user_metadata?.role,
    user.app_metadata?.role,
    (user as any)['custom:role'],
  ]

  console.log('[auth-utils] Checking role from session:', {
    userId: user.id,
    email: user.email,
    possibleRoles,
    userMetadata: user.user_metadata,
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
 */
export function extractRoleFromJWTPayload(payload: any): Role | null {
  if (!payload) {
    console.log('[auth-utils] No JWT payload provided')
    return null
  }

  const possibleRoles = [
    payload.role,
    payload.user_metadata?.role,
    payload.app_metadata?.role,
    payload['custom:role'],
    // Supabase stores user in 'user_metadata' at top level sometimes
    payload.user_metadata?.role,
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
