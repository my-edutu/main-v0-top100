import { describe, expect, it } from 'vitest'
import { contributionSchema } from '../../lib/community-contributions'

const base = { campaign: 'volunteer', kind: 'services', name: 'Test Member', details: 'I can offer design services for two hours weekly.', consent: true }
describe('community contribution validation', () => {
  it('accepts services for either campaign', () => {
    expect(contributionSchema.safeParse(base).success).toBe(true)
    expect(contributionSchema.safeParse({ ...base, campaign: 'give-back' }).success).toBe(true)
  })
  it('requires explicit consent and meaningful details', () => {
    expect(contributionSchema.safeParse({ ...base, consent: false }).success).toBe(false)
    expect(contributionSchema.safeParse({ ...base, details: 'Hi' }).success).toBe(false)
  })
  it('validates cash amount and supported currency', () => {
    expect(contributionSchema.safeParse({ ...base, kind: 'cash', amount: '25.50', currency: 'USD' }).success).toBe(true)
    for (const amount of ['', '-1', '0', 'Infinity', '1e3', '1.234']) expect(contributionSchema.safeParse({ ...base, kind: 'cash', amount, currency: 'USD' }).success).toBe(false)
    expect(contributionSchema.safeParse({ ...base, kind: 'cash', amount: '25', currency: 'ABC' }).success).toBe(false)
  })
  it('rejects unknown campaigns and overlong input', () => {
    expect(contributionSchema.safeParse({ ...base, campaign: 'other' }).success).toBe(false)
    expect(contributionSchema.safeParse({ ...base, details: 'x'.repeat(3001) }).success).toBe(false)
  })
})
