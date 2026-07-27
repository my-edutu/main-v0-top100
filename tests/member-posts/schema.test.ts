import { describe, expect, it } from 'vitest'

import {
  BODY_MAX,
  BODY_MIN,
  EXCERPT_MAX,
  TAGS_MAX,
  TAG_MAX_LENGTH,
  TITLE_MAX,
  TITLE_MIN,
  createMemberPostSchema,
  moderateMemberPostSchema,
  updateMemberPostSchema,
} from '@/lib/member-posts/types'

const valid = {
  title: 'Building clinics with three people',
  body: 'B'.repeat(BODY_MIN),
  excerpt: 'What we learned in the first year.',
  tags: ['health', 'lagos'],
  coverUrl: 'https://example.com/cover.jpg',
  status: 'draft' as const,
}

describe('createMemberPostSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = createMemberPostSchema.parse(valid)
    expect(parsed.title).toBe(valid.title)
    expect(parsed.tags).toEqual(['health', 'lagos'])
  })

  it('defaults status to draft', () => {
    const { status, ...withoutStatus } = valid
    expect(createMemberPostSchema.parse(withoutStatus).status).toBe('draft')
  })

  it('rejects a status a member may not set', () => {
    expect(() => createMemberPostSchema.parse({ ...valid, status: 'flagged' })).toThrow()
    expect(() => createMemberPostSchema.parse({ ...valid, status: 'removed' })).toThrow()
  })

  it('enforces the title bounds', () => {
    expect(() => createMemberPostSchema.parse({ ...valid, title: 'a'.repeat(TITLE_MIN - 1) })).toThrow()
    expect(() => createMemberPostSchema.parse({ ...valid, title: 'a'.repeat(TITLE_MAX + 1) })).toThrow()
    expect(createMemberPostSchema.parse({ ...valid, title: 'a'.repeat(TITLE_MAX) }).title).toHaveLength(
      TITLE_MAX,
    )
  })

  it('enforces the body bounds', () => {
    expect(() => createMemberPostSchema.parse({ ...valid, body: 'a'.repeat(BODY_MIN - 1) })).toThrow()
    expect(() => createMemberPostSchema.parse({ ...valid, body: 'a'.repeat(BODY_MAX + 1) })).toThrow()
    expect(createMemberPostSchema.parse({ ...valid, body: 'a'.repeat(BODY_MAX) }).body).toHaveLength(
      BODY_MAX,
    )
  })

  it('enforces the excerpt maximum but treats an empty excerpt as absent', () => {
    expect(() => createMemberPostSchema.parse({ ...valid, excerpt: 'a'.repeat(EXCERPT_MAX + 1) })).toThrow()
    expect(createMemberPostSchema.parse({ ...valid, excerpt: '' }).excerpt).toBeUndefined()
  })

  it('caps the number of tags and the length of each one', () => {
    const tooMany = Array.from({ length: TAGS_MAX + 1 }, (_, i) => `tag${i}`)
    expect(() => createMemberPostSchema.parse({ ...valid, tags: tooMany })).toThrow()
    expect(() =>
      createMemberPostSchema.parse({ ...valid, tags: ['a'.repeat(TAG_MAX_LENGTH + 1)] }),
    ).toThrow()
    expect(createMemberPostSchema.parse({ ...valid, tags: [] }).tags).toEqual([])
  })

  it('requires a real URL for a cover, but accepts none', () => {
    expect(() => createMemberPostSchema.parse({ ...valid, coverUrl: 'not-a-url' })).toThrow()
    expect(createMemberPostSchema.parse({ ...valid, coverUrl: '' }).coverUrl).toBeUndefined()
  })

  it('trims surrounding whitespace rather than counting it toward the minimum', () => {
    expect(() =>
      createMemberPostSchema.parse({ ...valid, body: `   ${'a'.repeat(BODY_MIN - 5)}   ` }),
    ).toThrow()
  })
})

describe('updateMemberPostSchema', () => {
  it('accepts a partial patch', () => {
    expect(updateMemberPostSchema.parse({ title: 'A new title' }).title).toBe('A new title')
  })

  it('rejects an empty patch', () => {
    expect(() => updateMemberPostSchema.parse({})).toThrow()
  })

  it('treats an empty excerpt or cover as an explicit clear, not as absent', () => {
    expect(updateMemberPostSchema.parse({ excerpt: '' }).excerpt).toBeNull()
    expect(updateMemberPostSchema.parse({ coverUrl: '' }).coverUrl).toBeNull()
  })

  it('still refuses a moderation status', () => {
    expect(() => updateMemberPostSchema.parse({ status: 'removed' })).toThrow()
    expect(() => updateMemberPostSchema.parse({ status: 'flagged' })).toThrow()
  })

  it('still enforces the same bounds as create', () => {
    expect(() => updateMemberPostSchema.parse({ body: 'short' })).toThrow()
    expect(() => updateMemberPostSchema.parse({ title: 'ab' })).toThrow()
  })
})

describe('moderateMemberPostSchema', () => {
  const postId = '11111111-2222-4333-8444-555555555555'

  it('accepts a moderation action with a note', () => {
    const parsed = moderateMemberPostSchema.parse({
      postId,
      status: 'flagged',
      moderationNote: 'Please remove the contact details.',
    })
    expect(parsed.status).toBe('flagged')
  })

  it('rejects a non-uuid post id', () => {
    expect(() => moderateMemberPostSchema.parse({ postId: 'nope', status: 'flagged' })).toThrow()
  })

  it('rejects `draft` — that is the author’s state, not a moderation outcome', () => {
    expect(() => moderateMemberPostSchema.parse({ postId, status: 'draft' })).toThrow()
  })
})
