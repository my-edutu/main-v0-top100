import type { NextRequest } from 'next/server'
import { fetchEdutuCatalog } from '@/lib/opportunities/edutu'
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/types'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const query = params.get('q')?.trim() ?? ''
  const type = params.get('type') ?? ''
  const cursor = params.get('cursor') ?? ''
  if (query.length > 200 || cursor.length > 512 || (type && !(OPPORTUNITY_TYPES as readonly string[]).includes(type))) {
    return Response.json({ message: 'Invalid opportunity filters.' }, { status: 400 })
  }

  try {
    return Response.json(await fetchEdutuCatalog({ query, type, cursor }))
  } catch {
    return Response.json({ message: 'Edutu listings are temporarily unavailable.' }, { status: 502 })
  }
}
