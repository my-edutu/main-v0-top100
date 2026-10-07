import { describe, expect, it } from 'vitest'
import { validateSocialLinks } from '@/lib/profile-contact'
import { buildProfileUpdate, mapProfileToMember } from '@/lib/member-hub-server'
describe('profile contact preferences', () => {
  it('allows up to three secure links and removal', () => {
    expect(validateSocialLinks([])).toBeNull()
    expect(validateSocialLinks([{ platform: 'linkedin', url: 'https://linkedin.com/in/member' }])).toBeNull()
    expect(validateSocialLinks(Array(4).fill({ platform: 'website', url: 'https://example.com' }))).toBeTruthy()
  })
  it('rejects unsafe URLs and duplicate platforms', () => {
    expect(validateSocialLinks([{ platform: 'website', url: 'javascript:alert(1)' }])).toBeTruthy()
    expect(validateSocialLinks([{ platform: 'website', url: 'https://user:password@example.com' }])).toBeTruthy()
    expect(validateSocialLinks(Array(2).fill({ platform: 'linkedin', url: 'https://linkedin.com' }))).toBeTruthy()
  })
  it('preserves unrelated settings and permits withdrawing consent', () => {
    const result = buildProfileUpdate({ socialLinks: [], socialLinksConsent: false, contactEmailConsent: false }, { eventReminders: true })
    expect(result.prefs.eventReminders).toBe(true)
    expect(result.preferencePatch).toEqual({ socialLinks: [], socialLinksConsent: false, contactEmailConsent: false })
    const member = mapProfileToMember({ id: 'one', notification_prefs: {} })
    expect(member.socialLinksConsent).toBe(false)
    expect(member.contactEmailConsent).toBe(false)
  })
})
