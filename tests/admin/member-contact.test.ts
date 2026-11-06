import { describe, expect, it } from 'vitest'
import { memberContactMessage } from '@/lib/admin/member-contact'

describe('admin welcome and reminder emails', () => {
  it('personalizes an activation email with the issued code and expiry', () => {
    const message = memberContactMessage({ name: 'Ada', code: 'AFL-ABCDE-FGHIJ', template: 'welcome', origin: 'https://top100afl.com' })
    expect(message.text).toContain('Hello Ada')
    expect(message.text).toContain('AFL-ABCDE-FGHIJ')
    expect(message.text).toContain('expires in 7 days')
    expect(message.text).toContain('https://top100afl.com/signup')
  })
  it('directs activated members to their dashboard without a signup code', () => {
    const message = memberContactMessage({ name: 'Ada', template: 'reminder', origin: 'https://top100afl.com' })
    expect(message.text).toContain('https://top100afl.com/dashboard')
    expect(message.text).not.toContain('invite code')
    expect(message.text).toContain('Already completed')
  })
  it('escapes personal content in HTML', () => {
    const message = memberContactMessage({ name: '<img src=x onerror=alert(1)>', template: 'welcome', origin: 'https://top100afl.com' })
    expect(message.html).not.toContain('<img')
    expect(message.html).toContain('&lt;img')
  })
})
