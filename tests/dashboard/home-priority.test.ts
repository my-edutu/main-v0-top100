import { describe, expect, it } from 'vitest'

import {
  selectHomePriority,
  selectUpcomingInvitations,
} from '@/app/dashboard/_lib/home-priority'
import type { EventInvitation } from '@/lib/events/invitations-client'

const member = {
  status: 'approved',
  profileStatus: 'approved',
  bio: 'Complete',
  headline: 'Founder',
  bioUpdateCount: 0,
  bioUpdateLimit: 2,
} as const

function invitation(id: string, startAt: string): EventInvitation {
  return {
    id,
    eventId: `event-${id}`,
    rsvp: 'pending',
    rsvpAt: null,
    seenAt: null,
    message: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    event: {
      id: `event-${id}`,
      title: `Event ${id}`,
      summary: null,
      startAt,
      location: null,
      cover: null,
      registrationUrl: null,
      registrationLabel: 'Register',
    },
  }
}

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

describe('Home upcoming invitations', () => {
  it('excludes past events, sorts future events ascending, and caps the result at three', () => {
    const invitations = [
      invitation('past', '2026-08-11T11:59:59.000Z'),
      invitation('fourth', '2026-08-15T12:00:00.000Z'),
      invitation('second', '2026-08-13T12:00:00.000Z'),
      invitation('first', '2026-08-12T12:00:00.000Z'),
      invitation('third', '2026-08-14T12:00:00.000Z'),
    ]

    expect(
      selectUpcomingInvitations(
        invitations,
        new Date('2026-08-11T12:00:00.000Z'),
      ).map(({ id }) => id),
    ).toEqual(['first', 'second', 'third'])
  })
})
