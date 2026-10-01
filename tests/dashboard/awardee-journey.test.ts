import { describe, expect, it } from 'vitest'

import { deriveAwardeeJourney } from '@/lib/dashboard/awardee-journey'

const profile = {
  fullName: 'Ama Mensah',
  headline: 'Founder and community builder',
  bio: 'I build opportunities for young people across Ghana.',
  location: 'Accra, Ghana',
  organization: 'Open Path',
  field: 'Education',
  avatarUrl: 'https://media.example/ama.webp',
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    profile: { ...profile, headline: '', bio: '', avatarUrl: null },
    welcomeReadAt: null,
    hasPublishedIntroPost: false,
    externalShareConfirmedAt: null,
    externalSharePlatform: null,
    magazine: { paymentStatus: 'unpaid', applicationStatus: null },
    award: { paymentStatus: 'unpaid', certificateAvailable: false },
    ...overrides,
  }
}

describe('awardee journey progress', () => {
  it('starts with three core steps and recommends the founder welcome', () => {
    const state = deriveAwardeeJourney(input())

    expect(state.progress).toEqual({ completed: 0, total: 3, percent: 0 })
    expect(state.nextStepId).toBe('welcome')
    expect(state.coreSteps.map((step) => step.id)).toEqual(['welcome', 'profile', 'introduction'])
  })

  it('counts only persisted welcome, complete profile with avatar, and published intro post', () => {
    const state = deriveAwardeeJourney(input({
      profile,
      welcomeReadAt: '2026-09-23T10:00:00.000Z',
      hasPublishedIntroPost: true,
    }))

    expect(state.progress).toEqual({ completed: 3, total: 3, percent: 100 })
    expect(state.nextStepId).toBeNull()
    expect(state.coreSteps.every((step) => step.complete)).toBe(true)
  })

  it('does not count a partial profile or missing uploaded avatar as complete', () => {
    const state = deriveAwardeeJourney(input({
      profile: { ...profile, bio: '', avatarUrl: null },
      welcomeReadAt: '2026-09-23T10:00:00.000Z',
      hasPublishedIntroPost: true,
    }))

    expect(state.progress.completed).toBe(2)
    expect(state.coreSteps.find((step) => step.id === 'profile')?.complete).toBe(false)
    expect(state.nextStepId).toBe('profile')
  })

  it('counts the profile checklist complete when BIO and photo are saved; optional details are not blockers', () => {
    const state = deriveAwardeeJourney(input({
      profile: { ...profile, headline: '', location: '', organization: '', field: '' },
    }))

    expect(state.coreSteps.find((step) => step.id === 'profile')?.complete).toBe(true)
  })

  it('keeps optional opportunities, magazine payment, and award milestones outside core progress', () => {
    const state = deriveAwardeeJourney(input({
      profile,
      welcomeReadAt: '2026-09-23T10:00:00.000Z',
      hasPublishedIntroPost: true,
      magazine: { paymentStatus: 'paid', applicationStatus: 'pending' },
      award: { paymentStatus: 'unpaid', certificateAvailable: false },
    }))

    expect(state.progress.completed).toBe(3)
    expect(state.recommendedActions.find((step) => step.id === 'opportunities')?.complete).toBe(false)
    expect(state.recommendedActions.find((step) => step.id === 'magazine')?.status).toBe('Application submitted')
    expect(state.recommendedActions.find((step) => step.id === 'award')).toMatchObject({
      label: 'Get your award',
      complete: false,
      status: 'Award payment needed',
    })
  })

  it('keeps the award priority visible with its confirmed payment status', () => {
    const state = deriveAwardeeJourney(input({
      award: { paymentStatus: 'paid', certificateAvailable: false },
    }))

    expect(state.recommendedActions.find((step) => step.id === 'award')).toMatchObject({
      label: 'Get your award',
      complete: false,
      status: 'Award fee paid',
    })
  })

  it('labels a member-confirmed external share as self-reported', () => {
    const state = deriveAwardeeJourney(input({
      externalShareConfirmedAt: '2026-09-23T11:00:00.000Z',
      externalSharePlatform: 'linkedin',
    }))

    expect(state.shareConfirmation).toEqual({ platform: 'linkedin', label: 'Marked complete by you' })
    expect(state.coreSteps.find((step) => step.id === 'introduction')?.complete).toBe(false)
  })
})
