import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { getServerSession } from '@/lib/auth-server'
import { normalizeProject100Draft } from '@/lib/project100/validation'
import { loadMemberProject100, saveMemberProject100Draft } from '@/lib/project100/server'

export const runtime = 'nodejs'

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ message: error.issues[0]?.message ?? 'Invalid Project100 application.' }, { status: 400 })
  }
  const message = error instanceof Error ? error.message : 'Could not process your Project100 application.'
  if (/closed|already been submitted/i.test(message)) return NextResponse.json({ message }, { status: 409 })
  return NextResponse.json({ message: 'Could not process your Project100 application.' }, { status: 503 })
}

export async function GET(request: Request) {
  const session = await getServerSession(request)
  if (!session?.user.id || !session.token) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  try {
    return NextResponse.json(await loadMemberProject100(session.user.id, session.token))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(request)
  if (!session?.user.id || !session.token) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ message: 'Invalid Project100 draft.' }, { status: 400 })
  }
  try {
    const draft = normalizeProject100Draft(body)
    return NextResponse.json(await saveMemberProject100Draft(session.user.id, draft, session.token))
  } catch (error) {
    return errorResponse(error)
  }
}
