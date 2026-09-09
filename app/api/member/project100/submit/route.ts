import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { getServerSession } from '@/lib/auth-server'
import { submitMemberProject100 } from '@/lib/project100/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getServerSession(request)
  const memberId = session?.user.id
  if (!memberId || !session?.token) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  try {
    return NextResponse.json(await submitMemberProject100(memberId, session.token))
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? 'Invalid Project100 application.' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Could not submit your Project100 application.'
    if (/complete every/i.test(message)) return NextResponse.json({ message }, { status: 400 })
    if (/closed|already been submitted/i.test(message)) return NextResponse.json({ message }, { status: 409 })
    return NextResponse.json({ message: 'Could not submit your Project100 application.' }, { status: 503 })
  }
}
