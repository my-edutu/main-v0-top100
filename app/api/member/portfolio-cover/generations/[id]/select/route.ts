import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createPortfolioCoverRepository } from '@/lib/portfolio-cover/repository'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => null) as { variant?: unknown } | null
  const parsed = z.object({ variant: z.enum(['executive-charcoal', 'leadership-ivory']) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: 'Choose one of the two available covers.' }, { status: 400 })
  const { id } = await params
  try {
    const generation = await createPortfolioCoverRepository().select(id, user.id, parsed.data.variant)
    return NextResponse.json({ generation })
  } catch {
    return NextResponse.json({ message: 'That cover is no longer available.' }, { status: 409 })
  }
}
