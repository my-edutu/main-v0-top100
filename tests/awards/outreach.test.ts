import { describe, expect, it } from 'vitest'
import { buildOutreachAudience, filterOutreachAudience, outreachCsv, type OutreachSource } from '@/lib/awards/outreach'
import { buildOutreachMessage, defaultOutreachDraft, templateEligible } from '@/lib/awards/outreach-templates'

const source = (): OutreachSource => ({
  awardees: [
    { id: 'a', name: 'Paid', email: 'PAID@example.com', year: 2026, profile_id: 'p' },
    { id: 'a-duplicate', name: 'Paid again', email: 'paid@example.com', year: 2023, profile_id: null },
    { id: 'b', name: 'New member', email: 'new@example.com', year: 2026, profile_id: null },
    { id: 'c', name: 'Retry', email: 'retry@example.com', year: 2026, profile_id: 'q' },
    { id: 'd', name: 'Review', email: 'review@example.com', year: 2026, profile_id: 'r' },
  ],
  profiles: [{ id: 'p', email: 'paid@example.com', full_name: 'Paid' }, { id: 'q', email: 'retry@example.com' }, { id: 'r', email: 'review@example.com' }],
  orders: [
    { id: 'old', profile_id: 'p', status: 'draft', awardPaymentVerified: false },
    { id: 'paid', profile_id: 'p', status: 'paid', awardPaymentVerified: true },
    { id: 'retry', profile_id: 'q', status: 'awaiting_payment', awardPaymentVerified: false },
    { id: 'review', profile_id: 'r', status: 'paid', awardPaymentVerified: false, awardPaymentStatus: 'paid' },
  ], contacts: [],
})

describe('award outreach audience', () => {
  it('counts unique eligible people, retains cohort membership and honors payment across all orders', () => {
    const audience = buildOutreachAudience(source())
    expect(audience).toHaveLength(4)
    expect(filterOutreachAudience(audience, { year: '2026', segment: 'unpaid' }).map(r => r.id)).toEqual(['b', 'c', 'd'])
    expect(filterOutreachAudience(audience, { year: '2023', segment: 'paid' }).map(r => r.id)).toEqual(['a'])
    expect(filterOutreachAudience(audience, { year: '2026', segment: 'recovery' }).map(r => r.id)).toEqual(['c'])
  })
  it('separates no profile, no order, verification and historically unknown visits', () => {
    const audience = buildOutreachAudience(source())
    expect(filterOutreachAudience(audience, { year: '2026', segment: 'no_profile' }).map(r => r.id)).toEqual(['b'])
    expect(filterOutreachAudience(audience, { year: '2026', segment: 'not_started' }).map(r => r.id)).toEqual(['b'])
    expect(filterOutreachAudience(audience, { year: '2026', segment: 'verification' }).map(r => r.id)).toEqual(['d'])
    expect(filterOutreachAudience(audience, { year: '2026', segment: 'not_clicked' })).toEqual([])
  })
  it('matches a profile by normalized email without falsely calling its owner unregistered', () => {
    const s = source(); s.profiles.push({ id: 'new-profile', email: ' NEW@example.com ' })
    expect(buildOutreachAudience(s).find(r => r.id === 'b')?.profileId).toBe('new-profile')
  })
  it.each(['pending', 'refunded'])('holds %s award payments for verification', status => {
    const s = source(); s.orders.find(o => o.id === 'retry')!.awardPaymentStatus = status
    const member = buildOutreachAudience(s).find(m => m.id === 'c')!
    expect(member.state).toBe('verification')
    expect(templateEligible(member, 'recovery')).toBe(false)
  })
  it.each(['creating', 'open', 'pending'])('does not request another payment during a %s checkout', status => {
    const s = source(); s.orders.find(o => o.id === 'retry')!.paymentStatus = status
    expect(buildOutreachAudience(s).find(m => m.id === 'c')?.state).toBe('verification')
  })
  it('matches paid evidence by explicit awardee identity even when billing contacts changed', () => {
    const s = source(); s.orders = [{ id: 'paid-direct', awardee_id: 'b', email: 'old-billing@example.com', awardPaymentVerified: true }]
    expect(buildOutreachAudience(s).find(m => m.id === 'b')?.state).toBe('paid')
  })
  it('keeps paid suppression and notes when duplicate awardee records have different emails', () => {
    const s = source(); s.awardees.push({ id: 'other', name: 'Paid duplicate', email: 'other@example.com', year: 2026, profile_id: 'p' })
    s.contacts.push({ awardee_id: 'other', suppressed: true, tracking_started_at: '2026-11-01T00:00:00Z', first_clicked_at: null })
    const row = buildOutreachAudience(s).find(r => r.id === 'a')!
    expect(row).toMatchObject({ state: 'paid', suppressed: true, visit: 'not_clicked' })
    expect(filterOutreachAudience([row], { year: '2026', segment: 'unpaid' })).toEqual([])
  })
  it('escapes CSV formulas, commas, quotes and multiline values', () => {
    expect(outreachCsv([{ Email: 'safe@example.com', Name: '=1+1', Notes: 'Hello, "friend"\nNext' }]))
      .toBe('\uFEFF"Email","Name","Notes"\r\n"safe@example.com","\'=1+1","Hello, ""friend""\nNext"')
  })
  it('keeps recent contacts out of new batches and allows due follow-ups', () => {
    const member = buildOutreachAudience(source()).find(m => m.id === 'c')!
    expect(templateEligible({ ...member, lastContactedAt: '2026-11-01T12:00:00Z' }, 'recovery', Date.parse('2026-11-02T12:00:00Z'))).toBe(false)
    expect(templateEligible({ ...member, lastContactedAt: '2026-10-28T12:00:00Z' }, 'follow_up', Date.parse('2026-11-02T12:00:00Z'))).toBe(true)
  })
  it('holds uncertain delivery out of email exports and future campaign selection until reviewed', () => {
    const s = source(); s.deliveryHeldEmails = ['retry@example.com']
    const member = buildOutreachAudience(s).find(m => m.id === 'c')!
    expect(member.deliveryHeld).toBe(true)
    expect(templateEligible(member, 'recovery')).toBe(false)
  })
  it('uses the latest contact across duplicate rows even when an older row contains notes', () => {
    const s = source(); s.contacts = [{ awardee_id: 'a', notes: 'Old notes', last_contacted_at: '2026-10-01T12:00:00Z' }, { awardee_id: 'a-duplicate', last_contacted_at: '2026-11-02T12:00:00Z' }]
    expect(buildOutreachAudience(s).find(m => m.id === 'a')?.lastContactedAt).toBe('2026-11-02T12:00:00Z')
  })
})

describe('outreach templates', () => {
  it('renders personalized escaped HTML and plain text with server supplied links and fees', () => {
    const draft = defaultOutreachDraft('awareness')
    const message = buildOutreachMessage(draft, { name: '<Alice>', year: '2023', fee: '₦25,000 / $20', actionUrl: 'https://www.top100afl.com/signup', stopUrl: 'https://www.top100afl.com/stop', imageUrl: 'https://www.top100afl.com/afl-physical-award.png' })
    expect(message.html).toContain('&lt;Alice&gt;')
    expect(message.html).not.toContain('Hi <Alice>')
    expect(message.text).toContain('2023')
    expect(message.text).toContain('₦25,000 / $20')
    expect(message.html).toContain('https://www.top100afl.com/signup')
    expect(message.html).toContain('lang="en"')
    expect(message.text).not.toContain('{{')
  })
  it('rejects unknown variables and unsafe action URLs', () => {
    expect(() => buildOutreachMessage({ subject: '{{password}}', body: 'Hello' }, { name: 'A', year: '2026', fee: '$20', actionUrl: 'https://example.com', stopUrl: 'https://example.com/stop', imageUrl: 'https://example.com/image.png' })).toThrow(/variable/i)
    expect(() => buildOutreachMessage(defaultOutreachDraft('recovery'), { name: 'A', year: '2026', fee: '$20', actionUrl: 'javascript:alert(1)', stopUrl: 'https://example.com/stop', imageUrl: 'https://example.com/image.png' })).toThrow(/URL/i)
  })
})
