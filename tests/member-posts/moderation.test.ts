import { describe, expect, it } from 'vitest'

import {
  ADMIN_WRITABLE_STATUSES,
  MEMBER_POST_STATUSES,
  canPublish,
  canSetStatus,
  memberCanMutate,
  nextPublishedAt,
  shouldReslug,
  type MemberPostStatus,
} from '@/lib/member-posts/types'

const ALL = MEMBER_POST_STATUSES

describe('canSetStatus — the full member x admin x (from, to) matrix', () => {
  it('lets a member set only draft or published, from any non-removed status', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        const allowed = canSetStatus('member', from, to)
        const expected = from !== 'removed' && (to === 'draft' || to === 'published')
        expect({ from, to, allowed }).toEqual({ from, to, allowed: expected })
      }
    }
  })

  it('never lets a member leave `removed` — for any target status', () => {
    for (const to of ALL) {
      expect(canSetStatus('member', 'removed', to)).toBe(false)
    }
    // Including the no-op, which must not be treated as a permitted write.
    expect(canSetStatus('member', 'removed', 'removed')).toBe(false)
    expect(memberCanMutate('removed')).toBe(false)
  })

  it('never lets a member apply a moderation status', () => {
    for (const from of ALL) {
      expect(canSetStatus('member', from, 'flagged')).toBe(false)
      expect(canSetStatus('member', from, 'removed')).toBe(false)
    }
  })

  it('lets a member recover a flagged post by fixing and re-publishing it', () => {
    expect(canSetStatus('member', 'flagged', 'draft')).toBe(true)
    expect(canSetStatus('member', 'flagged', 'published')).toBe(true)
    expect(memberCanMutate('flagged')).toBe(true)
  })

  it('lets an admin set published, flagged or removed from anywhere — including out of removed', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        expect(canSetStatus('admin', from, to)).toBe(ADMIN_WRITABLE_STATUSES.includes(to))
      }
    }
    expect(canSetStatus('admin', 'removed', 'published')).toBe(true)
  })

  it('does not let an admin push a post back to draft — that is the author’s state', () => {
    for (const from of ALL) {
      expect(canSetStatus('admin', from, 'draft')).toBe(false)
    }
  })
})

describe('canPublish — only approved members may publish', () => {
  it('accepts only the approved membership status', () => {
    expect(canPublish('approved')).toBe(true)
  })

  it('rejects every other membership status, and a missing one', () => {
    for (const status of ['pending', 'rejected', 'suspended', '', null, undefined]) {
      expect(canPublish(status as string | null | undefined)).toBe(false)
    }
  })
})

describe('nextPublishedAt — set once, never moved', () => {
  const now = () => '2026-07-28T10:00:00.000Z'

  it('stamps the first publish', () => {
    expect(nextPublishedAt(null, 'published', now)).toBe('2026-07-28T10:00:00.000Z')
  })

  it('leaves a draft with no timestamp', () => {
    expect(nextPublishedAt(null, 'draft', now)).toBeNull()
  })

  it('keeps the original timestamp when a post is re-published after a flag', () => {
    const original = '2026-01-01T00:00:00.000Z'
    expect(nextPublishedAt(original, 'published', now)).toBe(original)
    expect(nextPublishedAt(original, 'flagged', now)).toBe(original)
    // Unpublishing back to draft does not erase it either, so re-publishing
    // later cannot silently re-date the post.
    expect(nextPublishedAt(original, 'draft', now)).toBe(original)
  })
})

describe('shouldReslug — a live URL is never rewritten', () => {
  it('re-slugs a renamed post that has never been published', () => {
    expect(shouldReslug({ titleChanged: true, publishedAt: null })).toBe(true)
  })

  it('does not re-slug when the title did not change', () => {
    expect(shouldReslug({ titleChanged: false, publishedAt: null })).toBe(false)
  })

  it('does not re-slug a post that has ever been published, even after a rename', () => {
    expect(shouldReslug({ titleChanged: true, publishedAt: '2026-01-01T00:00:00.000Z' })).toBe(false)
  })
})

describe('status coverage', () => {
  it('covers every status the table allows', () => {
    const expected: MemberPostStatus[] = ['draft', 'published', 'flagged', 'removed']
    expect([...ALL]).toEqual(expected)
  })
})
