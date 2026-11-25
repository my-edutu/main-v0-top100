import { hasOpportunityExpired, opportunityDeadlineDay, opportunityImageUrl, slugify, type Opportunity } from './types'

export type EdutuOpportunity = Opportunity & {
  source: 'Edutu'
  deadlineNeedsReview: boolean
}

export type EdutuOpportunityPage = {
  opportunities: EdutuOpportunity[]
  nextCursor: string | null
}

const detailUrl = 'https://backend.edutu.org/opportunities/'
const catalogUrl = 'https://backend.edutu.org/opportunities/catalog'
const categoryTypes: Record<string, string> = {
  scholarships: 'Scholarship',
  fellowships: 'Fellowship',
  internships: 'Internship',
  grants: 'Grant',
  jobs: 'Job',
  mentorship: 'Mentorship',
  programs: 'Programme',
  programmes: 'Programme',
  graduate_programs: 'Programme',
  bootcamps: 'Programme',
  events: 'Programme',
  competitions: 'Programme',
}

function field(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function applicationLink(value: unknown): string | null {
  const raw = field(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function mapEdutuOpportunity(value: unknown, now = new Date()): EdutuOpportunity | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = field(row.id)
  const title = field(row.title)
  if (!id || !title || row.status !== 'active') return null

  const applicationUrl = [row.application_url, row.applicationUrl, row.apply_url, row.applyUrl, row.canonical_url, row.source_url]
    .map(applicationLink).find(Boolean)
  if (!applicationUrl) return null

  const rawDeadline = field(row.close_date) ?? field(row.deadline)
  const deadline = rawDeadline && Number.isFinite(Date.parse(rawDeadline)) ? rawDeadline : null
  if (hasOpportunityExpired(deadline, opportunityDeadlineDay(now))) return null

  const category = field(row.canonical_category) ?? field(row.category) ?? field(row.type) ?? ''
  const key = category.toLowerCase().replace(/\s+/g, '_')
  const trust = row.trust as { deadlineNeedsReview?: boolean } | undefined

  return {
    id: `edutu:${id}`,
    slug: slugify(title),
    title,
    type: categoryTypes[key] ?? 'Programme',
    organization: field(row.organization),
    location: field(row.location) ?? (row.is_remote === true ? 'Remote' : null),
    summary: field(row.refined_summary) ?? field(row.summary),
    description: field(row.description),
    imageUrl: opportunityImageUrl(row.image_url) ?? opportunityImageUrl(row.source_image_url),
    applicationUrl,
    contactEmail: null,
    deadline,
    deadlineNeedsReview: trust?.deadlineNeedsReview === true,
    amountNote: null,
    visibility: 'public',
    isFeatured: false,
    status: 'published',
    isSaved: false,
    createdAt: field(row.created_at) ?? '',
    updatedAt: field(row.updated_at) ?? '',
    source: 'Edutu',
  }
}

export async function fetchEdutuOpportunity(id: string): Promise<EdutuOpportunity | null> {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return null

  const response = await fetch(new URL(id, detailUrl), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(3_000),
    redirect: 'error',
  })
  if (response.status === 404 || response.status === 410) return null
  if (!response.ok) throw new Error(`Edutu listing returned HTTP ${response.status}`)

  const opportunity = mapEdutuOpportunity(await response.json())
  return opportunity?.id === `edutu:${id}` ? opportunity : null
}

export async function fetchEdutuCatalog(input: { query: string; type: string; cursor: string }) {
  const opportunities: EdutuOpportunity[] = []
  let cursor: string | null = input.cursor || null
  const maxPages = input.type ? 4 : 1
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(catalogUrl)
    url.searchParams.set('limit', '24')
    if (input.query) url.searchParams.set('q', input.query)
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(2_000),
      redirect: 'error',
    })
    if (!response.ok) throw new Error(`Edutu catalog returned HTTP ${response.status}`)
    const result: { items?: unknown; nextCursor?: unknown } = await response.json()
    if (!Array.isArray(result.items)) throw new Error('Edutu catalog returned an invalid page')

    for (const row of result.items) {
      const item = mapEdutuOpportunity(row)
      if (item && (!input.type || item.type === input.type)) opportunities.push(item)
    }
    const nextCursor = field(result.nextCursor)
    if (nextCursor && nextCursor === cursor) throw new Error('Edutu catalog repeated its cursor')
    cursor = nextCursor
    if (!cursor || opportunities.length >= 12) break
  }

  return { opportunities, nextCursor: cursor } satisfies EdutuOpportunityPage
}
