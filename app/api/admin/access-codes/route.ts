// app/api/admin/access-codes/route.ts
// Admin-only management of signup access codes.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { generateCode, listCodes, parseAccessCodeRequest } from '@/lib/access-codes'

export const runtime = 'nodejs'

// GET — list all access codes (newest first)
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  try {
    const codes = await listCodes()
    return NextResponse.json({ codes })
  } catch (error) {
    return NextResponse.json(
      { message: 'Could not load access codes.', details: error instanceof Error ? error.message : undefined },
      { status: 500 },
    )
  }
}

// POST — generate a new access code
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine — use defaults
  }

  try {
    const options = parseAccessCodeRequest(body)
    const code = await generateCode({
      ...options,
      createdBy: adminCheck.user?.id ?? null,
    })
    return NextResponse.json({ code }, { status: 201 })
  } catch (error) {
    const details = error instanceof Error ? error.message : undefined
    const isValidationError = Boolean(details && /required|choose/i.test(details))
    return NextResponse.json(
      {
        message: isValidationError ? details : 'Could not generate an access code.',
        details: isValidationError ? undefined : details,
      },
      { status: isValidationError ? 400 : 500 },
    )
  }
}
