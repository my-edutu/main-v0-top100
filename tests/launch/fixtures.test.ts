import { describe, expect, it } from 'vitest'

import {
  buildLaunchSmokeFixtures,
  isClearlyTestEmail,
} from '@/lib/launch-smoke/fixtures'

describe('launch smoke fixtures', () => {
  it('builds clearly labelled, deterministic launch records', () => {
    const fixtures = buildLaunchSmokeFixtures(
      'team+launch-smoke@example.com',
      new Date('2026-09-04T08:00:00.000Z'),
    )

    expect(fixtures.invite).toEqual({
      email: 'team+launch-smoke@example.com',
      label: '[Launch Smoke] 2026-09-04 awardee invite',
      usesLeft: 1,
      expiresInDays: 2,
    })
    expect(fixtures.opportunity).toMatchObject({
      title: '[Launch Smoke] Leadership Impact Fellowship',
      slug: 'launch-smoke-leadership-impact-fellowship-20260904',
      visibility: 'members',
      status: 'published',
      deadline: '2026-10-04',
    })
    expect(fixtures.notification).toMatchObject({
      title: 'Welcome to the launch check',
      category: 'launch-smoke',
      cta_url: '/dashboard/discover/opportunities',
    })
  })

  it('rejects ordinary personal-looking addresses for production fixture writes', () => {
    expect(isClearlyTestEmail('person@gmail.com')).toBe(false)
    expect(isClearlyTestEmail('not-an-email')).toBe(false)
    expect(isClearlyTestEmail('team+launch-smoke@example.com')).toBe(true)
    expect(isClearlyTestEmail('qa-test@top100afl.com')).toBe(true)
  })

  it('throws before building fixtures for an unsafe address', () => {
    expect(() => buildLaunchSmokeFixtures('person@gmail.com')).toThrow(
      'LAUNCH_SMOKE_EMAIL must be a clearly labelled test address.',
    )
  })
})
