import { describe, expect, it } from 'vitest'

import { buildSignupProfile } from '@/lib/auth/signup-profile'

describe('signup profile persistence', () => {
  it('writes both UUID identity columns required by the live profile schema', () => {
    const userId = '11b7e533-cc9e-4792-a5a8-428a746ae634'

    const profile = buildSignupProfile({
      userId,
      email: 'awardee@example.com',
      name: 'Ada Awardee',
      headline: '',
      slug: 'ada-awardee',
      accessCode: 'afl-ready',
      awardee: {
        country: 'Nigeria',
        course: 'Engineering',
        bio: 'Builder',
        image_url: 'https://example.com/ada.jpg',
      },
    })

    expect(profile).toMatchObject({
      id: userId,
      user_id: userId,
      email: 'awardee@example.com',
      access_code: 'AFL-READY',
    })
  })
})
