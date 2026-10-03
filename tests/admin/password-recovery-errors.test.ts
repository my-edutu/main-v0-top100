import { describe, expect, it } from 'vitest'
import { passwordUpdateErrorMessage } from '@/lib/auth/password-recovery'

describe('password recovery update failures', () => {
  it('keeps password validation errors separate from an expired link', () => {
    expect(passwordUpdateErrorMessage({ code: 'same_password', status: 422 })).toMatch(/different/)
    expect(passwordUpdateErrorMessage({ code: 'weak_password', status: 422 })).toMatch(/stronger/)
    expect(passwordUpdateErrorMessage({ status: 429 })).toMatch(/wait/)
  })
  it('explains when another recovery link is needed', () => {
    expect(passwordUpdateErrorMessage({ code: 'session_not_found' })).toMatch(/Request a new one/)
    expect(passwordUpdateErrorMessage({ status: 401 })).toMatch(/Request a new one/)
  })
  it('does not describe network or server failures as expired links', () => {
    expect(passwordUpdateErrorMessage({ status: 500 })).toMatch(/try again/)
    expect(passwordUpdateErrorMessage({ status: 500 })).not.toMatch(/expired/)
  })
})
