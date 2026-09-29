import { describe, expect, it } from 'vitest'
import { mapPublicAwardee } from '@/lib/admin-social/profile'

describe('mapPublicAwardee', () => {
  it('builds the public profile URL and prefers the portfolio cover', () => {
    const profile = mapPublicAwardee({
      awardee_id: 'awardee-1',
      profile_id: 'profile-1',
      slug: 'amara-okafor',
      name: 'Amara Okafor',
      bio: 'Building climate solutions.',
      portfolio_cover_url: 'https://cdn.example/cover.png',
      avatar_url: 'https://cdn.example/avatar.png',
      is_public: true,
    }, 'https://afl.example')

    expect(profile).toEqual({
      awardeeId: 'awardee-1',
      profileId: 'profile-1',
      slug: 'amara-okafor',
      name: 'Amara Okafor',
      bio: 'Building climate solutions.',
      headline: '',
      country: '',
      fieldOfStudy: '',
      cohort: '',
      year: null,
      achievements: [],
      impactProjects: null,
      livesImpacted: null,
      awardsReceived: null,
      updatedAt: null,
      profileUrl: 'https://afl.example/awardees/amara-okafor',
      imageUrl: 'https://cdn.example/cover.png',
      imageSource: 'portfolio-cover',
      isPublic: true,
    })
  })

  it('falls back to public avatar and omits private and hidden awardee fields', () => {
    const profile = mapPublicAwardee({
      awardee_id: 'awardee-2',
      slug: 'hidden-leader',
      name: 'Hidden Leader',
      email: 'private@example.com',
      personal_email: 'personal@example.com',
      bio: null,
      portfolio_cover_url: null,
      cover_image_url: 'https://cdn.example/avatar.png',
      is_public: false,
    }, 'https://afl.example')

    expect(profile).toMatchObject({ imageSource: 'profile-photo', imageUrl: 'https://cdn.example/avatar.png', isPublic: false })
    expect(profile).not.toHaveProperty('email')
    expect(profile).not.toHaveProperty('personal_email')
  })

  it('does not invent an image when no public image is available', () => {
    const profile = mapPublicAwardee({ awardee_id: 'awardee-3', slug: 'leader', name: 'Leader', is_public: true }, 'https://afl.example')
    expect(profile.imageUrl).toBeNull()
    expect(profile.imageSource).toBe('none')
  })
})
