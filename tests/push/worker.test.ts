import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
it('shows a notification and updates the home-screen badge from a push event', async () => {
  const handlers: Record<string, (event: any) => void> = {}
  const showNotification = vi.fn(async () => {})
  const setAppBadge = vi.fn(async () => {})
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: {
      addEventListener: (type: string, fn: (e: any) => void) => { handlers[type] = fn },
      registration: { showNotification },
      navigator: { setAppBadge, clearAppBadge: vi.fn(async () => {}) },
      location: { origin: 'https://www.top100afl.com', search: '' },
    }, console: { log: vi.fn() }, location: { search: '' },
    importScripts: () => {}, URL, Promise,
  })
  let pending: Promise<unknown> | undefined
  handlers.push({ data: { json: () => ({ title: 'Hello', body: 'Update', unreadCount: 4, url: '/dashboard/notifications' }) }, waitUntil: (p: Promise<unknown>) => { pending = p } })
  await pending
  expect(setAppBadge).toHaveBeenCalledWith(4)
  expect(showNotification).toHaveBeenCalledWith('Hello', expect.objectContaining({ body: 'Update' }))
})

it.each(['throws', 'rejects', 'missing-clear'] as const)('still displays push when badging %s', async (failure) => {
  const handlers: Record<string, (event: any) => void> = {}
  const showNotification = vi.fn(async (_title: string, _options: Record<string, unknown>) => {})
  const setAppBadge = failure === 'throws'
    ? () => { throw new Error('Badging unavailable') }
    : () => Promise.reject(new Error('Badging unavailable'))
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: {
      addEventListener: (type: string, fn: (event: any) => void) => { handlers[type] = fn },
      registration: { showNotification }, navigator: { setAppBadge },
    }, console: { log: vi.fn(), error: vi.fn() }, URL, Promise,
  })
  let pending: Promise<unknown> | undefined
  handlers.push({
    data: { json: () => ({ title: 'Update', body: 'Hello', unreadCount: failure === 'missing-clear' ? 0 : 4 }) },
    waitUntil: (promise: Promise<unknown>) => { pending = promise },
  })
  await pending
  expect(showNotification).toHaveBeenCalledOnce()
  expect(showNotification.mock.calls[0][1]).not.toHaveProperty('tag')
})
