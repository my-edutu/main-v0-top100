import { describe, expect, it } from 'vitest'

import {
  portfolioCoverFieldsSchema,
  portfolioCoverRequestSchema,
  normalizePortfolioCoverFields,
} from '@/lib/portfolio-cover/validation'

describe('portfolio cover validation', () => {
  it('accepts only explicitly selected Male or Female tailoring', () => {
    expect(portfolioCoverRequestSchema.safeParse({ tailoring: 'male', consent: true }).success).toBe(true)
    expect(portfolioCoverRequestSchema.safeParse({ tailoring: 'female', consent: true }).success).toBe(true)
    expect(portfolioCoverRequestSchema.safeParse({ tailoring: 'other', consent: true }).success).toBe(false)
    expect(portfolioCoverRequestSchema.safeParse({ consent: true }).success).toBe(false)
  })

  it('trims values and omits empty optional fields without inventing content', () => {
    const normalized = normalizePortfolioCoverFields({
      name: '  Ada Lovelace ',
      school: '   ',
      cgpa: ' 4.82 / 5.0 ',
      headline: '',
    })

    expect(normalized).toEqual({ name: 'Ada Lovelace', cgpa: '4.82 / 5.0' })
  })

  it('bounds supplied fields and rejects unknown keys', () => {
    expect(portfolioCoverFieldsSchema.safeParse({ name: 'A'.repeat(121) }).success).toBe(false)
    expect(portfolioCoverFieldsSchema.safeParse({ name: 'Ada', madeUp: 'x' }).success).toBe(false)
    expect(portfolioCoverFieldsSchema.safeParse({ cgpa: '4.8 / 5.0' }).success).toBe(true)
    expect(portfolioCoverFieldsSchema.safeParse({ cgpa: '5.8 / 5.0' }).success).toBe(false)
  })
})
