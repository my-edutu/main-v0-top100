import type { NextRequest } from 'next/server'

import { handleDemoMemberRequest } from '@/lib/dev-dashboard/handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params
  return handleDemoMemberRequest(request, path)
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
