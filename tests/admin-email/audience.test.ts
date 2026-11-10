import { expect, it } from 'vitest'
import { emailTemplateEligible } from '@/lib/admin-email/audience'
import type { OutreachMember } from '@/lib/awards/outreach'
const member = { state: 'paid', suppressed: false, deliveryHeld: false, emailable: true, lastContactedAt: null } as OutreachMember
it('allows a general email to paid members while respecting suppressions and recent contact', () => {
  expect(emailTemplateEligible(member, 'general')).toBe(true)
  expect(emailTemplateEligible({ ...member, suppressed: true }, 'general')).toBe(false)
  expect(emailTemplateEligible({ ...member, deliveryHeld: true }, 'general')).toBe(false)
  expect(emailTemplateEligible({ ...member, lastContactedAt: new Date().toISOString() }, 'general')).toBe(false)
})
it('preserves award-specific eligibility rules', () => {
  expect(emailTemplateEligible(member, 'awareness')).toBe(false)
  expect(emailTemplateEligible({ ...member, state: 'not_started' }, 'awareness')).toBe(true)
})
it('previews only named eligible recipients and gives a stable audience key', async () => {
  const { selectEmailAudience } = await import('@/lib/admin-email/audience')
  const common = { ...member, id: '1', awardeeIds: ['1'], name: 'Ada', email: 'ada@example.org', years: [2026], phone: '', country: '', owner: '' } as OutreachMember
  const missing = { ...common, id: '2', name: 'Awardee', email: 'unknown@example.org' }
  const result = selectEmailAudience([common, missing], { year: '2026', segment: 'all', search: '' }, 'general', 50)
  expect(result.selected.map(x => x.name)).toEqual(['Ada']); expect(result.audienceKey).toHaveLength(64)
})
