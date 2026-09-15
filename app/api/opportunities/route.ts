import { NextRequest } from 'next/server'

import {
  extractEdutuOpportunities,
  normalizeEdutuOpportunity,
  type EdutuOpportunityPayload,
} from '@/lib/opportunities/edutu-proxy'

export const runtime = 'nodejs'

type ExternalOpportunity = {
  id: string
  title: string
  type: string
  location: string
  deadline: string
}

const fallbackOpportunities: ExternalOpportunity[] = [
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
    const opportunities = extractEdutuOpportunities(payload).map((item: EdutuOpportunityPayload, index) =>
      normalizeEdutuOpportunity(item, index),
    )

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
