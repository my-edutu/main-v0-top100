import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  OpportunitiesSetupRequiredError,
  fetchMemberOpportunities,
  saveOpportunity,
  unsaveOpportunity,
} from '@/lib/opportunities/client'

/**
 * A stand-in for /api/member/opportunities/[id] that models what the real
 * route relies on: the unique (opportunity_id, profile_id) index, which makes a
 * repeat save a no-op rather than a duplicate row or an error, and a
 * delete-by-filter, which succeeds whether or not a row was there.
 */
function createFakeApi() {
  const saves = new Set<string>()
  const calls: { method: string; url: string }[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    calls.push({ method, url })

    const match = /\/api\/member\/opportunities\/([^?]+)$/.exec(url)
    if (match) {
      const id = match[1]
      if (method === 'POST') {
        saves.add(id) // Set semantics === the unique index: idempotent.
        return new Response(JSON.stringify({ isSaved: true }), { status: 200 })
      }
      if (method === 'DELETE') {
        saves.delete(id)
        return new Response(JSON.stringify({ isSaved: false }), { status: 200 })
      }
    }

    if (url.startsWith('/api/member/opportunities')) {
      return new Response(JSON.stringify({ opportunities: [] }), { status: 200 })
    }

    return new Response(JSON.stringify({ message: 'Not found.' }), { status: 404 })
  })

  return { saves, calls, fetchMock }
}

describe('save / unsave idempotency', () => {
  let api: ReturnType<typeof createFakeApi>

  beforeEach(() => {
    api = createFakeApi()
    vi.stubGlobal('fetch', api.fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saving the same opportunity twice leaves exactly one bookmark', async () => {
    expect(await saveOpportunity('opp-1')).toBe(true)
    expect(await saveOpportunity('opp-1')).toBe(true)
    expect(Array.from(api.saves)).toEqual(['opp-1'])
  })

  it('unsaving twice is a no-op and still reports not-saved', async () => {
    await saveOpportunity('opp-1')
    expect(await unsaveOpportunity('opp-1')).toBe(false)
    expect(await unsaveOpportunity('opp-1')).toBe(false)
    expect(api.saves.size).toBe(0)
  })

  it('unsaving something that was never saved succeeds', async () => {
    expect(await unsaveOpportunity('never-saved')).toBe(false)
  })

  it('save and unsave round-trip independently per opportunity', async () => {
    await saveOpportunity('opp-1')
    await saveOpportunity('opp-2')
    await unsaveOpportunity('opp-1')
    expect(Array.from(api.saves)).toEqual(['opp-2'])
  })
})

describe('fetchMemberOpportunities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('never sends a visibility parameter — the tier is the server’s decision', async () => {
    const api = createFakeApi()
    vi.stubGlobal('fetch', api.fetchMock)

    await fetchMemberOpportunities({ type: 'Grant', q: 'climate', savedOnly: true })

    const url = api.calls[0].url
    expect(url).toContain('type=Grant')
    expect(url).toContain('q=climate')
    expect(url).toContain('saved=1')
    expect(url).not.toContain('visibility')
  })

  it('omits the query string entirely when there are no filters', async () => {
    const api = createFakeApi()
    vi.stubGlobal('fetch', api.fetchMock)

    await fetchMemberOpportunities()
    expect(api.calls[0].url).toBe('/api/member/opportunities')
  })

  it('raises a setup-required error on a 503 so the section can explain itself', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'Run supabase/migrations/20260728_opportunities.sql.' }), {
            status: 503,
          }),
      ),
    )

    await expect(fetchMemberOpportunities()).rejects.toBeInstanceOf(OpportunitiesSetupRequiredError)
  })

  it('raises a plain error on any other failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'Nope.' }), { status: 500 })),
    )

    await expect(fetchMemberOpportunities()).rejects.toThrow('Nope.')
  })
})
