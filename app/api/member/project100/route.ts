import { NextResponse } from 'next/server'

import { getServerSession } from '@/lib/auth-server'
import { normalizeProject100Draft } from '@/lib/project100/validation'
import { loadMemberProject100, saveMemberProject100Draft } from '@/lib/project100/server'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Could not process your Project100 application.'
  if (/closed|already been submitted/i.test(message)) return NextResponse.json({ message }, { status: 409 })
  return NextResponse.json({ message: 'Could not process your Project100 application.' }, { status: 503 })
}

async function memberId(request: Request) {
  const session = await getServerSession(request)
  return session?.user.id ?? null
}

export async function GET(request: Request) {
  const id = await memberId(request)
  if (!id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  try {
    return NextResponse.json(await loadMemberProject100(id, request))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  const id = await memberId(request)
  if (!id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ message: 'Invalid Project100 draft.' }, { status: 400 })
  }
  try {
    const draft = normalizeProject100Draft(body)
    return NextResponse.json(await saveMemberProject100Draft(id, draft, request))
  } catch (error) {
    if (error instanceof Error && /required|international phone|unrecognized key|expected/i.test(error.message)) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    return errorResponse(error)
  }
}
