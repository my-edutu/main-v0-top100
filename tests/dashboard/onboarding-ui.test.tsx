import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { MemberProfile } from '@/lib/member-hub'

vi.mock('@/app/dashboard/dashboard-header', () => ({
  SignOutControl: () => null,
}))
vi.mock('@/app/dashboard/_components/onboarding-welcome', () => ({
  OnboardingWelcome: () => null,
}))

import { Onboarding } from '@/app/dashboard/_components/onboarding'

function renderOnboarding(overrides: Partial<MemberProfile> = {}) {
  const member = {
    id: 'member-1',
    name: 'Romanus',
    headline: 'Community organiser',
    location: 'Nigeria',
    field: 'Education',
    bio: 'A short bio.',
    onboardingStep: 3,
    onboardingWelcomeSeenAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  } as MemberProfile

  return renderToStaticMarkup(
    <Onboarding member={member} onComplete={() => undefined} />,
  )
}

describe('onboarding Bio context', () => {
  it('shows Bio as optional and removes the browser minimum-length gate', () => {
    const markup = renderOnboarding()
    const textarea = markup.match(/<textarea[^>]*>/)?.[0] ?? ''

    expect(markup).toContain('Your Bio is optional and can be added or updated later.')
    expect(markup).toContain('characters · optional')
    expect(markup).toContain('Your earlier answers are saved. Continue to save this Bio; you can add or update it later from your profile.')
    expect(markup).not.toContain('Keep this page open')
    expect(textarea).not.toContain('required')
    expect(textarea).not.toContain('minlength')
    expect(textarea).toContain('maxLength="2000"')
  })

  it('explains in the final review that an empty Bio can be added later', () => {
    const markup = renderOnboarding({ onboardingStep: 4, bio: '' })

    expect(markup).toContain('You can add your Bio later from your profile.')
    expect(markup).toContain('Review your details and complete setup to open your awardee dashboard.')
    expect(markup).toContain('Complete setup')
  })
})
