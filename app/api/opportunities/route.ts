import { NextRequest } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  OPPORTUNITY_TYPES,
  mapCuratedOpportunity,
  mergeOpportunities,
  type CuratedOpportunity,
} from '@/lib/opportunities-server'

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

function normalizeOpportunity(item: RawOpportunity, index: number): ExternalOpportunity {
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

/**
 * Whether the caller is an authenticated member. A failure to resolve the
 * session (thrown error, expired token, anything) must never be treated as
 * membership — this is the fail-closed default that keeps `member_only`
 * curated rows out of an unauthenticated response.
 */
async function resolveIsMember(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return Boolean(user?.id)
  } catch (error) {
    console.error('Opportunities: failed to resolve session; treating caller as not a member:', error)
    return false
  }
}

/**
 * AFL-curated + member-only listings. A broken/missing `member_opportunities`
 * table must not take down the public opportunities feed, so any failure here
 * is logged and swallowed in favour of an empty curated list.
 */
async function loadCuratedOpportunities(): Promise<CuratedOpportunity[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('member_opportunities')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Opportunities: could not load curated listings; continuing with none:', error)
      return []
    }

    return (data ?? []).map(mapCuratedOpportunity)
  } catch (error) {
    console.error('Opportunities: unexpected error loading curated listings; continuing with none:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  const endpoint = process.env.EDUTU_SCHOLARSHIP_API_URL
  const apiKey = process.env.EDUTU_SCHOLARSHIP_API_KEY
  const type = request.nextUrl.searchParams.get('type') ?? undefined

  // Resolved once up front and reused across every response branch below, so
  // the member-only gate is applied identically whether the external feed is
  // disabled, live, or failing.
  const [isMember, curated] = await Promise.all([resolveIsMember(), loadCuratedOpportunities()])

  if (!endpoint) {
    return Response.json({
      mode: 'fallback',
      source: 'Local fallback',
      message: 'Set EDUTU_SCHOLARSHIP_API_URL to enable live Edutu opportunities.',
      opportunities: mergeOpportunities(curated, fallbackOpportunities, { isMember, type }),
      types: OPPORTUNITY_TYPES,
    })
  }

  try {
    const url = new URL(endpoint)
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
      opportunities: mergeOpportunities(
        curated,
        opportunities.length ? opportunities : fallbackOpportunities,
        { isMember, type },
      ),
      types: OPPORTUNITY_TYPES,
    })
  } catch (error) {
    console.error('Edutu opportunities bridge failed:', error)

    return Response.json({
      mode: 'fallback',
      source: 'Local fallback',
      message: 'Edutu opportunities are temporarily unavailable. Showing fallback opportunities.',
      opportunities: mergeOpportunities(curated, fallbackOpportunities, { isMember, type }),
      types: OPPORTUNITY_TYPES,
    })
  }
}
