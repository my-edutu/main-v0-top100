import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const recovery = vi.hoisted(() => ({ generateLink: vi.fn(), sendEmail: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ auth: { admin: { generateLink: recovery.generateLink } } }) }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: recovery.sendEmail }))
import { sendPasswordRecoveryEmail } from '@/lib/auth/send-password-recovery-email'

import {
  getPostRecoveryPath,
  getRecoveryRequestOrigin,
  getRecoveryRedirectUrl,
} from '@/lib/auth/password-recovery'

const root = path.resolve(__dirname, '../..')
beforeEach(() => {
  vi.resetAllMocks()
  recovery.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'test-recovery-token' }, user: { user_metadata: {} } }, error: null })
  recovery.sendEmail.mockResolvedValue({ ok: true })
})

describe('password recovery', () => {
  it('builds a same-origin recovery callback for the requested console', () => {
    expect(getRecoveryRedirectUrl('https://www.top100afl.com', 'admin')).toBe(
      'https://www.top100afl.com/auth/reset-password?area=admin',
    )
    expect(getRecoveryRedirectUrl('http://localhost:3100/', 'member')).toBe(
      'http://localhost:3100/auth/reset-password?area=member',
    )
  })

  it('keeps localhost in development and uses the canonical site in production', () => {
    expect(
      getRecoveryRequestOrigin({
        browserOrigin: 'http://localhost:3100',
        canonicalSiteUrl: 'https://www.top100afl.com',
        isProduction: false,
      }),
    ).toBe('http://localhost:3100')

    expect(
      getRecoveryRequestOrigin({
        browserOrigin: 'https://preview.example.com',
        canonicalSiteUrl: 'https://www.top100afl.com/',
        isProduction: true,
      }),
    ).toBe('https://www.top100afl.com')
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

  it('generates a portable recovery token server-side and sends the correct account-area callback', async () => {
    await expect(sendPasswordRecoveryEmail({ email: 'admin@example.com', origin: 'https://www.top100afl.com', area: 'admin' })).resolves.toEqual({ ok: true })
    expect(recovery.generateLink).toHaveBeenCalledWith({ type: 'recovery', email: 'admin@example.com', options: { redirectTo: 'https://www.top100afl.com/auth/reset-password?area=admin' } })
    const email = recovery.sendEmail.mock.calls[0][0]
    expect(email.to).toBe('admin@example.com')
    const url = new URL(email.text.split('\n').find((line: string) => line.startsWith('https://')))
    expect(url.pathname).toBe('/auth/reset-password')
    expect(url.searchParams.get('area')).toBe('admin')
    expect(new URLSearchParams(url.hash.slice(1)).get('token_hash')).toBe('test-recovery-token')
    expect(new URLSearchParams(url.hash.slice(1)).get('type')).toBe('recovery')
  })
  it('does not send a recovery email when token generation fails', async () => {
    recovery.generateLink.mockResolvedValue({ data: null, error: { code: 'user_not_found' } })
    await expect(sendPasswordRecoveryEmail({ email: 'missing@example.com', origin: 'https://www.top100afl.com', area: 'member' })).resolves.toMatchObject({ ok: false, stage: 'token' })
    expect(recovery.sendEmail).not.toHaveBeenCalled()
  })

  it('keeps both password visibility controls obvious and accessible', () => {
    const reset = readFileSync(path.join(root, 'app/auth/reset-password/page.tsx'), 'utf8')
    expect(reset).toContain("aria-label={showPassword ? 'Hide new password' : 'Show new password'}")
    expect(reset).toContain("aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}")
    expect(reset).toContain('h-5 w-5 stroke-[2.25]')
  })
})
