import { describe, expect, it } from 'vitest'
import { remainingContacts, reviewContacts, type ContactAwardee } from '@/lib/admin/member-contact-review'
const person = (id: string, email: string | null, profile_id: string | null = null): ContactAwardee => ({ id, name: id, email, profile_id })
describe('contact review and continuation', () => {
  it('uses the linked account address and collapses duplicate recipient emails', () => {
    const rows = reviewContacts([person('one', 'old@example.com', 'profile'), person('two', 'ADA@example.com')], [{ id: 'profile', user_id: 'auth', email: 'Ada@example.com' }], [], '2026-11-06')
    expect(rows[0]).toMatchObject({ email: 'ada@example.com', activated: true, eligible: true })
    expect(rows[1]).toMatchObject({ eligible: false, reason: 'Duplicate email in this selection' })
  })
  it('excludes missing email, daily attempts, and uncertain deliveries from previous days', () => {
    const rows = reviewContacts([person('missing', null), person('today', 'today@example.com'), person('held', 'held@example.com')], [], [
      { email: 'today@example.com', status: 'not_sent', contact_day: '2026-11-06' },
      { email: 'held@example.com', status: 'unknown', contact_day: '2026-11-01' },
    ], '2026-11-06')
    expect(rows.every(r => !r.eligible)).toBe(true)
    expect(rows.map(r => r.reason)).toEqual(['Missing or invalid email', 'Already attempted today', 'Earlier delivery needs review'])
  })
  it('continues only untouched eligible recipients, never rejected or uncertain sends', () => {
    const rows = reviewContacts([person('one', 'one@example.com'), person('two', 'two@example.com'), person('three', 'three@example.com'), person('four', 'four@example.com'), person('missing', null)], [], [], '2026-11-06')
    const pending = remainingContacts(rows, [
      { id: 'one', name: 'one', outcome: 'accepted', message: '' },
      { id: 'two', name: 'two', outcome: 'unknown', message: '' },
      { id: 'three', name: 'three', outcome: 'not_sent', message: '' },
    ])
    expect(pending.map(r => r.id)).toEqual(['four'])
  })
})
