import { expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), order: vi.fn(), cached: '' }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => Promise<unknown>) => async () => {
  const result = await fn()
  mocks.cached = JSON.stringify(result)
  return result
} }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => { throw new Error('Cookies must not be accessed') }) }))
it('caches a large directory below 2 MB and preserves data using an anonymous session-free client', async () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  const bio = 'A long awardee biography. '.repeat(110000)
  mocks.order.mockResolvedValue({ data: [{ id: 'one', name: 'Example', bio }], error: null })
  mocks.create.mockReturnValue({ from: () => ({ select: () => ({ order: mocks.order }) }) })
  try {
    const { getAwardees } = await import('@/lib/awardees')
    const result = await getAwardees()
    expect(result[0].bio).toBe(bio)
    expect(Buffer.byteLength(mocks.cached)).toBeLessThan(2 * 1024 * 1024)
    expect(mocks.create).toHaveBeenCalledWith('https://example.supabase.co', 'test-anon-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  } finally { vi.unstubAllEnvs() }
})
