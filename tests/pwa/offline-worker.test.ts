import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

function worker() {
  const handlers: Record<string, (event: any) => void> = {}
  const fallback = new Response('offline')
  const match = vi.fn(async () => fallback)
  const add = vi.fn(async () => {})
  const fetcher = vi.fn(async () => new Response('latest'))
  const skipWaiting = vi.fn()
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { addEventListener: (name: string, fn: any) => { handlers[name] = fn },
      location: { origin: 'https://www.top100afl.com' }, skipWaiting },
    caches: { open: async () => ({ add, match }) }, fetch: fetcher, URL, Response,
    console: { log: vi.fn() },
  })
  return { handlers, fallback, match, add, fetcher, skipWaiting }
}
it('precaches only the public offline page', async () => {
  const { handlers, add } = worker()
  let pending: Promise<unknown> | undefined
  handlers.install({ waitUntil: (p: Promise<unknown>) => { pending = p } })
  await pending
  expect(add).toHaveBeenCalledWith('/offline.html')
})
it('keeps worker activation available if offline precaching fails', async () => {
  const { handlers, add, skipWaiting } = worker()
  add.mockRejectedValueOnce(new Error('offline'))
  let pending: Promise<unknown> | undefined
  handlers.install({ waitUntil: (p: Promise<unknown>) => { pending = p } })
  await expect(pending).resolves.toBeUndefined()
  expect(skipWaiting).toHaveBeenCalledOnce()
})
it('always fetches fresh navigation and uses a fallback only on network failure', async () => {
  const { handlers, fetcher, match, fallback } = worker()
  const request = { mode: 'navigate', method: 'GET', url: 'https://www.top100afl.com/dashboard' }
  let response: Promise<Response> | undefined
  const event = { request, respondWith: (p: Promise<Response>) => { response = p } }
  handlers.fetch(event)
  expect(await (await response)?.text()).toBe('latest')
  expect(fetcher).toHaveBeenCalledWith(request, { cache: 'no-store' })
  expect(match).not.toHaveBeenCalled()
  fetcher.mockRejectedValueOnce(new Error('offline'))
  handlers.fetch(event)
  expect(await response).toBe(fallback)
})
it('does not intercept APIs, scripts, mutations or other origins', () => {
  const { handlers, fetcher } = worker()
  const respondWith = vi.fn()
  for (const request of [
    { mode: 'cors', method: 'GET', url: 'https://www.top100afl.com/api/app-version' },
    { mode: 'no-cors', method: 'GET', url: 'https://www.top100afl.com/_next/app.js' },
    { mode: 'navigate', method: 'POST', url: 'https://www.top100afl.com/login' },
    { mode: 'navigate', method: 'GET', url: 'https://example.com/' },
  ]) handlers.fetch({ request, respondWith })
  expect(respondWith).not.toHaveBeenCalled()
  expect(fetcher).not.toHaveBeenCalled()
})
it('returns a readable fallback even when cache storage is unavailable', async () => {
  const { handlers, match, fetcher } = worker()
  match.mockRejectedValueOnce(new Error('cache unavailable'))
  fetcher.mockRejectedValueOnce(new Error('offline'))
  let response: Promise<Response> | undefined
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://www.top100afl.com/dashboard' },
    respondWith: (p: Promise<Response>) => { response = p } })
  expect((await response)?.status).toBe(503)
})
