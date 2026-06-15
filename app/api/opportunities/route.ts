import { NextRequest } from 'next/server'

import type { HubOpportunity } from '@/lib/member-hub-local'

export const runtime = 'nodejs'

const fallbackOpportunities: HubOpportunity[] = [
  {
    id: 'edutu-fallback-1',
    title: 'Youth Climate Fellowship',
    type: 'Fellowship',
    location: 'Hybrid',
    deadline: 'Jul 30',
  },
  {
    id: 'edutu-fallback-2',
    title: 'Founder Mentorship Sprint',
    type: 'Mentorship',
    location: 'Remote',
    deadline: 'Aug 12',
  },
]

type RawOpportunity = {
  id?: unknown
  title?: unknown
  name?: unknown
  type?: unknown
  category?: unknown
  location?: unknown
  deadline?: unknown
  closesAt?: unknown
  closing_date?: unknown
}

function asText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeOpportunity(item: RawOpportunity, index: number): HubOpportunity {
  return {
    id: asText(item.id, `edutu-${index + 1}`),
    title: asText(item.title, asText(item.name, 'Scholarship opportunity')),
    type: asText(item.type, asText(item.category, 'Scholarship')),
    location: asText(item.location, 'Online'),
    deadline: asText(item.deadline, asText(item.closesAt, asText(item.closing_date, 'Rolling'))),
  }
}

function pickOpportunityArray(payload: unknown): RawOpportunity[] {
  if (Array.isArray(payload)) return payload as RawOpportunity[]

  if (typeof payload !== 'object' || payload === null) return []

  const record = payload as Record<string, unknown>
  const candidates = [record.opportunities, record.scholarships, record.items, record.data, record.results]
  const match = candidates.find(Array.isArray)

  return match ? match as RawOpportunity[] : []
}

export async function GET(request: NextRequest) {
  const endpoint = process.env.EDUTU_SCHOLARSHIP_API_URL
  const apiKey = process.env.EDUTU_SCHOLARSHIP_API_KEY

  if (!endpoint) {
    return Response.json({
      mode: 'fallback',
      source: 'Local fallback',
      message: 'Set EDUTU_SCHOLARSHIP_API_URL to enable live Edutu opportunities.',
      opportunities: fallbackOpportunities,
    })
  }

  try {
    const url = new URL(endpoint)
    const type = request.nextUrl.searchParams.get('type')
    const country = request.nextUrl.searchParams.get('country')

    if (type) url.searchParams.set('type', type)
    if (country) url.searchParams.set('country', country)

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`Edutu API returned ${response.status}`)
    }

    const payload = await response.json()
    const opportunities = pickOpportunityArray(payload).map(normalizeOpportunity)

    return Response.json({
      mode: 'live',
      source: 'Edutu scholarship API',
      opportunities: opportunities.length ? opportunities : fallbackOpportunities,
    })
  } catch (error) {
    console.error('Edutu opportunities bridge failed:', error)

    return Response.json({
      mode: 'fallback',
      source: 'Local fallback',
      message: 'Edutu opportunities are temporarily unavailable. Showing fallback opportunities.',
      opportunities: fallbackOpportunities,
    })
  }
}
