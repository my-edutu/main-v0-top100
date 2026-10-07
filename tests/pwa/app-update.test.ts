import { afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ effect: undefined as undefined | (() => (() => void) | undefined), set: vi.fn() }))
vi.mock('react', () => ({
  useEffect: (fn: () => (() => void) | undefined) => { mocks.effect = fn },
  useState: () => [false, mocks.set],
  useRef: () => ({ current: false }),
}))
import AppUpdateNotice from '@/components/AppUpdateNotice'
import { GET } from '@/app/api/app-version/route'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); vi.clearAllMocks() })
async function setup(version: string) {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_APP_RELEASE', 'old')
  vi.useFakeTimers()
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const win = Object.assign(new EventTarget(), { setInterval, clearInterval })
  const fetcher = vi.fn().mockResolvedValue(Response.json({ version }))
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', win)
  vi.stubGlobal('navigator', {})
  vi.stubGlobal('fetch', fetcher)
  AppUpdateNotice()
  const cleanup = mocks.effect?.()
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  return { doc, fetcher, cleanup }
}
it('offers an update when the running release differs from production', async () => {
  const { cleanup } = await setup('new')
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.set).toHaveBeenCalledWith(true)
  cleanup?.()
  expect(vi.getTimerCount()).toBe(0)
})
it('checks again when returning to the foreground without flagging the same release', async () => {
  const { doc, fetcher, cleanup } = await setup('old')
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.set).not.toHaveBeenCalled()
  doc.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(0)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[0][1].cache).toBe('no-store')
  cleanup?.()
})
it('does not offer an update for a transient offline failure', async () => {
  const { doc, fetcher, cleanup } = await setup('old')
  await vi.advanceTimersByTimeAsync(0)
  fetcher.mockRejectedValueOnce(new Error('offline'))
  doc.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(0)
  expect(mocks.set).not.toHaveBeenCalled()
  cleanup?.()
})
it('returns the deployed version with CDN and browser caching disabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_RELEASE', 'release-2')
  const response = GET()
  expect(await response.json()).toEqual({ version: 'release-2' })
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store')
})
