// lib/opportunities/client.ts
// Browser-side fetch wrappers for the member opportunities API.
// Deliberately never sends a `visibility` parameter — the tier a caller may
// read is decided server-side by visibleTiersFor().
import type { Opportunity } from '@/lib/opportunities/types'
import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'

/** Thrown when the API answers 503 because the migration has not been run. */
export class OpportunitiesSetupRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpportunitiesSetupRequiredError'
  }
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.message || 'Request failed. Please try again.'
    if (res.status === 503) throw new OpportunitiesSetupRequiredError(message)
    throw new Error(message)
  }
  return data
}

export type MemberOpportunityFilters = {
  type?: string
  q?: string
  savedOnly?: boolean
}

export async function fetchMemberOpportunities(
  filters: MemberOpportunityFilters = {},
): Promise<Opportunity[]> {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.q) params.set('q', filters.q)
  if (filters.savedOnly) params.set('saved', '1')

  const query = params.toString()
  const res = await fetchWithTimeout(
    `/api/member/opportunities${query ? `?${query}` : ''}`,
    { cache: 'no-store' },
  )
  const data = await jsonOrThrow(res)
  return (data.opportunities ?? []) as Opportunity[]
}

/** Bookmark an opportunity. Idempotent — saving twice is a no-op. */
export async function saveOpportunity(id: string): Promise<boolean> {
  const res = await fetch(`/api/member/opportunities/${id}`, { method: 'POST' })
  const data = await jsonOrThrow(res)
  return Boolean(data.isSaved)
}

/** Remove a bookmark. Idempotent — unsaving something unsaved is a no-op. */
export async function unsaveOpportunity(id: string): Promise<boolean> {
  const res = await fetch(`/api/member/opportunities/${id}`, { method: 'DELETE' })
  const data = await jsonOrThrow(res)
  return Boolean(data.isSaved)
}
