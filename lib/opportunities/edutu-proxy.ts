// Server-side adapter for Edutu's partner opportunity API.
// Keep this dependency-free so it can be tested without a database or network.

export type EdutuOpportunityPayload = {
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

export type ProxiedOpportunity = {
  id: string
  title: string
  type: string
  location: string
  deadline: string
}

function asText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function normalizeEdutuOpportunity(
  item: EdutuOpportunityPayload,
  index: number,
): ProxiedOpportunity {
  const rawType = asText(item.type, asText(item.category, 'Scholarship'))

  return {
    id: asText(item.id, `edutu-${index + 1}`),
    title: asText(item.title, asText(item.name, 'Scholarship opportunity')),
    type: titleCase(rawType),
    location: asText(item.location, 'Online'),
    deadline: asText(item.deadline, asText(item.closesAt, asText(item.closing_date, 'Rolling'))),
  }
}

export function extractEdutuOpportunities(payload: unknown): EdutuOpportunityPayload[] {
  if (Array.isArray(payload)) return payload as EdutuOpportunityPayload[]
  if (typeof payload !== 'object' || payload === null) return []

  const record = payload as Record<string, unknown>
  const candidates = [record.data, record.opportunities, record.scholarships, record.items, record.results]
  const match = candidates.find(Array.isArray)
  return match ? (match as EdutuOpportunityPayload[]) : []
}
