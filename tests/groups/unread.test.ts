import { describe, expect, it } from 'vitest'

import { countUnread } from '@/lib/groups/types'

const messages = [
  { created_at: '2026-07-20T10:00:00.000Z' },
  { created_at: '2026-07-21T10:00:00.000Z' },
  { created_at: '2026-07-22T10:00:00.000Z' },
]

describe('countUnread', () => {
  it('counts everything when the group has never been opened', () => {
    expect(countUnread(messages, null)).toBe(3)
    expect(countUnread(messages, undefined)).toBe(3)
  })

  it('counts only messages strictly newer than last_read_at', () => {
    expect(countUnread(messages, '2026-07-21T00:00:00.000Z')).toBe(2)
    expect(countUnread(messages, '2026-07-22T09:59:59.000Z')).toBe(1)
  })

  it('treats a message posted exactly at last_read_at as read', () => {
    expect(countUnread(messages, '2026-07-22T10:00:00.000Z')).toBe(0)
  })

  it('returns zero when everything predates the read stamp', () => {
    expect(countUnread(messages, '2026-08-01T00:00:00.000Z')).toBe(0)
  })

  it('handles an empty group', () => {
    expect(countUnread([], null)).toBe(0)
    expect(countUnread([], '2026-07-21T00:00:00.000Z')).toBe(0)
  })

  it('accepts the camelCase mapped shape as well as the raw row', () => {
    expect(
      countUnread(
        [{ createdAt: '2026-07-23T10:00:00.000Z' }, { createdAt: '2026-07-01T10:00:00.000Z' }],
        '2026-07-22T10:00:00.000Z',
      ),
    ).toBe(1)
  })

  it('falls back to counting everything when last_read_at is unparseable', () => {
    expect(countUnread(messages, 'not-a-date')).toBe(3)
  })

  it('ignores rows with no timestamp instead of counting them as unread', () => {
    expect(countUnread([{ created_at: null }, ...messages], '2026-07-21T00:00:00.000Z')).toBe(2)
  })

  // Timezone offsets are the classic way an unread badge goes wrong: the same
  // instant written two ways must compare equal, not "newer".
  it('compares instants, not strings', () => {
    expect(countUnread([{ created_at: '2026-07-22T12:00:00.000+02:00' }], '2026-07-22T10:00:00.000Z')).toBe(0)
  })
})
