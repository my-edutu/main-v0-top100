import { describe, expect, it } from 'vitest'
import { profileCheckFeedback } from '@/lib/auth-utils'

describe('profile access feedback', () => {
  it('does not call a blocked origin request an awardee eligibility failure', () => {
    expect(profileCheckFeedback(403, { message: 'Cross-origin request blocked.' })).not.toContain('Awardee privileges')
    expect(profileCheckFeedback(403, { message: 'Cross-origin request blocked.' })).toContain('verify')
  })
  it('reports a verified access denial separately', () => {
    expect(profileCheckFeedback(403, { error: 'Access denied.' })).toContain('Awardee privileges')
  })
  it('does not infer ineligibility from an unknown forbidden response', () => {
    expect(profileCheckFeedback(403, {})).not.toContain('Awardee privileges')
  })
})
