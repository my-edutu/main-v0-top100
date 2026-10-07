import { expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ create: vi.fn(), range: vi.fn(), order: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => Promise<unknown>) => async () => fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }))

it('includes awardees beyond the Supabase 1,000-row REST limit', async () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.resetModules()

  const firstPage = Array.from({ length: 1000 }, (_, index) => ({
    awardee_id: `awardee-${index}`,
    profile_id: null,
    name: `Awardee ${String(index).padStart(4, '0')}`,
    slug: `awardee-${index}`,
    is_public: true,
  }))
  const directory = [
    ...firstPage,
    {
      awardee_id: 'rachida-id',
      profile_id: 'rachida-profile',
      name: 'Rachida El Rhdioui',
      slug: 'rachida-el-rhdioui',
      is_public: true,
    },
  ]
  mocks.order.mockReturnThis()
  mocks.range.mockImplementation((from: number, to: number) =>
    Promise.resolve({ data: directory.slice(from, to + 1), error: null }),
  )
  mocks.create.mockReturnValue({
    from: () => ({ select: () => ({ order: mocks.order, range: mocks.range }) }),
  })

  try {
    const { getAwardees } = await import('@/lib/awardees')
    const awardees = await getAwardees()

    expect(awardees).toHaveLength(directory.length)
    expect(awardees.find((awardee) => awardee.name === 'Rachida El Rhdioui')?.slug)
      .toBe('rachida-el-rhdioui')
  } finally {
    vi.unstubAllEnvs()
  }
})
