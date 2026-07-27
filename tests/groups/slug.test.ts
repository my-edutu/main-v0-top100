import { describe, expect, it } from 'vitest'

import { initialsFromName, nextAvailableSlug, slugifyGroupName } from '@/lib/groups/types'

describe('slugifyGroupName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyGroupName('Founders And Builders')).toBe('founders-and-builders')
  })

  it('strips punctuation and collapses separators', () => {
    expect(slugifyGroupName('Climate & Sustainability!!')).toBe('climate-sustainability')
    expect(slugifyGroupName('Policy   ---   Advocacy')).toBe('policy-advocacy')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugifyGroupName('  --Health--  ')).toBe('health')
  })

  it('folds accents rather than dropping the word', () => {
    expect(slugifyGroupName('Éducation Africaine')).toBe('education-africaine')
  })

  it('never returns an empty slug', () => {
    expect(slugifyGroupName('!!!')).toBe('group')
    expect(slugifyGroupName('')).toBe('group')
  })

  it('caps the slug length and does not end on a hyphen', () => {
    const slug = slugifyGroupName('a'.repeat(40) + ' ' + 'b'.repeat(40))
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('nextAvailableSlug', () => {
  it('returns the base when nothing has taken it', () => {
    expect(nextAvailableSlug('founders', [])).toBe('founders')
  })

  it('suffixes with -2 on the first collision', () => {
    expect(nextAvailableSlug('founders', ['founders'])).toBe('founders-2')
  })

  it('walks past a run of existing suffixes', () => {
    expect(nextAvailableSlug('founders', ['founders', 'founders-2', 'founders-3'])).toBe('founders-4')
  })

  it('fills a gap in the sequence rather than always appending at the end', () => {
    expect(nextAvailableSlug('founders', ['founders', 'founders-3'])).toBe('founders-2')
  })

  it('keeps suffixed slugs inside the length cap', () => {
    const base = slugifyGroupName('c'.repeat(80))
    const taken = [base]
    const next = nextAvailableSlug(base, taken)
    expect(next.length).toBeLessThanOrEqual(60)
    expect(next).not.toBe(base)
    expect(next.endsWith('-2')).toBe(true)
  })

  it('ignores unrelated slugs that merely share a prefix', () => {
    expect(nextAvailableSlug('policy', ['policy-and-advocacy'])).toBe('policy')
  })
})

describe('initialsFromName', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsFromName('Amara Nwosu Okeke')).toBe('AN')
  })

  it('falls back for missing names', () => {
    expect(initialsFromName('')).toBe('AF')
    expect(initialsFromName(null)).toBe('AF')
  })
})
