import { describe, expect, it } from 'vitest'

import {
  passwordRecoveryRedirect,
  recoverySignInPath,
  requestPasswordRecovery,
  requestAdminPasswordRecovery,
  updateRecoveredPassword,
  validateAdminPassword,
} from '@/lib/auth-recovery'

describe('admin password recovery', () => {
  it('sends recovery emails back to the dedicated password update page', () => {
    expect(passwordRecoveryRedirect('https://www.top100afl.com/')).toBe(
      'https://www.top100afl.com/auth/update-password?source=admin',
    )
  })

  it('preserves whether recovery began from the member or admin sign-in', () => {
    expect(passwordRecoveryRedirect('https://www.top100afl.com/', 'member')).toBe(
      'https://www.top100afl.com/auth/update-password?source=member',
    )
    expect(recoverySignInPath('member', true)).toBe('/login?passwordReset=success')
    expect(recoverySignInPath('admin', true)).toBe('/admin/login?passwordReset=success')
  })

  it('requires a strong matching admin password', () => {
    expect(validateAdminPassword('short', 'short')).toBe(
      'Use at least 12 characters for your new password.',
    )
    expect(validateAdminPassword('A-secure-password-2026', 'different-password')).toBe(
      'The passwords do not match.',
    )
    expect(validateAdminPassword('A-secure-password-2026', 'A-secure-password-2026')).toBeNull()
  })

  it('requests a recovery email with the dedicated callback URL', async () => {
    const calls: unknown[] = []
    const auth = {
      async resetPasswordForEmail(email: string, options: { redirectTo: string }) {
        calls.push({ email, options })
        return { error: null }
      },
    }

    const error = await requestAdminPasswordRecovery(
      auth,
      'admin@top100afl.org',
      'https://www.top100afl.com',
    )

    expect(error).toBeNull()
    expect(calls).toEqual([
      {
        email: 'admin@top100afl.org',
        options: { redirectTo: 'https://www.top100afl.com/auth/update-password?source=admin' },
      },
    ])
  })

  it('requests member recovery with a member callback', async () => {
    const calls: unknown[] = []
    const auth = {
      async resetPasswordForEmail(email: string, options: { redirectTo: string }) {
        calls.push({ email, options })
        return { error: null }
      },
    }

    await requestPasswordRecovery(
      auth,
      'member@example.com',
      'https://www.top100afl.com',
      'member',
    )

    expect(calls).toEqual([
      {
        email: 'member@example.com',
        options: { redirectTo: 'https://www.top100afl.com/auth/update-password?source=member' },
      },
    ])
  })

  it('updates the recovered password before globally signing out', async () => {
    const calls: unknown[] = []
    const auth = {
      async updateUser(attributes: { password: string }) {
        calls.push({ updateUser: attributes })
        return { error: null }
      },
      async signOut(options: { scope: 'global' }) {
        calls.push({ signOut: options })
        return { error: null }
      },
    }

    const error = await updateRecoveredPassword(auth, 'A-secure-password-2026')

    expect(error).toBeNull()
    expect(calls).toEqual([
      { updateUser: { password: 'A-secure-password-2026' } },
      { signOut: { scope: 'global' } },
    ])
  })
})
