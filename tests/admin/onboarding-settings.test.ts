import { describe, expect, it } from 'vitest'

import {
  DEFAULT_AWARDEE_JOURNEY_SETTINGS,
  validateAwardeeJourneySettings,
} from '@/lib/dashboard/awardee-journey-settings'

describe('awardee journey admin settings', () => {
  it('provides the founder welcome, verified LinkedIn destinations, and fixed campaign prices', () => {
    expect(DEFAULT_AWARDEE_JOURNEY_SETTINGS.founderLinkedinUrl).toBe('https://www.linkedin.com/in/paul-light-/')
    expect(DEFAULT_AWARDEE_JOURNEY_SETTINGS.organizationLinkedinUrl).toBe('https://www.linkedin.com/company/top100africa/')
    expect(DEFAULT_AWARDEE_JOURNEY_SETTINGS.facebookUrl).toBeNull()
    expect(DEFAULT_AWARDEE_JOURNEY_SETTINGS.instagramUrl).toBeNull()
    expect(DEFAULT_AWARDEE_JOURNEY_SETTINGS.magazineCampaign.ngnAmountMinor).toBe(1_000_000)
    expect(DEFAULT_AWARDEE_JOURNEY_SETTINGS.magazineCampaign.usdAmountMinor).toBe(1_000)
    expect(DEFAULT_AWARDEE_JOURNEY_SETTINGS.welcomeBody.length).toBeGreaterThan(500)
  })

  it('accepts approved HTTPS social destinations and immutable amount units', () => {
    const result = validateAwardeeJourneySettings({
      ...DEFAULT_AWARDEE_JOURNEY_SETTINGS,
      facebookUrl: 'https://www.facebook.com/africa.future.leaders',
      instagramUrl: 'https://www.instagram.com/africa.future.leaders/',
    })

    expect(result.ok).toBe(true)
  })

  it.each([
    ['javascript URL', { founderLinkedinUrl: 'javascript:alert(1)' }],
    ['wrong LinkedIn host', { organizationLinkedinUrl: 'https://linkedin.example/fake' }],
    ['non-HTTPS social page', { instagramUrl: 'http://instagram.com/afl' }],
    ['oversized welcome', { welcomeBody: 'x'.repeat(6001) }],
    ['client-selected price', { magazineCampaign: { ...DEFAULT_AWARDEE_JOURNEY_SETTINGS.magazineCampaign, ngnAmountMinor: 1 } }],
    ['invalid campaign slug', { magazineCampaign: { ...DEFAULT_AWARDEE_JOURNEY_SETTINGS.magazineCampaign, id: 'bad slug' } }],
  ])('rejects %s', (_label, patch) => {
    const result = validateAwardeeJourneySettings({
      ...DEFAULT_AWARDEE_JOURNEY_SETTINGS,
      ...patch,
    })

    expect(result.ok).toBe(false)
  })
})
