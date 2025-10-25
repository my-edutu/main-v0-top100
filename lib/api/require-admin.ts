import { NextResponse } from 'next/server'

import { betterAuthServer, isBetterAuthEnabled } from '@/lib/better-auth/server'
import type { BetterAuthSession } from '@/lib/better-auth/server'

const DEFAULT_ROLE = 'user'

type RequireAdminSuccess = {
  session: BetterAuthSession
}

type RequireAdminFailure = {
  error: NextResponse
}

export type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure

const isFailure = (result: RequireAdminResult): result is RequireAdminFailure =>
  Object.prototype.hasOwnProperty.call(result, 'error')

export const requireAdmin = async (request: Request): Promise<RequireAdminResult> => {
  if (!isBetterAuthEnabled || !betterAuthServer) {
    return {
      error: NextResponse.json({ error: 'Authentication disabled' }, { status: 503 }),
    }
  }
  try {
    const headers = new Headers(request.headers)
    const session = await betterAuthServer.api.getSession({ headers })

    if (!session) {
      return {
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }
    }

    const role = (session.user as Record<string, unknown>)?.role ?? DEFAULT_ROLE
    if (role !== 'admin') {
      return {
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      }
    }

    return { session }
  } catch (error) {
    console.error('[requireAdmin] session resolution failed', error)
    return {
      error: NextResponse.json({ error: 'Unable to verify session' }, { status: 500 }),
    }
  }
}

export const assertAdminOrThrow = async (request: Request): Promise<BetterAuthSession> => {
  const result = await requireAdmin(request)
  if (isFailure(result)) {
    throw result.error
  }
  return result.session
}
