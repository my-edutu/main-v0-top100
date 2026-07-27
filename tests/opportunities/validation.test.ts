import { describe, expect, it } from 'vitest'

import {
  createOpportunitySchema,
  deadlineRejectionReason,
  publishBlockedReason,
  sanitizeSearchTerm,
  toRowPatch,
  updateOpportunitySchema,
} from '@/lib/opportunities/server'
import { nextAvailableSlug, slugify } from '@/lib/opportunities/types'

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('Mastercard Foundation Scholars Programme 2027')).toBe(
      'mastercard-foundation-scholars-programme-2027',
    )
  })

  it('strips punctuation, accents and edge hyphens', () => {
    expect(slugify('  École — Résidence: "Impact"!  ')).toBe('ecole-residence-impact')
  })

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('opportunity')
  })
})

describe('nextAvailableSlug collision suffixing', () => {
  it('returns the base slug when it is free', () => {
    expect(nextAvailableSlug('climate-fellowship', [])).toBe('climate-fellowship')
    expect(nextAvailableSlug('climate-fellowship', ['other-thing'])).toBe('climate-fellowship')
  })

  it('suffixes -2 on the first collision', () => {
    expect(nextAvailableSlug('climate-fellowship', ['climate-fellowship'])).toBe('climate-fellowship-2')
  })

  it('keeps counting past existing suffixes', () => {
    expect(
      nextAvailableSlug('climate-fellowship', [
        'climate-fellowship',
        'climate-fellowship-2',
        'climate-fellowship-3',
      ]),
    ).toBe('climate-fellowship-4')
  })

  it('ignores gaps left by a deleted listing and takes the first free suffix', () => {
    expect(nextAvailableSlug('grant', ['grant', 'grant-3'])).toBe('grant-2')
  })

  it('is not confused by an unrelated slug that merely starts with the base', () => {
    expect(nextAvailableSlug('grant', ['grant-for-founders'])).toBe('grant')
  })
})

describe('deadlineRejectionReason', () => {
  const now = new Date('2026-07-27T10:00:00')

  it('rejects a deadline that has already passed', () => {
    expect(deadlineRejectionReason('2026-07-26', now)).toMatch(/already in the past/i)
    expect(deadlineRejectionReason('2019-01-01', now)).toMatch(/already in the past/i)
  })

  it('accepts today, so a same-day deadline can still be posted', () => {
    expect(deadlineRejectionReason('2026-07-27', now)).toBeNull()
  })

  it('accepts a future deadline and an absent one', () => {
    expect(deadlineRejectionReason('2026-12-01', now)).toBeNull()
    expect(deadlineRejectionReason(null, now)).toBeNull()
  })

  it('rejects an unparseable date', () => {
    expect(deadlineRejectionReason('not-a-date', now)).toMatch(/valid date/i)
  })
})

describe('publishBlockedReason — a published listing must have a way to apply', () => {
  const base = { title: 'Youth Climate Fellowship', type: 'Fellowship' }

  it('blocks publishing with neither an application link nor a contact email', () => {
    expect(publishBlockedReason({ ...base, applicationUrl: null, contactEmail: null })).toMatch(
      /application link or a contact email/i,
    )
    expect(publishBlockedReason({ ...base, applicationUrl: '', contactEmail: '   ' })).toMatch(
      /application link or a contact email/i,
    )
  })

  it('allows publishing with an application link', () => {
    expect(publishBlockedReason({ ...base, applicationUrl: 'https://apply.example.org' })).toBeNull()
  })

  it('allows publishing with only a contact email', () => {
    expect(publishBlockedReason({ ...base, contactEmail: 'apply@example.org' })).toBeNull()
  })

  it('blocks publishing without a title or a type', () => {
    expect(publishBlockedReason({ title: '', type: 'Grant', applicationUrl: 'https://x.example' })).toMatch(
      /title/i,
    )
    expect(
      publishBlockedReason({ title: 'A real title', type: '', applicationUrl: 'https://x.example' }),
    ).toMatch(/type/i)
  })
})

describe('createOpportunitySchema', () => {
  const valid = { title: 'Africa Innovation Grant', type: 'Grant' }

  it('defaults to a members-only draft — never public, never published by accident', () => {
    const parsed = createOpportunitySchema.parse(valid)
    expect(parsed.visibility).toBe('members')
    expect(parsed.status).toBe('draft')
    expect(parsed.isFeatured).toBe(false)
  })

  it('normalises blank optional fields to null', () => {
    const parsed = createOpportunitySchema.parse({ ...valid, organization: '', deadline: '', summary: '   ' })
    expect(parsed.organization).toBeNull()
    expect(parsed.deadline).toBeNull()
    expect(parsed.summary).toBeNull()
  })

  it('lowercases a contact email', () => {
    expect(createOpportunitySchema.parse({ ...valid, contactEmail: 'Apply@Example.ORG' }).contactEmail).toBe(
      'apply@example.org',
    )
  })

  it('rejects a short title, an unknown type and an unknown visibility', () => {
    expect(createOpportunitySchema.safeParse({ ...valid, title: 'ab' }).success).toBe(false)
    expect(createOpportunitySchema.safeParse({ ...valid, type: 'Bootcamp' }).success).toBe(false)
    expect(createOpportunitySchema.safeParse({ ...valid, visibility: 'secret' }).success).toBe(false)
  })

  it('rejects a non-http application link and a malformed email', () => {
    expect(createOpportunitySchema.safeParse({ ...valid, applicationUrl: 'javascript:alert(1)' }).success).toBe(
      false,
    )
    expect(createOpportunitySchema.safeParse({ ...valid, contactEmail: 'nope' }).success).toBe(false)
  })

  it('rejects a malformed deadline', () => {
    expect(createOpportunitySchema.safeParse({ ...valid, deadline: '01/08/2026' }).success).toBe(false)
    expect(createOpportunitySchema.safeParse({ ...valid, deadline: '2026-13-40' }).success).toBe(false)
  })
})

describe('updateOpportunitySchema / toRowPatch', () => {
  it('only writes the columns the caller actually sent', () => {
    const parsed = updateOpportunitySchema.parse({ status: 'closed' })
    expect(toRowPatch(parsed)).toEqual({ status: 'closed' })
  })

  it('maps camelCase input onto snake_case columns', () => {
    const parsed = updateOpportunitySchema.parse({
      applicationUrl: 'https://apply.example.org',
      contactEmail: 'apply@example.org',
      amountNote: 'Full tuition',
      isFeatured: true,
    })
    expect(toRowPatch(parsed)).toEqual({
      application_url: 'https://apply.example.org',
      contact_email: 'apply@example.org',
      amount_note: 'Full tuition',
      is_featured: true,
    })
  })

  it('produces an empty patch for an empty body, so the route can 400', () => {
    expect(toRowPatch(updateOpportunitySchema.parse({}))).toEqual({})
  })
})

describe('sanitizeSearchTerm', () => {
  it('strips the characters that would break a PostgREST or= filter', () => {
    expect(sanitizeSearchTerm('grant,visibility.eq.approved')).toBe('grant visibility.eq.approved')
    expect(sanitizeSearchTerm('a(b)c%')).toBe('a b c')
  })

  it('trims and caps the term', () => {
    expect(sanitizeSearchTerm('   fellowship   ')).toBe('fellowship')
    expect(sanitizeSearchTerm('x'.repeat(200))).toHaveLength(80)
  })
})
