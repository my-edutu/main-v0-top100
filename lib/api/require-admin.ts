import { NextResponse } from 'next/server'

type RequireAdminFailure = {
  error: NextResponse
}

export type RequireAdminResult = RequireAdminFailure

const authDisabled = () => NextResponse.json({ error: 'Authentication disabled' }, { status: 503 })

export const requireAdmin = async (_request?: Request): Promise<RequireAdminResult> => ({
  error: authDisabled(),
})

export const assertAdminOrThrow = async (_request?: Request): Promise<never> => {
  throw authDisabled()
}
