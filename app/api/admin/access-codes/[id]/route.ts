// app/api/admin/access-codes/[id]/route.ts
// Admin-only: revoke a single access code.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { revokeCode } from '@/lib/access-codes'

export const runtime = 'nodejs'

// PATCH — revoke the code (only supported action for now)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { id } = await params
  if (!id) return NextResponse.json({ message: 'Code id is required.' }, { status: 400 })

  let action = 'revoke'
  try {
    const body = await request.json()
    if (typeof body?.action === 'string') action = body.action
  } catch {
    // default to revoke
  }

  if (action !== 'revoke') {
    return NextResponse.json({ message: `Unsupported action: ${action}` }, { status: 400 })
  }

  try {
    const code = await revokeCode(id)
    if (!code) return NextResponse.json({ message: 'Access code not found.' }, { status: 404 })
    return NextResponse.json({ code })
  } catch (error) {
    return NextResponse.json(
      { message: 'Could not revoke the access code.', details: error instanceof Error ? error.message : undefined },
      { status: 500 },
    )
  }
}
