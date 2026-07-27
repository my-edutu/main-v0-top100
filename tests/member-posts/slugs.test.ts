import { describe, expect, it } from 'vitest'

import { slugifyTitle, uniquifySlug } from '@/lib/member-posts/types'

describe('slugifyTitle', () => {
  it('lowercases and hyphenates a normal title', () => {
    expect(slugifyTitle('My Story So Far')).toBe('my-story-so-far')
  })

  it('strips punctuation rather than encoding it', () => {
    expect(slugifyTitle('Why I build: lessons, & regrets!')).toBe('why-i-build-lessons-regrets')
  })

  it('keeps accented letters as their base letter instead of dropping the word', () => {
    expect(slugifyTitle('Adébáyò on climate')).toBe('adebayo-on-climate')
  })

  it('collapses runs of whitespace and hyphens', () => {
    expect(slugifyTitle('  too   many --- gaps  ')).toBe('too-many-gaps')
  })

  it('never returns an empty slug', () => {
    expect(slugifyTitle('!!! ???')).toBe('post')
    expect(slugifyTitle('   ')).toBe('post')
  })

  it('does not end a truncated slug with a stray hyphen', () => {
    const slug = slugifyTitle('a'.repeat(78) + ' bb')
    expect(slug.endsWith('-')).toBe(false)
    expect(slug.length).toBeLessThanOrEqual(80)
  })
})

describe('uniquifySlug', () => {
  it('returns the base slug when the author has not used it', () => {
    expect(uniquifySlug('my-story', [])).toBe('my-story')
    expect(uniquifySlug('my-story', ['something-else'])).toBe('my-story')
  })

  it('appends -2 for the first collision, then -3, and so on', () => {
    expect(uniquifySlug('my-story', ['my-story'])).toBe('my-story-2')
    expect(uniquifySlug('my-story', ['my-story', 'my-story-2'])).toBe('my-story-3')
    expect(uniquifySlug('my-story', ['my-story', 'my-story-2', 'my-story-3'])).toBe('my-story-4')
  })

  it('fills a gap left by a deleted post rather than always taking the next number', () => {
    expect(uniquifySlug('my-story', ['my-story', 'my-story-3'])).toBe('my-story-2')
  })

  it('is scoped per author: another author using the slug does not affect this one', () => {
    // The caller only ever passes ONE author's slugs, which is what makes
    // `unique (profile_id, slug)` — rather than a global unique — correct.
    const authorA = ['my-story']
    const authorB: string[] = []
    expect(uniquifySlug('my-story', authorA)).toBe('my-story-2')
    expect(uniquifySlug('my-story', authorB)).toBe('my-story')
  })
})
