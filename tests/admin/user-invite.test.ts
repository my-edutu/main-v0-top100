import { describe, expect, it } from 'vitest'

import {
  buildAdminInviteMetadata,
  getAdminInviteRedirectUrl,
  normalizeAdminInviteInput,
} from '@/lib/admin/user-invite'

describe('normalizeAdminInviteInput', () => {
  it('normalizes a valid invitation without allowing a caller to choose a non-admin role', () => {
    expect(normalizeAdminInviteInput({ email: '  NEW.ADMIN@EXAMPLE.COM ', fullName: '  Ada Admin  ' })).toEqual({
      email: 'new.admin@example.com',
      fullName: 'Ada Admin',
      role: 'admin',
    })
  })

  it('rejects malformed or missing email addresses', () => {
    expect(() => normalizeAdminInviteInput({ email: 'not-an-email' })).toThrow('Enter a valid email address.')
    expect(() => normalizeAdminInviteInput({ email: '' })).toThrow('Email is required.')
  })

  it('rejects names that are too long', () => {
    expect(() => normalizeAdminInviteInput({ email: 'admin@example.com', fullName: 'a'.repeat(121) })).toThrow('Name must be 120 characters or fewer.')
  })
})

describe('admin invite redirects', () => {
  it('uses the configured site origin and admin invite callback', () => {
    expect(getAdminInviteRedirectUrl('https://www.top100afl.com')).toBe('https://www.top100afl.com/auth/update-password?source=admin')
    expect(getAdminInviteRedirectUrl('http://localhost:3100/')).toBe('http://localhost:3100/auth/update-password?source=admin')
  })
})

describe('buildAdminInviteMetadata', () => {
  it('marks invited accounts as admins while preserving the display name', () => {
    expect(buildAdminInviteMetadata({ email: 'admin@example.com', fullName: 'Ada Admin', role: 'admin' })).toEqual({
      full_name: 'Ada Admin',
      role: 'admin',
    })
  })
})
