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
