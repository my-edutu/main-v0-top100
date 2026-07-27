// lib/opportunities-server.ts
// Merges AFL-curated listings with the external Edutu feed.
// The member-only filter here is the security boundary: it runs before any
// type filtering so a `type` query can never be used to surface a gated row.
import type { HubOpportunity } from '@/lib/member-hub'

export const OPPORTUNITY_TYPES = [
  'Workshop',
  'Training',
  'Fellowship',
  'Grant',
  'Scholarship',
  'Mentorship',
  'Residency',
  'Opportunity',
] as const

export type CuratedOpportunity = HubOpportunity & {
  description: string | null
  url: string | null
  memberOnly: boolean
  source: 'afl'
}

export function mapCuratedOpportunity(row: any): CuratedOpportunity {
  return {
    id: row.id,
    title: row.title ?? '',
    type: row.type ?? 'Opportunity',
    location: row.location ?? 'Online',
    deadline: row.deadline ?? 'Rolling',
    description: row.description ?? null,
    url: row.url ?? null,
    memberOnly: Boolean(row.member_only),
    source: 'afl',
  }
}

export function mergeOpportunities(
  curated: CuratedOpportunity[],
  external: HubOpportunity[],
  opts: { isMember: boolean; type?: string },
): (HubOpportunity | CuratedOpportunity)[] {
  // Gate first, filter second. Doing this in the other order would let a
  // crafted `type` parameter reach a member-only row.
  const visible = curated.filter((item) => opts.isMember || !item.memberOnly)

  const seen = new Set(visible.map((item) => item.id))
  const deduped = external.filter((item) => !seen.has(item.id))

  const combined: (HubOpportunity | CuratedOpportunity)[] = [...visible, ...deduped]

  if (!opts.type) return combined

  const wanted = opts.type.trim().toLowerCase()
  return combined.filter((item) => item.type.trim().toLowerCase() === wanted)
}
