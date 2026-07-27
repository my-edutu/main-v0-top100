import { beforeEach, describe, expect, it, vi } from 'vitest'

// `lib/member-posts/server.ts` pulls in the awardee directory helper, which
// reaches for next/cache and an Excel workbook at import time. None of that is
// under test here, so it is stubbed out.
vi.mock('@/lib/awardees', () => ({ getAwardees: vi.fn(async () => []) }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }))

import {
  bumpViewCount,
  isMissingMemberPostsTable,
  loadPublishedPost,
  loadPublishedPostsForAuthor,
  mapMemberPost,
} from '@/lib/member-posts/server'

type Call = { method: string; args: unknown[] }

/**
 * Minimal chainable stand-in for the PostgREST query builder. It records every
 * filter applied so a test can assert on the query that was actually built,
 * rather than on a hand-written duplicate of it.
 */
function fakeSupabase(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const calls: Call[] = []

  const builder: any = new Proxy(
    {},
    {
      get(_target, property: string) {
        if (property === 'then') return undefined
        return (...args: unknown[]) => {
          calls.push({ method: property, args })
          // These are the terminal calls; everything else keeps chaining.
          if (property === 'maybeSingle' || property === 'single') return Promise.resolve(result)
          return builder
        }
      },
    },
  )

  // A builder that is also awaitable, for the list query which has no
  // .maybeSingle() terminator.
  const awaitableBuilder: any = new Proxy(
    {},
    {
      get(_target, property: string) {
        if (property === 'then') {
          return (resolve: (value: unknown) => unknown) => resolve(result)
        }
        return (...args: unknown[]) => {
          calls.push({ method: property, args })
          if (property === 'maybeSingle' || property === 'single') return Promise.resolve(result)
          return awaitableBuilder
        }
      },
    },
  )

  return {
    calls,
    client: {
      from(table: string) {
        calls.push({ method: 'from', args: [table] })
        return awaitableBuilder
      },
    } as any,
    singleClient: {
      from(table: string) {
        calls.push({ method: 'from', args: [table] })
        return builder
      },
    } as any,
  }
}

function eqCalls(calls: Call[]): Array<[string, unknown]> {
  return calls.filter((call) => call.method === 'eq').map((call) => [String(call.args[0]), call.args[1]])
}

describe('public queries always constrain status = published', () => {
  it('loadPublishedPost filters on profile, slug AND status', async () => {
    const fake = fakeSupabase({ data: null, error: null })
    await loadPublishedPost(fake.singleClient, 'profile-1', 'my-story')

    expect(fake.calls[0]).toEqual({ method: 'from', args: ['member_posts'] })
    expect(eqCalls(fake.calls)).toEqual([
      ['profile_id', 'profile-1'],
      ['slug', 'my-story'],
      ['status', 'published'],
    ])
  })

  it('loadPublishedPostsForAuthor filters on profile AND status', async () => {
    const fake = fakeSupabase({ data: [], error: null })
    await loadPublishedPostsForAuthor(fake.client, 'profile-1')

    expect(eqCalls(fake.calls)).toEqual([
      ['profile_id', 'profile-1'],
      ['status', 'published'],
    ])
  })

  it('never accepts a caller-supplied status — there is no parameter for one', async () => {
    const fake = fakeSupabase({ data: [], error: null })
    // @ts-expect-error the signature deliberately has no status parameter
    await loadPublishedPostsForAuthor(fake.client, 'profile-1', 24, 'draft')

    const statuses = eqCalls(fake.calls).filter(([column]) => column === 'status')
    expect(statuses).toEqual([['status', 'published']])
  })

  it('returns null rather than throwing when the post does not exist', async () => {
    const fake = fakeSupabase({ data: null, error: null })
    const { row } = await loadPublishedPost(fake.singleClient, 'profile-1', 'nope')
    expect(row).toBeNull()
  })
})

describe('isMissingMemberPostsTable', () => {
  it('recognises the Postgres and PostgREST missing-relation codes', () => {
    expect(isMissingMemberPostsTable({ code: '42P01' })).toBe(true)
    expect(isMissingMemberPostsTable({ code: 'PGRST205' })).toBe(true)
    expect(isMissingMemberPostsTable({ code: 'PGRST204' })).toBe(true)
  })

  it('recognises the message form', () => {
    expect(
      isMissingMemberPostsTable({ message: 'relation "public.member_posts" does not exist' }),
    ).toBe(true)
    expect(isMissingMemberPostsTable({ message: 'Could not find the table in the schema cache' })).toBe(
      true,
    )
  })

  it('does not swallow unrelated failures', () => {
    expect(isMissingMemberPostsTable(null)).toBe(false)
    expect(isMissingMemberPostsTable({ code: '23505', message: 'duplicate key value' })).toBe(false)
  })
})

describe('mapMemberPost', () => {
  it('maps a row and defaults every nullable column', () => {
    const post = mapMemberPost({
      id: 'post-1',
      slug: 'my-story',
      title: 'My story',
      body: 'Body text',
      created_at: '2026-07-28T00:00:00.000Z',
    })

    expect(post).toMatchObject({
      id: 'post-1',
      slug: 'my-story',
      excerpt: null,
      coverUrl: null,
      tags: [],
      status: 'draft',
      moderationNote: null,
      publishedAt: null,
      viewCount: 0,
    })
  })
})

describe('bumpViewCount', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('increments from the count it was given', async () => {
    const fake = fakeSupabase({ data: null, error: null })
    await bumpViewCount(fake.client, 'post-1', 7)

    const update = fake.calls.find((call) => call.method === 'update')
    expect(update?.args[0]).toEqual({ view_count: 8 })
  })

  it('swallows a failure so a broken counter never breaks the page', async () => {
    const exploding = {
      from() {
        throw new Error('member_posts does not exist')
      },
    } as any

    await expect(bumpViewCount(exploding, 'post-1', 0)).resolves.toBeUndefined()
  })
})
