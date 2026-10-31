import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

function setup() {
  const handlers: Record<string, (event: any) => void> = {}
  const entries = new Map<string, Response>()
  const cache = {
    match: vi.fn(async (request: any) => entries.get(request.url)?.clone()),
    put: vi.fn(async (request: any, response: Response) => { entries.set(request.url, response) }),
    keys: async () => [...entries.keys()].map(url => ({ url })),
    delete: async (request: any) => entries.delete(request.url),
  }
  const fetcher = vi.fn(async () => new Response('asset', { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } }))
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { addEventListener: (key: string, fn: any) => { handlers[key] = fn }, location: { origin: 'https://www.top100afl.com' } },
    caches: { open: async () => cache }, fetch: fetcher, URL, Response, console,
  })
  async function get(path = '/_next/static/chunks/12345678abcdef.js', destination = 'script') {
    let response: Promise<Response> | undefined
    const pending: Promise<unknown>[] = []
    handlers.fetch({ request: { method: 'GET', mode: 'cors', destination, url: `https://www.top100afl.com${path}` },
      respondWith: (value: Promise<Response>) => { response = value }, waitUntil: (value: Promise<unknown>) => pending.push(value) })
    const result = await response
    await Promise.all(pending)
    return result
  }
  return { entries, cache, fetcher, get }
}
it('reuses fingerprinted static assets without another network request', async () => {
  const { get, fetcher } = setup()
  expect(await (await get())?.text()).toBe('asset')
  expect(await (await get())?.text()).toBe('asset')
  expect(fetcher).toHaveBeenCalledOnce()
})
it('recognizes Next.js base36 and hyphenated production chunk names', async () => {
  const { get, fetcher } = setup()
  for (const name of ['11wf0axirxeme.css', '1mokn-3v9u-4i.css']) {
    expect(await (await get(`/_next/static/chunks/${name}`, 'style'))?.text()).toBe('asset')
    await get(`/_next/static/chunks/${name}`, 'style')
  }
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it.each([404, 500])('does not cache a failed asset response (%s)', async status => {
  const { get, fetcher, cache } = setup()
  fetcher.mockResolvedValue(new Response('failed', { status }))
  expect((await get())?.status).toBe(status)
  expect(cache.put).not.toHaveBeenCalled()
})
it('does not cache private or explicitly uncached assets', async () => {
  const { get, fetcher, cache } = setup()
  for (const directive of ['private', 'no-store']) {
    fetcher.mockResolvedValueOnce(new Response('private', { headers: { 'Cache-Control': directive } }))
    await get()
  }
  expect(cache.put).not.toHaveBeenCalled()
})
it('does not cache development chunks or unversioned server responses', async () => {
  const { get, fetcher, cache } = setup()
  fetcher.mockResolvedValue(new Response('development', { headers: { 'Cache-Control': 'no-cache' } }))
  await get()
  expect(cache.put).not.toHaveBeenCalled()
})
it('continues serving an asset when cache storage fails', async () => {
  const { get, cache } = setup()
  cache.match.mockRejectedValue(new Error('storage unavailable'))
  expect(await (await get())?.text()).toBe('asset')
})
it('limits the asset cache to 60 entries', async () => {
  const { get, entries } = setup()
  for (let i = 0; i < 63; i++) await get(`/_next/static/chunks/12345678abcdef-${i}.js`)
  expect(entries.size).toBe(60)
  expect(entries.has('https://www.top100afl.com/_next/static/chunks/12345678abcdef-0.js')).toBe(false)
})
it('leaves member APIs, unversioned files and non-assets on the network', async () => {
  const { get, fetcher, cache } = setup()
  for (const path of ['/api/member/me', '/sw.js', '/_next/static/chunks/app.js']) expect(await get(path)).toBeUndefined()
  expect(await get('/_next/static/chunks/12345678abcdef.js', 'document')).toBeUndefined()
  expect(fetcher).not.toHaveBeenCalled()
  expect(cache.put).not.toHaveBeenCalled()
})
