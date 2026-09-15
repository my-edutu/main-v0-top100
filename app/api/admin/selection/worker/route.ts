import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { runSelectionWorker } from '@/lib/selection/worker'

export const runtime = 'nodejs'
export const maxDuration = 300

const requestSchema = z.object({
  limit: z.number().int().min(1).max(10).optional().default(3),
})

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let limit = 3
  try {
    const body = await request.json().catch(() => ({}))
    limit = requestSchema.parse(body).limit
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Worker limit must be between 1 and 10',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    )
  }

  try {
    const result = await runSelectionWorker({ limit })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Selection worker failed' },
      { status: 500 },
    )
  }
}
