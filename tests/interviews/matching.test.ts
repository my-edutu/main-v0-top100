import { describe, expect, it } from 'vitest'

import {
  matchAwardee,
  normaliseName,
  slugifyInterview,
  uniqueSlug,
  type AwardeeCandidate,
} from '@/lib/interviews/matching'

const candidates: AwardeeCandidate[] = [
  { id: 'a1', name: 'Amara Okonkwo', email: 'amara@example.com', year: 2025 },
  { id: 'a2', name: 'Thabo Mokoena', email: 'thabo@example.com', year: 2024 },
  { id: 'a3', name: 'Amara Okonkwo', email: 'amara.o@work.com', year: 2023 },
]

describe('normaliseName', () => {
  it('strips case, accents and punctuation', () => {
    expect(normaliseName('  Amara  Ókonkwo-Jr. ')).toBe('amara okonkwo jr')
  })
})

describe('matchAwardee', () => {
  it('matches on email regardless of case', () => {
    const result = matchAwardee(
      { email: 'AMARA@example.com', fullName: 'Someone Else', cohortYear: 2019 },
      candidates,
    )
    expect(result).toEqual({ awardeeId: 'a1', verification: 'matched' })
  })

  it('falls back to name plus cohort year when the email differs', () => {
    const result = matchAwardee(
      { email: 'personal@gmail.com', fullName: 'amara okonkwo', cohortYear: 2023 },
      candidates,
    )
    expect(result).toEqual({ awardeeId: 'a3', verification: 'matched' })
  })

  it('flags an application it cannot match instead of rejecting it', () => {
    const result = matchAwardee(
      { email: 'nobody@example.com', fullName: 'Unknown Person', cohortYear: 2025 },
      candidates,
    )
    expect(result).toEqual({ awardeeId: null, verification: 'unmatched' })
  })

  it('does not match a shared name when the cohort year does not line up', () => {
    const result = matchAwardee(
      { email: 'personal@gmail.com', fullName: 'Amara Okonkwo', cohortYear: 2018 },
      candidates,
    )
    expect(result.verification).toBe('unmatched')
  })

  it('ignores directory rows with no email when matching by email', () => {
    const result = matchAwardee(
      { email: 'ghost@example.com', fullName: 'Ghost', cohortYear: 2025 },
      [{ id: 'a9', name: 'Ghost', email: null, year: null }],
    )
    expect(result.verification).toBe('unmatched')
  })
})

describe('slugifyInterview', () => {
  it('produces a url-safe slug', () => {
    expect(slugifyInterview('"I stopped waiting for permission" — Amara')).toBe(
      'i-stopped-waiting-for-permission-amara',
    )
  })

  it('falls back when a title has no url-safe characters', () => {
    expect(slugifyInterview('???')).toBe('interview')
  })
})

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', () => {
    expect(uniqueSlug('amara-okonkwo', ['thabo-mokoena'])).toBe('amara-okonkwo')
  })

  it('suffixes on collision', () => {
    expect(uniqueSlug('amara-okonkwo', ['amara-okonkwo'])).toBe('amara-okonkwo-2')
  })

  it('keeps counting past an existing suffix', () => {
    expect(uniqueSlug('amara-okonkwo', ['amara-okonkwo', 'amara-okonkwo-2'])).toBe(
      'amara-okonkwo-3',
    )
  })
})
