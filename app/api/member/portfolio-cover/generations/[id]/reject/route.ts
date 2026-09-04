import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createPortfolioCoverRepository } from '@/lib/portfolio-cover/repository'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const { id } = await params
  const repo = createPortfolioCoverRepository()
  const current = await repo.getOwned(id, user.id)
  if (!current || !['ready', 'selected'].includes(current.status)) return NextResponse.json({ message: 'This cover set cannot be rejected.' }, { status: 409 })
  const generation = await repo.update(id, { status: 'rejected' })
  return NextResponse.json({ generation })
}
