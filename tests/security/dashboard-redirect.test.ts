import { describe, expect, it } from 'vitest'

import { sanitizeDashboardRedirect } from '@/lib/dashboard/redirect'

describe('dashboard redirect sanitization', () => {
  it('keeps a nested same-origin dashboard path and query', () => {
    expect(
      sanitizeDashboardRedirect('/dashboard/messages/conversation-1?view=compact&unread=1'),
    ).toBe('/dashboard/messages/conversation-1?view=compact&unread=1')
  })

  it.each([
    '//evil.example/dashboard',
    '/\\evil.example',
    '/%5Cevil.example',
    'https://evil.example/dashboard',
    'https://user:password@evil.example/dashboard',
    '/dashboard/messages\r\nLocation: https://evil.example',
    '/dashboard/messages%0D%0ALocation:%20https://evil.example',
  ])('uses the safe fallback for %s', (requestedPath) => {
    expect(sanitizeDashboardRedirect(requestedPath)).toBe('/dashboard')
  })

  it('lets the normal sign-in flow retain its role-based fallback', () => {
    expect(sanitizeDashboardRedirect('/\\evil.example', '')).toBe('')
  })
})
