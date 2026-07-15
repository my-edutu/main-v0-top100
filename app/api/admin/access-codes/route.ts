// app/api/admin/access-codes/route.ts
// Admin-only management of signup access codes.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { generateCode, listCodes } from '@/lib/access-codes'

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

  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'Awardee invite'
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
  const usesLeft = Number.isFinite(Number(body.usesLeft)) ? Math.max(1, Number(body.usesLeft)) : 1
  const expiresInDays = Number.isFinite(Number(body.expiresInDays)) ? Math.max(1, Number(body.expiresInDays)) : 90

  try {
    const code = await generateCode({
      label,
      email,
      usesLeft,
      expiresInDays,
      createdBy: adminCheck.user?.id ?? null,
    })
    return NextResponse.json({ code }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { message: 'Could not generate an access code.', details: error instanceof Error ? error.message : undefined },
      { status: 500 },
    )
  }
}
