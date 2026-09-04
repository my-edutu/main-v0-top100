import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { portfolioCoverConfig } from '@/lib/portfolio-cover/config'
import { createPortfolioCoverRepository } from '@/lib/portfolio-cover/repository'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const config = portfolioCoverConfig()
  const generation = config.enabled ? await createPortfolioCoverRepository().getCurrent(user.id) : null
  return NextResponse.json({ enabled: config.enabled, generation })
}
