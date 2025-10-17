import { cache } from 'react'
import { headers } from 'next/headers'

import type { BetterAuthSession } from '@/lib/better-auth/server'
import { betterAuthServer } from '@/lib/better-auth/server'

type SessionPayload = BetterAuthSession['session']
type UserPayload = BetterAuthSession['user'] & { role?: string | null }

const DEFAULT_ROLE = 'user'

const extractRole = (user: Partial<UserPayload>) =>
  (user?.role ?? (user as Record<string, unknown>)?.role ?? DEFAULT_ROLE) as string

async function resolveSessionFromHeaders(requestHeaders: Headers) {
  const result = await betterAuthServer.api.getSession({
    headers: requestHeaders,
  })

  if (!result) {
    return null
  }

  return result
}

export const getCurrentUser = cache(async () => {
  try {
    const headerList = headers()
    const session = await resolveSessionFromHeaders(headerList)

    if (!session) {
      return null
    }

    const role = extractRole(session.user)

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role,
      session: session.session,
    }
  } catch (error) {
    console.error('[auth-server] getCurrentUser failed', error)
    return null
  }
})

export async function validateRequest(request: Request) {
  try {
    const session = await resolveSessionFromHeaders(request.headers)

    if (!session) {
      return null
    }

    const role = extractRole(session.user)

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role,
      },
      session: {
        ...session.session,
        role,
      } as SessionPayload & { role: string },
    }
  } catch (error) {
    console.error('[auth-server] validateRequest failed', error)
    return null
  }
}
