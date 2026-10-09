import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  upsert: vi.fn(),
  insert: vi.fn(),
  legacySchema: false,
  profileRole: 'user',
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.currentUser }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from(table: string) {
      let wrote = false
      let selected = ''
      const query: any = {
        select: vi.fn((columns: string) => { selected = columns; return query }),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(async () => ({
          data: table === 'user_notifications' ? [] : [],
          error: table === 'user_notifications' && mocks.legacySchema && selected.includes('campaign_id')
            ? { code: '42703', message: 'column campaign_id does not exist' }
            : null,
        })),
        insert: vi.fn(() => { wrote = true; mocks.insert(); return query }),
        maybeSingle: vi.fn(async () => {
          if (table === 'profiles') return { data: { id: 'member-1', role: mocks.profileRole, membership_status: 'pending' }, error: null }
          if (table === 'awardees') return { data: null, error: null }
          if (table === 'user_notifications' && wrote) return {
            data: {
              id: 'handbook-notice', user_id: 'member-1', title: 'Your 2026 participant handbook is ready',
              body: 'Find your first steps, programme information, and key dates in one guide.',
              category: 'admin', cta_label: 'Open handbook', cta_url: '/handbooks/2026-participant-handbook.pdf',
              ...(mocks.legacySchema ? {} : { campaign_id: 'afl-2026-participant-handbook' }), delivered_at: '2026-10-09T10:00:00.000Z',
              read_at: null, metadata: { audience: 'all' },
            }, error: null,
          }
          return { data: null, error: null }
        }),
        upsert: vi.fn(() => { wrote = true; mocks.upsert(); return query }),
      }
      return query
    },
  }),
}))

import { GET } from '@/app/api/member/me/route'

describe('member handbook inbox delivery', () => {
  beforeEach(() => {
    mocks.currentUser.mockResolvedValue({ id: 'member-1' })
    mocks.upsert.mockReset()
    mocks.insert.mockReset()
    mocks.legacySchema = false
    mocks.profileRole = 'user'
  })

  it('adds the handbook to a pending member inbox without requiring an admin broadcast', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect((await response.json()).notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Your 2026 participant handbook is ready',
        audience: 'all',
        ctaUrl: '/handbooks/2026-participant-handbook.pdf',
      }),
    ]))
    expect(mocks.upsert).toHaveBeenCalledOnce()
  })

  it('still delivers the handbook during preview when the campaign migration is not applied', async () => {
    mocks.legacySchema = true
    mocks.profileRole = 'admin'

    const response = await GET()

    expect(response.status).toBe(200)
    expect((await response.json()).notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Your 2026 participant handbook is ready', audience: 'all' }),
    ]))
    expect(mocks.insert).toHaveBeenCalledOnce()
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})
