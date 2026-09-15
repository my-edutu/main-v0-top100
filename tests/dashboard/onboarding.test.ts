import { describe, expect, it } from 'vitest'
import {
  finishDashboardOnboarding,
  onboardingComplete,
  validateOnboarding,
} from '@/lib/dashboard/onboarding'

const profile = { headline: 'Community organiser', location: 'Lagos, Nigeria', field: 'Education', bio: 'I support young people with mentoring and access to learning opportunities.' }
describe('mandatory onboarding', () => {
  it('does not treat populated legacy profiles as completed onboarding', () => {
    expect(onboardingComplete(null)).toBe(false)
    expect(onboardingComplete({ ...profile })).toBe(false)
    expect(onboardingComplete({ onboardingCompletedAt: 'invalid' })).toBe(false)
  })
  it('requires a saved completion timestamp', () => {
    expect(onboardingComplete({ onboardingCompletedAt: '2026-09-06T10:00:00.000Z' })).toBe(true)
  })
  it('opens the real dashboard immediately after onboarding completes', () => {
    const completedMember = { id: 'member-one' }
    const replaced: unknown[] = []
    const destinations: string[] = []

    finishDashboardOnboarding(
      completedMember,
      member => replaced.push(member),
      destination => destinations.push(destination),
    )

    expect(replaced).toEqual([completedMember])
    expect(destinations).toEqual(['/dashboard'])
  })
  it('rejects missing, whitespace-only, short and oversized fields before completion', () => {
    expect(validateOnboarding(profile)).toBeNull()
    for (const key of ['headline', 'location', 'field']) expect(validateOnboarding({ ...profile, [key]: ' ' })).not.toBeNull()
    expect(validateOnboarding({ ...profile, field: 'Education, Climate Action' })).toBeNull()
    expect(validateOnboarding({ ...profile, field: Array.from({ length: 11 }, (_, index) => `Interest ${index}`).join(', ') })).toContain('no more than 10')
    expect(validateOnboarding({ ...profile, bio: '' })).toBeNull()
    expect(validateOnboarding({ ...profile, bio: 'Too short' })).not.toBeNull()
    expect(validateOnboarding({ ...profile, headline: 'a'.repeat(161) })).not.toBeNull()
  })
})
