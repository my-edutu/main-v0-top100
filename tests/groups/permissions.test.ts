import { describe, expect, it } from 'vitest'

import {
  canDeleteMessage,
  canLeaveGroup,
  canModerateGroup,
  canPostInGroup,
  canViewGroup,
  joinStatusFor,
  type GroupMemberStatus,
  type GroupRole,
  type GroupVisibility,
} from '@/lib/groups/types'

const VISIBILITIES: GroupVisibility[] = ['open', 'request', 'private']

function post(options: {
  memberStatus?: string | null
  visibility?: GroupVisibility
  archived?: boolean
  membershipStatus?: GroupMemberStatus | null
  role?: GroupRole
}) {
  return canPostInGroup({
    memberStatus: 'memberStatus' in options ? options.memberStatus : 'approved',
    group: {
      visibility: options.visibility ?? 'open',
      isArchived: options.archived ?? false,
    },
    membership:
      options.membershipStatus === null || options.membershipStatus === undefined
        ? null
        : { role: options.role ?? 'member', status: options.membershipStatus },
  })
}

describe('canPostInGroup — the assertCanPost matrix', () => {
  it('lets an active, approved member post in any visibility', () => {
    for (const visibility of VISIBILITIES) {
      expect(post({ visibility, membershipStatus: 'active' })).toEqual({ ok: true })
    }
  })

  it('blocks a pending membership with a 403 that explains the wait', () => {
    for (const visibility of VISIBILITIES) {
      const verdict = post({ visibility, membershipStatus: 'pending' })
      expect(verdict.ok).toBe(false)
      if (verdict.ok) return
      expect(verdict.status).toBe(403)
      expect(verdict.message).toMatch(/waiting for approval/i)
    }
  })

  it('blocks a banned membership in every visibility', () => {
    for (const visibility of VISIBILITIES) {
      const verdict = post({ visibility, membershipStatus: 'banned' })
      expect(verdict.ok).toBe(false)
      if (verdict.ok) return
      expect(verdict.status).toBe(403)
    }
  })

  it('blocks a non-member in every visibility', () => {
    for (const visibility of VISIBILITIES) {
      const verdict = post({ visibility, membershipStatus: null })
      expect(verdict.ok).toBe(false)
      if (verdict.ok) return
      expect(verdict.message).toMatch(/join this group/i)
    }
  })

  it('makes an archived group read-only even for an active owner', () => {
    for (const visibility of VISIBILITIES) {
      const verdict = post({ visibility, archived: true, membershipStatus: 'active', role: 'owner' })
      expect(verdict.ok).toBe(false)
      if (verdict.ok) return
      expect(verdict.status).toBe(403)
      expect(verdict.message).toMatch(/archived/i)
    }
  })

  it('blocks members whose site membership is not approved', () => {
    for (const memberStatus of ['pending', 'rejected', 'suspended', null]) {
      const verdict = post({ memberStatus, membershipStatus: 'active' })
      expect(verdict.ok).toBe(false)
      if (verdict.ok) return
      expect(verdict.status).toBe(403)
      expect(verdict.message).toMatch(/approved awardees/i)
    }
  })

  it('404s when the group is gone', () => {
    const verdict = canPostInGroup({
      memberStatus: 'approved',
      group: null,
      membership: { role: 'owner', status: 'active' },
    })
    expect(verdict).toMatchObject({ ok: false, status: 404 })
  })
})

describe('canViewGroup', () => {
  it('shows open and request groups to anyone', () => {
    expect(canViewGroup({ group: { visibility: 'open' }, membership: null })).toEqual({ ok: true })
    expect(canViewGroup({ group: { visibility: 'request' }, membership: null })).toEqual({ ok: true })
  })

  it('hides private groups from non-members with a 403', () => {
    expect(canViewGroup({ group: { visibility: 'private' }, membership: null })).toMatchObject({
      ok: false,
      status: 403,
    })
  })

  it('shows a private group to its members and to site admins', () => {
    expect(
      canViewGroup({ group: { visibility: 'private' }, membership: { status: 'active' } }),
    ).toEqual({ ok: true })
    expect(
      canViewGroup({ group: { visibility: 'private' }, membership: null, isSiteAdmin: true }),
    ).toEqual({ ok: true })
  })

  it('still hides a private group from a banned member', () => {
    expect(
      canViewGroup({ group: { visibility: 'private' }, membership: { status: 'banned' } }),
    ).toMatchObject({ ok: false, status: 403 })
  })
})

describe('canModerateGroup', () => {
  it('accepts active owners and moderators only', () => {
    expect(canModerateGroup('owner', 'active')).toBe(true)
    expect(canModerateGroup('moderator', 'active')).toBe(true)
    expect(canModerateGroup('member', 'active')).toBe(false)
    expect(canModerateGroup(null)).toBe(false)
  })

  it('rejects an owner whose own membership is pending or banned', () => {
    expect(canModerateGroup('owner', 'pending')).toBe(false)
    expect(canModerateGroup('owner', 'banned')).toBe(false)
  })
})

describe('canLeaveGroup — the last owner may not walk out', () => {
  it('lets an ordinary member leave', () => {
    expect(
      canLeaveGroup({ membership: { role: 'member', status: 'active' }, activeOwnerCount: 1 }),
    ).toEqual({ ok: true })
  })

  it('blocks the only owner with a 409 that says what to do', () => {
    const verdict = canLeaveGroup({
      membership: { role: 'owner', status: 'active' },
      activeOwnerCount: 1,
    })
    expect(verdict.ok).toBe(false)
    if (verdict.ok) return
    expect(verdict.status).toBe(409)
    expect(verdict.message).toMatch(/promote/i)
  })

  it('lets an owner leave once a second owner exists', () => {
    expect(
      canLeaveGroup({ membership: { role: 'owner', status: 'active' }, activeOwnerCount: 2 }),
    ).toEqual({ ok: true })
  })

  it('404s when there is no membership to leave', () => {
    expect(canLeaveGroup({ membership: null, activeOwnerCount: 0 })).toMatchObject({
      ok: false,
      status: 404,
    })
  })
})

describe('canDeleteMessage', () => {
  const message = { authorId: 'author-1' }

  it('lets the author remove their own message', () => {
    expect(
      canDeleteMessage({ message, viewerId: 'author-1', membership: null }),
    ).toEqual({ ok: true })
  })

  it('lets a group moderator remove someone else’s', () => {
    expect(
      canDeleteMessage({
        message,
        viewerId: 'someone-else',
        membership: { role: 'moderator', status: 'active' },
      }),
    ).toEqual({ ok: true })
  })

  it('lets a site admin remove any message', () => {
    expect(
      canDeleteMessage({ message, viewerId: 'admin', membership: null, isSiteAdmin: true }),
    ).toEqual({ ok: true })
  })

  it('refuses an ordinary member', () => {
    expect(
      canDeleteMessage({
        message,
        viewerId: 'someone-else',
        membership: { role: 'member', status: 'active' },
      }),
    ).toMatchObject({ ok: false, status: 403 })
  })

  it('404s for a message that is not there', () => {
    expect(
      canDeleteMessage({ message: null, viewerId: 'x', membership: null, isSiteAdmin: true }),
    ).toMatchObject({ ok: false, status: 404 })
  })
})

describe('joinStatusFor', () => {
  it('maps visibility onto the membership a join creates', () => {
    expect(joinStatusFor('open')).toBe('active')
    expect(joinStatusFor('request')).toBe('pending')
    expect(joinStatusFor('private')).toBeNull()
  })
})
