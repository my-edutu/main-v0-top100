import { afterEach, expect, it, vi } from 'vitest'
import { contactCodeDigest, contactCodeMessage } from '@/lib/team-operations/contact-code.server'

afterEach(() => vi.unstubAllEnvs())

it('binds a code to its recipient, contact token, challenge and secret', () => {
  vi.stubEnv('CONTACT_CONFIRMATION_SECRET', 'a-long-test-only-contact-confirmation-secret')
  const digest = contactCodeDigest('token', 'recipient', 'challenge', '123456')
  expect(digest).toMatch(/^[a-f0-9]{64}$/)
  for (const args of [['other-token', 'recipient', 'challenge', '123456'], ['token', 'rep', 'challenge', '123456'], ['token', 'recipient', 'old-challenge', '123456'], ['token', 'recipient', 'challenge', '000000']]) {
    expect(contactCodeDigest(...args as [string, string, string, string])).not.toBe(digest)
  }
  vi.stubEnv('CONTACT_CONFIRMATION_SECRET', 'another-long-test-only-contact-confirmation-secret')
  expect(contactCodeDigest('token', 'recipient', 'challenge', '123456')).not.toBe(digest)
})

it('fails closed without a sufficiently long signing secret', () => {
  vi.stubEnv('CONTACT_CONFIRMATION_SECRET', '')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'short')
  expect(() => contactCodeDigest('token', 'recipient', 'challenge', '123456')).toThrow()
})

it('escapes rep text in HTML and keeps the code out of the subject', () => {
  const message = contactCodeMessage('123456', '<img src=x onerror=alert(1)>', 'whatsapp')
  expect(message.subject).not.toContain('123456')
  expect(message.html).not.toContain('<img')
  expect(message.html).toContain('&lt;img')
  expect(message.text).toContain('Never share it with a rep')
})
