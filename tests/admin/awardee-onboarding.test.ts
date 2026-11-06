import { describe, expect, it } from 'vitest'
import { getAwardeeOnboardingStatus } from '@/lib/admin/awardee-onboarding'

describe('awardee onboarding groups', () => {
  it('keeps legacy profiles without a signup account unactivated', () => {
    expect(getAwardeeOnboardingStatus()).toBe('not-activated')
    expect(getAwardeeOnboardingStatus({ user_id: null, bio: 'Imported biography' })).toBe('not-activated')
  })
  it('ignores signup defaults and empty content', () => {
    expect(getAwardeeOnboardingStatus({ user_id: 'user', headline: 'Top100 Africa Future Leaders awardee', social_links: { website: ' ' }, achievements: [] })).toBe('empty')
  })
  it('recognizes text, images and nested profile details', () => {
    for (const detail of [{ bio: 'Biography' }, { avatar_url: 'photo.jpg' }, { social_links: { website: 'https://example.com' } }, { achievements: [{ title: 'Award' }] }]) {
      expect(getAwardeeOnboardingStatus({ user_id: 'user', ...detail })).toBe('has-details')
    }
  })
})
