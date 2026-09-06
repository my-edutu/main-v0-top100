import { describe, it, expect } from 'vitest'
import { DM_NOTIFY_WINDOW_MS, buildDmNotification, shouldNotify } from '@/lib/email/dm-notification'

const NOW = Date.parse('2026-07-27T12:00:00.000Z')

describe('DM_NOTIFY_WINDOW_MS', () => {
  it('is one hour', () => {
    expect(DM_NOTIFY_WINDOW_MS).toBe(60 * 60 * 1000)
  })
})

describe('shouldNotify', () => {
  it('notifies when there is no prior notification', () => {
    expect(shouldNotify(null, NOW)).toBe(true)
  })

  it('suppresses inside the window', () => {
    expect(shouldNotify(new Date(NOW - 60_000).toISOString(), NOW)).toBe(false)
  })

  it('notifies once the window has elapsed', () => {
    expect(shouldNotify(new Date(NOW - DM_NOTIFY_WINDOW_MS - 1).toISOString(), NOW)).toBe(true)
  })

  it('notifies exactly at the window boundary', () => {
    expect(shouldNotify(new Date(NOW - DM_NOTIFY_WINDOW_MS).toISOString(), NOW)).toBe(true)
  })

  it('notifies when the stored timestamp is unparseable', () => {
    expect(shouldNotify('not-a-date', NOW)).toBe(true)
  })
})

describe('buildDmNotification', () => {
  const built = buildDmNotification({
    recipientName: 'Ada',
    senderName: 'Kwame Mensah',
    siteUrl: 'https://top100afl.com',
  })

  it('names the sender in the subject', () => {
    expect(built.subject).toContain('Kwame Mensah')
  })

  it('links back to the dashboard messages section', () => {
    expect(built.html).toContain('https://top100afl.com/dashboard')
  })

  it('never includes a raw email address', () => {
    expect(built.html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    expect(built.text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
  })

  it('does not include the message body', () => {
    expect(built.html.toLowerCase()).not.toContain('message body')
  })
})
