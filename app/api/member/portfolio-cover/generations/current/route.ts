import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { portfolioCoverConfig } from '@/lib/portfolio-cover/config'
import { createPortfolioCoverRepository } from '@/lib/portfolio-cover/repository'
import { hasConfirmedAwardPayment } from '@/lib/awards/access-server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  try {
    if (!(await hasConfirmedAwardPayment(user.id))) return NextResponse.json({ message: 'Complete your award payment to unlock your portfolio cover.' }, { status: 402 })
  } catch {
    return NextResponse.json({ message: 'Could not verify award access. Please try again shortly.' }, { status: 503 })
  }
  const config = portfolioCoverConfig()
  if (!config.enabled) return NextResponse.json({ enabled: false, generation: null, usage: { used: 0, limit: 2 } })
  const repo = createPortfolioCoverRepository()
  const generation = await repo.getCurrent(user.id)
  const used = await repo.countGenerations(user.id)
  return NextResponse.json({ enabled: true, generation, usage: { used, limit: 2 } })
}
