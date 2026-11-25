import { describe, expect, it } from 'vitest'
import * as rsvp from '@/lib/festival/interest'

describe('Festival RSVP and dispatch forms', () => {
  const awardee = { name: 'Ada Obi', email: 'ada@example.com', phone: '+2348031234567' }
  const guest = { name: 'Amina Kamau', email: 'amina@example.com', phone: '+254712345678' }
  const input = { attending: true, awardee, guest, pickup: 'festival' }

  it('keeps awardee and guest contact details separate', () => {
    expect(rsvp.festivalRsvpSchema.parse(input)).toEqual(input)
  })

  it('requires a guest email and valid international phone when bringing a guest', () => {
    expect(rsvp.festivalRsvpSchema.safeParse({ ...input, guest: { ...guest, email: '' } }).success).toBe(false)
    expect(rsvp.festivalRsvpSchema.safeParse({ ...input, guest: { ...guest, phone: '123' } }).success).toBe(false)
  })

  it('accepts a declined RSVP with dispatch and no guest', () => {
    const declined = { ...input, attending: false, pickup: 'dispatch' }
    expect(rsvp.festivalRsvpSchema.safeParse({ ...declined, guest: null }).success).toBe(true)
    expect(rsvp.festivalRsvpSchema.safeParse(declined).success).toBe(false)
    expect(rsvp.festivalRsvpSchema.safeParse({ ...declined, guest: null, pickup: 'festival' }).success).toBe(false)
  })

  it('accepts international addresses without postal codes', () => {
    expect(rsvp.festivalDispatchSchema.safeParse({
      recipient: 'Ada Obi', phone: '+254712345678', country: 'Kenya', city: 'Nairobi',
      region: 'Nairobi County', address: '10 Example Street', postalCode: '',
    }).success).toBe(true)
  })
})
