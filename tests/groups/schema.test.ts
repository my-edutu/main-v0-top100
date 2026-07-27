import { describe, expect, it } from 'vitest'

import {
  GROUP_MESSAGE_MAX,
  createGroupSchema,
  membershipPatchSchema,
  postGroupMessageSchema,
} from '@/lib/groups/types'

describe('createGroupSchema', () => {
  it('accepts a minimal group and defaults the optional fields', () => {
    const parsed = createGroupSchema.parse({ name: 'Health Systems' })
    expect(parsed).toEqual({
      name: 'Health Systems',
      description: '',
      topic: '',
      visibility: 'open',
    })
  })

  it('trims whitespace off the name', () => {
    expect(createGroupSchema.parse({ name: '  Policy Circle  ' }).name).toBe('Policy Circle')
  })

  it('rejects a name shorter than 3 characters', () => {
    const result = createGroupSchema.safeParse({ name: 'ab' })
    expect(result.success).toBe(false)
  })

  it('rejects a name longer than 80 characters', () => {
    expect(createGroupSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false)
    expect(createGroupSchema.safeParse({ name: 'x'.repeat(80) }).success).toBe(true)
  })

  it('rejects a description longer than 500 characters', () => {
    expect(
      createGroupSchema.safeParse({ name: 'Valid name', description: 'd'.repeat(501) }).success,
    ).toBe(false)
    expect(
      createGroupSchema.safeParse({ name: 'Valid name', description: 'd'.repeat(500) }).success,
    ).toBe(true)
  })

  it('rejects a topic longer than 60 characters', () => {
    expect(createGroupSchema.safeParse({ name: 'Valid name', topic: 't'.repeat(61) }).success).toBe(
      false,
    )
  })

  it('accepts each valid visibility and rejects anything else', () => {
    for (const visibility of ['open', 'request', 'private']) {
      expect(createGroupSchema.safeParse({ name: 'Valid name', visibility }).success).toBe(true)
    }
    expect(createGroupSchema.safeParse({ name: 'Valid name', visibility: 'secret' }).success).toBe(
      false,
    )
  })

  it('rejects a missing name outright', () => {
    expect(createGroupSchema.safeParse({}).success).toBe(false)
  })
})

describe('postGroupMessageSchema', () => {
  it('accepts an ordinary message', () => {
    expect(postGroupMessageSchema.parse({ body: 'Hello everyone' }).body).toBe('Hello everyone')
  })

  it('rejects an empty or whitespace-only body', () => {
    expect(postGroupMessageSchema.safeParse({ body: '' }).success).toBe(false)
    expect(postGroupMessageSchema.safeParse({ body: '    ' }).success).toBe(false)
  })

  it('accepts exactly the maximum length and rejects one more', () => {
    expect(postGroupMessageSchema.safeParse({ body: 'a'.repeat(GROUP_MESSAGE_MAX) }).success).toBe(
      true,
    )
    expect(
      postGroupMessageSchema.safeParse({ body: 'a'.repeat(GROUP_MESSAGE_MAX + 1) }).success,
    ).toBe(false)
  })
})

describe('membershipPatchSchema', () => {
  const profileId = '11111111-2222-4333-8444-555555555555'

  it('accepts each moderation action', () => {
    for (const status of ['active', 'banned', 'pending', 'removed']) {
      expect(membershipPatchSchema.safeParse({ profileId, status }).success).toBe(true)
    }
  })

  it('rejects an unknown status', () => {
    expect(membershipPatchSchema.safeParse({ profileId, status: 'owner' }).success).toBe(false)
  })

  it('rejects a profileId that is not a uuid', () => {
    expect(membershipPatchSchema.safeParse({ profileId: 'nope', status: 'active' }).success).toBe(
      false,
    )
  })
})
