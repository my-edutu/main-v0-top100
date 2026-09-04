import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  getPostRecoveryPath,
  getRecoveryRedirectUrl,
} from '@/lib/auth/password-recovery'

const root = path.resolve(__dirname, '../..')

describe('password recovery', () => {
  it('builds a same-origin recovery callback for the requested console', () => {
    expect(getRecoveryRedirectUrl('https://www.top100afl.com', 'admin')).toBe(
      'https://www.top100afl.com/auth/reset-password?area=admin',
    )
    expect(getRecoveryRedirectUrl('http://localhost:3100/', 'member')).toBe(
      'http://localhost:3100/auth/reset-password?area=member',
    )
  })

  it('returns the correct sign-in destination after a password update', () => {
    expect(getPostRecoveryPath('admin')).toBe('/admin/login?reset=success')
    expect(getPostRecoveryPath('member')).toBe('/login?reset=success')
  })

  it('exposes an active recovery action on the admin login screen', () => {
    const source = readFileSync(path.join(root, 'app/admin/login/page-content.tsx'), 'utf8')
    expect(source).toContain("href=\"/auth/forgot-password?area=admin\"")
    expect(source).toContain("searchParams.get('reset')")
  })

  it('implements both recovery Supabase operations', () => {
    const forgot = readFileSync(path.join(root, 'app/auth/forgot-password/page.tsx'), 'utf8')
    const reset = readFileSync(path.join(root, 'app/auth/reset-password/page.tsx'), 'utf8')
    expect(forgot).toContain('resetPasswordForEmail')
    expect(reset).toContain('updateUser({ password })')
  })
})
