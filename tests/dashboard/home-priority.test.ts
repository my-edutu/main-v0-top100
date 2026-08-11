import { describe, expect, it } from 'vitest'

import { selectHomePriority } from '@/app/dashboard/_lib/home-priority'

const member = {
  status: 'approved',
  profileStatus: 'approved',
  bio: 'Complete',
  headline: 'Founder',
  bioUpdateCount: 0,
  bioUpdateLimit: 2,
} as const

describe('Home priority', () => {
  it('puts an award action ahead of inbox work', () => {
    expect(
      selectHomePriority({
        member,
        awardNeedsAttention: true,
        unreadMessages: 4,
        unreadUpdates: 2,
      }).kind,
    ).toBe('award')
  })

  it('uses messages when membership work is complete', () => {
    expect(
      selectHomePriority({
        member,
        awardNeedsAttention: false,
        unreadMessages: 4,
        unreadUpdates: 2,
      }).href,
    ).toBe('/dashboard/messages')
  })

  it('puts a membership restriction ahead of every member action', () => {
    expect(
      selectHomePriority({
        member: { ...member, status: 'pending' },
        awardNeedsAttention: true,
        unreadMessages: 4,
        unreadUpdates: 2,
      }).kind,
    ).toBe('membership')
  })

  it('puts an incomplete BIO ahead of an award action', () => {
    expect(
      selectHomePriority({
        member: { ...member, profileStatus: 'draft', bio: '', headline: '' },
        awardNeedsAttention: true,
        unreadMessages: 4,
        unreadUpdates: 2,
      }).href,
    ).toBe('/dashboard/me/profile')
  })

  it('uses unread updates after messages are clear', () => {
    expect(
      selectHomePriority({
        member,
        awardNeedsAttention: false,
        unreadMessages: 0,
        unreadUpdates: 2,
      }).kind,
    ).toBe('updates')
  })

  it('falls back to Discover when there is no outstanding work', () => {
    expect(
      selectHomePriority({
        member,
        awardNeedsAttention: false,
        unreadMessages: 0,
        unreadUpdates: 0,
      }),
    ).toMatchObject({
      kind: 'discover',
      href: '/dashboard/discover',
    })
  })
})
