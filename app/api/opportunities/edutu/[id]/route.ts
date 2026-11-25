import type { NextRequest } from 'next/server'

import { fetchEdutuOpportunity } from '@/lib/opportunities/edutu'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const opportunity = await fetchEdutuOpportunity(id)
    if (!opportunity) return Response.json({ message: 'Opportunity not found.' }, { status: 404 })
    return Response.json({ opportunity })
  } catch {
    return Response.json({ message: 'Edutu listings are temporarily unavailable.' }, { status: 502 })
  }
}
