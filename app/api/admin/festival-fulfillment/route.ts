import type { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { loadFestivalFulfillment } from '@/lib/festival/fulfillment-server'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    return Response.json(await loadFestivalFulfillment(), { headers })
  } catch (error) {
    console.error('[festival fulfillment] Read failed', error instanceof Error ? error.message : 'Unknown error')
    return Response.json({ message: 'The fulfillment roster could not be verified. Refresh to try again.' }, { status: 503, headers })
  }
}
