import { afterEach, expect, it, vi } from 'vitest'
import { dashboardRead } from '@/lib/http/dashboard-read'
afterEach(() => vi.unstubAllGlobals())
it('combines simultaneous browser requests and gives each reader its own body', async () => {
  vi.stubGlobal('window', {})
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
  vi.stubGlobal('fetch', fetchMock)
  const [first, second] = await Promise.all([dashboardRead('/test'), dashboardRead('/test')])
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(await first.json()).toEqual({ ok: true })
  expect(await second.json()).toEqual({ ok: true })
  await dashboardRead('/test')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
it('does not share server-side authenticated reads', async () => {
  vi.stubGlobal('window', undefined)
  const fetchMock = vi.fn(async () => new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  await Promise.all([dashboardRead('/server'), dashboardRead('/server')])
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
it('clears failed requests so retry works', async () => {
  vi.stubGlobal('window', {})
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  await expect(dashboardRead('/retry')).rejects.toThrow('offline')
  expect((await dashboardRead('/retry')).ok).toBe(true)
})
