import { NextRequest, NextResponse } from 'next/server'

import { runSelectionWorker } from '@/lib/selection/worker'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 503 })
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSelectionWorker({ limit: 5 })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Selection worker failed' },
      { status: 500 },
    )
  }
}
